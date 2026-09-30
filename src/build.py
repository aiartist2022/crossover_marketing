"""Assemble index.html from index.template.html.

Injects the Crossover logo as inline SVG (so paths can be animated individually)
and renders the services and work lists for Crossover Marketing.
Run:  python3 src/build.py
"""
import re, pathlib, html

ROOT = pathlib.Path(__file__).resolve().parent.parent
logo_src = (ROOT / 'images/crossover-marketing-logo-gradient.svg').read_text()
PATHS = re.findall(r'<path([^>]*)/>', logo_src)  # 13 "crossover" paths, then 9 "MARKETING" letters
VIEWBOX = '0 0 774.99 166.65'
GRAD = ('<defs><linearGradient id="{id}" gradientUnits="userSpaceOnUse" x1="0" y1="217.85" x2="0" y2="-23.99">'
        '<stop offset="0" stop-color="#64432C"/><stop offset="1" stop-color="#B48655"/></linearGradient></defs>')


def logo(cls, fill, grad_id=None, idx=None):
    out = []
    for i, attrs in enumerate(PATHS):
        if idx is not None and i not in idx:
            continue
        a = attrs.replace('url(#cg)', fill if not grad_id else f'url(#{grad_id})')
        row = 'word' if i < 13 else 'brand'
        out.append(f'<path class="lp" data-row="{row}"{a}/>')
    uid = grad_id or cls.split()[-1]
    defs = (GRAD.format(id=grad_id) if grad_id else '')
    defs += (f'<defs><clipPath id="{uid}-cw"><rect x="-2" y="-2" width="780" height="99"/></clipPath>'
             f'<clipPath id="{uid}-cb"><rect x="-2" y="108" width="780" height="60"/></clipPath></defs>')
    word = ''.join(o for o in out if 'data-row="word"' in o)
    brand = ''.join(o for o in out if 'data-row="brand"' in o)
    body = f'<g clip-path="url(#{uid}-cw)">{word}</g><g clip-path="url(#{uid}-cb)">{brand}</g>'
    return f'<svg class="{cls}" viewBox="{VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">{defs}{body}</svg>'


def loader_logo():
    """Loader lockup: the first "o" (brand mark) sits in its own unclipped group so it can
    start large at the centre and travel home; the other letters rise inside their masks."""
    def p(i, cls):
        a = PATHS[i].replace('url(#cg)', 'url(#cg-load)')
        return f'<path class="{cls}"{a}/>'
    shards = ''.join(p(i, f'loader-shard mk-{n}') for n, i in zip('abc', (7, 8, 9)))
    word = ''.join(p(i, 'loader-lw') for i in (0, 1, 2, 3, 4, 5, 6, 10, 11, 12))
    brand = ''.join(p(i, 'loader-lb') for i in range(13, len(PATHS)))
    defs = ('<defs><linearGradient id="cg-load" gradientUnits="userSpaceOnUse" x1="0" y1="190" x2="0" y2="-20">'
            '<stop offset="0" stop-color="var(--bronze-l)"/><stop offset="1" stop-color="var(--gold)"/></linearGradient>'
            '<clipPath id="load-cw"><rect x="-2" y="-2" width="780" height="99"/></clipPath>'
            '<clipPath id="load-cb"><rect x="-2" y="108" width="780" height="60"/></clipPath></defs>')
    body = (f'<g clip-path="url(#load-cw)">{word}</g><g clip-path="url(#load-cb)">{brand}</g>'
            f'<g class="loader-mark">{shards}</g>')
    return f'<svg class="loader-svg" viewBox="{VIEWBOX}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">{defs}{body}</svg>'


def mark():
    parts = []
    for n, i in zip('abc', (7, 8, 9)):
        a = PATHS[i].replace('url(#cg)', 'currentColor')
        parts.append(f'<path class="mk mk-{n}"{a}/>')
    return f'<svg class="mark-svg" viewBox="156 0 96 95" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">{"".join(parts)}</svg>'


SERVICES = [
    ("Marketing Strategy", "The plan every post, ad and campaign is measured against.",
     ["Know what marketing has to make happen for the business.",
      "Know exactly who you are talking to, and what they should do next.",
      "A channel mix and a monthly calendar your team can sign off on.",
      "Or a strategy only: we write the plan, your team runs it."]),
    ("Social Media Management", "Your accounts, run end to end: strategy, calendar, posting and community.",
     ["A monthly calendar across Instagram, LinkedIn, YouTube and Facebook.",
      "Posts, reels, stories and captions in one consistent voice.",
      "Comments and DMs answered, with hot leads handed straight to your team.",
      "Sign off post by post, or a month at a time."]),
    ("Content & Reels", "Content made by filmmakers, built for the feed.",
     ["Monthly shoot days for product, space, people and process.",
      "Founder-led content that people actually watch.",
      "Reels, carousels and stories cut for every platform.",
      "Or content only: we make it, your team posts it."]),
    ("Paid Media & Performance", "Ads that are built around a result you define, not around vanity numbers.",
     ["Meta, Instagram, Google Search, YouTube and LinkedIn campaigns.",
      "Lead generation, retargeting, WhatsApp, email and SMS follow-up.",
      "Tracking set up so you know what a lead actually costs.",
      "Your ad accounts stay yours. Always."]),
    ("Influencer & Creator", "The right voices, not just the biggest ones.",
     ["Big names or many smaller creators, depending on the goal.",
      "Paid, barter and affiliate collaborations.",
      "Briefing, contracts, content approvals and usage rights handled."]),
    ("Search & SEO", "Be found when people are already looking.",
     ["Website search visibility for the terms that bring enquiries.",
      "Google Business Profile set up, managed and reviewed.",
      "Local search for every city and location that matters."]),
    ("Campaigns, OOH & Traditional", "One idea, carried across every channel it needs.",
     ["Launches, festive and seasonal pushes.",
      "Hoardings, transit, mall, airport and retail branding.",
      "Print, radio, TV and cinema.",
      "Artwork adapted to every size and language."]),
    ("PR & Founder Presence", "Reputation built through the people and publications your audience trusts.",
     ["Press and media relations.",
      "Founder profiles and industry features.",
      "Founder and leadership LinkedIn, written and run for you."]),
]


# placeholder image shown for each service (images/ph/sNN.svg)
WORK = ["Strategy placeholder", "Social media placeholder", "Content shoot placeholder", "Paid media placeholder",
        "Influencer placeholder", "Search placeholder", "Campaign / OOH placeholder", "PR placeholder"]

# selected work (images/ph/w-project-N.svg) — CONFIRM PROJECTS, then swap names, copy and images
PROJECTS = [
    ("project-1", "FuelFest", "Event marketing · Social · Content",
     "One line on the brief, and what the work made happen.", "FuelFest — placeholder"),
    ("project-2", "Open Fire Food Festival", "Launch · Social · Influencer",
     "One line on the brief, and what the work made happen.", "Open Fire Food Festival — placeholder"),
    ("project-3", "Culligan Middle East", "Content · Paid media",
     "One line on the brief, and what the work made happen.", "Culligan Middle East — placeholder"),
    ("project-4", "Athletifreak", "Social · Reels · Community",
     "One line on the brief, and what the work made happen.", "Athletifreak — placeholder"),
]


def works():
    out = []
    for n, (key, name, tags, short, alt) in enumerate(PROJECTS, 1):
        e = html.escape
        out.append(f'''
        <article class="work-item wi-{n}" data-cursor="{e(name.lower())}">
          <div class="work-media"><div class="work-media-in"><img class="work-img" src="images/ph/w-{key}.svg" alt="{e(alt)}" loading="lazy"></div></div>
          <div class="work-meta"><h3 class="work-name" line>{e(name)}</h3><span class="label work-num">{n:02d}</span></div>
          <p class="work-tags label" line>{e(tags)}</p>
          <p class="work-short p-m" line>{e(short)}</p>
        </article>''')
    return ''.join(out)


REELS = [("reel-1", "Launch teaser"), ("reel-2", "Founder-led"), ("reel-3", "Product in motion"), ("reel-4", "Behind the scenes")]


def reels():
    """Vertical 9:16 reel slots. Drop real files in videos/reel-N.mp4 (poster: images/ph/reel-N.svg)."""
    out = []
    offs = [-6, 4, -10, 2]
    for n, (key, cap) in enumerate(REELS, 1):
        e = html.escape
        out.append(f'''
        <figure class="reel-card rc-{n}" parallax parallax-y="{offs[n - 1]}" data-cursor="play">
          <div class="reel-card-media"><video src="videos/{key}.mp4" poster="images/ph/{key}.svg" autoplay muted loop playsinline preload="none" aria-label="{e(cap)}"></video></div>
          <figcaption class="label reel-card-cap"><span>{n:02d}</span><span>{e(cap)}</span></figcaption>
        </figure>''')
    return ''.join(out)


def services():
    out = []
    for n, (title, short, bullets) in enumerate(SERVICES, 1):
        e = html.escape
        lis = ''.join(f'<li opacity>{e(b)}</li>' for b in bullets)
        out.append(f'''
        <article class="service-item si-{n}" data-idx="{n:02d}">
          <div class="service-head"><span class="label service-num">{n:02d}</span><h3 class="service-title" line>{e(title)}</h3></div>
          <p class="service-short p-m" line>{e(short)}</p>
          <div class="service-media" data-cursor="explore"><div class="service-media-in"><img src="images/ph/s{n:02d}.svg" alt="{e(WORK[n - 1])}" loading="lazy"></div></div>
          <ul class="service-bullets p-s">{lis}</ul>
        </article>''')
    return ''.join(out)


tpl = (ROOT / 'src/index.template.html').read_text()
out = (tpl
       .replace('{{LOGO_HERO}}', logo('logo-svg hero-svg', None, 'cg-hero'))
       .replace('{{LOGO_FOOTER}}', logo('logo-svg footer-svg', None, 'cg-foot'))
       .replace('{{LOGO_CURRENT}}', logo('logo-svg nav-svg', 'currentColor'))
       .replace('{{LOGO_LOADER}}', loader_logo())
       .replace('{{MARK}}', mark())
       .replace('{{SERVICES}}', services())
       .replace('{{WORKS}}', works())
       .replace('{{REELS}}', reels()))
(ROOT / 'index.html').write_text(out)

fav = mark().replace('currentColor', '#916941').replace('class="mark-svg" ', '')
(ROOT / 'images/favicon.svg').write_text(fav)
print('built index.html', len(out), 'chars')
