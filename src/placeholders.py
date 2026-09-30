"""Generate on-brand placeholder artwork for every image and video slot.

Each placeholder is an SVG named after its slot, stamped with the slot name and the
recommended export size. Replace a placeholder by dropping a real file into
images/ (or videos/) and updating the path in src/build.py or src/index.template.html.
Run:  python3 src/placeholders.py
"""
import pathlib, random

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'images/ph'
OUT.mkdir(parents=True, exist_ok=True)

# slot key, label, caption, width, height, kind ('image' | 'video')
SLOTS = [
    ('believe-reel', 'SHOWREEL', 'Marketing showreel — 16:9 loop', 1920, 1080, 'video'),
    ('philo', 'PHILOSOPHY', 'Pinned frame — 16:9 loop', 1920, 1080, 'video'),
    ('reel-1', 'REEL 01', 'Vertical reel — 9:16', 1080, 1920, 'video'),
    ('reel-2', 'REEL 02', 'Vertical reel — 9:16', 1080, 1920, 'video'),
    ('reel-3', 'REEL 03', 'Vertical reel — 9:16', 1080, 1920, 'video'),
    ('reel-4', 'REEL 04', 'Vertical reel — 9:16', 1080, 1920, 'video'),
    ('studio-a', 'STUDIO A', 'Team at work — portrait', 1200, 1500, 'image'),
    ('studio-b', 'STUDIO B', 'Shoot / behind the scenes', 1600, 1100, 'image'),
    ('mission', 'HOW WE WORK', 'Full-bleed — planning wall / edit suite', 1920, 1280, 'image'),
    ('contact', 'CONTACT', 'Team or studio — landscape', 1400, 900, 'image'),
] + [
    (f's{n:02d}', f'SERVICE {n:02d}', cap, 1600, 1000, 'image') for n, cap in enumerate([
        'Strategy — planning session', 'Social — account grid', 'Content — reel shoot',
        'Paid — ad creative set', 'Influencer — creator collab', 'Search — Google profile / site',
        'Campaign — hoarding / OOH', 'PR — founder feature'], 1)
] + [
    (f'w-{k}', f'WORK {n:02d}', cap, 1600, 1100, 'image') for n, (k, cap) in enumerate([
        ('project-1', 'Selected project — hero frame'), ('project-2', 'Selected project — hero frame'),
        ('project-3', 'Selected project — hero frame'), ('project-4', 'Selected project — hero frame')], 1)
]

PALETTES = [('#EFE4D3', '#D9C3A3', '#B48655'), ('#E9DCC8', '#CDBBA6', '#9B7953'),
            ('#F2EADF', '#DCC9B0', '#AE9679'), ('#E4D5C0', '#C9B08E', '#87663F')]


def svg(key, label, caption, w, h, kind):
    rnd = random.Random(key)
    a, b, c = rnd.choice(PALETTES)
    s = min(w, h)
    cx, cy = w * rnd.uniform(.38, .62), h * rnd.uniform(.4, .6)
    beams = ''.join(f'<rect x="{w * rnd.uniform(.1, .8):.0f}" y="{-h}" width="{s * rnd.uniform(.08, .2):.0f}" height="{h * 3}" fill="url(#beam)"/>' for _ in range(2))
    if kind == 'video':
        r = s * .09
        motif = (f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r * 1.9:.0f}" fill="none" stroke="#5C3F27" stroke-opacity=".35" stroke-width="{s * .004:.1f}"/>'
                 f'<circle cx="{cx:.0f}" cy="{cy:.0f}" r="{r * 1.35:.0f}" fill="#F5EFE6" fill-opacity=".55"/>'
                 f'<path d="M{cx - r * .45:.0f} {cy - r * .62:.0f} L{cx + r * .7:.0f} {cy:.0f} L{cx - r * .45:.0f} {cy + r * .62:.0f} Z" fill="#5C3F27" fill-opacity=".8"/>')
        tag = 'VIDEO PLACEHOLDER'
    else:
        r = s * rnd.uniform(.14, .2)
        motif = (f'<rect x="{cx - r * 1.2:.0f}" y="{cy - r * 1.5:.0f}" width="{r * 2.4:.0f}" height="{r * 3:.0f}" rx="{r * 1.2:.0f}" fill="url(#arch)"/>'
                 f'<circle cx="{cx + r * 1.3:.0f}" cy="{cy + r * .9:.0f}" r="{r * .6:.0f}" fill="url(#sph)"/>')
        tag = 'IMAGE PLACEHOLDER'
    fs = s * .022
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{a}"/><stop offset=".6" stop-color="{b}"/><stop offset="1" stop-color="{c}"/></linearGradient>
<linearGradient id="arch" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="{c}" stop-opacity=".55"/><stop offset="1" stop-color="{a}" stop-opacity=".9"/></linearGradient>
<radialGradient id="sph" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="{a}"/><stop offset=".7" stop-color="{b}"/><stop offset="1" stop-color="{c}"/></radialGradient>
<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<filter id="g"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .3  0 0 0 0 .22  0 0 0 0 .15  0 0 0 .09 0"/></filter>
</defs>
<rect width="{w}" height="{h}" fill="url(#bg)"/>
<g transform="rotate(35 {w / 2:.0f} {h / 2:.0f})">{beams}</g>
{motif}
<rect width="{w}" height="{h}" filter="url(#g)"/>
<g font-family="IBM Plex Mono, Menlo, monospace" fill="#5C3F27" opacity=".78">
<text x="{s * .04:.0f}" y="{s * .06:.0f}" font-size="{fs:.1f}" letter-spacing="2">{tag} · {label}</text>
<text x="{s * .04:.0f}" y="{h - s * .04:.0f}" font-size="{fs * 1.1:.1f}" letter-spacing="1">{caption}</text>
<text x="{w - s * .04:.0f}" y="{h - s * .04:.0f}" font-size="{fs:.1f}" text-anchor="end" letter-spacing="1">{w}×{h}</text>
</g></svg>'''


for slot in SLOTS:
    (OUT / f'{slot[0]}.svg').write_text(svg(*slot))
print(f'wrote {len(SLOTS)} placeholders to', OUT)
