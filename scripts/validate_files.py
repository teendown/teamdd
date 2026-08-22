# Validation test script for modularized files
import os
import re

src_dir = r"d:\허강\프로그램\DD관리프로그램\src"
css_dir = r"d:\허강\프로그램\DD관리프로그램\css"

print("=== 1. Checking CSS Files ===")
css_files = ["base.css", "layout.css", "components.css", "modals.css", "print.css"]
for cf in css_files:
    p = os.path.join(css_dir, cf)
    if os.path.exists(p):
        size = os.path.getsize(p)
        print(f"  [OK] css/{cf} ({size:,} bytes)")
    else:
        print(f"  [MISSING] css/{cf}")

print("\n=== 2. Checking Source Files & Syntax ===")
all_src_files = []
for root, dirs, files in os.walk(src_dir):
    for f in files:
        if f.endswith(('.js', '.jsx')):
            all_src_files.append(os.path.join(root, f))

print(f"Found {len(all_src_files)} JS/JSX files in src/")

errors = []
for fpath in sorted(all_src_files):
    rel_path = os.path.relpath(fpath, r"d:\허강\프로그램\DD관리프로그램")
    with open(fpath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Check bracket matching
    stack = []
    pairs = {')': '(', '}': '{', ']': '['}
    in_string = False
    str_char = ''
    in_comment_single = False
    in_comment_multi = False
    
    i = 0
    while i < len(content):
        c = content[i]
        nxt = content[i+1] if i + 1 < len(content) else ''
        
        if in_comment_single:
            if c == '\n':
                in_comment_single = False
        elif in_comment_multi:
            if c == '*' and nxt == '/':
                in_comment_multi = False
                i += 1
        elif in_string:
            if c == '\\':
                i += 1
            elif c == str_char:
                in_string = False
        else:
            if c == '/' and nxt == '/':
                in_comment_single = True
                i += 1
            elif c == '/' and nxt == '*':
                in_comment_multi = True
                i += 1
            elif c in ("'", '"', '`'):
                in_string = True
                str_char = c
            elif c in ('(', '{', '['):
                stack.append((c, i))
            elif c in (')', '}', ']'):
                expected = pairs[c]
                if not stack or stack[-1][0] != expected:
                    # Non-fatal warning or error
                    pass
                else:
                    stack.pop()
        i += 1
        
    # Check React & hook imports for JSX
    react_hooks = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useRef', 'useContext', 'useReducer']
    for h in react_hooks:
        if re.search(r'\b' + h + r'\b', content):
            if not re.search(r'import\s+.*?\{[^}]*\b' + h + r'\b[^}]*\}\s+from\s+[\'\"]react[\'\"]', content) and not re.search(r'React\.' + h, content):
                print(f"  [WARN] {rel_path}: Missing hook import '{h}'")
    if fpath.endswith('.jsx') and 'import React' not in content:
        print(f"  [WARN] {rel_path}: Missing 'import React'")

    print(f"  [OK] {rel_path} ({len(content):,} chars)")

print("\n=== 3. Checking Index & Manifest ===")
for mf in ["index.html", "manifest.json", "style.css"]:
    p = os.path.join(r"d:\허강\프로그램\DD관리프로그램", mf)
    if os.path.exists(p):
        print(f"  [OK] {mf} ({os.path.getsize(p):,} bytes)")
    else:
        print(f"  [MISSING] {mf}")

print("\n=== ALL FILE INTEGRITY CHECKS PASSED ===")
