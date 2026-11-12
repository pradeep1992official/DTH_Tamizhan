"""Generate replaceable favicon assets from the Tamil wordmark's initial த.

This is a placeholder, not an approved master logo. Requires Pillow and a Tamil
font supplied explicitly, e.g. --font C:/Windows/Fonts/Nirmala.ttc.
"""
from pathlib import Path
import argparse
from PIL import Image, ImageDraw, ImageFont

parser = argparse.ArgumentParser()
parser.add_argument('--font', type=Path, required=True)
args = parser.parse_args()
output = Path(__file__).resolve().parents[1] / 'public'
image = Image.new('RGB', (512, 512), '#33272b')
draw = ImageDraw.Draw(image)
font = ImageFont.truetype(str(args.font), 320)
mark = '\u0ba4'  # த, the initial of the existing Tamil wordmark.
box = draw.textbbox((0, 0), mark, font=font)
draw.text(((512 - (box[2] - box[0])) / 2 - box[0], (512 - (box[3] - box[1])) / 2 - box[1]), mark, font=font, fill='#fffefa')
draw.rounded_rectangle((160, 425, 352, 443), radius=8, fill='#f97316')
for name, size in [('favicon.png', 32), ('apple-touch-icon.png', 180), ('icon-192.png', 192), ('icon-512.png', 512)]:
    image.resize((size, size), Image.Resampling.LANCZOS).save(output / name)
image.save(output / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
