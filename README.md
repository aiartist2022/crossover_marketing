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

## Images and video

All photography lives in `images/work/`, cropped from `WEBSITE IMAGES/NEW` and exported as webp.

| Slot | File | Source |
|---|---|---|
| Showreel poster (01 — Believe) | `showreel-poster.webp` | Karan — Met Gala 2026 (press pit) |
| Services 01–08 | `s01…s08.webp` | JULY, Priyanka Chopra Jonas — New York, Tejaswi — Campaign, Homebound |
| Reels 01–04 posters | `reel-1…4-poster.webp` | JULY, Tejaswi — Campaign, Priyanka Chopra Jonas — New York |
| Selected work | `w-july`, `w-pcj-newyork`, `w-homebound`, `w-karan-metgala` | matching project folders |
| Philosophy poster | `philo-poster.webp` | Tejaswi Portfolio (desert) |
| Studio A / B | `studio-a.webp`, `studio-b.webp` | PCJ — The Oscars prep, Homebound audience |
| How we work | `mission.webp` | Priyanka Chopra Jonas — New York |
| Contact | `contact.webp` | Tejaswi Portfolio (bronze gown) |

**Videos still to add.** The showreel, the Philosophy frame and the four reels are `<video>` slots that currently show the stills above as posters. Drop these files into `videos/` and they play automatically:

| File | Format |
|---|---|
| `videos/showreel.mp4` | 1920×1080, muted loop |
| `videos/philosophy.mp4` | 1920×1080, muted loop |
| `videos/reel-1.mp4` … `reel-4.mp4` | 1080×1920 (9:16) |

Keep each loop under roughly 8 MB (H.264, no audio track).

To swap an image, export a webp at the same size and replace the file, or change the path in `src/build.py` (services, work, reels) or `src/index.template.html` (everything else), then rebuild. `python3 src/placeholders.py` regenerates labelled placeholder art in `images/ph/` if you need blank slots again.

## To confirm before launch

- [ ] Selected work: check the one-line descriptions for JULY, Priyanka Chopra Jonas — New York, Homebound and Karan — Met Gala 2026.
- [ ] Get sign-off for using celebrity and client imagery on a marketing site.
- [ ] Contact: the phone numbers and emails currently match the Branding site (purvak@). Change them if Marketing has its own inbox.
- [ ] "Book a call" dials +971 56 491 4000. Swap in a booking link if there is one.

## Structure

```
index.html              built page (generated)
css/crossover.css       all styles (1rem = 10px at 1440px, fluid)
js/crossover.js         motion system
images/                 Crossover Marketing logo (gradient / white / black), favicon, work/ photography
videos/                 drop real video files here
src/                    template, build script, placeholder generator
```
