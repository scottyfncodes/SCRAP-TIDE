"""P6 review deliverables, built with GITCRAFT tools from real in-game captures (screens/).
  PhotoCraft  -> before-after/*.psd|png   (labelled before/after composites)
  DesignCraft -> board/*.designcraft|pdf|png (Drowned World review board, 3 pages)
  FilmCraft   -> reel/*.fcproj|mp4           (portrait gallery reel)
  PdfCraft    -> TIDEBREAKERS_Drowned_World_review_pack.pdf
Run: python3 build_review.py [photocraft designcraft filmcraft pdfcraft]"""
import json, os, subprocess, sys, threading, queue, time
H = os.path.dirname(os.path.abspath(__file__))
SC = f"{H}/screens"
MCP = os.path.expanduser("~/.gitcraft/runtime/scripts/mcp.sh")
os.environ.setdefault("GITCRAFT_ROOT", "/home/user"); os.environ.setdefault("GITCRAFT_ROOTS", "/home/user")
LOG = []

class Client:
    def __init__(self, name):
        self.name = name
        self.p = subprocess.Popen([MCP, name], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
        self.q = queue.Queue(); self.i = 0
        threading.Thread(target=self._rd, daemon=True).start()
        self.req("initialize", {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "tb-review", "version": "1"}})
        self.p.stdin.write(b'{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
    def _rd(self):
        for l in self.p.stdout:
            try: self.q.put(json.loads(l))
            except Exception: pass
    def req(self, m, p=None, to=900):
        self.i += 1; i = self.i
        self.p.stdin.write((json.dumps({"jsonrpc": "2.0", "id": i, "method": m, "params": p or {}}) + "\n").encode())
        end = time.time() + to
        while True:
            msg = self.q.get(timeout=max(1, end - time.time()))
            if msg.get("id") == i:
                if "error" in msg: raise RuntimeError(msg["error"])
                return msg["result"]
    def call(self, tool, args=None):
        r = self.req("tools/call", {"name": tool, "arguments": args or {}})
        txt = "\n".join(c.get("text", "") for c in r.get("content", []) if c.get("type") == "text")
        LOG.append({"tool": self.name, "call": tool, "ok": not r.get("isError")})
        if r.get("isError"): raise RuntimeError(f"{self.name}.{tool}: {txt[:600]}")
        try: return json.loads(txt)
        except Exception: return txt
    def close(self):
        try: self.p.stdin.close(); self.p.wait(10)
        except Exception: self.p.kill()

PAIRS = [("title", "Title screen"), ("harbor", "Home port: Driftholm"), ("stump", "The first landmark"),
         ("hollow", "Rooftop Hollow (was open sea)"), ("boatfull", "The fully upgraded boat"), ("sunset", "Golden hour")]

def photocraft():
    c = Client("photocraft")
    run = lambda i, **p: c.call("command_run", {"id": i, "params": p})
    out = []
    for name, caption in PAIRS:
        c.call("doc_new", {"width": 860, "height": 1010, "background": "#06182e", "name": f"before_after_{name}"})
        run("type.create", x=430, y=50, text=caption.upper(), font="Nunito", size=26, color="#e9fbf6", align="center", name="caption")
        run("type.create", x=215, y=104, text="BEFORE · main", font="Nunito", size=20, color="#9aa9b4", align="center", name="label_before")
        run("type.create", x=645, y=104, text="AFTER · Drowned World", font="Nunito", size=20, color="#f2b825", align="center", name="label_after")
        c.call("doc_place", {"path": f"{SC}/before/{name}.png", "center": [215, 560]})
        c.call("doc_place", {"path": f"{SC}/after/{name}.png", "center": [645, 560]})
        c.call("doc_save", {"path": f"{H}/before-after/before_after_{name}.psd"})
        c.call("doc_save", {"path": f"{H}/before-after/before_after_{name}.png"})
        c.call("doc_close", {}) if True else None
        out.append(name)
        print("photocraft", name, flush=True)
    c.close()
    return out

def designcraft():
    c = Client("designcraft")
    ex = lambda cmd, **p: c.call("execute", {"command": cmd, "params": p})
    W, Hh = 900, 1200
    c.call("new_document", {"width": W, "height": Hh, "pages": 3, "intent": "web", "title": "TIDEBREAKERS Drowned World review board", "margins": 0, "facingPages": False})
    sw = {}
    for nm, hx in {"navy": "#06182E", "deep": "#0B3556", "foam": "#E9FBF6", "hazard": "#F2B825", "rust": "#A24B21", "slate": "#9AA9B4"}.items():
        r = ex("swatch.addColorTheme", colors=[hx], name=nm)
        s0 = r.get("swatches", [None])[0] if isinstance(r, dict) else None
        sw[nm] = s0 if isinstance(s0, str) else (s0 or {}).get("name", nm)
    def rect(page, x, y, w, h, fill):
        r = ex("frame.create", rect=[x, y, x + w, y + h], shape="rectangle", content="unassigned", spread=page)
        ex("object.fill", swatch=sw[fill], ids=[r["id"]]); ex("object.stroke", swatch="[None]", ids=[r["id"]])
    def text(page, x, y, w, h, t, size=16, color="foam", style="Black", align="left"):
        r = ex("frame.create", rect=[x, y, x + w, y + h], content="text", text=t, spread=page)
        c.call("execute", {"command": "selection.set", "params": {"ids": [r["id"]]}})
        ex("type.char", attrs={"fontFamily": "Nunito", "fontStyle": style, "size": size, "fill": sw[color]})
        ex("type.para", attrs={"align": align})
    def img(page, path, x, y, w):
        return c.call("place_image", {"path": path, "x": x, "y": y, "width": w, "spread": page})
    pages = [
        ("THE DROWNED WORLD", "In-game captures, iPhone viewport (390×844). Every structure is a GITCRAFT MeshCraft model.",
         ["meridian", "helios", "graveyard", "hollow", "storm", "night", "wall", "sunset"]),
        ("THE BOAT IS THE GAME", "Patchwork Skiff → Skiff with outboard, crane & crew → Scrap Trimaran → Ironwake Expedition Cat",
         ["prog1", "prog2", "prog3", "catfull"]),
        ("BEFORE / AFTER", "Left: main (pirate shallows). Right: this branch. Composites built in PhotoCraft.", None),
    ]
    for pi, (title, sub, shots) in enumerate(pages):
        rect(pi, 0, 0, W, Hh, "navy")
        rect(pi, 0, 0, W, 8, "hazard")
        text(pi, 40, 34, 820, 60, title, size=40, color="hazard")
        text(pi, 40, 96, 820, 40, sub, size=15, color="slate", style="Bold")
        if shots:
            cols = 4
            cw = (W - 80 - (cols - 1) * 12) / cols
            for i, s in enumerate(shots):
                x = 40 + (i % cols) * (cw + 12)
                y = 150 + (i // cols) * (cw * 844 / 390 + 52)
                img(pi, f"{SC}/after/{s}.png", x, y, cw)
                label = {"meridian": "Old Meridian", "helios": "Rig Helios", "graveyard": "Rustfang Graveyard", "hollow": "Rooftop Hollow", "storm": "Storm cell", "night": "Night in the Drift", "wall": "The Stormwall", "sunset": "Golden hour",
                         "prog1": "1 · Patchwork Skiff", "prog2": "2 · Outboard, crane, crew", "prog3": "3 · Scrap Trimaran", "catfull": "4 · Ironwake"}[s]
                text(pi, x, y + cw * 844 / 390 + 6, cw, 30, label, size=13, color="foam")
        else:
            for i, (name, cap) in enumerate(PAIRS[:4]):
                x = 40 + (i % 2) * 420
                y = 150 + (i // 2) * 500
                img(pi, f"{H}/before-after/before_after_{name}.png", x, y, 400)
        text(pi, 40, Hh - 40, 820, 24, "TIDEBREAKERS · Drowned World · built with GITCRAFT (MeshCraft, ForgeCraft, VectorCraft, PhotoCraft, DesignCraft, FilmCraft, PdfCraft)", size=10, color="slate", style="Bold")
    c.call("save_document", {"path": f"{H}/board/tidebreakers_drowned_board.designcraft"})
    for p in range(3):
        c.call("export_png", {"page": p, "path": f"{H}/board/board_p{p + 1}.png", "scale": 1.5})
    ex("file.exportPdf", path=f"{H}/board/tidebreakers_drowned_board.pdf")
    print("designcraft board done", flush=True)
    c.close()

def filmcraft():
    c = Client("filmcraft")
    run = lambda i, **p: c.call("command_run", {"id": i, "params": p})
    run("file.newProject")
    shots = ["title", "harbor", "stump", "prog2", "hollow", "meridian", "helios", "graveyard", "storm", "night", "wall", "catfull", "sunset"]
    paths = [f"{SC}/after/{s}.png" for s in shots]
    r = c.call("media_import", {"paths": paths}); items = r["items"]
    run("file.newSequence", name="Drowned World reel", width=1080, height=2340, fps=30)
    t = 0.0; clips = []
    for it in items:
        pr = run("timeline.place", item=it, track="V1", seconds=t, duration={"seconds": 2.4}, audio=False)
        clips.append(pr["clips"][0]); t += 2.4
    seq = c.call("sequence_inspect", {})
    for it in seq["video"][0]["items"]:
        a = run("effects.addKeyframe", clip=it["clip"], effect="motion", param="scale", time=it["start"])["mediaTime"]
        b = run("effects.addKeyframe", clip=it["clip"], effect="motion", param="scale", time=it["end"] - 8467200000)["mediaTime"]
        run("effects.setKeyframe", clip=it["clip"], effect="motion", param="scale", mediaTime=a, value=277.0)
        run("effects.setKeyframe", clip=it["clip"], effect="motion", param="scale", mediaTime=b, value=292.0)
    for cid in clips[1:]:
        run("sequence.applyVideoTransition", clip=cid, effect="cross_dissolve", frames=12, edge="in", align="center")
    run("file.saveAs", path=f"{H}/reel/drowned_world_reel.fcproj")
    r = run("file.exportMedia", path=f"{H}/reel/drowned_world_reel_1080x2340.mp4", format="h264", crf=22, wait=True, audio=False)
    print("filmcraft", json.dumps(r)[:300], flush=True)
    c.close()

def pdfcraft():
    c = Client("pdfcraft")
    parts = [f"{H}/board/tidebreakers_drowned_board.pdf"] + [f"{H}/before-after/before_after_{n}.png" for n, _ in PAIRS] + \
            [f"{H}/../3d-drowned/{a}/previews/tb_{a}_three_quarter.png" for a in ("oil_rig", "tower_glass", "tower_brick", "tower_spire", "settlement_kit", "boat_kit", "tanker_wreck", "raider_skiff")]
    parts = [p for p in parts if os.path.exists(p)]
    r = c.call("doc_combine", {"paths": parts, "out": f"{H}/TIDEBREAKERS_Drowned_World_review_pack.pdf"})
    info = c.call("doc_open", {"path": f"{H}/TIDEBREAKERS_Drowned_World_review_pack.pdf"})
    print("pdfcraft", json.dumps(r)[:200], json.dumps(info)[:200], flush=True)
    c.close()

if __name__ == "__main__":
    want = sys.argv[1:] or ["photocraft", "designcraft", "filmcraft", "pdfcraft"]
    for w in want:
        try: globals()[w]()
        except Exception as e: print("FAILED", w, str(e)[:800], flush=True)
    json.dump(LOG, open(f"{H}/review_calls.json", "w"), indent=0)
