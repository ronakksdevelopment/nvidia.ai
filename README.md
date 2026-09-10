# NVIDIA AI Studio — Enterprise DGX Cloud

> Stitch-inspired dark glassmorphism landing page for NVIDIA AI Studio. Frontend-only, GitHub Pages ready.

![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![GitHub Pages](https://img.shields.io/badge/deploy-GitHub%20Pages-black)

## Overview

A production-ready, responsive landing page showcasing NVIDIA AI Studio's enterprise AI workspace. Built with clean semantic HTML5, modern CSS, and vanilla JavaScript — no frameworks, no dependencies, no build step.

### Features

- **Dark/Light Mode** — Toggle with system preference detection and localStorage persistence
- **Responsive Design** — Mobile-first, works on all screen sizes (320px to 4K)
- **Glassmorphism UI** — Frosted glass surfaces, NVIDIA green glow effects, layered depth
- **Scroll Animations** — IntersectionObserver-powered reveals with staggered timing
- **Accessible** — Semantic HTML5, ARIA labels, keyboard navigation, skip links, reduced motion
- **SEO Optimized** — Meta tags, Open Graph, Twitter Cards, robots.txt, sitemap.xml
- **GitHub Pages Ready** — No build step, no backend, deploy directly

### Tech Stack

| Technology | Usage |
|---|---|
| HTML5 | Semantic structure |
| CSS3 | Custom properties, Grid, Flexbox, Glassmorphism |
| JavaScript | Vanilla ES6+ modules, IntersectionObserver |
| Geist | Primary typeface |
| JetBrains Mono | Monospace / code typeface |
| Material Symbols | Icon system |

## Project Structure

```
project/
├── index.html              # Main entry page
├── 404.html                # Custom 404 page
├── robots.txt              # SEO robots directive
├── sitemap.xml             # XML sitemap
├── .gitignore              # Git ignore rules
├── .nojekyll               # Disable Jekyll on GitHub Pages
├── README.md               # This file
├── favicon/
│   └── favicon.svg         # SVG favicon
├── styles/
│   ├── main.css            # Design tokens, base styles, typography
│   ├── components.css      # All component styles (navbar, cards, etc.)
│   ├── animations.css      # Keyframes, scroll reveal, transitions
│   └── responsive.css      # Media queries and breakpoints
├── scripts/
│   ├── main.js             # App entry point and initialization
│   ├── theme.js            # Dark/light mode manager
│   ├── navigation.js       # Responsive nav, mobile menu, scroll
│   └── animations.js       # Scroll animation controller
├── assets/                 # Static assets (images, icons)
├── components/             # Reusable HTML partials (for reference)
└── pages/                  # Additional pages (if needed)
```

## Getting Started

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/nvidia-ai-studio.git
   cd nvidia-ai-studio
   ```

2. **Open in browser**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Using Node.js
   npx serve .
   
   # Using VS Code
   # Install "Live Server" extension, right-click index.html → Open with Live Server
   ```

3. **Visit** `http://localhost:8000`

### Deploy to GitHub Pages

1. Push this repository to GitHub
2. Go to **Settings → Pages**
3. Set source to **Deploy from a branch**
4. Select **main** branch and **/ (root)** folder
5. Click **Save** — your site will be live in ~60 seconds

## Design System

### Color Palette (Dark Mode)

| Token | Hex | Usage |
|---|---|---|
| Canvas | `#0B0D0E` | Page background |
| Surface Subtle | `#14171A` | Cards, sidebar |
| Surface Elevated | `#1E2328` | Floating panels |
| Border Default | `#2A313A` | Container borders |
| Primary | `#94da32` | Interactive green |
| Primary Container | `#76B900` | NVIDIA brand green |
| Text Primary | `#F2F5F8` | Headings & body |
| Text Secondary | `#9EACB9` | Supporting text |
| Text Muted | `#5E6C79` | Metadata & hints |

### Typography

- **Geist** — Headlines, body, navigation
- **JetBrains Mono** — Code, badges, telemetry, metadata

## License

MIT License — feel free to use, modify, and distribute.

---

*Accelerated by TensorRT-LLM & NeMo Guardrails*
