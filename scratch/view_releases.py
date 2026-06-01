import subprocess
import json
import os

os.environ['GITHUB_TOKEN'] = ''
try:
    res = subprocess.check_output('gh api repos/OmegaProjct/Omega-Wave-Editor/releases', shell=True).decode('utf-8')
    data = json.loads(res)
    for r in data[:3]:
        print(f"ID: {r['id']}, Name: {r['name']}, Tag: {r['tag_name']}, Draft: {r['draft']}")
        for a in r.get('assets', []):
            print(f"  Asset: {a['name']}")
except Exception as e:
    print("Error:", e)
