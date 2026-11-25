"""Download logos for a catalog snapshot; retain source URLs in a manifest.

Usage: python scripts/download-channel-logos.py path/to/channel-catalog.json
The snapshot is an array of channel records with name and optional logoUrl.
"""
import concurrent.futures
import csv
import hashlib
import html
from html.parser import HTMLParser
import io
import json
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'channel-logos'
PAGES = [
    'tamil-thalaiva-hds', 'fta-complimentary-pack-new', 'fta-tamil-regional',
    'tamil-thalaiva-hd-new', 'tamil-tv-shows-hd', 'tamil-thalaiva-sports-kids-english-hd',
]
FALLBACK_IDS = {
    'Aaseervatham TV': 'AaseervathamTV.in', 'Sai TV': 'SaiTV.in',
    'Sony Sports Ten 4 Tamil': 'SonySportsTen4.in', 'Nick HD+': 'NickHDPlus.in',
    'Hungama': 'HungamaTV.in', 'Sun News': 'SunNews.in', 'Sonic': 'Sonic.in',
    'Puthu Yugam': 'PuthuyugamTV.in', 'News7 Tamil': 'News7Tamil.in',
    'Jaya TV': 'JayaTV.in', '7S Music': '7SMusic.in',
}
ALIASES = {
    'starvijaysuper': 'vijaysuper', 'starvijaysuperhd': 'vijaysuperhd',
    'starvijaytakkar': 'vijaytakkar', 'jmovie': 'jmovies',
    'news18tamil': 'news18tamilnadu', 'seithigal24x7': 'seithigaltv',
    'rajnews': 'rajnewstamil', 'malaimurasu': 'malaimurasuseithigal',
    'svbc2tamil': 'svbc2', 'discoverytamil': 'dtamil',
    'discoveryworldhd': 'discoveryhdworld', 'hungama': 'hungamatv',
    'sonysportsten4tamil': 'sonysportsten4',
}

def key(name):
    return re.sub(r'[^a-z0-9]', '', name.lower())

def require_https(url):
    if urllib.parse.urlsplit(url).scheme.lower() != 'https':
        raise ValueError(f'Rejected non-HTTPS logo URL: {url!r}')
    return url

class HTTPSOnlyRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        require_https(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def fetch(url):
    request = urllib.request.Request(require_https(url), headers={'User-Agent': 'Mozilla/5.0'})
    opener = urllib.request.build_opener(HTTPSOnlyRedirectHandler())
    with opener.open(request, timeout=25) as response:
        return response.read()

class Logos(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag != 'img' or '/assets/channels/' not in attrs.get('src', ''):
            return
        name = re.sub(r'\s+Channel$', '', html.unescape(attrs.get('alt', '')), flags=re.I)
        if name and 'default' not in attrs['src']:
            self.rows[key(name)] = ('https://www.tataplay.com' + attrs['src'] if attrs['src'].startswith('/') else attrs['src'], name)

def main():
    channels = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    candidates = {}
    for page in PAGES:
        parser = Logos()
        try:
            parser.feed(fetch('https://www.tataplay.com/dth/pack/' + page).decode('utf-8'))
        except Exception as error:
            print(f'Skipping {page}: {error}', file=sys.stderr)
        candidates.update(parser.rows)
    DEST.mkdir(exist_ok=True)
    manifest_path = ROOT / 'src' / 'lib' / 'channelLogos.json'
    previous = json.loads(manifest_path.read_text(encoding='utf-8')) if manifest_path.exists() else {}
    logo_rows = list(csv.DictReader(io.StringIO(fetch('https://raw.githubusercontent.com/iptv-org/database/master/data/logos.csv').decode('utf-8'))))

    def download(channel):
        name = channel['name']
        if name in previous and (ROOT / 'public' / previous[name]['path'].lstrip('/')).exists():
            return name, previous[name], None
        candidate = candidates.get(ALIASES.get(key(name), key(name)))
        if not candidate:
            slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
            candidate = ('https://www.tataplay.com/s3-api/v1/assets/channels/' + slug + '.webp', name)
        urls = [candidate]
        fallback = [row for row in logo_rows if row['channel'] == FALLBACK_IDS.get(name) and row['in_use'] == 'TRUE' and row['feed'] != 'Digital' and (name != 'Sony Sports Ten 4 Tamil' or row['feed'] == 'Tamil')]
        def preference(row):
            url = row['url']
            return (0 if 'xstreamcp-' in url else 1 if 'jiotvimages.' in url and name != 'Jaya TV' else 2 if 'i.imgur' in url else 3)
        urls.extend((row['url'], name) for row in sorted(fallback, key=preference))
        error = 'No usable image'
        for url, source_name in urls:
          try:
            data = fetch(url)
            with Image.open(io.BytesIO(data)) as img:
                img.verify()
            with Image.open(io.BytesIO(data)) as img:
                extension = {'WEBP': 'webp', 'PNG': 'png', 'JPEG': 'jpg', 'GIF': 'gif'}[img.format]
                if min(img.size) < 10:
                    raise ValueError('Image too small')
            filename = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') + '.' + extension
            (DEST / filename).write_bytes(data)
            return name, {'path': '/channel-logos/' + filename, 'source': url, 'sourceName': source_name, 'sha256': hashlib.sha256(data).hexdigest()}, None
          except Exception as failure:
            print(f'Skipping {url!r}: {failure}', file=sys.stderr)
            error = str(failure)
        return name, previous.get(name), error

    results = list(concurrent.futures.ThreadPoolExecutor(max_workers=6).map(download, channels))
    manifest = {name: entry for name, entry, _ in results if entry}
    manifest_path.write_text(json.dumps(dict(sorted(manifest.items())), ensure_ascii=True, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'downloaded': len(manifest), 'total': len(channels), 'missing': [{'name': name, 'reason': error} for name, entry, error in results if not entry]}))

if __name__ == '__main__':
    main()
