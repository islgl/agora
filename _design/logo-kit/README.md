# Agora — Brand Mark

The identity for **ἀγορά**, a humanist design system for the reading mind.

A compass of eight olive leaves around a wine-dark point.

---

## Quick start

- **Designers**: open `agora-brand-guidelines.html` in a browser. Full brand spec.
- **Developers**: open `EMBED.md`. Copy-paste SVG/React/favicon snippets.
- **Everyone else**: the SVGs in `svg/` are the canonical assets. Use `agora-mark.svg` by default.

---

## Files

```
agora-brand/
├── README.md                     ← this file
├── EMBED.md                      ← copy-paste code snippets
├── agora-brand-guidelines.html    ← visual brand spec, open in browser
│
├── svg/                          ← canonical vector assets (use these)
│   ├── agora-mark.svg             ← default: ink + wine
│   ├── agora-mark-mono.svg        ← single-color (currentColor-aware)
│   ├── agora-mark-inverse.svg     ← for dark backgrounds
│   ├── agora-favicon.svg          ← 16–32 px optimized, thicker leaves
│   ├── agora-lockup.svg           ← mark + wordmark lockup
│   ├── agora-og.svg               ← 1200×630 social share card
│   └── apple-touch-icon.svg      ← 180×180 padded, for iOS home screen
│
├── png/                          ← rasterized for places that need PNG
│   ├── agora-mark-{16…1024}.png
│   ├── agora-mark-{256,512,1024}-transparent.png
│   ├── agora-mark-inverse-{256,512,1024}.png
│   └── agora-og-1200x630.png
│
└── favicon/                      ← site head <link> targets
    ├── favicon.ico               ← multi-res 16/32/48 ICO
    ├── favicon-{16,32,48,64}.png
    ├── apple-touch-icon.png      ← 180×180
    └── android-chrome-{192,512}.png
```

---

## The palette

| Token               | Light mode  | Dark mode  |
|---------------------|-------------|------------|
| `--agora-ink`        | `#1a1814`   | `#ece3cf`  |
| `--agora-wine`       | `#6e2f3a`   | `#c08b97`  |
| `--agora-paper`      | `#fdfcf9`   | `#15140f`  |

The mark uses only the first two. Background is your choice — anything warm works.

---

## Construction

Eight almond-shaped leaves radiate from a central wine-dark dot:

- **4 long leaves** on the cardinal axes (N/E/S/W), tip at radius 84
- **4 short leaves** on the diagonals (NE/SE/SW/NW), tip at radius 58
- **1 center dot**, radius 5, in `--agora-wine`
- Inner breath: each leaf's inner end stops at radius 14, leaving a small void around the dot

Viewbox is `0 0 200 200`. Scales cleanly down to 16 px (favicon variant drops the dot; standard variant keeps it down to 24 px).

---

## Font caveat for PNG renders

SVGs that include text (`agora-lockup.svg`, `agora-og.svg`) reference
**Cormorant Garamond**, **EB Garamond**, **GFS Didot**, and **Cormorant SC**
via the tokens stylesheet. Browsers will load these from Google Fonts
automatically. In the provided PNG exports, these fonts fell back to a
default sans-serif because the render environment couldn't fetch them —
but the SVG source is correct, and any browser viewing these SVGs will
render them in the intended typography. If you need the PNGs with real
Cormorant, re-render locally with the fonts installed, or export them
from a browser screenshot.

---

## License

Use freely within the Agora system. Don't sell it as a generic icon pack.
