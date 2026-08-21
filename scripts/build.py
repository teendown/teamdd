import subprocess
import os
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

esbuild_path = os.path.abspath(r'node_modules/@esbuild/win32-x64/esbuild.exe')
cmd = [
    esbuild_path,
    'src/main.jsx',
    '--bundle',
    '--outfile=app.bundle.js',
    '--loader:.js=jsx',
    '--define:process.env.NODE_ENV="production"'
]
print('Running esbuild...')
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace')
if res.stdout:
    print(res.stdout.encode('utf-8', errors='replace').decode('utf-8'))
if res.stderr:
    print(res.stderr.encode('utf-8', errors='replace').decode('utf-8'))
print('Exit code:', res.returncode)
