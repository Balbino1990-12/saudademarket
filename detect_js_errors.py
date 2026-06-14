import re
from pathlib import Path
import subprocess

path = Path('backend/admin/products.html')
text = path.read_text(encoding='utf-8')
scripts = re.findall(r'<script[^>]*>([\s\S]*?)</script>', text, re.I)
print(f'found {len(scripts)} scripts')
for i, script in enumerate(scripts, 1):
    temp_path = Path(f'temp_script_{i}.js')
    temp_path.write_text(script, encoding='utf-8')
    print(f'-- script {i}: {temp_path}')
    proc = subprocess.run(['node', '-c', str(temp_path)], capture_output=True, text=True)
    if proc.returncode != 0:
        print('ERROR')
        print(proc.stderr)
    else:
        print('OK')
