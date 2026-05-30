#!/bin/bash
cd "$(dirname "$0")"
mkdir -p photos/thumbs

exts=("jpg" "jpeg" "png" "webp" "gif" "avif")

for f in photos/*; do
  [[ -f "$f" ]] || continue
  ext="${f##*.}"
  ext_lower=$(echo "$ext" | tr '[:upper:]' '[:lower:]')
  skip=true
  for e in "${exts[@]}"; do [[ "$ext_lower" == "$e" ]] && skip=false && break; done
  $skip && continue

  name=$(basename "$f")
  thumb="photos/thumbs/$name"
  [[ -f "$thumb" ]] && continue

  sips -Z 1200 "$f" --out "$thumb" > /dev/null 2>&1
  echo "thumbnail: $name"
done

python3 -c "
import json, os
exts = ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif')
photos = sorted(f for f in os.listdir('photos') if f.lower().endswith(exts))
print(json.dumps(photos, indent=2))
" > photos.json

count=$(python3 -c "import json; print(len(json.load(open('photos.json'))))")
echo "photos.json updated — $count photo(s)"
