#!/bin/bash
cd "$(dirname "$0")"

python3 - <<'EOF'
import json, os, subprocess

exts = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif')

# Load existing manifest to preserve ordering
existing = {}
if os.path.exists('photos.json'):
    with open('photos.json') as f:
        existing = json.load(f)

result = {}

for category in sorted(os.listdir('photos')):
    cat_path = f'photos/{category}'
    if not os.path.isdir(cat_path) or category == 'thumbs':
        continue

    thumb_dir = f'photos/thumbs/{category}'
    os.makedirs(thumb_dir, exist_ok=True)

    on_disk = set(f for f in os.listdir(cat_path) if f.lower().endswith(exts))

    # Generate missing thumbnails
    for name in on_disk:
        thumb = f'{thumb_dir}/{name}'
        if not os.path.exists(thumb):
            subprocess.run(['sips', '-Z', '1200', f'{cat_path}/{name}', '--out', thumb],
                           capture_output=True)
            print(f'thumbnail: {category}/{name}')

    # Preserve existing order, append new photos, drop deleted ones
    prev = existing.get(category, [])
    ordered = [f for f in prev if f in on_disk]
    ordered += sorted(f for f in on_disk if f not in set(prev))
    result[category] = ordered

# Update _all: preserve existing order, append new photos, drop deleted ones
all_paths = set(f'{cat}/{name}' for cat, names in result.items() for name in names)
prev_all = existing.get('_all', [])
new_all = [p for p in prev_all if p in all_paths]
new_all += sorted(p for p in all_paths if p not in set(prev_all))

# Extract metadata (color, GPS, EXIF) for new photos
from PIL import Image
import colorsys, struct

def dominant_color(thumb_path):
    try:
        img = Image.open(thumb_path).convert('RGB').resize((80, 80))
        pixels = [(r, g, b) for r, g, b in img.getdata()]
        # Convert all pixels to HSV, find the most saturated colorful pixel cluster
        hsv_pixels = [(colorsys.rgb_to_hsv(r/255, g/255, b/255), (r, g, b)) for r, g, b in pixels]
        # Sort by saturation descending, take top 10%
        hsv_pixels.sort(key=lambda x: x[0][1], reverse=True)
        top = hsv_pixels[:max(1, len(hsv_pixels)//10)]
        avg_s = sum(p[0][1] for p in top) / len(top)
        if avg_s < 0.18:
            return 'mono', '#888888'
        # Use median hue of top saturated pixels
        hues = sorted(p[0][0] * 360 for p in top)
        h_deg = hues[len(hues)//2]
        r, g, b = top[0][1]
        hex_color = '#{:02x}{:02x}{:02x}'.format(r, g, b)
        if h_deg <= 50 or h_deg >= 320:
            return 'warm', hex_color
        elif h_deg <= 160:
            return 'earth', hex_color
        else:
            return 'cool', hex_color
    except Exception:
        return None, None

def decode_gps(gps_info):
    try:
        def to_deg(val):
            d, m, s = val
            return float(d) + float(m)/60 + float(s)/3600
        lat = to_deg(gps_info[2])
        if gps_info[1] == 'S':
            lat = -lat
        lon = to_deg(gps_info[4])
        if gps_info[3] == 'W':
            lon = -lon
        return [round(lat, 6), round(lon, 6)]
    except Exception:
        return None

def extract_exif(photo_path):
    try:
        img = Image.open(photo_path)
        raw = img._getexif()
        if not raw:
            return None, None
        tags = {
            271: 'make', 272: 'model', 42036: 'lens',
            37386: 'focal', 33437: 'fnum', 33434: 'exposure', 34855: 'iso',
            34853: 'gps'
        }
        data = {tags[k]: v for k, v in raw.items() if k in tags}
        gps = decode_gps(data['gps']) if 'gps' in data else None
        exif = {}
        make = (data.get('make') or '').strip()
        model = (data.get('model') or '').strip()
        if model:
            camera = model if model.startswith(make) else f'{make} {model}'.strip()
            exif['camera'] = camera
        if 'lens' in data and data['lens']:
            exif['lens'] = str(data['lens']).strip()
        if 'focal' in data:
            f = data['focal']
            exif['focal'] = f'{int(float(f[0])/float(f[1]) if isinstance(f, tuple) else f)}mm'
        if 'fnum' in data:
            f = data['fnum']
            val = float(f[0])/float(f[1]) if isinstance(f, tuple) else float(f)
            exif['aperture'] = f'f/{val:.1f}'.rstrip('0').rstrip('.')
        if 'exposure' in data:
            e = data['exposure']
            val = float(e[0])/float(e[1]) if isinstance(e, tuple) else float(e)
            if val < 1:
                exif['shutter'] = f'1/{round(1/val)}s'
            else:
                exif['shutter'] = f'{val:.1f}s'
        if 'iso' in data:
            iso = data['iso']
            exif['iso'] = str(iso[0] if isinstance(iso, (list, tuple)) else iso)
        return gps, exif if exif else None
    except Exception:
        return None, None

prev_meta = existing.get('_meta', {})
meta = {k: v for k, v in prev_meta.items() if k in all_paths}

for path in all_paths:
    if path in meta:
        continue
    slash = path.index('/')
    cat, name = path[:slash], path[slash+1:]
    entry = {}
    color_bucket, hex_color = dominant_color(f'photos/thumbs/{cat}/{name}')
    if color_bucket:
        entry['color'] = color_bucket
        entry['hex'] = hex_color
    gps, exif = extract_exif(f'photos/{cat}/{name}')
    if gps:
        entry['gps'] = gps
    if exif:
        entry['exif'] = exif
    if entry:
        meta[path] = entry
        print(f'meta: {path} → {color_bucket or "?"} {"GPS" if gps else ""} {"EXIF" if exif else ""}')

output = {'_all': new_all, '_meta': meta, **result}

with open('photos.json', 'w') as f:
    json.dump(output, f, indent=2)

total = sum(len(v) for v in result.values())
print(f"photos.json updated — {total} photo(s) across {len(result)} categories")
EOF
