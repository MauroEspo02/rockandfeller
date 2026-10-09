#!/usr/bin/env python3
"""Prova del gratta e vinci: senza pass, vincita (100%), perdita (0%), già giocato."""
import json, urllib.request, http.cookiejar
from playwright.sync_api import sync_playwright
B = "http://localhost:8788"

def admin_set(pct):
    cj = http.cookiejar.CookieJar(); op = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cj))
    def req(m, path, body):
        r = urllib.request.Request(B + path, data=json.dumps(body).encode(), method=m, headers={"Content-Type": "application/json"})
        return op.open(r).read()
    req("POST", "/api/admin/login", {"username": "admin", "password": "prova-admin-123"})
    req("PUT", "/api/admin/gratta", {"active": True, "win_percent": pct, "max_wins_day": 0, "plays_per_day": 1, "valid_days": 7, "prize": "10% di sconto sul panino del mese"})

def scratch(pg):
    box = pg.locator("#layer").bounding_box()
    for row in range(9):
        y = box["y"] + 10 + row * (box["height"] - 20) / 8
        pg.mouse.move(box["x"] + 5, y); pg.mouse.down()
        for k in range(12):
            pg.mouse.move(box["x"] + 5 + k * (box["width"] - 10) / 11, y + (6 if k % 2 else -6))
        pg.mouse.up()

with sync_playwright() as p:
    b = p.chromium.launch()
    errs = []
    def page():
        ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
        pg = ctx.new_page(); pg.on("pageerror", lambda e: errs.append(str(e))); return pg
    pg = page(); pg.goto(B + "/gratta"); pg.wait_for_timeout(600); pg.screenshot(path="/tmp/s/g-nopass.png")
    admin_set(100)
    pg = page(); pg.goto(B + "/qr/gratta"); pg.wait_for_selector("#layer:not([hidden])"); pg.wait_for_timeout(400)
    pg.screenshot(path="/tmp/s/g-start.png")
    box = pg.locator("#layer").bounding_box()
    pg.mouse.move(box["x"]+40, box["y"]+60); pg.mouse.down(); pg.mouse.move(box["x"]+200, box["y"]+90, steps=10); pg.mouse.move(box["x"]+260, box["y"]+150, steps=8); pg.mouse.up()
    pg.wait_for_timeout(500); pg.screenshot(path="/tmp/s/g-mid.png")
    scratch(pg); pg.wait_for_timeout(1300); pg.screenshot(path="/tmp/s/g-win.png")
    print("vinto:", pg.text_content(".res__code"))
    pg.reload(); pg.wait_for_timeout(700); print("dopo ricarica:", pg.text_content("#hint"), pg.text_content(".res__code"))
    admin_set(0)
    pg = page(); pg.goto(B + "/qr/gratta"); pg.wait_for_selector("#layer:not([hidden])"); scratch(pg); pg.wait_for_timeout(1200)
    pg.screenshot(path="/tmp/s/g-lose.png"); print("perso:", pg.text_content(".res__big"))
    b.close()
    print("errori JS:", errs or "nessuno")
