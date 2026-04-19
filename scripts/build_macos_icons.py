# /// script
# requires-python = ">=3.10"
# dependencies = ["Pillow>=10"]
# ///
"""
Rebuild Tauri bundle icons from a single square master PNG, applying the
macOS app-icon template (824-px content on a 1024-px canvas with
R=185 rounded corners and transparent padding). Big Sur+ renders its
own drop shadow, so none is baked in.

Usage:
  uv run scripts/build_macos_icons.py [path/to/source.png]

Regenerates:
  src-tauri/icons/{32x32,64x64,128x128,128x128@2x,icon}.png
  src-tauri/icons/icon.icns   (via iconutil)
  src-tauri/icons/icon.ico    (multi-size)
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw

# --- Apple macOS icon template (Big Sur+) -------------------------------
# All dimensions expressed in the 1024-px canvas space; scaled
# proportionally for smaller exports.
BASE = 1024
INSET = 100                 # transparent padding on each side
CONTENT = BASE - 2 * INSET  # 824
CORNER = 185                # rounded-rect corner radius

REPO_ROOT = Path(__file__).resolve().parent.parent
# `assets/icon-source.png` is the raw square master kept out of the
# squircle pipeline so this script is idempotent — re-running won't
# re-mask an already-squircled output.
DEFAULT_SRC = REPO_ROOT / "assets" / "icon-source.png"
OUT_DIR = REPO_ROOT / "src-tauri" / "icons"


def _scaled(val: int, size: int) -> int:
    return max(1, round(val * size / BASE))


def _build(src: Image.Image, size: int) -> Image.Image:
    """Render the icon at an arbitrary square size using the template
    metrics scaled from the 1024 reference."""
    inset = _scaled(INSET, size)
    content = size - 2 * inset
    radius = _scaled(CORNER, size)

    # Squircle approximation — Pillow's rounded_rectangle uses quarter
    # circles rather than a continuous-corner superellipse. The delta
    # from a true Apple squircle is imperceptible at Dock / Finder
    # rendering sizes.
    mask = Image.new("L", (content, content), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (0, 0, content, content), radius=radius, fill=255
    )

    body = src.resize((content, content), Image.LANCZOS)
    masked = Image.new("RGBA", (content, content), (0, 0, 0, 0))
    masked.paste(body, (0, 0), mask)

    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.paste(masked, (inset, inset), masked)
    return canvas


def main() -> int:
    src_path = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else DEFAULT_SRC
    if not src_path.exists():
        print(f"source not found: {src_path}", file=sys.stderr)
        return 2

    src = Image.open(src_path).convert("RGBA")
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # Tauri-declared bundle targets.
    tauri_targets = {
        "32x32.png": 32,
        "64x64.png": 64,
        "128x128.png": 128,
        "128x128@2x.png": 256,
        "icon.png": 512,
    }
    for name, sz in tauri_targets.items():
        _build(src, sz).save(OUT_DIR / name)

    # .iconset → .icns via Apple's iconutil. Keeps the exact filename
    # mapping Apple expects for each (size, scale) combination.
    iconset = OUT_DIR / "icon.iconset"
    if iconset.exists():
        shutil.rmtree(iconset)
    iconset.mkdir()
    iconset_targets = {
        "icon_16x16.png": 16,
        "icon_16x16@2x.png": 32,
        "icon_32x32.png": 32,
        "icon_32x32@2x.png": 64,
        "icon_128x128.png": 128,
        "icon_128x128@2x.png": 256,
        "icon_256x256.png": 256,
        "icon_256x256@2x.png": 512,
        "icon_512x512.png": 512,
        "icon_512x512@2x.png": 1024,
    }
    for name, sz in iconset_targets.items():
        _build(src, sz).save(iconset / name)

    icns_path = OUT_DIR / "icon.icns"
    subprocess.run(
        ["iconutil", "-c", "icns", str(iconset), "-o", str(icns_path)],
        check=True,
    )
    shutil.rmtree(iconset)

    # Windows multi-size .ico. Embedding all common sizes lets the OS
    # pick the right one for taskbar / window chrome.
    ico_sizes = [16, 32, 48, 64, 128, 256]
    ico_imgs = [_build(src, s) for s in ico_sizes]
    ico_imgs[-1].save(
        OUT_DIR / "icon.ico",
        format="ICO",
        sizes=[(s, s) for s in ico_sizes],
    )

    print(f"icons rebuilt from {src_path.name} → {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
