# Agora — Embed Snippets

Copy-paste ready code for using the Agora mark in your site / app / React component / markdown.

---

## 1. Inline SVG (HTML)

Drop this anywhere in your HTML. The `currentColor` trick means the mark will adopt whatever text color its parent has.

```html
<!-- Canonical two-color mark -->
<svg viewBox="0 0 200 200" width="48" height="48" aria-label="Agora"
     style="color:#1a1814">
  <g transform="translate(100,100)" fill="currentColor">
    <g id="agora-l"><path d="M 0,-14 C 7,-42 7,-64 0,-84 C -7,-64 -7,-42 0,-14 Z"/></g>
    <use href="#agora-l"/>
    <use href="#agora-l" transform="rotate(90)"/>
    <use href="#agora-l" transform="rotate(180)"/>
    <use href="#agora-l" transform="rotate(270)"/>
    <g id="agora-s"><path d="M 0,-12 C 5,-30 5,-46 0,-58 C -5,-46 -5,-30 0,-12 Z"/></g>
    <use href="#agora-s" transform="rotate(45)"/>
    <use href="#agora-s" transform="rotate(135)"/>
    <use href="#agora-s" transform="rotate(225)"/>
    <use href="#agora-s" transform="rotate(315)"/>
  </g>
  <circle cx="100" cy="100" r="5" fill="#6e2f3a"/>
</svg>
```

---

## 2. React component

```jsx
export function AgoraMark({ size = 48, dot = true, className = '', ...rest }) {
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      aria-label="Agora"
      {...rest}
    >
      <g transform="translate(100,100)" fill="currentColor">
        <g id="nl">
          <path d="M 0,-14 C 7,-42 7,-64 0,-84 C -7,-64 -7,-42 0,-14 Z" />
        </g>
        <use href="#nl" />
        <use href="#nl" transform="rotate(90)" />
        <use href="#nl" transform="rotate(180)" />
        <use href="#nl" transform="rotate(270)" />
        <g id="ns">
          <path d="M 0,-12 C 5,-30 5,-46 0,-58 C -5,-46 -5,-30 0,-12 Z" />
        </g>
        <use href="#ns" transform="rotate(45)" />
        <use href="#ns" transform="rotate(135)" />
        <use href="#ns" transform="rotate(225)" />
        <use href="#ns" transform="rotate(315)" />
      </g>
      {dot && <circle cx="100" cy="100" r="5" fill="var(--agora-wine, #6e2f3a)" />}
    </svg>
  );
}

// Usage:
// <AgoraMark size={32} />                 ← default, with wine dot
// <AgoraMark size={16} dot={false} />     ← small, no dot (favicon-like)
// <AgoraMark size={64} style={{ color: '#ece3cf' }} />  ← inverse on dark
```

---

## 3. Favicon `<link>` tags

Put these in your `<head>` and upload the files to your site's root:

```html
<link rel="icon" type="image/svg+xml" href="/agora-favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
<link rel="icon" type="image/x-icon" href="/favicon.ico">
```

For PWAs, add a `site.webmanifest`:

```json
{
  "name": "Agora",
  "short_name": "Agora",
  "icons": [
    { "src": "/android-chrome-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/android-chrome-512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#1a1814",
  "background_color": "#fdfcf9",
  "display": "standalone"
}
```

---

## 4. OG / social meta tags

```html
<meta property="og:title" content="Agora — A Design System for the Reading Mind">
<meta property="og:description" content="A humanist theme for long-form thought.">
<meta property="og:image" content="https://agora.lglgl.me/agora-og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://agora.lglgl.me/agora-og.png">
```

---

## 5. Markdown (GitHub READMEs, etc.)

```markdown
<p align="center">
  <img src="./agora-brand/png/agora-mark-256.png" width="96" alt="Agora">
</p>

<h1 align="center">Agora</h1>

<p align="center">
  <em>ἀγορά · a design system for the reading mind.</em>
</p>
```

---

## 6. CSS-only mask (if you need it as a CSS background)

```css
.agora-icon {
  width: 24px;
  height: 24px;
  background-color: currentColor;
  mask: url('/agora-favicon.svg') no-repeat center / contain;
  -webkit-mask: url('/agora-favicon.svg') no-repeat center / contain;
}
```

This lets the mark inherit the current text color, which is useful inside links, buttons, etc.
