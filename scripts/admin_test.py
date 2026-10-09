#!/usr/bin/env python3
"""Prova del pannello nel browser: login, prezzo al volo, esaurito, modifica prodotto, QR, account."""
import sys, json, urllib.request
from playwright.sync_api import sync_playwright

B = "http://localhost:8788"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/tmp"
errors = []

def pub():
    return json.load(urllib.request.urlopen(B + "/api/public"))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2, accept_downloads=True)
    pg = ctx.new_page()
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.on("console", lambda m: m.type == "error" and errors.append(m.text))
    pg.goto(B + "/admin/")
    pg.fill('input[name="username"]', "admin")
    pg.fill('input[name="password"]', "sbagliata")
    pg.click("button[type=submit]")
    pg.wait_for_selector("#login-err:not(:empty)")
    print("login errato:", pg.text_content("#login-err"))
    pg.fill('input[name="password"]', "prova-admin-123")
    pg.click("button[type=submit]")
    pg.wait_for_selector(".ahead")
    pg.wait_for_timeout(300)
    pg.screenshot(path=f"{OUT}/a_account.png")

    # crea due account
    for name, user in (("Mauro", "mauro"), ("Proprietario", "titolare")):
        pg.fill('#newuser input[name="display_name"]', name)
        pg.fill('#newuser input[name="username"]', user)
        pg.fill('#newuser input[name="password"]', "kebab-2026!")
        pg.click('#newuser button[type="submit"]')
        pg.wait_for_function(f"document.querySelector('.ulist').textContent.includes('{user}')")
    print("account creati")

    # entra come mauro
    pg.click("#logout")
    pg.wait_for_selector("#login")
    pg.fill('input[name="username"]', "Mauro")
    pg.fill('input[name="password"]', "kebab-2026!")
    pg.click("button[type=submit]")
    pg.wait_for_selector(".ahead")
    pg.click('[data-tab="prodotti"]')
    pg.wait_for_selector(".cblock")

    # prezzo al volo
    first = pg.locator("input[data-price]").first
    first.fill("4,50")
    first.press("Enter")
    pg.wait_for_timeout(500)
    print("prezzo classiche:", pub()["categories"][0]["items"][0]["price_cents"])
    first.fill("abc")
    first.press("Enter")
    pg.wait_for_timeout(300)
    print("toast prezzo errato:", pg.text_content("#toast"))
    first.fill("4")
    first.press("Enter")
    pg.wait_for_timeout(400)

    # esaurito
    pg.locator(".avail").nth(1).click()
    pg.wait_for_timeout(400)
    print("würstel disponibile:", pub()["categories"][0]["items"][1]["available"])
    pg.screenshot(path=f"{OUT}/a_prodotti.png")
    pg.locator(".avail").nth(1).click()
    pg.wait_for_timeout(300)

    # modifica prodotto con variante e foto
    pg.locator(".irow__name", has_text="Kebacon").click()
    pg.wait_for_selector(".sheet[open]")
    pg.click("[data-addvar]")
    pg.locator('.vrow').last.locator('[name="v_label"]').fill("Doppio bacon")
    pg.locator('.vrow').last.locator('[name="v_price"]').fill("1")
    from PIL import Image
    Image.new("RGB", (1800, 1200), (180, 90, 30)).save("/tmp/foto.jpg")
    pg.set_input_files('.photo input[type=file]', "/tmp/foto.jpg")
    pg.wait_for_selector(".photo__prev img")
    pg.screenshot(path=f"{OUT}/a_sheet.png")
    pg.click('.sheet button[type="submit"]')
    pg.wait_for_selector(".sheet[open]", state="detached")
    keb = [i for c in pub()["categories"] for i in c["items"] if i["name"] == "Kebacon"][0]
    print("kebacon:", keb["variants"], keb["image_id"] is not None)
    img = urllib.request.urlopen(B + "/foto/" + keb["image_id"])
    print("foto:", img.headers["Content-Type"], len(img.read()), "byte")

    # componi: ingrediente con disegno
    pg.click('.seg [data-f="componi"]')
    pg.locator(".irow__name", has_text="Salsa BBQ").click()
    pg.wait_for_selector(".sheet[open] [data-visprev] svg")
    pg.screenshot(path=f"{OUT}/a_visual.png")
    pg.click(".sheet [data-close]")

    # del mese
    pg.click('[data-tab="mese"]')
    pg.wait_for_selector("#potm")
    pg.select_option('#potm select[name="item_id"]', label="Cinghialotto (Panini)")
    pg.fill('#potm input[name="period"]', "Ottobre")
    pg.click('#potm button[type="submit"]')
    pg.wait_for_timeout(500)
    print("del mese:", pub()["potm"]["title"], pub()["potm"]["period"])

    # QR
    pg.click('[data-tab="qr"]')
    pg.wait_for_selector(".qcard")
    pg.screenshot(path=f"{OUT}/a_qr.png", full_page=True)
    with pg.expect_download() as d:
        pg.locator('.qcard').first.locator('[data-qa="pngl"]').click()
    d.value.save_as(f"{OUT}/qr-label.png")
    pg.locator('.qcard').first.locator('[data-qa="edit"]').click()
    pg.wait_for_selector(".sheet[open]")
    pg.check('.sheet input[value="product"]')
    pg.select_option('.sheet select[name="product"]', label="BBK")
    pg.click('.sheet button[type="submit"]')
    pg.wait_for_selector(".sheet[open]", state="detached")
    r = urllib.request.Request(B + "/qr/panino-del-mese", method="GET")
    class NoRedir(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None
    try:
        urllib.request.build_opener(NoRedir).open(r)
    except urllib.error.HTTPError as e:
        print("QR del mese →", e.headers["Location"])

    # link
    pg.click('[data-tab="link"]')
    pg.wait_for_selector(".lrow")
    pg.screenshot(path=f"{OUT}/a_link.png")

    pg.click('[data-tab="altro"]')
    pg.wait_for_selector(".log")
    pg.screenshot(path=f"{OUT}/a_altro.png", full_page=True)

    # desktop
    pg.set_viewport_size({"width": 1280, "height": 860})
    pg.click('[data-tab="prodotti"]')
    pg.wait_for_timeout(300)
    pg.screenshot(path=f"{OUT}/a_desktop.png")
    b.close()

print("errori JS:", errors or "nessuno")
