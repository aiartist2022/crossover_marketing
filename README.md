# Crossover Marketing — website

One-page site for **Crossover Marketing**, the marketing division of Crossover (Dubai · India).
Built on Theme 1, the same motion system as the Crossover Branding site: GSAP 3.13 + ScrollTrigger + SplitText + Lenis, with attribute-driven reveals. No build tools are needed to run it.

## Run it locally

```bash
python3 -m http.server 5190
# open http://localhost:5190
```

## Edit copy

- Page copy: `src/index.template.html`
- Services, selected work and reels: the lists at the top of `src/build.py`
- After editing either file, rebuild with:

```bash
python3 src/build.py      # writes index.html + images/favicon.svg
```

Do not edit `index.html` directly. It gets regenerated.

## Replace the placeholders

Every image and video slot uses a placeholder from `images/ph/`, stamped with its slot name and recommended size.

| Slot | Placeholder | Put the real file at | Size |
|---|---|---|---|
| Showreel (01 — Believe) | `images/ph/believe-reel.svg` (poster) | `videos/showreel.mp4` | 1920×1080, muted loop |
| Philosophy pinned frame | `images/ph/philo.svg` (poster) | `videos/philosophy.mp4` | 1920×1080, muted loop |
| Reels 01–04 | `images/ph/reel-1…4.svg` (posters) | `videos/reel-1…4.mp4` | 1080×1920 (9:16) |
| Services 01–08 | `images/ph/s01…s08.svg` | e.g. `images/work/s01.webp` → update path in `build.py` | 1600×1000 |
| Selected work 01–04 | `images/ph/w-project-1…4.svg` | e.g. `images/work/w-fuelfest.webp` → update `build.py` | 1600×1100 |
| Studio A / B | `images/ph/studio-a.svg`, `studio-b.svg` | update path in the template | 1200×1500 / 1600×1100 |
| How we work (full-bleed) | `images/ph/mission.svg` | update path in the template | 1920×1280 |
| Contact | `images/ph/contact.svg` | update path in the template | 1400×900 |

**Videos:** drop the `.mp4` into `videos/` with the exact name above and it plays automatically. The placeholder poster shows until then. Change `poster="…"` to a real still (webp/jpg) as well. Keep each loop under roughly 8 MB (H.264, no audio track).

**Images:** export as `.webp` at the sizes above, crop so heads aren't cut, then swap the path.

To regenerate the placeholder set, run `python3 src/placeholders.py`.

## To confirm before launch

- [ ] Selected work: FuelFest, Open Fire Food Festival, Culligan Middle East and Athletifreak are suggestions. Confirm them or swap, and write the one-line outcomes.
- [ ] Contact: the phone numbers and emails currently match the Branding site (purvak@). Change them if Marketing has its own inbox.
- [ ] "Book a call" dials +971 56 491 4000. Swap in a booking link if there is one.

## Structure

```
index.html              built page (generated)
css/crossover.css       all styles (1rem = 10px at 1440px, fluid)
js/crossover.js         motion system
images/                 Crossover Marketing logo (gradient / white / black), favicon, placeholders
videos/                 drop real video files here
src/                    template, build script, placeholder generator
```
