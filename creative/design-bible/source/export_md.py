"""Writes creative/design-bible/WORLD_AND_VOYAGE_BIBLE.md from content.py (the same source as the PDF).

  python3 creative/design-bible/source/export_md.py
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import content as C  # noqa: E402

OUT = os.path.join(HERE, '..', 'WORLD_AND_VOYAGE_BIBLE.md')
TIERS = [('conservative', 'Conservative'), ('ambitious', 'Ambitious'), ('wild', 'Wild card')]


def proposal(d, label, list_key):
    out = [f"#### {label}: {d['title']}{'  ·  **RECOMMENDED**' if d.get('recommended') else ''}", '', f"*{d['pitch']}*", '']
    items = d.get(list_key, [])
    if items:
        for i, s in enumerate(items):
            out.append(f'{i + 1}. {s}' if list_key == 'steps' else f'- {s}')
        out.append('')
    out += [f"- **Gameplay impact:** {d['impact']}", f"- **Implementation:** {d['impl']}", f"- **Tradeoffs:** {d['tradeoffs']}",
            f"- **Validate:** {d['validate']}", '']
    return out


def main():
    L = [f'# TIDEBREAKERS · {C.TITLE}', '', f'*{C.SUBTITLE}.* {C.VERSION}', '',
         '> **Authoritative design brief.** The illustrated version is `TIDEBREAKERS_World_and_Voyage_Bible.pdf` in this folder, '
         'laid out in GITCRAFT DesignCraft. This Markdown file and the PDF are generated from the same source '
         '(`source/content.py`), so they say the same thing. Implementation passes should read this file.', '']
    L += ['## 0 · How to use this bible', '', C.HOW_TO_USE['intro'], '']
    L += [f'- {r}' for r in C.HOW_TO_USE['rules']] + ['']
    L += ['**Contents:** ' + ' · '.join(C.HOW_TO_USE['reading']), '']

    D = C.DIAGNOSIS
    L += ['## 1 · Diagnosis', '', D['lede'], '', '| Area | What exists | Source |', '|---|---|---|']
    L += [f'| {k} | {v} | `{r}` |' for k, v, r in D['inventory']] + ['']
    L += ['**DESIGNCRAFT assessment:** ' + ' · '.join(f'{k} {v:g}/{m}' for k, v, m in D['score']), '', D['score_note'], '']
    L += [f'{i + 1}. **{k}.** {v}' for i, (k, v) in enumerate(D['problems'])] + ['']

    I = C.IDENTITY
    L += ['## 2 · Identity: pirates after the flood', '', I['lede'], '', '**Pillars**', '']
    L += [f'- **{k}:** {v}' for k, v in I['pillars']] + ['', '**Pirate vocabulary**', '']
    L += [f'- **{k}:** {v}' for k, v in I['pirate_vocab']] + ['', '**Never**', ''] + [f'- {n}' for n in I['never']] + ['']

    Wl = C.WORLD_LOOP
    L += ['## 3 · The World: one map, one loop, one legend', '', Wl['lede'], '', '**The loop:** ' + ' › '.join(f'{k} ({a})' for k, a, _ in Wl['loop']), '']
    L += [f'- **{k}:** {v}' for k, v in Wl['legend']] + ['', '| Region | Character | Places |', '|---|---|---|']
    L += [f'| {r} | {d} | {p} |' for r, d, p in Wl['regions']] + ['']

    L += ['## 4 · The Cast: 14 character sheets', '', C.CAST_SUMMARY, '', '**Relationships (proposed):** ' +
          '; '.join(f'{a}–{b} ({l})' for a, b, l in C.CAST_RELATIONS), '']
    for c in C.CAST:
        L += [f"### {c['name']} · {c['role']} · {c['pron']}", '',
              f"- **Home:** {c['home']}", f"- **Model:** {c['model']}", f"- **EXISTS:** {c['exists']} (lines in code: {c['lines_now']})",
              f"- **Want:** {c['want']}", f"- **Wound:** {c['wound']}", f"- **Voice:** {c['voice']}", '- **Arc:**']
        L += [f'  {i + 1}. *{reg}:* {txt}' for i, (reg, txt) in enumerate(c['arc'])]
        L += ['- **New lines by trigger:**'] + [f'  - `{trg}`: "{ln}"' for trg, ln in c['new_lines']]
        L += [f"- **Gameplay hook:** {c['hook']}", '']

    L += ['## 5 · The First Voyage', '', '**Today** (`FIRST_VOYAGE`, src/data/progress.ts:53):', '', '| # | id | Step | Kind | Note |', '|---|---|---|---|---|']
    L += [f'| {i + 1} | `{sid}` | {tx} | {k} | {n} |' for i, (sid, tx, k, n) in enumerate(C.VOYAGE_NOW)] + ['']
    L += [f'- **{k}:** {v}' for k, v in C.VOYAGE_FINDINGS] + ['']
    for key, lab in TIERS:
        L += proposal(C.VOYAGE_PROPOSALS[key], lab, 'steps')

    L += ['## 6 · Agency & Exploration', '', C.AGENCY['lede'], '']
    for key, lab in TIERS:
        L += proposal(C.AGENCY[key], lab, 'changes')

    Pg = C.PROGRESSION
    L += ['## 7 · Dinghy to Pirate Ship', '', Pg['lede'], ''] + [f'- **{k}:** {v}' for k, v in Pg['facts']] + ['']
    L += ['| Rank | Hull | Waters | Look |', '|---|---|---|---|'] + [f'| {a} | {b} | {c} | {d} |' for a, b, c, d in Pg['ranks']] + ['']
    for key, lab in TIERS:
        L += proposal(Pg[key], lab, 'changes')

    L += ['## 8 · Islands, Ports, Caves & Treasure', '', C.PLACES_RULE, '', '| Place | Who talks about it | Only here | Opened by | Reason to return |', '|---|---|---|---|---|']
    L += ['| ' + ' | '.join(r) + ' |' for r in C.PLACES] + ['', '### Caves', '', C.CAVES['lede'], '']
    for key, lab in TIERS:
        L += proposal(C.CAVES[key], lab, 'changes')
    L += ['### Treasure: the Redfinch Line', '', C.TREASURE['lede'], '', '| # | Map | State | Where | Needs | Prize |', '|---|---|---|---|---|---|']
    L += ['| ' + ' | '.join(r) + ' |' for r in C.TREASURE['maps']] + ['', '### Every upgrade opens a place', '', '| Upgrade | Opens | Person | Payoff |', '|---|---|---|---|']
    L += ['| ' + ' | '.join(r) + ' |' for r in C.UPGRADE_KEYS] + ['']

    L += ['## 9 · Gameplay examples', '']
    for ex in C.EXAMPLES:
        L += [f"### {ex['title']}", '', '| Time | What happens | Systems |', '|---|---|---|'] + [f'| {a} | {b} | {c} |' for a, b, c in ex['beats']] + ['']

    L += ['## 10 · Roadmap & implementation brief', '', '| # | Area | Tier | Proposal | Impact | Effort | Risk | Plan |', '|---|---|---|---|---|---|---|---|']
    L += [f'| {i + 1} | {a} | {t} | {ti} | {im} | {ef} | {r} | {rec} |' for i, (a, t, ti, im, ef, r, rec) in enumerate(C.MATRIX)] + ['']
    for t1, t2, items in C.PHASES:
        L += [f'### {t1}', '', f'*{t2}*', ''] + [f'- {it}' for it in items] + ['']
    L += ['### Schemas', '', '```ts', C.SCHEMAS, '```', '', '### Guardrails', ''] + [f'- {g}' for g in C.GUARDRAILS] + ['']
    L += ['### Acceptance: the pass is done when', '', '| Measure | Target | Today |', '|---|---|---|'] + [f'| {a} | {b} | {c} |' for a, b, c in C.ACCEPTANCE] + ['']
    with open(OUT, 'w') as f:
        f.write('\n'.join(L))
    print('wrote', os.path.abspath(OUT))


if __name__ == '__main__':
    main()
