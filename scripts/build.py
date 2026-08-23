import subprocess
import os
import sys

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except Exception:
        pass

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
esbuild_path = os.path.join(base_dir, 'node_modules', '@esbuild', 'win32-x64', 'esbuild.exe')
entry_path = os.path.join(base_dir, 'src', 'main.jsx')
outfile_path = os.path.join(base_dir, 'app.bundle.js')

cmd = [
    esbuild_path,
    entry_path,
    '--bundle',
    f'--outfile={outfile_path}',
    '--loader:.js=jsx',
    '--define:process.env.NODE_ENV="production"',
    '--charset=utf8'
]

print(f'Running esbuild: {entry_path} -> {outfile_path}')
res = subprocess.run(cmd, capture_output=True, text=True, encoding='utf-8', errors='replace', cwd=base_dir)
if res.stdout:
    print(res.stdout)
if res.stderr:
    print(res.stderr)
print('Exit code:', res.returncode)
if res.returncode != 0:
    sys.exit(res.returncode)

