"""TIDEBREAKERS Drowned World item icons, built in GITCRAFT VectorCraft (headless MCP).
Each icon is one 64x64 VectorCraft document; fills use two placeholder swatches (A=#FF00FE, B=#00FEFF)
that the game swaps for each item's own colours (src/ui/iconsDrowned.ts is generated from the exports).
Run: python3 build_icons_vc.py   (needs ~/.gitcraft/runtime/scripts/mcp.sh)"""
import json, os, subprocess, threading, queue, time, sys
HERE = os.path.dirname(os.path.abspath(__file__))
MCP = os.path.expanduser("~/.gitcraft/runtime/scripts/mcp.sh")
os.environ.setdefault("GITCRAFT_ROOT", "/home/user"); os.environ.setdefault("GITCRAFT_ROOTS", "/home/user")
A, B, INK, WHITE = "#FF00FE", "#00FEFF", "#1C2229", "#FFFFFF"

class Client:
    def __init__(self, name):
        self.p = subprocess.Popen([MCP, name], stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, bufsize=0)
        self.q = queue.Queue(); self.i = 0
        threading.Thread(target=self._rd, daemon=True).start()
        self.req("initialize", {"protocolVersion": "2025-06-18", "capabilities": {}, "clientInfo": {"name": "tb-icons", "version": "1"}})
        self.p.stdin.write(b'{"jsonrpc":"2.0","method":"notifications/initialized"}\n')
    def _rd(self):
        for l in self.p.stdout:
            try: self.q.put(json.loads(l))
            except Exception: pass
    def req(self, m, p=None, to=120):
        self.i += 1; i = self.i
        self.p.stdin.write((json.dumps({"jsonrpc": "2.0", "id": i, "method": m, "params": p or {}}) + "\n").encode())
        end = time.time() + to
        while True:
            msg = self.q.get(timeout=max(1, end - time.time()))
            if msg.get("id") == i:
                if "error" in msg: raise RuntimeError(msg["error"])
                return msg["result"]
    def call(self, tool, args):
        r = self.req("tools/call", {"name": tool, "arguments": args})
        txt = "\n".join(c.get("text", "") for c in r.get("content", []) if c.get("type") == "text")
        if r.get("isError"): raise RuntimeError(f"{tool}: {txt[:400]}")
        try: return json.loads(txt)
        except Exception: return txt

def P(d, fill=A, stroke="none", sw=None, op=None):
    a = {"d": d, "fill": fill, "stroke": stroke, "cap": "round", "join": "round"}
    if sw: a["strokeWidth"] = sw
    if op: a["opacity"] = op
    return ("draw_path", a)
def E(cx, cy, rx, ry, fill=A, stroke="none", sw=None):
    a = {"shape": "ellipse", "x": cx - rx, "y": cy - ry, "width": rx * 2, "height": ry * 2, "fill": fill, "stroke": stroke}
    if sw: a["strokeWidth"] = sw
    return ("draw_shape", a)
def R(x, y, w, h, fill=A, r=0, stroke="none", sw=None):
    a = {"shape": "rectangle", "x": x, "y": y, "width": w, "height": h, "radius": r, "fill": fill, "stroke": stroke}
    if sw: a["strokeWidth"] = sw
    return ("draw_shape", a)

ICONS = {
  "watch": [E(32, 34, 17, 17, B), E(32, 33, 14, 14, A), E(32, 33, 11, 11, WHITE), P("M32 24 L32 33 L38 37", "none", INK, 2.5), R(28, 10, 8, 8, B, 2), R(28, 48, 8, 8, B, 2)],
  "diamond": [P("M20 26 L28 16 H36 L44 26 L32 52 Z", A), P("M20 26 H44 L32 52 Z", B, op=55), P("M28 16 L32 26 L36 16", "none", WHITE, 1.5), E(32, 40, 18, 6, "none", B, 3)],
  "chart": [P("M10 14 L24 10 L40 14 L54 10 V48 L40 52 L24 48 L10 52 Z", A), P("M24 10 V48 M40 14 V52", "none", B, 1.5), P("M18 42 L26 30 L32 36 L44 18 L50 24", "none", B, 2.5), P("M41 15 L47 21 M47 15 L41 21", "none", "#C8352A", 3)],
  "record": [E(32, 32, 22, 22, A), E(32, 32, 17, 17, "none", "#3A4148", 1.2), E(32, 32, 12, 12, "none", "#3A4148", 1.2), E(32, 32, 7, 7, B), E(32, 32, 1.8, 1.8, WHITE), P("M18 22 Q24 14 34 13", "none", WHITE, 2, 40)],
  "photo": [R(12, 10, 40, 46, A, 2), R(16, 14, 32, 30, "#8CC9E8"), P("M16 34 Q28 28 48 34 V44 H16 Z", B), E(40, 22, 4, 4, "#F2B825"), P("M22 34 V28 M22 28 Q22 24 26 25", "none", "#3A4148", 1.5)],
  "badge": [P("M32 8 L48 14 V30 Q48 46 32 56 Q16 46 16 30 V14 Z", A), P("M32 14 L43 18 V30 Q43 41 32 49 Q21 41 21 30 V18 Z", B), E(32, 30, 6, 6, A), P("M32 20 V24 M32 36 V40 M22 30 H26 M38 30 H42", "none", A, 2)],
  "radio": [R(10, 22, 44, 30, A, 6), R(14, 26, 20, 22, "#3A4148", 3), E(24, 37, 7, 7, B), R(38, 27, 12, 6, WHITE, 1), E(42, 43, 4, 4, B), E(50, 43, 2.5, 2.5, B), P("M18 22 L44 8", "none", B, 2.5)],
  "sign": [R(30, 26, 4, 32, "#7F8A94"), R(8, 12, 48, 18, A, 3), R(10, 14, 44, 14, "none", 2, WHITE, 1.5), P("M16 21 H48", "none", B, 3)],
  "light": [R(22, 6, 20, 50, A, 5), E(32, 16, 6, 6, "#C8352A"), E(32, 31, 6, 6, B), E(32, 46, 6, 6, "#3E8C80"), P("M22 12 L16 14 M42 12 L48 14 M22 27 L16 29 M42 27 L48 29", "none", A, 3)],
  "shipbottle": [P("M22 12 H30 V20 Q46 22 46 38 V52 Q46 56 42 56 H14 Q10 56 10 52 V38 Q10 22 22 20 Z", A, op=70), R(23, 6, 10, 7, B, 2), P("M14 46 H42 L38 52 H18 Z", B), P("M28 46 V28 L38 40 H28", "none", WHITE, 1.5), P("M28 30 L20 42 H28", WHITE)],
  "seed": [R(14, 8, 36, 48, A, 3), R(14, 8, 36, 10, B, 3), E(32, 36, 10, 10, "#C8352A"), P("M32 26 Q36 20 40 22 Q36 26 32 26", "#3E8C80"), P("M18 50 H46", "none", B, 2)],
  "globe": [R(18, 46, 28, 10, B, 3), E(32, 30, 18, 18, A), P("M22 40 V30 H26 V24 H30 V40 M34 40 V28 H38 V34 H42 V40", "#3A4148"), E(26, 22, 1.5, 1.5, WHITE), E(36, 18, 1.5, 1.5, WHITE), E(40, 26, 1.2, 1.2, WHITE), E(24, 22, 5, 3, WHITE)],
  "duck": [E(30, 40, 18, 12, A), E(40, 24, 10, 10, A), P("M48 24 L58 27 L48 30 Z", B), E(43, 22, 1.8, 1.8, INK), P("M16 36 Q22 30 30 36", "none", B, 2)],
  "scrap": [P("M10 40 L20 22 L34 30 L46 16 L54 30 L44 48 L22 50 Z", A), P("M20 22 L22 50 M34 30 L44 48", "none", B, 2), E(26, 40, 2, 2, B), E(40, 30, 2, 2, B), P("M14 44 L24 46", "none", "#D2702F", 3)],
  "wire": [E(32, 32, 20, 20, "none", A, 7), E(32, 32, 12, 12, "none", A, 5), E(32, 32, 5, 5, B), P("M50 26 Q58 40 46 50", "none", A, 3)],
  "plastic": [R(14, 16, 24, 36, A, 8), R(20, 10, 12, 8, B, 2), P("M38 30 L54 38 L46 54 L32 48 Z", B), P("M18 24 V44", "none", WHITE, 2.5, 50)],
  "chip": [R(12, 14, 40, 36, A, 3), R(26, 24, 14, 14, "#1C2229", 2), P("M16 20 H24 V30 M48 22 H40 V28 M16 44 H22 L26 38 M48 42 H40", "none", B, 2), P("M18 10 V14 M26 10 V14 M34 10 V14 M42 10 V14 M18 50 V54 M26 50 V54 M34 50 V54 M42 50 V54", "none", B, 2.5)],
  "oil": [R(16, 12, 32, 42, A, 6), R(16, 22, 32, 4, B), R(16, 40, 32, 4, B), P("M28 30 Q32 22 36 30 Q36 36 32 36 Q28 36 28 30", B)],
  "fuel": [P("M14 18 H40 L50 28 V54 H14 Z", A), P("M40 18 L50 28 H40 Z", B), R(18, 10, 12, 8, B, 2), P("M22 34 L42 48 M42 34 L22 48", "none", B, 4)],
  "gear": [E(32, 32, 18, 18, A), E(32, 32, 7, 7, B)] + [R(29, 6, 6, 10, A) for _ in range(1)] + [R(29, 48, 6, 10, A), R(6, 29, 10, 6, A), R(48, 29, 10, 6, A), P("M14 14 L20 20 M50 14 L44 20 M14 50 L20 44 M50 50 L44 44", "none", A, 6)],
  "plate": [P("M10 20 L46 12 L54 42 L18 52 Z", A), P("M10 20 L46 12 L54 42 L18 52 Z", "none", B, 2)] + [E(x, y, 1.8, 1.8, B) for x, y in ((16, 22), (44, 16), (48, 40), (20, 47))],
  "patch": [R(10, 18, 44, 28, A, 4), P("M10 32 H54", "none", B, 3), P("M24 18 V46 M40 18 V46", "none", B, 2), P("M14 22 L20 28 M44 38 L50 44", "none", WHITE, 2)],
  "fish": [P("M8 32 Q24 14 44 26 L56 18 L54 32 L56 46 L44 38 Q24 50 8 32 Z", A), P("M20 28 Q28 32 20 36", "none", B, 2), E(16, 30, 2.2, 2.2, INK), P("M26 32 Q36 26 44 30", "none", B, 2)],
}

def main():
    c = Client("vectorcraft")
    made = []
    for name, ops in ICONS.items():
        c.call("command_run", {"id": "file.new", "params": {"width": 64, "height": 64, "units": "Pixels", "name": f"icon_{name}"}})
        for tool, a in ops:
            c.call(tool, a)
        c.call("save_file", {"path": f"{HERE}/source/icon_{name}.vectorcraft"})
        c.call("export", {"path": f"{HERE}/svg/icon_{name}.svg", "format": "svg"})
        c.call("export", {"path": f"{HERE}/svg/icon_{name}.png", "format": "png", "scale": 2})
        made.append(name)
        print("built", name, flush=True)
    json.dump({"tool": "GITCRAFT VectorCraft (headless MCP)", "icons": made, "placeholders": {"a": A, "b": B}}, open(f"{HERE}/icons.json", "w"), indent=1)

if __name__ == "__main__":
    main()
