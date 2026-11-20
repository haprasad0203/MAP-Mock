# Remove buildings that the real footage shows are not there (H A, 20 Nov: fake-building audit), with their entrances.
# Keeps the file's own formatting (json.dumps indent=1, ASCII, no trailing newline), so the diff shows only the removals.
# Usage: python scripts/layout_remove.py <building-id> ...
import json, sys
f = 'public/data/campus-layout.json'
d = json.load(open(f, encoding='utf-8'))
ids = set(sys.argv[1:])
before = len(d['buildings'])
gone = [b['id'] for b in d['buildings'] if b['id'] in ids]
d['buildings'] = [b for b in d['buildings'] if b['id'] not in ids]
d['entrances'] = [e for e in d['entrances'] if e.get('buildingId') not in ids]
open(f, 'w', encoding='utf-8', newline='\n').write(json.dumps(d, indent=1, ensure_ascii=True))
print('removed', len(gone), 'of', len(ids), sorted(set(ids) - set(gone)) or '', '| buildings', before, '->', len(d['buildings']))
