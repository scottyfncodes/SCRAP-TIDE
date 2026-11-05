"""Diagrams for the World & Voyage Design Bible, drawn as plain SVG from the game's own data.

Every SVG is sized in points at the size it is placed on the page (1 unit = 1 pt), uses only flat fills and strokes
(DesignCraft's edit.pasteSvg brings them in as native vector paths, text outlined) and the TIDEBREAKERS survivor
palette from src/ui/styles.css. Coordinates for the world chart come from src/data/world.ts at commit 5766ca5.

  python3 creative/design-bible/source/art.py      -> creative/design-bible/art/diagrams/*.svg
"""
import math
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import content as C  # noqa: E402

OUT = os.path.join(os.path.dirname(__file__), '..', 'art', 'diagrams')

P = dict(oil='#0d1113', steel='#1b2225', steel2='#283135', steel3='#3a4549', bone='#d9d2bf', bone2='#c8c0aa',
         dim='#9a9381', paper='#d6cdb4', paper2='#c4b99c', edge='#8c8068', ink='#1a1a17', soft='#4d4a40',
         rust='#a3481e', rustdk='#5c260f', copper='#4f9484', copperdk='#23463f', hazard='#d6a62a', hazarddk='#6e5210',
         red='#c5371f', living='#57e05f', sea='#24323a', sea2='#2d4048', storm='#3c4a5c')
COND = "font-family=\"Barlow Condensed\" font-weight=\"700\""
COND8 = "font-family=\"Barlow Condensed\" font-weight=\"800\""
BODY = "font-family=\"Barlow\" font-weight=\"500\""
BODYB = "font-family=\"Barlow\" font-weight=\"700\""
MONO = "font-family=\"Share Tech Mono\""
STEN = "font-family=\"Saira Stencil One\""


def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'


def t(x, y, s, size=10, fill=P['bone'], font=COND, anchor='start', extra=''):
    return f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" fill="{fill}" {font} text-anchor="{anchor}" {extra}>{esc(s)}</text>'


def rect(x, y, w, h, fill='none', stroke='none', sw=1, rx=0, extra=''):
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def circ(x, y, r, fill='none', stroke='none', sw=1, extra=''):
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r:.1f}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def line(x1, y1, x2, y2, stroke=P['bone'], sw=1, extra=''):
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def poly(pts, fill='none', stroke='none', sw=1, extra=''):
    return f'<polygon points="{" ".join(f"{x:.1f},{y:.1f}" for x, y in pts)}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def path(d, fill='none', stroke='none', sw=1, extra=''):
    return f'<path d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" {extra}/>'


def arrow(x1, y1, x2, y2, col, sw=1.6, head=6):
    a = math.atan2(y2 - y1, x2 - x1)
    hx, hy = x2 - head * math.cos(a), y2 - head * math.sin(a)
    left = (hx + head * 0.55 * math.cos(a + math.pi / 2), hy + head * 0.55 * math.sin(a + math.pi / 2))
    right = (hx + head * 0.55 * math.cos(a - math.pi / 2), hy + head * 0.55 * math.sin(a - math.pi / 2))
    return line(x1, y1, hx, hy, col, sw) + poly([(x2, y2), left, right], col)


def chamfer(x, y, w, h, c=7, fill=P['steel'], stroke='none', sw=1):
    return poly([(x + c, y), (x + w, y), (x + w, y + h - c), (x + w - c, y + h), (x, y + h), (x, y + c)], fill, stroke, sw)


def wrap(s, n):
    words, lines, cur = s.split(), [], ''
    for w in words:
        if len(cur) + len(w) + 1 > n and cur:
            lines.append(cur)
            cur = w
        else:
            cur = (cur + ' ' + w).strip()
    if cur:
        lines.append(cur)
    return lines


BG = {'score_bars': '#c4b99c', 'world_legend': '#d6cdb4', 'ladder': '#d6cdb4', 'matrix': '#d6cdb4', 'lines_chart': '#d6cdb4',
      'world_loop': '#d6cdb4'}


def save(name, s):
    """Every SVG gets a full-canvas backing rect (its own panel colour, or the page paper): DesignCraft centres pasted
    art on its content bounds, so this makes the bounds equal the canvas and placement exact."""
    if name in BG:
        m = s.index('>') + 1
        w, h = re.search(r'width="([\d.]+)(?:pt)?" height="([\d.]+)(?:pt)?"', s).groups()
        s = s[:m] + f'<rect x="0" y="0" width="{w}" height="{h}" fill="{BG[name]}"/>' + s[m:]
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name + '.svg'), 'w') as f:
        f.write(s)


# ───────────────────────────────────────────── world chart (real coordinates from src/data/world.ts)
ISL = [('Driftholm', 0, 320, 112), ('Turtle Atoll', -150, 70, 40), ('Lantern Rock', 175, 10, 32), ('Gull Shoal', 40, -175, 22),
       ('Canopy Rise', -330, -320, 58)]
SETT = [('Driftholm', 6, 168), ('Rooftop Hollow', -228, -48), ('Rig Helios', -540, 170)]
SALV = [('Sunken Tower', 92, 150), ('Box Yard', 216, -120), ('Hollow Underfloors', -250, -88), ('Meridian Plaza', 500, -440),
        ('Broadcast Spire', 570, -480), ('Leaning Block', 460, -500), ('Helios Lower Deck', -555, 150), ('Meridian Star', 270, 650),
        ('Graveyard Boxes', 280, 620), ('Meridian Spire', -210, -1040)]
OUTP = [('Gullstep', 110, 70), ('Tin Can Rest', -120, -110), ('Last Call', -400, 20), ('Rustfang Hold', 350, 625), ('Stripping Yard', 54, -54),
        ('Going Under', -60, 40)]
CAST = [('Kai', -60, -150), ('Bram', 455, -390)]
RAID = [(270, 640, 230), (520, -450, 200)]
NEW_NW = [('Bell Buoy', -430, -150), ('Drowned Billboard', -170, -250), ('Lashed Shrine', -500, -420)]
CAVES = [('cave', -150 - 2, 70 - 11), ('cave', 175 - 12, 10 + 10), ('cave', -330 - 4, -320 - 22)]
REDFINCH = [(-150, 70), (-330, -320), (175, 10), (570, -480), (350, 625), (-210, -1040)]


def world_chart(W=470, H=540):
    x0, x1, z0, z1 = -935, 935, -1110, 945
    s = min((W - 20) / (x1 - x0), (H - 40) / (z1 - z0))
    ox = 10 + ((W - 20) - (x1 - x0) * s) / 2
    oy = 30

    def X(x):
        return ox + (x - x0) * s

    def Y(z):
        return oy + (z - z0) * s
    b = [rect(0, 0, W, H, P['sea'])]
    # region rings: Stormwall (r 900 from the origin), the open swell edge (r 365 around the shallows centre)
    b.append(circ(X(0), Y(0), 900 * s, 'none', P['storm'], 26 * s * 3, 'opacity="0.9"'))
    b.append(circ(X(0), Y(0), 900 * s, 'none', P['dim'], 0.8, 'stroke-dasharray="3 3"'))
    b.append(circ(X(0), Y(30), 365 * s, P['sea2'], P['copper'], 1.0, 'stroke-dasharray="5 3"'))
    # grid
    for gx in range(-600, 701, 200):
        b.append(line(X(gx), 22, X(gx), H - 4, P['steel3'], 0.4))
    for gz in range(-1000, 801, 200):
        b.append(line(4, Y(gz), W - 4, Y(gz), P['steel3'], 0.4))
    # raider zones
    for x, z, r in RAID:
        b.append(circ(X(x), Y(z), r * s, 'none', P['red'], 1.0, 'stroke-dasharray="2 2"'))
    # redfinch line
    d = 'M ' + ' L '.join(f'{X(x):.1f} {Y(z):.1f}' for x, z in REDFINCH)
    b.append(path(d, 'none', P['hazard'], 1.6, 'stroke-dasharray="6 3"'))
    for i, (x, z) in enumerate(REDFINCH):
        b.append(circ(X(x), Y(z), 6.5, P['hazard'], P['ink'], 1))
        b.append(t(X(x), Y(z) + 3, str(i + 1), 8, P['ink'], COND8, 'middle'))
    # islands
    for n, x, z, r in ISL:
        b.append(circ(X(x), Y(z), max(r * s, 3), P['edge'], P['bone2'], 0.8))
    # salvage, outposts, settlements, castaways
    for n, x, z in SALV:
        cx, cy = X(x), Y(z)
        b.append(poly([(cx, cy - 4), (cx + 4, cy), (cx, cy + 4), (cx - 4, cy)], P['rust'], P['bone'], 0.6))
    for n, x, z in OUTP:
        b.append(rect(X(x) - 2.5, Y(z) - 2.5, 5, 5, P['steel3'], P['bone2'], 0.6))
    for n, x, z in SETT:
        b.append(rect(X(x) - 4.5, Y(z) - 4.5, 9, 9, P['bone'], P['ink'], 1))
    for n, x, z in CAST:
        b.append(circ(X(x), Y(z), 3.5, P['copper'], P['bone'], 0.8))
    for n, x, z in NEW_NW:
        b.append(circ(X(x), Y(z), 4, 'none', P['hazard'], 1.2, 'stroke-dasharray="2 1.5"'))
    for n, x, z in CAVES:
        b.append(path(f'M {X(x)-5:.1f} {Y(z)+3:.1f} Q {X(x):.1f} {Y(z)-7:.1f} {X(x)+5:.1f} {Y(z)+3:.1f} Z', P['oil'], P['hazard'], 0.9))
    # labels
    L = [('DRIFTHOLM', 0, 320, 0, 16, 9), ('Turtle Atoll', -150, 70, 0, 22, 7.5), ('Lantern Rock', 175, 10, 8, 3, 7.5),
         ('Gull Shoal · the Wren', 40, -175, 8, 3, 7.5), ('Canopy Rise', -330, -320, 12, 3, 7.5), ('Rooftop Hollow', -228, -48, -8, -6, 7.5),
         ('RIG HELIOS', -540, 170, 0, 14, 8.5), ('OLD MERIDIAN', 500, -440, 0, -24, 8.5), ('Rustfang Hold', 350, 625, 8, 3, 7.5),
         ('Meridian Star', 270, 650, -8, 14, 7.5), ('MERIDIAN SPIRE', -210, -1040, 12, 3, 8.5), ('Sunken Tower', 92, 150, 8, 3, 7),
         ('Box Yard', 216, -120, 8, 3, 7), ('Going Under', -60, 40, 10, 3, 7), ('Kai', -60, -150, 6, -4, 7), ('Bram', 455, -390, -8, -2, 7)]
    for n, x, z, dx, dy, sz in L:
        anchor = 'middle' if dx == 0 else ('start' if dx > 0 else 'end')
        b.append(t(X(x) + dx, Y(z) + dy, n, sz, P['bone'], COND, anchor))
    b.append(t(X(0), Y(-900) - 6, 'THE STORMWALL', 9, P['bone2'], COND8, 'middle', 'letter-spacing="2"'))
    b.append(t(X(-300), Y(330), 'THE DRIFT', 8, P['copper'], COND8, 'middle', 'letter-spacing="2"'))
    b.append(t(X(560), Y(120), 'THE SUNKEN REACH', 8, P['dim'], COND8, 'middle', 'letter-spacing="2"'))
    # header + north arrow + scale
    b.append(rect(0, 0, W, 20, P['steel']))
    b.append(t(8, 14, 'WORLD CHART · src/data/world.ts · north up (−z)', 9, P['bone'], MONO))
    b.append(arrow(W - 18, 56, W - 18, 32, P['bone'], 1.4, 7) + t(W - 18, 66, 'N', 8, P['bone'], COND8, 'middle'))
    b.append(line(12, H - 12, 12 + 200 * s, H - 12, P['bone'], 1.5) + t(12, H - 16, '200 m', 7, P['bone'], MONO))
    return svg(W, H, ''.join(b))


def world_legend(W=230, H=170):
    rows = [
        ('settle', 'Settlement with services (3)'), ('salv', 'Salvage site (10)'), ('outp', 'Outpost, set dressing only (6)'),
        ('isl', 'Walkable island (5)'), ('cast', 'Castaway: crew to rescue (2)'), ('raid', 'Rustfang raider zone (2)'),
        ('red', 'PROPOSED Redfinch Line, maps 1–6'), ('nw', 'PROPOSED north-west discovery (3)'), ('cave', 'PROPOSED sea-cave mouth (3)'),
    ]
    b = []
    for i, (k, lab) in enumerate(rows):
        y = 10 + i * 17
        cx, cy = 9, y
        if k == 'settle':
            b.append(rect(cx - 4.5, cy - 4.5, 9, 9, P['bone'], P['ink'], 1))
        elif k == 'salv':
            b.append(poly([(cx, cy - 4.5), (cx + 4.5, cy), (cx, cy + 4.5), (cx - 4.5, cy)], P['rust'], P['ink'], 0.6))
        elif k == 'outp':
            b.append(rect(cx - 3, cy - 3, 6, 6, P['steel3'], P['ink'], 0.6))
        elif k == 'isl':
            b.append(circ(cx, cy, 5, P['edge'], P['ink'], 0.6))
        elif k == 'cast':
            b.append(circ(cx, cy, 4, P['copper'], P['ink'], 0.6))
        elif k == 'raid':
            b.append(circ(cx, cy, 5, 'none', P['red'], 1.2, 'stroke-dasharray="2 2"'))
        elif k == 'red':
            b.append(line(1, cy, 17, cy, P['hazard'], 1.6, 'stroke-dasharray="5 2"') + circ(cx, cy, 4.5, P['hazard'], P['ink'], 0.8))
        elif k == 'nw':
            b.append(circ(cx, cy, 4.5, 'none', P['hazarddk'], 1.4, 'stroke-dasharray="2 1.5"'))
        elif k == 'cave':
            b.append(path(f'M {cx-5} {cy+3} Q {cx} {cy-7} {cx+5} {cy+3} Z', P['oil'], P['hazarddk'], 0.9))
        b.append(t(24, y + 3.5, lab, 9, P['ink'], COND))
    return svg(W, H, ''.join(b))


# ───────────────────────────────────────────── the one-world loop
def world_loop(W=330, H=300):
    cx, cy, R = W / 2, H / 2 + 4, 108
    n = len(C.WORLD_LOOP['loop'])
    b = [circ(cx, cy, R, 'none', P['edge'], 1.2, 'stroke-dasharray="3 4"')]
    pts = []
    for i in range(n):
        a = -math.pi / 2 + i * 2 * math.pi / n
        pts.append((cx + R * math.cos(a), cy + R * math.sin(a)))
    for i in range(n):
        (x1, y1), (x2, y2) = pts[i], pts[(i + 1) % n]
        a = math.atan2(y2 - y1, x2 - x1)
        b.append(arrow(x1 + 40 * math.cos(a), y1 + 40 * math.sin(a), x2 - 42 * math.cos(a), y2 - 42 * math.sin(a), P['rust'], 2, 8))
    cols = [P['hazard'], P['copper'], P['bone'], P['hazard'], P['copper'], P['bone']]
    for i, ((x, y), (k, a, ex)) in enumerate(zip(pts, C.WORLD_LOOP['loop'])):
        b.append(chamfer(x - 46, y - 24, 92, 48, 7, P['steel'], cols[i], 1.2))
        b.append(t(x, y - 6, k, 12, cols[i], COND8, 'middle', 'letter-spacing="1"'))
        for j, ln in enumerate(wrap(a, 24)[:2]):
            b.append(t(x, y + 6 + j * 9, ln, 7.5, P['bone'], BODY, 'middle'))
    b.append(t(cx, cy - 6, 'ONE', 20, P['ink'], STEN, 'middle'))
    b.append(t(cx, cy + 16, 'WORLD', 20, P['ink'], STEN, 'middle'))
    return svg(W, H, ''.join(b))


# ───────────────────────────────────────────── DESIGNCRAFT score bars
def score_bars(W=330, H=190):
    b = []
    rows = C.DIAGNOSIS['score']
    for i, (lab, v, mx) in enumerate(rows):
        y = 8 + i * 22
        b.append(t(0, y + 11, lab, 9.5, P['ink'], COND))
        bx, bw = 112, 150
        b.append(rect(bx, y + 2, bw, 12, P['paper2']))
        b.append(rect(bx, y + 2, bw * v / mx, 12, P['rust'] if v / mx < 0.34 else (P['hazard'] if v / mx < 0.67 else P['copper'])))
        b.append(t(bx + bw + 6, y + 12, f'{v:g} / {mx}', 9, P['ink'], MONO))
    b.append(t(0, H - 4, 'DESIGNCRAFT 1.0 · method d98e718b8f0c · 25 / 100 · ceiling 85 · coverage 40%', 7.5, P['soft'], MONO))
    return svg(W, H, ''.join(b))


# ───────────────────────────────────────────── cast web
GROUPS = {'Driftholm': ['pip', 'marlo', 'wren', 'odessa', 'juno'], 'Rooftop Hollow': ['sal', 'nori', 'tomas'],
          'Rig Helios': ['dace', 'vik', 'mara', 'ines'], 'Adrift': ['kai', 'bram']}


def cast_web(W=500, H=330):
    by = {c['id']: c for c in C.CAST}
    centres = {'Driftholm': (128, 112), 'Rooftop Hollow': (395, 94), 'Rig Helios': (372, 246), 'Adrift': (118, 262)}
    pos = {}
    for g, ids in GROUPS.items():
        gx, gy = centres[g]
        r = 50 if len(ids) > 3 else 40
        for i, cid in enumerate(ids):
            a = -math.pi / 2 + i * 2 * math.pi / len(ids) + (0.3 if g == 'Adrift' else 0)
            pos[cid] = (gx + r * math.cos(a) * 1.3, gy - 8 + r * math.sin(a) * 0.9)
    b = []
    for g, (gx, gy) in centres.items():
        rr = 88 if len(GROUPS[g]) > 3 else 70
        b.append(f'<ellipse cx="{gx}" cy="{gy}" rx="{rr * 1.18:.0f}" ry="{rr * 0.86:.0f}" fill="{P["steel2"]}" stroke="{P["steel3"]}" stroke-width="1"/>')
        b.append(t(gx - rr * 1.18 + 10, gy - rr * 0.86 - 4, g.upper(), 8.5, P['bone2'], COND8, 'start', 'letter-spacing="1.5"'))
    for a, c2, lab in C.CAST_RELATIONS:
        (x1, y1), (x2, y2) = pos[a], pos[c2]
        b.append(line(x1, y1, x2, y2, P['hazard'], 1.2, 'stroke-dasharray="4 2"'))
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        w = len(lab) * 3.9 + 8
        b.append(rect(mx - w / 2, my - 6, w, 11, P['oil'], rx=2))
        b.append(t(mx, my + 2.5, lab, 7, P['hazard'], COND, 'middle'))
    for cid, (x, y) in pos.items():
        c = by[cid]
        b.append(circ(x, y, 15, c['color'], P['oil'], 2))
        b.append(t(x, y + 4.5, c['name'][0] if cid != 'wren' else 'W', 13, P['oil'], STEN, 'middle'))
        nm = {'wren': 'Old Wren', 'sal': 'Old Sal', 'dace': 'Dace'}.get(cid, c['name'].split(' ')[0])
        b.append(t(x, y + 26, nm, 8.5, P['bone'], COND8, 'middle'))
    b.append(t(W - 6, H - 6, 'ring colour = character colour in src/ui/ui.ts:92 and crew.ts ROLE_INFO', 7, P['dim'], MONO, 'end'))
    return svg(W, H, rect(0, 0, W, H, P['steel']) + ''.join(b))


def lines_chart(W=500, H=150):
    b = []
    n = len(C.CAST)
    bw = (W - 20) / n
    mx = 15
    for i, c in enumerate(C.CAST):
        x = 10 + i * bw
        now = c['lines_now']
        new = len(c['new_lines'])
        beats = len(c['arc'])
        sc = (H - 50) / mx
        base = H - 30
        b.append(rect(x + 4, base - now * sc, bw - 8, now * sc, P['rust']))
        b.append(rect(x + 4, base - (now + new) * sc, bw - 8, new * sc, P['hazard']))
        b.append(rect(x + 4, base - (now + new + beats) * sc, bw - 8, beats * sc, P['copper']))
        b.append(t(x + bw / 2, base + 11, {'wren': 'Wren', 'sal': 'Sal', 'dace': 'Dace'}.get(c['id'], c['name'].split(' ')[0]), 7.5, P['ink'], COND, 'middle'))
        b.append(t(x + bw / 2, base - (now + new + beats) * sc - 3, str(now + new + beats), 7.5, P['ink'], MONO, 'middle'))
    six = H - 30 - 6 * (H - 50) / mx
    b.append(line(6, six, W - 4, six, P['ink'], 0.8, 'stroke-dasharray="3 2"') + t(W - 4, H - 3, 'dashed line: target of 6', 7.5, P['ink'], MONO, 'end'))
    lg = [(P['rust'], 'lines in code today'), (P['hazard'], 'new lines in this bible'), (P['copper'], 'arc beats')]
    for i, (col, lab) in enumerate(lg):
        b.append(rect(10 + i * 150, H - 10, 9, 8, col) + t(23 + i * 150, H - 3, lab, 8, P['ink'], COND))
    return svg(W, H, ''.join(b))


def arc_grid(W=500, H=310):
    regions = ['Drift', 'Reach', 'Stormwall']
    b = [rect(0, 0, W, H, P['steel'])]
    lx, top, rowh = 92, 26, (H - 34) / len(C.CAST)
    colw = (W - lx - 10) / 3
    for j, r in enumerate(regions):
        b.append(rect(lx + j * colw + 2, 4, colw - 4, 16, P['steel2']))
        b.append(t(lx + j * colw + colw / 2, 15.5, r.upper(), 9, P['bone'], COND8, 'middle', 'letter-spacing="1.5"'))
    for i, c in enumerate(C.CAST):
        y = top + i * rowh + rowh / 2
        if i % 2 == 0:
            b.append(rect(0, top + i * rowh, W, rowh, P['steel2'], extra='opacity="0.5"'))
        b.append(circ(10, y, 4.5, c['color']))
        b.append(t(20, y + 3.2, c['name'], 8.5, P['bone'], COND))
        counts = {}
        for k, (reg, txt) in enumerate(c['arc']):
            j = regions.index(reg)
            n = counts.get(j, 0)
            counts[j] = n + 1
            x = lx + j * colw + 12 + n * 14
            b.append(circ(x, y, 5, c['color'], P['oil'], 1) + t(x, y + 2.8, str(k + 1), 7, P['oil'], COND8, 'middle'))
        for j, reg in enumerate(regions):
            beats = [txt for r2, txt in c['arc'] if r2 == reg]
            if not beats:
                continue
            short = beats[0].split('.')[0].split(':')[0]
            room = int((colw - 14 - 14 * len(beats)) / 3.3)
            short = short if len(short) <= room else short[:room - 1] + '…'
            b.append(t(lx + j * colw + 7 + 14 * len(beats), y + 2.8, short, 6.8, P['bone2'], BODY))
    return svg(W, H, ''.join(b))


# ───────────────────────────────────────────── first voyage
KIND_COL = {'move': P['copper'], 'travel': P['copper'], 'boat': P['copper'], 'mode': P['copper'], 'explore': P['hazard'],
            'puzzle': P['hazard'], 'menu': P['rust'], 'shop': P['rust'], 'end': P['bone']}
INTENSITY = {'steer': 1, 'leave_dock': 1, 'reach_turtle': 2, 'anchor': 1, 'ashore': 2, 'find_bottle': 3, 'read_map': 1, 'dig_x': 4,
             'return_harbor': 1, 'sell': 2, 'catalog': 1, 'upgrade': 3, 'free': 2}


def voyage_now(W=700, H=210):
    steps = C.VOYAGE_NOW
    n = len(steps)
    cw = (W - 20) / n
    b = [rect(0, 0, W, H, P['steel'])]
    # intensity curve (inferred)
    pts = []
    for i, (sid, *_r) in enumerate(steps):
        pts.append((10 + i * cw + cw / 2, 92 - INTENSITY[sid] * 15))
    b.append(t(10, 16, 'INFERRED INTENSITY (1–4)', 8, P['dim'], MONO))
    b.append(path('M ' + ' L '.join(f'{x:.1f} {y:.1f}' for x, y in pts), 'none', P['hazard'], 2))
    for x, y in pts:
        b.append(circ(x, y, 3, P['hazard']))
    for i, (sid, txt, kind, note) in enumerate(steps):
        x = 10 + i * cw
        col = KIND_COL[kind]
        b.append(chamfer(x + 2, 104, cw - 4, 62, 6, P['steel2'], col, 1.2))
        b.append(t(x + cw / 2, 118, f'{i + 1:02d}', 11, col, STEN, 'middle'))
        for j, ln in enumerate(wrap(txt, 13)[:3]):
            b.append(t(x + cw / 2, 131 + j * 9, ln, 7.4, P['bone'], COND, 'middle'))
        b.append(rect(x + 6, 170, cw - 12, 12, col, rx=2))
        b.append(t(x + cw / 2, 179, kind.upper(), 7, P['oil'], COND8, 'middle'))
        b.append(t(x + cw / 2, 195, sid, 6.4, P['dim'], MONO, 'middle'))
    lg = [(P['copper'], 'sailing / boat'), (P['hazard'], 'explore / puzzle'), (P['rust'], 'menu / shop')]
    for i, (col, lab) in enumerate(lg):
        b.append(rect(W - 330 + i * 110, 8, 9, 9, col) + t(W - 317 + i * 110, 16, lab, 8.5, P['bone'], COND))
    # brackets for problems
    b.append(line(10 + 6 * cw + 4, 100, 10 + 7 * cw - 4, 100, P['red'], 2))
    b.append(line(10 + 9 * cw + 4, 100, 10 + 12 * cw - 4, 100, P['red'], 2))
    b.append(t(10 + 10.5 * cw, 97, '3 menu/shop steps in a row', 7.5, P['red'], COND8, 'middle'))
    b.append(t(10 + 8.5 * cw, 44, 'dead leg ~300 m', 7.5, P['bone2'], COND, 'middle'))
    return svg(W, H, ''.join(b))


def voyage_compare(W=700, H=240):
    lanes = [('CONSERVATIVE', P['copper'], C.VOYAGE_PROPOSALS['conservative']['steps']),
             ('AMBITIOUS', P['hazard'], C.VOYAGE_PROPOSALS['ambitious']['steps']),
             ('WILD CARD', P['red'], C.VOYAGE_PROPOSALS['wild']['steps'])]
    b = [rect(0, 0, W, H, P['steel'])]
    lh = (H - 10) / 3
    for i, (lab, col, steps) in enumerate(lanes):
        y = 5 + i * lh
        b.append(rect(4, y + 2, 82, lh - 4, P['steel2']))
        b.append(t(45, y + lh / 2 - 2, lab, 9.5, col, COND8, 'middle'))
        b.append(t(45, y + lh / 2 + 10, f'{len(steps)} steps', 8, P['bone2'], MONO, 'middle'))
        n = len(steps)
        cw = (W - 96) / n
        for j, st in enumerate(steps):
            x = 92 + j * cw
            b.append(chamfer(x + 2, y + 4, cw - 4, lh - 8, 5, P['oil'], col, 1))
            b.append(t(x + 8, y + 15, f'{j + 1}', 9, col, STEN))
            nn = max(10, int((cw - 10) / 3.4))
            for k, ln in enumerate(wrap(st, nn)[:7]):
                b.append(t(x + 7, y + 27 + k * 8.3, ln, 6.9, P['bone'], BODY))
            if j < n - 1:
                b.append(arrow(x + cw - 3, y + lh / 2, x + cw + 3, y + lh / 2, col, 1, 4))
    return svg(W, H, ''.join(b))


# ───────────────────────────────────────────── progression
def ladder(W=330, H=230):
    b = []
    rows = [('Patchwork Skiff', 0, 'Scavenger'), ('Scrap Trimaran', 420, 'Rover'), ('Ironwake', 1400, 'Tidebreaker')]
    rows2 = [('Patchwork Skiff', 0, 'Scavenger'), ('Scrap Trimaran', 420, 'Rover'), ('Salt Brig (new)', 800, 'Corsair'), ('Ironwake', 1400, 'Tidebreaker')]
    mx = 1400
    bx, bw = 100, 160

    def block(rows, y0, title, col):
        out = [t(0, y0, title, 9.5, P['ink'], COND8)]
        for i, (n, g, rank) in enumerate(rows):
            y = y0 + 8 + i * 19
            out.append(t(0, y + 11, n, 9, P['ink'], COND))
            out.append(rect(bx, y + 2, bw, 12, P['paper2']))
            out.append(rect(bx, y + 2, max(2, bw * g / mx), 12, col))
            out.append(t(bx + bw + 5, y + 12, f'{g:,}g' if g else 'start', 8.5, P['ink'], MONO))
            if i:
                ratio = g / rows[i - 1][1] if rows[i - 1][1] else 0
                if ratio:
                    out.append(t(W, y + 12, f'×{ratio:.1f}', 8.5, P['red'] if ratio > 2 else P['copperdk'], MONO, 'end'))
        return out
    b += block(rows, 10, 'TODAY: 3 hulls', P['rust'])
    b += block(rows2, 104, 'AMBITIOUS: 4 hulls (Salt Brig)', P['copper'])
    return svg(W, H, ''.join(b))


def rank_track(W=700, H=120):
    b = [rect(0, 0, W, H, P['steel'])]
    n = len(C.PROGRESSION['ranks'])
    cw = (W - 20) / n
    for i, (rank, hull, where, look) in enumerate(C.PROGRESSION['ranks']):
        x = 10 + i * cw
        col = [P['bone2'], P['copper'], P['hazard'], P['red']][i]
        new = 'new' in hull
        b.append(chamfer(x + 4, 12, cw - 8, H - 24, 8, P['steel2'], col, 1.6 if not new else 1.2))
        if new:
            b.append(rect(x + cw - 64, 18, 52, 13, P['hazard'], rx=2) + t(x + cw - 38, 27.5, 'PROPOSED', 7.5, P['oil'], COND8, 'middle'))
        b.append(t(x + 16, 40, rank.upper(), 17, col, STEN))
        b.append(t(x + 16, 58, hull, 10, P['bone'], COND8))
        b.append(t(x + 16, 72, where, 8.5, P['bone2'], COND))
        for j, ln in enumerate(wrap(look, 34)[:2]):
            b.append(t(x + 16, 88 + j * 10, ln, 8, P['dim'], BODY))
        if i < n - 1:
            b.append(arrow(x + cw - 6, H / 2, x + cw + 8, H / 2, P['bone'], 1.4, 6))
    return svg(W, H, ''.join(b))


def upgrade_keys(W=470, H=250):
    b = [rect(0, 0, W, H, P['steel'])]
    rows = C.UPGRADE_KEYS
    rh = (H - 26) / len(rows)
    b.append(t(10, 15, 'UPGRADE / HULL', 8, P['dim'], COND8, extra='letter-spacing="1"'))
    b.append(t(170, 15, 'OPENS', 8, P['dim'], COND8, extra='letter-spacing="1"'))
    b.append(t(340, 15, 'PERSON · PAYOFF', 8, P['dim'], COND8, extra='letter-spacing="1"'))
    for i, (u, opens, who, what) in enumerate(rows):
        y = 22 + i * rh
        if i % 2 == 0:
            b.append(rect(0, y, W, rh, P['steel2']))
        proposed = '(new)' in opens
        b.append(t(10, y + rh / 2 + 3.5, u, 9.5, P['hazard'], COND8))
        b.append(arrow(128, y + rh / 2, 162, y + rh / 2, P['bone2'], 1, 5))
        b.append(t(170, y + rh / 2 + 3.5, opens, 8.8, P['bone'] if not proposed else P['hazard'], COND))
        b.append(t(340, y + rh / 2 - 1, who, 8.5, P['bone'], COND8))
        b.append(t(340, y + rh / 2 + 8, what, 7.3, P['bone2'], BODY))
    return svg(W, H, ''.join(b))


def redfinch_line(W=700, H=150):
    b = [rect(0, 0, W, H, P['steel'])]
    maps = C.TREASURE['maps']
    n = len(maps)
    cw = (W - 20) / n
    b.append(path(f'M 20 {H/2:.0f} ' + ' '.join(f'Q {10 + i * cw + cw/2:.0f} {H/2 + (14 if i % 2 else -14):.0f} {10 + (i + 1) * cw:.0f} {H/2:.0f}' for i in range(n - 1)),
                  'none', P['edge'], 3, 'stroke-dasharray="1 4" stroke-linecap="round"'))
    for i, (num, name, state, where, needs, prize) in enumerate(maps):
        x = 10 + i * cw
        ex = state == 'EXISTS'
        col = P['bone'] if ex else P['hazard']
        b.append(chamfer(x + 5, 10, cw - 10, H - 20, 8, P['paper'] if ex else P['oil'], col, 1.4))
        tc = P['ink'] if ex else P['bone']
        b.append(t(x + 15, 34, num, 20, P['rust'] if ex else P['hazard'], STEN))
        b.append(rect(x + cw - 60, 18, 46, 12, P['copperdk'] if ex else P['hazard'], rx=2))
        b.append(t(x + cw - 37, 27, state, 7, P['bone'] if ex else P['oil'], COND8, 'middle'))
        for j, ln in enumerate(wrap(name, 20)[:2]):
            b.append(t(x + 15, 50 + j * 11, ln, 10, tc, COND8))
        b.append(t(x + 15, 80, where, 8, tc, COND))
        b.append(t(x + 15, 92, 'needs: ' + needs if len(needs) < 26 else 'needs: ' + needs[:24] + '…', 7.4, P['rust'] if ex else P['hazard'], COND))
        for j, ln in enumerate(wrap(prize, 28)[:3]):
            b.append(t(x + 15, 106 + j * 9.5, ln, 7.4, tc, BODY))
    return svg(W, H, ''.join(b))


# ───────────────────────────────────────────── decision matrix
def matrix(W=380, H=300):
    b = []
    ox, oy, w, h = 46, 10, W - 60, H - 62
    b.append(rect(ox, oy, w, h, P['paper2']))
    b.append(rect(ox, oy, w / 2, h / 2, P['paper'], extra='opacity="0.7"'))
    b.append(t(ox + 6, oy + 14, 'QUICK WINS: high impact, low effort', 8, P['copperdk'], COND8))
    b.append(t(ox + w - 6, oy + h - 6, 'MONEY PITS', 8, P['rustdk'], COND8, 'end'))
    for k in range(1, 6):
        x = ox + (k - 0.5) * w / 5
        y = oy + h - (k - 0.5) * h / 5
        b.append(t(x, oy + h + 12, str(k), 8, P['ink'], MONO, 'middle'))
        b.append(t(ox - 6, y + 3, str(k), 8, P['ink'], MONO, 'end'))
    b.append(t(ox + w / 2, oy + h + 26, 'EFFORT', 9, P['ink'], COND8, 'middle'))
    b.append(t(12, oy + h / 2, 'IMPACT', 9, P['ink'], COND8, 'middle', f'transform="rotate(-90 12 {oy + h / 2})"'))
    cols = {'C': P['copper'], 'A': P['hazard'], 'W': P['red']}
    seen = {}
    for i, (area, tier, title, imp, eff, risk, rec) in enumerate(C.MATRIX):
        key = (imp, eff)
        k = seen.get(key, 0)
        seen[key] = k + 1
        x = ox + (eff - 0.5) * w / 5 + (k % 3 - 1) * 15
        y = oy + h - (imp - 0.5) * h / 5 + (k // 3) * 15 - 4
        b.append(circ(x, y, 7, cols[tier], P['ink'], 1))
        b.append(t(x, y + 3, str(i + 1), 7, P['oil'], COND8, 'middle'))
    lg = [('C', 'Conservative'), ('A', 'Ambitious'), ('W', 'Wild card')]
    for i, (k, lab) in enumerate(lg):
        b.append(circ(ox + 8 + i * 92, H - 8, 5, cols[k], P['ink'], 0.8) + t(ox + 17 + i * 92, H - 5, lab, 8.5, P['ink'], COND))
    return svg(W, H, ''.join(b))


# ───────────────────────────────────────────── NPC badge (no unique model exists)
def badge(c, W=104, H=130):
    b = [rect(0, 0, W, H, P['steel'])]
    b.append(rect(0, 0, W, 6, c['color']))
    for k in range(6):
        x = 8 + k * 16
        b.append(poly([(x, H), (x + 8, H), (x + 18, H - 14), (x + 10, H - 14)], P['steel2']))
    b.append(circ(W / 2, 56, 32, P['steel2'], c['color'], 3))
    ini = ''.join(p[0] for p in c['name'].replace('Old ', '').replace('Foreman ', '').split()[:2])
    b.append(t(W / 2, 67, ini, 29 if len(ini) > 1 else 32, c['color'], STEN, 'middle'))
    b.append(t(W / 2, 104, 'NO UNIQUE MODEL', 7, P['dim'], COND8, 'middle', 'letter-spacing="1"'))
    return svg(W, H, ''.join(b))


def main():
    save('world_chart', world_chart())
    save('world_legend', world_legend())
    save('world_loop', world_loop())
    save('score_bars', score_bars())
    save('cast_web', cast_web())
    save('lines_chart', lines_chart())
    save('arc_grid', arc_grid())
    save('voyage_now', voyage_now())
    save('voyage_compare', voyage_compare())
    save('ladder', ladder())
    save('rank_track', rank_track())
    save('upgrade_keys', upgrade_keys())
    save('redfinch_line', redfinch_line())
    save('matrix', matrix())
    for c in C.CAST:
        if c['kind'] == 'npc':
            save('badge_' + c['id'], badge(c))
    print('diagrams ->', os.path.abspath(OUT))


if __name__ == '__main__':
    main()
