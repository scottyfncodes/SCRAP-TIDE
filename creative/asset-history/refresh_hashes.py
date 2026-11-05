"""Refresh the SHA-256 of every replacement in tidebreakers-asset-history.jsonl from the files that ship in public/models.

    python3 creative/asset-history/refresh_hashes.py      (run from the repo root after re-exporting a model)
"""
import hashlib
import json

PATH = 'creative/asset-history/tidebreakers-asset-history.jsonl'
rows = [json.loads(line) for line in open(PATH) if line.strip()]
for r in rows:
    f = r['replacement']['file']
    r['replacement']['sha256'] = hashlib.sha256(open(f, 'rb').read()).hexdigest()
with open(PATH, 'w') as out:
    for r in rows:
        out.write(json.dumps(r) + '\n')
print(f'{len(rows)} records refreshed')
