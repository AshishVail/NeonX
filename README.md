# NeonX — Next-Gen AI Dashboard

A real-time AI operations dashboard built with a **glassmorphism + neon UI** aesthetic.

## Features

| Area | Details |
|---|---|
| **Theme** | Dark base (`#050510`), frosted-glass panels (`backdrop-filter: blur`), neon glow borders and shadows |
| **KPI Cards** | Live-updating accuracy, training speed, data volume, and active-model counts with colour-coded sparklines |
| **Performance Chart** | Chart.js line chart (24 h / 7 d / 30 d views) showing model accuracy, loss, and throughput |
| **Model Distribution** | Doughnut chart breaking down model types (Transformer, CNN, GAN, Diffusion, RL) |
| **Live Activity Feed** | Auto-scrolling event log that prepends new entries every few seconds |
| **System Monitor** | Animated GPU VRAM, CPU, RAM, temperature, and network I/O progress bars with live drift |
| **Top Models Panel** | Ranked model cards with neon accent colours |
| **Particle Background** | Canvas-based floating neon particles with connecting lines |
| **Responsive** | Collapsible sidebar, adaptive grid layouts down to mobile widths |

## Usage

No build step required — open `index.html` directly in any modern browser:

```bash
# Option 1 – open file directly
open index.html

# Option 2 – serve with a simple HTTP server (avoids CDN CORS issues on some setups)
npx serve .
# or
python3 -m http.server 8080
```

## Tech Stack

- Plain HTML5 / CSS3 / ES2020 JavaScript (zero build tooling)
- [Chart.js 4](https://www.chartjs.org/) via CDN for interactive charts
- [Font Awesome 6](https://fontawesome.com/) via CDN for icons
- Canvas API for the animated particle background

## Design Tokens

| Token | Value | Role |
|---|---|---|
| `--neon-cyan`   | `#00f5ff` | Primary accent / chart line |
| `--neon-purple` | `#bf00ff` | Secondary accent |
| `--neon-pink`   | `#ff00cc` | Alerts / loss metric |
| `--neon-green`  | `#00ff88` | Success / GPU status |
| `--bg-base`     | `#050510` | Page background |
| `--bg-panel`    | `rgba(255,255,255,0.04)` | Glass card background |

## License

[MIT](LICENSE)
