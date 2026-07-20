# Cortex Landing Page — Design System v3 (supersedes v2/obsidian)

Generated from `ui-ux-pro-max` v2.11.0 (updated via `ui-ux-pro-max-cli`). This is a **complete fresh redesign** of the landing page only — a new trust-blue + orange palette, light mode only (no dark panels anywhere), decoupled from the dashboard's warm-paper/plum `--cx-*` system. The dashboard is untouched and will look like a different product until/unless it's migrated too — accepted tradeoff.

Tokens use a `--lp-*` (Landing Page) prefix, kept separate from `--cx-*` so nothing in the dashboard breaks.

---

## 1. Color System

Source: `ui-ux-pro-max` colors.csv, "SaaS (General)" — trust blue + WCAG-adjusted orange CTA.

```css
--lp-bg:           #f8fafc;  /* slate-50, cool near-white page background */
--lp-surface:      #ffffff;  /* cards */
--lp-surface-2:    #f1f5f9;  /* recessed panels, alt rows */
--lp-ink:          #0f172a;  /* headings */
--lp-ink-2:        #1e293b;  /* body-emphasis */
--lp-mute-1:       #475569;  /* body text */
--lp-mute-2:       #64748b;  /* secondary / placeholder */
--lp-border:       #e2e8f0;
--lp-border-2:     #cbd5e1;
--lp-primary:      #2563eb;  /* trust blue — brand + technical accent */
--lp-primary-2:    #3b82f6;
--lp-primary-wash: #eef4ff;
--lp-primary-line: #c7ddff;
--lp-accent:       #ea580c;  /* CTA orange — conversion actions ONLY */
--lp-accent-2:     #f2762e;
--lp-accent-wash:  #fff1e8;
--lp-ok:           #16a34a;
--lp-ok-wash:      #eafaf0;
--lp-err:          #dc2626;
```

**Role discipline:** blue is the brand/technical color — nav, links, technical tags, the Architecture pipeline's "active" indicator. Orange is reserved *only* for primary conversion buttons (Hero CTA, final CTA section) so it keeps its signal value. Don't let orange bleed into decorative use.

---

## 2. Typography

Source: `ui-ux-pro-max` typography.csv, "Friendly SaaS" pairing.

- **Font:** Plus Jakarta Sans (single family, headings + body) — geometric, modern, warmer than Inter/Geist without losing technical credibility.
- Scoped to the landing page only via a `.lp-font` wrapper class — the dashboard keeps Geist.
- Technical labels/tags/step numbers keep **Geist Mono** (already loaded sitewide, zero extra cost) — same rule as before: data reads as data.

| Role | Weight | Size |
|---|---|---|
| Hero H1 | 700, tracking -0.03em | `text-5xl md:text-7xl` |
| Section H2 | 700, tracking -0.02em | `text-3xl md:text-4xl` |
| Body | 400 | `text-[15px]–[17px]` |
| Mono tags/labels | Geist Mono 500 | `text-[10.5px]–[11px]` uppercase |

---

## 3. Style Direction

- **Glassmorphism** (light mode) for panels — frosted white cards over a soft abstract gradient background, not a photographic landscape.
- **Bento Box Grid** for Features — varied tile spans (1x1/2x1/2x2), rounded-[1.5–2rem], soft shadows, hover scale/lift.
- Background: replace the old Ken Burns landscape photo with an abstract light mesh-gradient (soft blue + orange radial blooms on `--lp-bg`), consistent with "vibrant background, light source, depth" from the Glassmorphism style entry.

---

## 4. Section-by-section

- **Navbar** — light, blue link-hover, blue "Get Started" pill.
- **Hero** — same tuned motion timing as before; new palette; mockup chrome in blue.
- **Architecture** — was a dark obsidian panel; now a **light** panel (`--lp-surface-2` bg, `--lp-border`), same 6 real pipeline nodes (Ingest, 768-dim Matryoshka embed, Hybrid RRF k=60, gemini-3.1-flash-lite re-rank, agentic Tavily decision, SSE gemini-2.5-flash stream), blue used as the "active/live" indicator instead of green-on-black.
- **Features** — same 7-tile bento content (Hybrid Search, pgvector/768-dim, re-ranking, SSE streaming, agentic tool use, citations), restyled blue.
- **CTA** — orange primary button (the palette's designated conversion color), light panel.
- **Footer** — restyled to `--lp-*`, drop hardcoded `#000`.

All existing motion rules (ease `[0.16,1,0.3,1]`, spring `{stiffness:380,damping:22}`, scroll-triggered stagger, `useReducedMotion` gating) carry over unchanged — only color/type/background change in this pass.
