## Demo walkthrough — minimal color refinement

Scope: `src/components/DemoWalkthrough.tsx` only. No app, token, or memory changes.

### New surface palette

Replace per-slide bright backgrounds with a single muted dark-beige/mud across all slides except the final cream one.

- Slide background: `#2A2520` (dark mud-beige), text light
- Card on slide: `#332E28` with 1px hairline `rgba(255,255,255,0.08)`
- Final slide: keep cream `#F5F3EE`, text dark

### Role color (kept, minimal)

Color appears only in the role marker at the top of each slide — the dot + the eyebrow label + a 1px underline beneath the role label. Nothing else on the slide carries hue.

- PM → orange `#C1531E`
- Contractor → blue `#60A5FA`
- AI → neutral white (no hue, AI is the system voice)
- Client → green `#3D7A5A`

`dotColor` field already exists per slide; we extend it to also tint the eyebrow text and the small underline.

### Inside cards — strip color

- StatusPill / ChecklistPill: drop green `#1A3D2B` / amber `#3D2A0A` filled backgrounds. Use a single muted row style `rgba(255,255,255,0.05)` with a small leading dot:
  - done → muted dot `rgba(255,255,255,0.45)` + label "done"
  - in progress → white dot + label "in progress"
  - todo → hollow ring + label "to do"
- Progress bars: single white fill on `rgba(255,255,255,0.12)` track. Drop dual-color (green + amber) split.
- AI check rows: drop colored ✓/△ and colored result pills. Use neutral mono labels; the one flag becomes "1 flag" muted text at the bottom. Remove the pulsing green "LIVE" indicator.
- Approval card: replace the green "approved with condition" filled block with a hairline-bordered row, neutral text.
- Client payment card: numbers all in white/muted — drop green `£63,000` and amber `£11,000` accents. The "this payment" amount stays larger via type weight, not color.

### Iconography

Remove all emoji (💬 📷 📍 🎙 ✓ △ ○ →). Replace with text labels and small hairline-bordered squares where an icon slot is structurally needed (evidence sources).

### CTAs

One pill style per surface:
- Dark slides → cream pill, dark text
- Cream final slide → dark pill, cream text

Drop the per-slide `ctaTone` branching.

### Result

Seven slides reading as one continuous muted-mud sequence. The only color on each slide is the small role marker at the top (orange/blue/white/green dot + eyebrow + underline). Final cream slide acts as the tonal reset and CTA moment.

### Files touched

- `src/components/DemoWalkthrough.tsx`
