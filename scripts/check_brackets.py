from pathlib import Path
p=Path(r"d:/Downloads/signplus-suite_15/signplus-suite/renderer/app.js")
s=p.read_text(encoding='utf-8')
stack=[]
pairs={ '(':')','[':']','{':'}' }
for idx,ch in enumerate(s):
    pos=idx+1
    if ch in pairs:
        stack.append((ch,pos))
    elif ch in pairs.values():
        if not stack:
            print('Unmatched closing', ch, 'at pos', pos)
            break
        top, top_pos = stack.pop()
        if pairs[top] != ch:
            print('Mismatched', top, 'opened at', top_pos, 'but closed by', ch, 'at', pos)
            break
else:
    if stack:
        last, last_pos = stack[-1]
        print('Unclosed opener', last, 'opened at', last_pos)
    else:
        print('All balanced')
