from pathlib import Path
p=Path(r"d:/Downloads/signplus-suite_15/signplus-suite/renderer/app.js")
s=p.read_text(encoding='utf-8')
open_pos=106794
close_pos=108387
line_open = s.count('\n',0,open_pos)+1
line_close = s.count('\n',0,close_pos)+1
print('open_pos',open_pos,'-> line',line_open)
print('close_pos',close_pos,'-> line',line_close)
