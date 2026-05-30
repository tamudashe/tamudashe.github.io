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

output = {'_all': new_all, **result}

with open('photos.json', 'w') as f:
    json.dump(output, f, indent=2)

total = sum(len(v) for v in result.values())
print(f"photos.json updated — {total} photo(s) across {len(result)} categories")
EOF
