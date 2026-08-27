from pathlib import Path
import re

root = Path(__file__).resolve().parent
html = (root / "index.html").read_text(encoding="utf-8")
slides = (root / "slides-fragment.html").read_text(encoding="utf-8").strip()
notes = (root / "speaker-notes.js").read_text(encoding="utf-8").strip()

html = html.replace(
    "[必填] 替换为 PPT 标题 · Deck Title",
    "理解胖东来，从理解人开始 · 自由·爱 AI 文化数字馆",
)

start = html.find("<!-- SLIDES_HERE")
nav = html.find('<div id="nav">')
if start < 0 or nav < 0:
    raise SystemExit(f"markers missing start={start} nav={nav}")

html2 = html[:start] + slides + "\n\n</div>\n\n" + html[nav:]
html2, n = re.subn(
    r"const SPEAKER_NOTES = \[[\s\S]*?window\.__SPEAKER_NOTES__ = SPEAKER_NOTES;",
    notes,
    html2,
    count=1,
)
if n != 1:
    raise SystemExit(f"SPEAKER_NOTES replace count={n}")

(root / "index.html").write_text(html2, encoding="utf-8")
print("wrote", root / "index.html")
print("bytes", (root / "index.html").stat().st_size)
print("slide class count", html2.count('class="slide'))
print("必填 leftover", html2.count("[必填]"))
