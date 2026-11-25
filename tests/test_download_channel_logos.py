"""Offline checks: python -B -m unittest discover -s tests -p test_download_channel_logos.py"""
import importlib.util
import io
from email.message import Message
from pathlib import Path
import unittest
from unittest.mock import patch
import urllib.error
import urllib.request
import urllib.response


spec = importlib.util.spec_from_file_location(
    'download_channel_logos',
    Path(__file__).resolve().parents[1] / 'scripts' / 'download-channel-logos.py',
)
logos = importlib.util.module_from_spec(spec)
spec.loader.exec_module(logos)


class DownloadURLTests(unittest.TestCase):
    def test_rejects_non_https_before_opening(self):
        with patch.object(urllib.request, 'build_opener') as opener:
            for url in ['file:///private/logo.png', 'ftp://example.com/logo.png',
                        'data:image/png;base64,AAAA', 'http://example.com/logo.png',
                        '//example.com/logo.png']:
                with self.subTest(url=url), self.assertRaises(ValueError):
                    logos.fetch(url)
            opener.assert_not_called()

    def fetch_with_redirects(self, targets):
        visited = []

        def https_open(handler, request):
            visited.append(request.full_url)
            headers = Message()
            if len(visited) <= len(targets):
                headers['Location'] = targets[len(visited) - 1]
                response = urllib.response.addinfourl(io.BytesIO(b''), headers, request.full_url, 302)
                response.msg = 'Found'
            else:
                response = urllib.response.addinfourl(io.BytesIO(b'image bytes'), headers, request.full_url, 200)
                response.msg = 'OK'
            return response

        # Exercise the real opener and redirect handler, replacing only transport.
        with patch.object(urllib.request.HTTPSHandler, 'https_open', https_open), \
                patch('socket.create_connection', side_effect=AssertionError('Network forbidden')):
            return logos.fetch('https://example.com/start'), visited

    def test_https_and_relative_redirects_work(self):
        data, visited = self.fetch_with_redirects(['/next', 'https://cdn.example.com/logo.png'])
        self.assertEqual(data, b'image bytes')
        self.assertEqual(visited, ['https://example.com/start', 'https://example.com/next',
                                   'https://cdn.example.com/logo.png'])

    def test_rejects_unsafe_redirects_after_an_https_hop(self):
        for url in ['file:///private/logo.png', 'ftp://example.com/logo.png',
                    'data:image/png;base64,AAAA', 'http://example.com/logo.png']:
            with self.subTest(url=url), self.assertRaises((ValueError, urllib.error.HTTPError)):
                self.fetch_with_redirects(['https://example.com/next', url])


if __name__ == '__main__':
    unittest.main()
