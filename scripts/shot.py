#!/usr/bin/env python3
"""Screenshot helper: shot.py URL OUT [width] [height] [fullpage 0/1] [js-to-run]"""
import sys
from playwright.sync_api import sync_playwright

url, out = sys.argv[1], sys.argv[2]
w = int(sys.argv[3]) if len(sys.argv) > 3 else 390
h = int(sys.argv[4]) if len(sys.argv) > 4 else 844
full = len(sys.argv) > 5 and sys.argv[5] == "1"
js = sys.argv[6] if len(sys.argv) > 6 else None
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={"width": w, "height": h}, device_scale_factor=2 if w < 600 else 1)
    logs = []
    pg.on("console", lambda m: logs.append(f"{m.type}: {m.text}"))
    pg.on("pageerror", lambda e: logs.append(f"PAGEERROR: {e}"))
    if url.startswith("<"):
        pg.goto("http://localhost:8788/api/public")
        pg.set_content(url)
    else:
        pg.goto(url)
    pg.wait_for_timeout(700)
    if js:
        pg.evaluate(js)
        pg.wait_for_timeout(900)
    over = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
    pg.screenshot(path=out, full_page=full)
    for l in logs:
        print(l)
    print("overflow-x:", over)
    b.close()
