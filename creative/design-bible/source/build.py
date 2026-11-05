"""Lays out the TIDEBREAKERS World & Voyage Design Bible in GITCRAFT DesignCraft (headless MCP) and exports the PDF.

  python3 creative/design-bible/source/art.py     # diagrams (SVG) from the game's data
  python3 creative/design-bible/source/build.py   # DesignCraft layout -> .designcraft + PDF + page PNGs

Talks to the DesignCraft MCP server over stdio (~/.gitcraft/runtime/scripts/mcp.sh designcraft), exactly as Claude
Code does: every swatch, style, frame, image and pasted vector diagram is a DesignCraft command. Text comes from
content.py; diagrams from art.py. Fonts are the game's own UI faces (Saira Stencil One, Barlow, Barlow Condensed,
Share Tech Mono; all OFL, installed to ~/.local/share/fonts, not vendored into the repo).
"""
import json
import os
import queue
import re
import subprocess
import sys
import threading

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import content as C  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..'))
ART = os.path.join(ROOT, 'art')
OUT_PDF = os.path.join(ROOT, 'TIDEBREAKERS_World_and_Voyage_Bible.pdf')
OUT_DOC = os.path.join(ROOT, 'source', 'TIDEBREAKERS_World_and_Voyage_Bible.designcraft')
PREVIEW = os.path.join(ROOT, 'previews')
W, H = 792, 612
M = 40  # outer margin


# ───────────────────────────────────────────── MCP client
class MCP:
    def __init__(self, name):
        cmd = [os.path.expanduser('~/.gitcraft/runtime/scripts/mcp.sh'), name]
        self.p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, bufsize=1,
                                  cwd=os.path.abspath(os.path.join(ROOT, '..', '..')))
        self.q, self.i = queue.Queue(), 0
        threading.Thread(target=self._rd, daemon=True).start()
        self.req('initialize', {'protocolVersion': '2025-06-18', 'capabilities': {}, 'clientInfo': {'name': 'tb-bible', 'version': '1'}})
        self.p.stdin.write(json.dumps({'jsonrpc': '2.0', 'method': 'notifications/initialized', 'params': {}}) + '\n')
        self.p.stdin.flush()

    def _rd(self):
        for ln in self.p.stdout:
            try:
                self.q.put(json.loads(ln))
            except Exception:
                pass

    def req(self, m, p, timeout=600):
        self.i += 1
        i = self.i
        self.p.stdin.write(json.dumps({'jsonrpc': '2.0', 'id': i, 'method': m, 'params': p}) + '\n')
        self.p.stdin.flush()
        while True:
            r = self.q.get(timeout=timeout)
            if r.get('id') == i:
                return r

    def tool(self, name, args):
        r = self.req('tools/call', {'name': name, 'arguments': args})
        if 'error' in r:
            raise RuntimeError(f'{name}: {r["error"]}')
        txt = '\n'.join(c.get('text', '') for c in r['result'].get('content', []) if c.get('type') == 'text')
        if r['result'].get('isError'):
            raise RuntimeError(f'{name} {json.dumps(args)[:300]}: {txt}')
        try:
            return json.loads(txt)
        except Exception:
            return txt

    def x(self, command, **params):
        return self.tool('execute', {'command': command, 'params': params})


# ───────────────────────────────────────────── typography helpers
GLYPH = {'→': '›', '★ ': '', '★': '', '▸': '>', '←': '‹'}


def smart(s):
    for k, v in GLYPH.items():
        s = s.replace(k, v)
    s = re.sub(r"(^|[\s(\[\u2014–-])'", '\\1\u2018', s)
    s = s.replace("'", '\u2019')
    s = re.sub(r'(^|[\s(\[\u2014–-])"', '\\1\u201c', s)
    s = s.replace('"', '\u201d')
    return s


SW = dict(Oil='#0d1113', Steel='#1b2225', Steel2='#283135', Steel3='#3a4549', Bone='#d9d2bf', Bone2='#c8c0aa', Dim='#9a9381',
          Paper='#d6cdb4', Paper2='#c4b99c', Edge='#8c8068', Ink='#1a1a17', Soft='#4d4a40', Rust='#a3481e', RustDk='#5c260f',
          Copper='#4f9484', CopperDk='#23463f', Hazard='#d6a62a', HazardDk='#6e5210', Red='#c5371f', Living='#57e05f')
TIER = {'conservative': ('CONSERVATIVE', 'Copper'), 'ambitious': ('AMBITIOUS', 'Hazard'), 'wild': ('WILD CARD', 'Red')}
SCALES = [1.0, 0.93, 0.86, 0.8, 0.74]
# name: (family, style, size, leading, colour, extra para attrs, tracking)
STYLES = {
    'Kicker': ('Barlow Condensed', 'ExtraBold', 9, 11, 'Rust', {}, 180),
    'H1': ('Saira Stencil One', 'Regular', 30, 31, 'Ink', {'spaceAfter': 6}, 0),
    'H2': ('Barlow Condensed', 'ExtraBold', 14, 15.5, 'Ink', {'spaceBefore': 5, 'spaceAfter': 3}, 10),
    'H3': ('Barlow Condensed', 'ExtraBold', 9.5, 11.5, 'Rust', {'spaceBefore': 5, 'spaceAfter': 1.5}, 80),
    'Lede': ('Barlow', 'Medium', 12, 16.5, 'Ink', {'spaceAfter': 6}, 0),
    'Body': ('Barlow', 'Regular', 9.3, 12.6, 'Ink', {'spaceAfter': 4}, 0),
    'Bullet': ('Barlow', 'Regular', 9.3, 12.4, 'Ink', {'spaceAfter': 2.6, 'leftIndent': 10, 'firstLineIndent': -10}, 0),
    'Small': ('Barlow', 'Regular', 8, 10.4, 'Soft', {'spaceAfter': 2.5}, 0),
    'Mono': ('Share Tech Mono', 'Regular', 7.6, 9.6, 'Soft', {'spaceAfter': 0}, 0),
    'Quote': ('Barlow', 'Italic', 10.5, 14, 'RustDk', {'spaceAfter': 4}, 0),
    'Tag': ('Barlow Condensed', 'ExtraBold', 8.5, 10, 'Oil', {}, 120),
    'Stat': ('Saira Stencil One', 'Regular', 22, 22, 'Rust', {}, 0),
    'Display': ('Saira Stencil One', 'Regular', 68, 66, 'Ink', {}, 0),
}
LIGHT = {'Ink': 'Bone', 'Soft': 'Bone2', 'Rust': 'Hazard', 'RustDk': 'Hazard', 'Oil': 'Bone2'}


class Book:
    def __init__(self, n_pages):
        self.m = MCP('designcraft')
        self.m.tool('new_document', {'width': W, 'height': H, 'pages': n_pages, 'facingPages': False, 'margins': M,
                                     'title': f'TIDEBREAKERS · {C.TITLE}', 'intent': 'print'})
        for k, v in SW.items():
            self.m.x('swatch.create', name=k, color=v)
        self.m.x('style.character.create', name='Bold', chars={'fontFamily': 'Barlow', 'fontStyle': 'Bold'})
        self.m.x('style.character.create', name='BoldRust', chars={'fontFamily': 'Barlow', 'fontStyle': 'Bold', 'fill': 'Rust'})
        self.m.x('style.character.create', name='BoldHaz', chars={'fontFamily': 'Barlow', 'fontStyle': 'Bold', 'fill': 'Hazard'})
        for name, (fam, sty, size, lead, col, para, tr) in STYLES.items():
            for light in (False, True):
                for si, sc in enumerate(SCALES):
                    nm = name + ('L' if light else '') + ('' if si == 0 else f'@{si}')
                    fill = LIGHT.get(col, col) if light else col
                    chars = {'fontFamily': fam, 'fontStyle': sty, 'size': round(size * sc, 2), 'fill': fill,
                             'leading': {'kind': 'points', 'value': round(lead * sc, 2)}}
                    if tr:
                        chars['tracking'] = tr
                    p = {k: (round(v * sc, 2) if isinstance(v, (int, float)) else v) for k, v in para.items()}
                    p['hyphenate'] = False
                    if name == 'Bullet':
                        p['grepStyles'] = [{'style': 'BoldHaz' if light else 'Bold', 'pattern': r"^(•\x{00A0}\x{00A0})?[A-Z][A-Za-z’' ]{1,32}:(?= )"}]
                    self.m.x('style.paragraph.create', name=nm, chars=chars, para=p)
        self.overset = []
        self.frames = {}
        self.last_scale = 0

    # primitives ------------------------------------------------------
    def rect(self, sp, r, fill=None, stroke=None, sw=1.0, opacity=None, corner=None):
        f = self.m.x('frame.create', spread=sp, rect=list(r), content='unassigned')
        fid = f['id']
        self.m.x('object.fill', swatch=fill or '[None]', ids=[fid])
        if stroke:
            self.m.x('object.stroke', swatch=stroke, weight=sw, ids=[fid])
        else:
            self.m.x('object.stroke', swatch='[None]', ids=[fid])
        if opacity is not None:
            self.m.x('object.opacity', opacity=opacity, ids=[fid])
        if corner:
            self.m.x('object.cornerOptions', shape='bevel', size=corner, ids=[fid])
        return fid

    def line(self, sp, a, b, stroke='Ink', sw=0.75):
        r = self.m.x('line.create', spread=sp, a=list(a), b=list(b))
        lid = r['id'] if isinstance(r, dict) else r
        self.m.x('object.stroke', swatch=stroke, weight=sw, ids=[lid])
        return lid

    def image(self, sp, r, path, fit='fillProportionally', align=4):
        f = self.m.x('frame.create', spread=sp, rect=list(r), content='graphic')
        self.m.tool('place_image', {'path': path, 'frame': f['id']})
        self.m.x('object.fit', mode=fit, ids=[f['id']])
        self.m.x('object.stroke', swatch='[None]', ids=[f['id']])
        return f['id']

    def svg(self, sp, name, x, y):
        """Paste art/diagrams/<name>.svg as native DesignCraft vectors with its top-left at (x, y)."""
        s = open(os.path.join(ART, 'diagrams', name + '.svg')).read()
        mw = re.search(r'width="([\d.]+)(?:pt)?" height="([\d.]+)(?:pt)?"', s)
        w, h = float(mw.group(1)), float(mw.group(2))
        r = self.m.x('edit.pasteSvg', svg=s, spread=sp, at=[x + w / 2, y + h / 2])
        ids = r.get('ids', []) if isinstance(r, dict) else []
        gid = self.m.x('object.group', ids=ids)['id'] if len(ids) > 1 else ids[0]
        # pasteSvg reads SVG px at 96 dpi (1 px = 0.75 pt): scale back to 1 unit = 1 pt, then pin the top-left corner
        self.m.x('transform.scale', sx=4 / 3, sy=4 / 3, ids=[gid])
        self.m.x('transform.set', x=x, y=y, ref=0, ids=[gid])
        return w, h

    def _apply(self, fid, si):
        story, plain, spans, light, full = self.frames[fid]
        off, total = 0, len(full.encode('utf-8'))
        for (st, p), bold in zip(plain, spans):
            n = len(p.encode('utf-8'))
            nm = st + ('L' if light else '') + ('' if si == 0 else f'@{si}')
            self.m.x('text.select', story=story, anchor=off, focus=off + n + (1 if off + n < total else 0))
            self.m.x('style.paragraph.apply', name=nm, clearOverrides=True)
            for a, b in bold:
                self.m.x('text.select', story=story, anchor=off + a, focus=off + b)
                self.m.x('style.character.apply', name='BoldHaz' if light else 'Bold')
            off += n + 1
        self.m.x('text.exitToFrame')

    def unify(self, fids_scales):
        """Give side-by-side frames one shared (the smallest needed) text scale."""
        top = max(si for _, si in fids_scales)
        for fid, si in fids_scales:
            if si < top:
                self._apply(fid, top)

    def text(self, sp, r, paras, light=False, inset=0, vj='top', fill=None, cols=1, gutter=14, min_scale=4, scale=0):
        """paras: [(style, text)]; **bold** spans get the Bold character style. Shrinks through SCALES until it fits."""
        plain, spans = [], []
        for st, tx in paras:
            tx = smart(tx)
            out, bold, pos = '', [], 0
            for part in re.split(r'(\*\*[^*]+\*\*)', tx):
                if part.startswith('**') and part.endswith('**'):
                    bold.append((len(out.encode('utf-8')), len((out + part[2:-2]).encode('utf-8'))))
                    out += part[2:-2]
                else:
                    out += part
            plain.append((st, out))
            spans.append(bold)
        full = '\n'.join(p for _, p in plain)
        f = self.m.x('frame.create', spread=sp, rect=list(r), content='text', text=full)
        fid, story = f['id'], f['story']
        opts = {'ids': [fid], 'inset': inset, 'verticalJustification': vj}
        if cols > 1:
            opts.update(columns=cols, gutter=gutter)
        self.m.x('object.textFrameOptions', **opts)
        if fill:
            self.m.x('object.fill', swatch=fill, ids=[fid])
        self.frames[fid] = (story, plain, spans, light, full)
        for si in range(scale, len(SCALES)):
            self._apply(fid, si)
            g = self.m.x('story.get', story=story)
            if not g.get('overset') or si >= min_scale:
                if g.get('overset'):
                    self.overset.append((sp, full[:60]))
                break
        self.last_scale = si
        self.m.x('text.exitToFrame')
        return fid

    # page furniture ---------------------------------------------------
    def bg(self, sp, dark=False):
        self.rect(sp, (0, 0, W, H), 'Oil' if dark else 'Paper')

    def chrome(self, sp, no, title, dark=False):
        self.rect(sp, (0, 0, W, 26), 'Steel')
        self.rect(sp, (0, 26, W, 29), 'Rust' if not dark else 'Hazard')
        self.text(sp, (M, 7, 420, 22), [('Tag', f'{no} · {title.upper()}')], light=True)
        self.text(sp, (W - 340, 7, W - M, 22), [('Tag', 'TIDEBREAKERS · WORLD & VOYAGE DESIGN BIBLE')], light=True)
        self.text(sp, (W - M - 80, H - 22, W - M, H - 10), [('Mono', f'p. {sp + 1:02d}')], light=dark)
        self.text(sp, (M, H - 22, 420, H - 10), [('Mono', C.VERSION)], light=dark)

    def heading(self, sp, x0, y0, x1, kicker, title, light=False, h=58):
        self.text(sp, (x0, y0, x1, y0 + h), [('Kicker', kicker.upper()), ('H1', title)], light=light)

    def tag(self, sp, x, y, label, fill, w=None):
        w = w or (len(label) * 5.4 + 14)
        self.rect(sp, (x, y, x + w, y + 14), fill)
        self.text(sp, (x + 6, y + 2.5, x + w, y + 13), [('Tag', label)])
        return w

    def card(self, sp, r, fill='Paper2', stroke=None):
        return self.rect(sp, r, fill, stroke, 1.0, corner=7)


# ───────────────────────────────────────────── pages
def shot(name):
    p = os.path.join(ART, 'screens', name + '.jpg')
    return p if os.path.exists(p) else None


def portrait(cid):
    p = os.path.join(ART, 'portraits', cid + '.jpg')
    return p if os.path.exists(p) else None


def p_cover(b, sp):
    b.bg(sp, True)
    img = shot('ironwake_full') or shot('skiff_driftholm')
    if img:
        b.image(sp, (0, 0, W, H), img)
    b.rect(sp, (0, 330, W, H), 'Oil', opacity=0.94)
    b.rect(sp, (0, 326, W, 330), 'Hazard')
    b.text(sp, (M, 346, 760, 440), [('Kicker', 'GITCRAFT DESIGNCRAFT · GAME DESIGN BRIEF'), ('Display', 'TIDEBREAKERS')], light=True)
    b.text(sp, (M, 428, 760, 476), [('H1', C.TITLE)], light=True)
    b.text(sp, (M, 480, 560, 590), [('Lede', C.SUBTITLE + '.'),
                                    ('Body', 'Fourteen characters developed, a 13-step first voyage redesigned, and a dinghy-to-pirate-ship ladder. '
                                             'Islands, ports, caves and treasure are tied into one legend. Every proposal comes in Conservative, Ambitious and Wild Card tiers, with its gameplay impact, implementation and tradeoffs.')], light=True)
    b.text(sp, (600, 520, W - M, 580), [('Mono', C.VERSION), ('Mono', 'Authoritative brief for the next implementation pass')], light=True)


def p_howto(b, sp):
    b.bg(sp)
    b.chrome(sp, '00', 'How to use this bible')
    b.heading(sp, M, 46, 470, 'Read me first', 'How to use this bible')
    b.text(sp, (M, 110, 440, 560), [('Lede', C.HOW_TO_USE['intro'])] + [('H3', 'THE RULES')] +
           [('Bullet', '•\u00a0\u00a0' + r) for r in C.HOW_TO_USE['rules']])
    ty = 418
    b.text(sp, (M, ty - 18, 440, ty - 4), [('H3', 'HOW PROPOSALS ARE TAGGED')])
    cw3 = (440 - M - 2 * 8) / 3
    for i, (key, desc) in enumerate([('conservative', 'One PR. Data, copy and small art. Low risk. Build first.'),
                                     ('ambitious', 'A new system or content set. Medium risk. Phase 2, where marked RECOMMENDED.'),
                                     ('wild', 'A bold bet. Prototype behind ?wild=. Ships only after a playtest.')]):
        lab, colr = TIER[key]
        x = M + i * (cw3 + 8)
        b.rect(sp, (x, ty, x + cw3, ty + 5), colr)
        b.tag(sp, x, ty + 10, lab, colr)
        b.text(sp, (x, ty + 30, x + cw3, ty + 90), [('Small', desc)])
    b.text(sp, (M, ty + 96, 440, ty + 150), [('H3', 'EVIDENCE TAGS'), ('Small', '**EXISTS**: in the code today, cited as file:line at 5766ca5. **PROPOSED / NEW**: not in the game yet. Claims about how players will feel are inferred design judgements until a PLAYCRAFT pass or playtest measures them.')])
    b.card(sp, (470, 52, W - M, 560), 'Steel')
    b.text(sp, (488, 66, W - M - 16, 100), [('Kicker', 'CONTENTS')], light=True)
    y = 96
    for i, r in enumerate(C.HOW_TO_USE['reading']):
        no, rest = r.split(' ', 1)
        name, desc = rest.split(':', 1) if ':' in rest else (rest, '')
        b.text(sp, (488, y, 530, y + 30), [('Stat', no)], light=True)
        b.text(sp, (532, y + 1, W - M - 14, y + 40), [('H2', name.strip()), ('Small', desc.strip())], light=True)
        y += 45


def p_diag1(b, sp):
    b.bg(sp)
    b.chrome(sp, '01', 'Diagnosis')
    b.heading(sp, M, 46, 470, '01 · Diagnosis', 'What exists, measured')
    b.text(sp, (M, 108, 410, 190), [('Lede', C.DIAGNOSIS['lede'])])
    y = 196
    b.text(sp, (M, y, 410, y + 14), [('H3', 'INVENTORY AT COMMIT 5766CA5')])
    y += 16
    for k, v, ref in C.DIAGNOSIS['inventory']:
        b.line(sp, (M, y), (410, y), 'Edge', 0.5)
        b.text(sp, (M, y + 3, 112, y + 27), [('H2', k)])
        b.text(sp, (112, y + 4, 410, y + 27), [('Small', v), ('Mono', ref)])
        y += 29
    b.card(sp, (430, 52, W - M, 560), 'Paper2')
    b.text(sp, (446, 64, W - M - 12, 120), [('Kicker', 'DESIGNCRAFT ASSESSMENT'), ('Stat', '25 / 100'),
                                            ('Small', 'ceiling 85 · coverage 40% · confidence low')])
    b.svg(sp, 'score_bars', 446, 130)
    b.text(sp, (446, 330, W - M - 14, 552), [('Body', C.DIAGNOSIS['score_note'])])


def p_diag2(b, sp):
    b.bg(sp)
    b.chrome(sp, '01', 'Diagnosis')
    b.heading(sp, M, 46, 600, '01 · Diagnosis', 'Six reasons it feels like systems')
    cw, ch = (W - 2 * M - 2 * 14) / 3, 150
    for i, (k, v) in enumerate(C.DIAGNOSIS['problems']):
        x = M + (i % 3) * (cw + 14)
        y = 116 + (i // 3) * (ch + 14)
        b.card(sp, (x, y, x + cw, y + ch), 'Steel')
        b.text(sp, (x + 14, y + 12, x + cw - 12, y + ch - 10), [('Stat', f'{i + 1:02d}'), ('H2', k), ('Body', v)], light=True)
    strip = [s for s in ['rooftop_hollow', 'old_meridian', 'rig_helios', 'rustfang_hold'] if shot(s)]
    if strip:
        sw = (W - 2 * M - (len(strip) - 1) * 8) / len(strip)
        for i, s in enumerate(strip):
            b.image(sp, (M + i * (sw + 8), 448, M + i * (sw + 8) + sw, 548), shot(s))
        b.text(sp, (M, 552, W - M, 568), [('Mono', 'Real frames from the built game (creative/design-bible/source/capture.cjs): Rooftop Hollow · Old Meridian · Rig Helios · Rustfang Hold. The places are rich; nobody in them speaks.')])


def p_identity(b, sp):
    b.bg(sp, True)
    img = shot('rustfang_hold')
    if img:
        b.image(sp, (430, 0, W, H), img)
        b.rect(sp, (430, 0, 470, H), 'Oil', opacity=0.6)
    b.chrome(sp, '02', 'Identity', dark=True)
    b.heading(sp, M, 46, 420, '02 · Identity', 'Pirates after the flood', light=True)
    b.text(sp, (M, 112, 410, 210), [('Lede', C.IDENTITY['lede'])], light=True)
    y = 214
    for k, v in C.IDENTITY['pillars']:
        b.rect(sp, (M, y + 2, M + 3, y + 40), 'Hazard')
        b.text(sp, (M + 12, y, 410, y + 46), [('H2', k), ('Small', v)], light=True)
        y += 48
    b.card(sp, (452, 300, W - M, 584), 'Oil')
    b.text(sp, (468, 312, W - M - 12, 580), [('Kicker', 'THE PIRATE VOCABULARY')] +
           [('Small', f'**{k}**: {v}') for k, v in C.IDENTITY['pirate_vocab']] +
           [('Kicker', 'NEVER')] + [('Small', '•\u00a0\u00a0' + n) for n in C.IDENTITY['never']], light=True)


def p_world1(b, sp):
    b.bg(sp)
    b.chrome(sp, '03', 'The World')
    b.svg(sp, 'world_chart', M, 40)
    x = M + 470 + 16
    b.text(sp, (x, 44, W - M, 120), [('Kicker', '03 · The World'), ('H1', 'One map')])
    b.svg(sp, 'world_legend', x, 118)
    b.text(sp, (x, 292, W - M, 570), [('H3', 'THREE REGIONS, THREE HULLS')] +
           sum([[('H2', r), ('Small', d), ('Mono', p)] for r, d, p in C.WORLD_LOOP['regions']], []) +
           [('Small', 'Positions are the real coordinates from world.ts. Dashed gold marks the proposed Redfinch Line: the six treasure maps in story order.')])


def p_world2(b, sp):
    b.bg(sp)
    b.chrome(sp, '03', 'The World')
    b.heading(sp, M, 46, 430, '03 · The World', 'One loop, one legend')
    b.text(sp, (M, 110, 400, 220), [('Lede', C.WORLD_LOOP['lede'])])
    b.svg(sp, 'world_loop', 420, 40)
    y = 300
    b.text(sp, (M, 232, 400, 250), [('H3', 'THE LEGEND THAT THREADS THE WORLD')])
    cw = (W - 2 * M - 3 * 10) / 4
    imgs = ['lantern_night', 'wren_wreck', 'ironwake_full', 'rustfang_hold']
    for i, (k, v) in enumerate(C.WORLD_LOOP['legend']):
        x = M + i * (cw + 10)
        b.card(sp, (x, 352, x + cw, 576), 'Steel')
        if shot(imgs[i]):
            b.image(sp, (x, 352, x + cw, 430), shot(imgs[i]))
        b.text(sp, (x + 12, 438, x + cw - 10, 572), [('H2', k), ('Small', v)], light=True)
    b.text(sp, (M, 254, 400, 345), [('Body', 'Redfinch is already in the data: a journal page, a chart in two halves and a grand hoard. The proposal makes him the reason the player sails from region to region. **Old Wren**, **Marlo** and **Rustfang** each hold a piece of his story, so the legend lives in people, not menus.')])


def p_cast1(b, sp):
    b.bg(sp)
    b.chrome(sp, '04', 'The Cast')
    b.heading(sp, M, 46, 300, '04 · The Cast', 'Fourteen people')
    b.text(sp, (M, 110, 262, 330), [('Body', C.CAST_SUMMARY)])
    b.svg(sp, 'cast_web', 270, 40)
    b.text(sp, (M, 386, 262, 420), [('H3', 'LINES TODAY → TARGET'), ('Small', 'Every character reaches the target of 6 or more lines plus arc beats. Mara goes from 1 to 9.')])
    b.svg(sp, 'lines_chart', 270, 388)
    b.text(sp, (M, 430, 262, 570), [('Small', 'Dashed lines on the web are the relationships this bible proposes. They are what makes a meeting in one port pay off in another: the tug (Juno and Vik), the Wren (Old Wren and Marlo), Rustfang (Bram and Ines), the Hollow (Tomas and Sal).')])


def p_cast2(b, sp):
    b.bg(sp)
    b.chrome(sp, '04', 'The Cast')
    b.heading(sp, M, 46, 300, '04 · The Cast', 'Arcs across the map')
    b.text(sp, (M, 112, 270, 560), [('Body', 'Each character gets three beats, and every beat is pinned to a place that already exists. A meeting in the Drift sets up a payoff in the Reach or inside the Stormwall, so sailing somewhere new is also seeing someone again.'),
                                    ('H3', 'RULES FOR BEATS'),
                                    ('Bullet', '•\u00a0\u00a0A beat needs a place, a trigger (a goal, contract, item or crew pairing) and a visible result (a line, a price, a structure, a perk).'),
                                    ('Bullet', '•\u00a0\u00a0No beat blocks the Captain\'s Log. Beats are rewards for wandering.'),
                                    ('Bullet', '•\u00a0\u00a0Crew beats fire only while that crew member is aboard, which makes choosing a crew an agency choice.'),
                                    ('Bullet', '•\u00a0\u00a0NPC beats change their port: a museum shelf, a raft deck, a second flare.')])
    b.svg(sp, 'arc_grid', 282, 44)
    b.text(sp, (282, 362, W - M, 380), [('Mono', 'Numbered dots = beat order per character. Text = first beat in that region. Full beats are on the character sheets.')])
    crew = [c for c in ['juno', 'tomas', 'kai', 'mara', 'bram', 'ines'] if portrait(c)]
    pw = (W - M - 282 - 5 * 6) / 6
    for i, cid in enumerate(crew):
        b.image(sp, (282 + i * (pw + 6), 392, 282 + i * (pw + 6) + pw, 560), portrait(cid))
    b.text(sp, (282, 562, W - M, 578), [('Mono', 'Crew models: creative/3d-characters (GITCRAFT MeshCraft). Juno · Tomas · Kai · Mara · Bram · Ines')])


def char_sheet(b, sp, c, x0, x1):
    y0 = 40
    pid = c['id'] if c['kind'] == 'crew' else {'pip': 'townsfolk_trader', 'wren': 'townsfolk_elder', 'marlo': 'townsfolk_dockhand'}.get(c['id'])
    px = x0
    if pid and portrait(pid):
        b.image(sp, (px, y0 + 6, px + 104, y0 + 136), portrait(pid))
        if c['kind'] == 'npc':
            b.text(sp, (px, y0 + 138, px + 104, y0 + 150), [('Mono', 'stand-in: generic townsfolk')])
    else:
        b.svg(sp, 'badge_' + c['id'], px, y0 + 6)
        b.text(sp, (px, y0 + 138, px + 104, y0 + 150), [('Mono', 'art need: unique model')])
    tx = x0 + 114
    b.text(sp, (tx, y0 + 4, x1, y0 + 64), [('Kicker', f"{c['role']} · {c['pron']}"), ('H1', c['name'])])
    b.text(sp, (tx, y0 + 64, x1, y0 + 150), [('Small', f"**Home:** {c['home']}"), ('Small', f"**Model:** {c['model']}"),
                                              ('Small', f"**EXISTS:** {c['exists']}")])
    body = [('H3', 'WANT'), ('Body', c['want']), ('H3', 'WOUND'), ('Body', c['wound']), ('H3', 'VOICE'), ('Body', c['voice']),
            ('H3', 'ARC · THREE BEATS')] + [('Bullet', f'{i + 1}\u00a0\u00a0**{reg}:** {txt}') for i, (reg, txt) in enumerate(c['arc'])]
    fid = b.text(sp, (x0, y0 + 156, x1, 438), body, min_scale=4)
    body_fs = (fid, b.last_scale)
    b.card(sp, (x0, 444, x1, 574), 'Steel')
    b.text(sp, (x0 + 10, 452, x1 - 10, 570), [('H3', 'NEW LINES BY TRIGGER')] +
           [('Small', f'**{trg}:** "{ln}"') for trg, ln in c['new_lines']] + [('H3', 'GAMEPLAY HOOK'), ('Small', c['hook'])], light=True)
    return body_fs, (b.frames and list(b.frames)[-1], b.last_scale)


def p_chars(b, sp, pair):
    b.bg(sp)
    b.chrome(sp, '04', 'The Cast · character sheets')
    mid = W / 2
    a = char_sheet(b, sp, pair[0], M, mid - 14)
    b.line(sp, (mid, 46), (mid, 574), 'Edge', 0.6)
    if len(pair) > 1:
        c2 = char_sheet(b, sp, pair[1], mid + 14, W - M)
        b.unify([a[0], c2[0]])
        b.unify([a[1], c2[1]])


def proposal_col(b, sp, key, d, x0, y0, x1, y1, bullets_key):
    lab, colr = TIER[key]
    b.rect(sp, (x0, y0, x1, y0 + 5), colr)
    w = b.tag(sp, x0, y0 + 10, lab, colr)
    if d.get('recommended'):
        b.tag(sp, x0 + w + 6, y0 + 10, 'RECOMMENDED', 'Bone')
    items = d.get(bullets_key, [])
    paras = [('H2', d['title']), ('Quote', d['pitch'])]
    if items:
        paras.append(('H3', 'STEPS' if bullets_key == 'steps' else 'CHANGES'))
        paras += [('Bullet', (f'{i + 1}\u00a0\u00a0' if bullets_key == 'steps' else '•\u00a0\u00a0') + s) for i, s in enumerate(items)]
    paras += [('H3', 'GAMEPLAY IMPACT'), ('Body', d['impact']), ('H3', 'IMPLEMENTATION'), ('Body', d['impl']),
              ('H3', 'TRADEOFFS'), ('Body', d['tradeoffs']), ('H3', 'VALIDATE'), ('Small', d['validate'])]
    fid = b.text(sp, (x0, y0 + 30, x1, y1), paras)
    return fid, b.last_scale


def three_cols(b, sp, props, bullets_key, y0=112, y1=576):
    cw = (W - 2 * M - 2 * 16) / 3
    fs = []
    for i, key in enumerate(['conservative', 'ambitious', 'wild']):
        x = M + i * (cw + 16)
        fs.append(proposal_col(b, sp, key, props[key], x, y0, x + cw, y1, bullets_key))
    b.unify(fs)


def p_voyage1(b, sp):
    b.bg(sp)
    b.chrome(sp, '05', 'The First Voyage')
    b.heading(sp, M, 46, 600, '05 · The First Voyage', 'Thirteen steps, measured')
    b.text(sp, (430, 50, W - M, 108), [('Body', 'FIRST_VOYAGE (src/data/progress.ts:53) is checked step by step in Game.updateQuest (game.ts:2060). The HUD reads "First Voyage · n/12". Kinds and intensity are inferred design judgements.')])
    b.svg(sp, 'voyage_now', (W - 700) / 2, 112)
    cw = (W - 2 * M - 2 * 14) / 3
    for i, (k, v) in enumerate(C.VOYAGE_FINDINGS):
        x = M + (i % 3) * (cw + 14)
        y = 338 + (i // 3) * 118
        keep = i == 5
        b.card(sp, (x, y, x + cw, y + 108), 'Copper' if keep else 'Paper2')
        b.text(sp, (x + 12, y + 10, x + cw - 10, y + 104), [('H2', k), ('Small', v)], light=keep)


def p_voyage2(b, sp):
    b.bg(sp)
    b.chrome(sp, '05', 'The First Voyage')
    b.heading(sp, M, 46, 600, '05 · The First Voyage', 'Three redesigns')
    b.text(sp, (430, 50, W - M, 108), [('Body', 'All three keep the treasure dig as the centrepiece and keep every QuestStepId, so saves stay valid. Recommended path: ship the Conservative cut in Phase 1, then the Ambitious voyage in Phase 2.')])
    b.svg(sp, 'voyage_compare', (W - 700) / 2, 114)
    for i, key in enumerate(['conservative', 'ambitious', 'wild']):
        d = C.VOYAGE_PROPOSALS[key]
        cw = (W - 2 * M - 2 * 14) / 3
        x = M + i * (cw + 14)
        lab, colr = TIER[key]
        b.rect(sp, (x, 366, x + cw, 370), colr)
        b.text(sp, (x, 376, x + cw, 576), [('H2', d['title']), ('Quote', d['pitch']), ('H3', 'GAMEPLAY IMPACT'), ('Small', d['impact'])])


def p_voyage3(b, sp):
    b.bg(sp)
    b.chrome(sp, '05', 'The First Voyage · implementation')
    b.heading(sp, M, 46, 600, '05 · The First Voyage', 'Implementation & tradeoffs')
    cw = (W - 2 * M - 2 * 16) / 3
    for i, key in enumerate(['conservative', 'ambitious', 'wild']):
        d = C.VOYAGE_PROPOSALS[key]
        x = M + i * (cw + 16)
        lab, colr = TIER[key]
        b.rect(sp, (x, 112, x + cw, 117), colr)
        w = b.tag(sp, x, 122, lab, colr)
        if d.get('recommended'):
            b.tag(sp, x + w + 6, 122, 'RECOMMENDED', 'Bone')
        b.text(sp, (x, 144, x + cw, 576), [('H2', d['title']), ('H3', 'IMPLEMENTATION'), ('Body', d['impl']), ('H3', 'TRADEOFFS'), ('Body', d['tradeoffs']),
                                            ('H3', 'VALIDATE'), ('Body', d['validate'])])


def p_agency(b, sp):
    b.bg(sp)
    b.chrome(sp, '06', 'Agency & Exploration')
    b.heading(sp, M, 46, 420, '06 · Agency & Exploration', 'Offer leads, not orders')
    b.text(sp, (430, 50, W - M, 110), [('Body', C.AGENCY['lede'])])
    three_cols(b, sp, C.AGENCY, 'changes')


def p_prog1(b, sp):
    b.bg(sp)
    b.chrome(sp, '07', 'Dinghy to Pirate Ship')
    b.heading(sp, M, 46, 470, '07 · Dinghy to Pirate Ship', 'Eight planks to a flagship')
    b.text(sp, (M, 110, 420, 270), [('Body', C.PROGRESSION['lede'])])
    b.svg(sp, 'ladder', 440, 52)
    y = 290
    b.text(sp, (M, 276, 420, 292), [('H3', 'THE NUMBERS (src/data/ship.ts, world.ts, progress.ts)')])
    for k, v in C.PROGRESSION['facts']:
        b.line(sp, (M, y), (420, y), 'Edge', 0.5)
        b.text(sp, (M, y + 3, 150, y + 26), [('H2', k)])
        b.text(sp, (150, y + 5, 420, y + 26), [('Small', v)])
        y += 26
    b.svg(sp, 'rank_track', (W - 700) / 2, 428)
    shots = [s for s in ['skiff_driftholm', 'trimaran_reach', 'ironwake_full'] if shot(s)]
    if shots:
        pw = (W - 440 - M - (len(shots) - 1) * 6) / len(shots)
        for i, s in enumerate(shots):
            b.image(sp, (440 + i * (pw + 6), 300, 440 + i * (pw + 6) + pw, 400), shot(s))
        b.text(sp, (440, 403, W - M, 418), [('Mono', 'In-game today: Patchwork Skiff · Scrap Trimaran · Ironwake (all upgrades)')])
    b.text(sp, (M, 556, W - M, 576), [('Small', 'Renown ranks are proposed (Conservative tier). The Corsair rung exists only in the Ambitious tier. A rank is earned from deeds and milestones, never bought.')])


def p_prog2(b, sp):
    b.bg(sp)
    b.chrome(sp, '07', 'Dinghy to Pirate Ship')
    b.heading(sp, M, 46, 600, '07 · Dinghy to Pirate Ship', 'Three ladders')
    three_cols(b, sp, C.PROGRESSION, 'changes')


def p_places1(b, sp):
    b.bg(sp)
    b.chrome(sp, '08', 'Islands, Ports, Caves & Treasure')
    b.heading(sp, M, 46, 470, '08 · Islands, Ports, Caves & Treasure', 'The One-World audit')
    b.text(sp, (480, 50, W - M, 110), [('Body', C.PLACES_RULE)])
    cols = [(M, 'PLACE', 138), (178, 'WHO TALKS ABOUT IT', 128), (306, 'ONLY HERE', 150), (456, 'OPENED BY', 100), (556, 'REASON TO RETURN', W - M - 556)]
    y = 116
    b.rect(sp, (M, y, W - M, y + 18), 'Steel')
    for x, lab, w in cols:
        b.text(sp, (x + 6, y + 4, x + w, y + 16), [('Tag', lab)], light=True)
    y += 20
    for i, row in enumerate(C.PLACES):
        if i % 2 == 0:
            b.rect(sp, (M, y, W - M, y + 32), 'Paper2')
        for (x, lab, w), val in zip(cols, row):
            gap = 'GAP' in val or val == 'nobody' or val.startswith('nothing')
            st = 'H2' if x == M else 'Small'
            txt = val.replace('GAP · ', '')
            if gap and x != M:
                txt = '**GAP**: ' + txt if 'GAP' in val else '**' + txt + '**'
            b.text(sp, (x + 6, y + 4, x + w - 4, y + 31), [(st, txt)])
        y += 33


def p_places2(b, sp):
    b.bg(sp)
    b.chrome(sp, '08', 'Islands, Ports, Caves & Treasure')
    b.heading(sp, M, 46, 470, '08 · Treasure', 'The Redfinch Line')
    b.text(sp, (480, 50, W - M, 112), [('Body', C.TREASURE['lede'])])
    b.svg(sp, 'redfinch_line', (W - 700) / 2, 116)
    b.text(sp, (M, 282, 300, 300), [('H3', 'EVERY UPGRADE OPENS A PLACE')])
    b.text(sp, (M, 300, 300, 576), [('Body', 'A part on the boat should never be just a stat. Each key upgrade opens a place, brings a person and pays off a piece of the legend. Two rows are new: String Lights gain a job (night caves), and the Container Cabin fills the berths for a full crew of six.'),
                                    ('Body', 'Implementation: no new upgrade ids are needed for Phase 1. The cave glint check reads the existing light effect (UpgradeEffects.light). The Broadcast Cache reuses heavy-site salvage (salvage tier 1).'),
                                    ('Small', 'Gold rows are proposed. All others exist and are cited in src/data/ship.ts.')])
    b.svg(sp, 'upgrade_keys', 322, 282)


def p_caves(b, sp):
    b.bg(sp)
    b.chrome(sp, '08', 'Caves')
    b.heading(sp, M, 46, 420, '08 · Caves', 'The missing room')
    b.text(sp, (430, 50, W - M, 110), [('Body', C.CAVES['lede'])])
    three_cols(b, sp, C.CAVES, 'changes', y1=420)
    shots = [s for s in ['turtle_atoll', 'lantern_night'] if shot(s)]
    if shots:
        pw = (W - 2 * M - 8) / 2
        for i, s in enumerate(shots):
            b.image(sp, (M + i * (pw + 8), 430, M + i * (pw + 8) + pw, 562), shot(s))
        b.text(sp, (M, 564, W - M, 578), [('Mono', 'Turtle Atoll, where the Belly cave mouth would sit · Lantern Rock at night with String Lights (both captured from the current build)')])


def p_example(b, sp, ex, img):
    b.bg(sp)
    b.chrome(sp, '09', 'Gameplay examples')
    head, _, sub = ex['title'].partition(': ')
    b.heading(sp, M, 46, 520, '09 · Gameplay example · ' + sub, head)
    if img and shot(img):
        b.image(sp, (530, 40, W - M, 300), shot(img))
    y = 116
    for tm, txt, tagt in ex['beats']:
        b.text(sp, (M, y, M + 56, y + 40), [('Stat', tm)])
        b.text(sp, (M + 70, y + 1, 500, y + 44), [('Body', txt)])
        b.text(sp, (M + 70, y + 30, 500, y + 44), [('Mono', '▸ ' + tagt)])
        y += 50 if len(ex['beats']) < 8 else 49.5
    b.card(sp, (530, 312, W - M, 576), 'Steel')
    sys_used = sorted(set(t2 for _, _, tg in ex['beats'] for t2 in [s.strip() for s in tg.split('·')]))
    b.text(sp, (544, 324, W - M - 12, 570), [('Kicker', 'WHAT THIS PROVES'),
                                             ('Small', 'Every row is a real system in the build (sail, flotsam, anchor, dig, salvage, castaway, trade, upgrade, raiders) or a proposal from this bible (contracts, the Green Choice, Renown, Mara\'s Survey, arcs).'),
                                             ('H3', 'BEATS TOUCHED'), ('Small', ' · '.join(sys_used))], light=True)


def p_roadmap1(b, sp):
    b.bg(sp)
    b.chrome(sp, '10', 'Roadmap')
    b.heading(sp, M, 46, 460, '10 · Roadmap', 'Fifteen proposals, ranked')
    b.svg(sp, 'matrix', M, 112)
    x = M + 380 + 18
    cols = [(x, 16), (x + 16, 66), (x + 84, 150), (x + 236, W - M - x - 236)]
    y = 54
    b.rect(sp, (x, y, W - M, y + 16), 'Steel')
    for (cx, w), lab in zip(cols, ['#', 'AREA', 'PROPOSAL', 'PLAN']):
        b.text(sp, (cx + 3, y + 3.5, cx + w + 40, y + 14), [('Tag', lab)], light=True)
    y += 18
    for i, (area, tier, title, imp, eff, risk, rec) in enumerate(C.MATRIX):
        if i % 2 == 0:
            b.rect(sp, (x, y, W - M, y + 33), 'Paper2')
        b.text(sp, (cols[0][0] + 3, y + 5, cols[0][0] + 18, y + 30), [('H2', str(i + 1))])
        b.text(sp, (cols[1][0] + 3, y + 5, cols[1][0] + 62, y + 30), [('Small', f'**{area}** {tier}')])
        b.text(sp, (cols[2][0] + 3, y + 5, cols[2][0] + 150, y + 31), [('Small', title), ('Mono', f'impact {imp} · effort {eff} · risk {risk}')])
        b.text(sp, (cols[3][0] + 3, y + 5, W - M - 2, y + 30), [('Small', f'**{rec}**')])
        y += 34


def p_roadmap2(b, sp):
    b.bg(sp)
    b.chrome(sp, '10', 'Roadmap & acceptance')
    b.heading(sp, M, 46, 460, '10 · Roadmap', 'Three phases, measured')
    cw = (W - 2 * M - 2 * 14) / 3
    for i, (t1, t2, items) in enumerate(C.PHASES):
        x = M + i * (cw + 14)
        b.card(sp, (x, 112, x + cw, 352), ['Copper', 'Hazard', 'Steel'][i])
        b.text(sp, (x + 12, 122, x + cw - 10, 348), [('H2', t1), ('Small', t2)] + [('Small', '•\u00a0\u00a0' + it) for it in items], light=(i != 1))
    b.text(sp, (M, 364, W - M, 380), [('H3', 'ACCEPTANCE: THE PASS IS DONE WHEN')])
    y = 382
    b.rect(sp, (M, y, W - M, y + 16), 'Steel')
    for x, lab in [(M, 'MEASURE'), (290, 'TARGET'), (540, 'TODAY')]:
        b.text(sp, (x + 6, y + 3.5, x + 240, y + 14), [('Tag', lab)], light=True)
    y += 18
    for i, (k, tgt, now) in enumerate(C.ACCEPTANCE):
        if i % 2 == 0:
            b.rect(sp, (M, y, W - M, y + 22), 'Paper2')
        b.text(sp, (M + 6, y + 5, 288, y + 21), [('Small', f'**{k}**')])
        b.text(sp, (296, y + 5, 538, y + 21), [('Small', tgt)])
        b.text(sp, (546, y + 5, W - M, y + 21), [('Small', now)])
        y += 22


def p_brief(b, sp):
    b.bg(sp, True)
    b.chrome(sp, '10', 'Implementation brief', dark=True)
    b.heading(sp, M, 46, 460, '10 · For the implementation pass', 'Schemas & guardrails', light=True)
    b.card(sp, (M, 110, 470, 576), 'Steel')
    b.text(sp, (M + 12, 120, 462, 572), [('Mono', ln) for ln in C.SCHEMAS.split('\n')], light=True)
    b.text(sp, (490, 112, W - M, 576), [('Kicker', 'GUARDRAILS')] + [('Small', '•\u00a0\u00a0' + g) for g in C.GUARDRAILS] +
           [('Kicker', 'SOURCE FILES'),
            ('Small', 'creative/design-bible/WORLD_AND_VOYAGE_BIBLE.md is the same content as text: read it first. source/content.py is the single source of truth. art.py draws the diagrams from the game data. build.py lays out this PDF in DesignCraft.')], light=True)


def p_back(b, sp):
    b.bg(sp, True)
    img = shot('old_meridian')
    if img:
        b.image(sp, (0, 0, W, H), img)
        b.rect(sp, (0, 0, W, H), 'Oil', opacity=0.55)
    b.text(sp, (M, 200, 600, 330), [('Kicker', 'THE WORLD DROWNED. YOU DIDN\'T.'), ('H1', 'Follow the wake.')], light=True)
    b.text(sp, (M, 330, 520, 560), [('Body', 'Method: a full read of the repository at commit 5766ca5 (src/data, src/game, src/ui, src/audio, docs/). DESIGNCRAFT 1.0 assessment for the measured baseline (25 / 100, ceiling 85). PLAYCRAFT run 20261105001617 imported as simulated evidence. Fresh frames captured from the built game with ?ship= preview links, plus crew renders from docs/characters-pass.'),
                                    ('Body', 'Made with GITCRAFT DesignCraft (layout, vector diagrams, PDF). Typefaces: the game\'s own Saira Stencil One, Barlow, Barlow Condensed and Share Tech Mono (OFL).'),
                                    ('Mono', C.VERSION)], light=True)


def pages():
    P = [p_cover, p_howto, p_diag1, p_diag2, p_identity, p_world1, p_world2, p_cast1, p_cast2]
    cast = C.CAST
    for i in range(0, len(cast), 2):
        P.append(lambda b, sp, pair=cast[i:i + 2]: p_chars(b, sp, pair))
    P += [p_voyage1, p_voyage2, p_voyage3, p_agency, p_prog1, p_prog2, p_places1, p_places2, p_caves,
          lambda b, sp: p_example(b, sp, C.EXAMPLES[0], 'turtle_atoll'),
          lambda b, sp: p_example(b, sp, C.EXAMPLES[1], 'old_meridian'),
          p_roadmap1, p_roadmap2, p_brief, p_back]
    return P


def main():
    only = [int(x) for x in os.environ.get('ONLY', '').split(',') if x]
    P = pages()
    b = Book(len(P))
    for sp, fn in enumerate(P):
        if only and sp + 1 not in only:
            continue
        fn(b, sp)
        print(f'page {sp + 1:02d} {getattr(fn, "__name__", "")}', flush=True)
    b.m.x('file.saveAs', path=OUT_DOC)
    r = b.m.x('file.exportPdf', path=OUT_PDF, title=f'TIDEBREAKERS · {C.TITLE}', author='TIDEBREAKERS / GITCRAFT DesignCraft', tagged=True, created=1793923200)
    print('pdf', r)
    os.makedirs(PREVIEW, exist_ok=True)
    for sp in range(len(P)):
        if only and sp + 1 not in only:
            continue
        png = os.path.join(PREVIEW, f'page_{sp + 1:02d}.png')
        b.m.tool('export_png', {'page': sp, 'path': png})
        try:  # keep the repo light: review previews as JPEG
            from PIL import Image
            Image.open(png).convert('RGB').save(png[:-4] + '.jpg', quality=84, optimize=True)
            os.remove(png)
        except ImportError:
            pass
    if b.overset:
        print('OVERSET (still too long at the smallest scale):')
        for sp, s in b.overset:
            print(f'  p{sp + 1}: {s!r}')


if __name__ == '__main__':
    main()
