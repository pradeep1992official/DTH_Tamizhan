"""Normalize channel logo canvases and ship small retina-ready WebP assets.

Run after download-channel-logos.py. Original files are retained in artifacts.
"""
import hashlib
import json
from pathlib import Path
import shutil
import zipfile
from PIL import Image, ImageChops

root = Path(__file__).resolve().parents[1]
public = (root / 'public').resolve()
logo_root = (public / 'channel-logos').resolve()
archive = root / 'artifacts' / 'channel-logo-originals'
archive.mkdir(parents=True, exist_ok=True)
manifest_path = root / 'src' / 'lib' / 'channelLogos.json'
manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
before = after = 0
for name, entry in manifest.items():
    source = (public / entry['path'].lstrip('/')).resolve()
    source.relative_to(logo_root)
    before += source.stat().st_size
    if entry.get('width') == 96 and entry.get('height') == 96 and source.suffix == '.webp':
        after += source.stat().st_size
        continue
    with Image.open(source) as image:
        image = image.convert('RGBA')
        # Find visible artwork on its existing white/transparent canvas.
        white = Image.new('RGBA', image.size, 'white')
        white.alpha_composite(image)
        mask = ImageChops.difference(white.convert('RGB'), Image.new('RGB', image.size, 'white')).convert('L').point(lambda value: 255 if value > 12 else 0)
        bbox = mask.getbbox()
        if bbox:
            image = image.crop(bbox)
        image.thumbnail((88, 88), Image.Resampling.LANCZOS)
        canvas = Image.new('RGBA', (96, 96), 'white')
        canvas.alpha_composite(image, ((96 - image.width) // 2, (96 - image.height) // 2))
        destination = logo_root / (source.stem + '.webp')
        destination.relative_to(logo_root)
        # Retain originals outside the public/build asset tree before replacement.
        saved_original = archive / source.name
        if not saved_original.exists():
            shutil.copyfile(source, saved_original)
        canvas.convert('RGB').save(destination, 'WEBP', quality=86, method=6)
    if source != destination:
        target = (archive / source.name).resolve()
        target.relative_to(archive.resolve())
        # Move only this checked single file, never a recursively computed path.
        shutil.move(str(source), str(target))
    after += destination.stat().st_size
    entry['originalSha256'] = entry.get('originalSha256', entry['sha256'])
    entry.update(path='/channel-logos/' + destination.name, width=96, height=96, bytes=destination.stat().st_size, sha256=hashlib.sha256(destination.read_bytes()).hexdigest())
manifest_path.write_text(json.dumps(manifest, ensure_ascii=True, indent=2) + '\n', encoding='utf-8')
with zipfile.ZipFile(root / 'artifacts' / 'channel-logos.zip', 'w', zipfile.ZIP_DEFLATED) as output:
    for entry in manifest.values():
        path = public / entry['path'].lstrip('/')
        output.write(path, 'channel-logos/' + path.name)
    output.write(manifest_path, 'sources.json')
print(json.dumps({'logos': len(manifest), 'previousBytes': before, 'optimizedBytes': after, 'largestBytes': max(entry['bytes'] for entry in manifest.values())}))
