#!/bin/bash
cd "$(dirname "$0")"
python3 -c "
import json, os
exts = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif')
photos = sorted(f for f in os.listdir('photos') if f.lower().endswith(exts))
print(json.dumps(photos, indent=2))
" > photos.json
count=$(python3 -c "import json; print(len(json.load(open('photos.json'))))")
echo "photos.json updated — $count photo(s)"
