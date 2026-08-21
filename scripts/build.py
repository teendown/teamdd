import subprocess
import os

esbuild_path = os.path.abspath(r'node_modules/@esbuild/win32-x64/esbuild.exe')
cmd = [
    esbuild_path,
    'src/main.jsx',
    '--bundle',
    '--outfile=app.bundle.js',
    '--loader:.js=jsx',
    '--define:process.env.NODE_ENV="production"'
]
print('Running:', ' '.join(cmd))
res = subprocess.run(cmd, capture_output=True, text=True)
print(res.stdout)
if res.stderr:
    print(res.stderr)
print('Exit code:', res.returncode)
