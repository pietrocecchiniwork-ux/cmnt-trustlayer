## UI refinement pass — Auth + shell

Stay brutalist (sharp corners, no shadows, no gradients, 1px dividers, DM Mono/Sans). The goal is "more polished" through better hierarchy, spacing, type scale, and softer surface tints — not by importing rounded cards / shadows.

### 1. Design tokens (`src/index.css`, `tailwind.config.ts`)

Soften per-route surfaces (lower saturation, lighter tints) while keeping the same hue family:

- `--background` 60 4% 93% → **60 6% 96%** (warmer, lighter base)
- `--surface-cream` 48 30% 92% → **44 22% 94%** (calmer)
- `--surface-orange` 27 80% 60% → **22 55% 66%** (less neon, kept as accent surface)
- `--surface-dark` 60 3% 10% → **60 4% 13%** (slightly lifted off pure black)
- `--surface-dark-muted` 60 2% 34% → **60 3% 42%**
- `--border` (heavy) stays 1px but use new `--hairline: 60 4% 80%` for in-content dividers; keep `--border` for emphasis only
- `--muted-foreground` slightly lifted for readability
- Add a single elevation primitive: `.surface-raised` = 1px solid hairline + 1px inset highlight (no shadow, no radius) — used for cards/sheets

Type scale tightening (utility classes in `@layer components`):
- `.t-eyebrow` font-mono 10px / +0.08em tracking / uppercase
- `.t-label` font-mono 11px / muted
- `.t-body` font-sans 14px / 1.45
- `.t-title` font-sans 22px / -0.01em
- `.t-display` font-sans 32px / -0.02em

No radius changes (stays 0). Toggles keep their existing radius exception.

### 2. Auth screen (`src/pages/Auth.tsx`)

Refinement, not redesign:
- Logo block: replace solid square with a 1px-bordered square + DM Mono "C" inside; tighten the `cemento` wordmark (lowercase, -0.02em tracking, 16px).
- Vertical rhythm: pt-24 → pt-20; mb-20 between logo and form → mb-14; consistent 24px gaps in form column.
- Primary CTA ("Continue with Google"): keep dark fill, but use a 1px outer hairline + inner 1px focus ring on focus-visible; height 48px (was ~52px).
- "or" divider: change full-width line into two short 24px hairlines flanking the label.
- Secondary actions ("continue with email", "sign in with password", "explore demo"): unify into a single column with 12px gaps, all `t-label`, underline only on hover (not by default).
- Email/password inputs: reuse `.underline-input` but left-align (centered text on inputs reads as quirky, not polished); add a subtle `t-eyebrow` label above each.
- Inline errors: small destructive dot + `t-label` text (no full-width red bar).
- "check email" success state: use `t-display` for headline, `t-body` for sub.
- Add a tiny footer line at bottom: `cemento · trust infrastructure` in `t-eyebrow` muted.

### 3. App shell

**`AppLayout.tsx`** — add a fixed top hairline header rail (40px) that hosts the burger trigger on the right and (when on a project route) the project code + active section eyebrow on the left. Content scroll region gets `pt-10 pb-16`.

**`BottomNav.tsx`** — refinements only:
- Reduce vertical padding `py-4` → `py-3`; nav height ~52px.
- Active-state border-b currently 1px / accent-text — keep, but add 8px padding under text so the underline doesn't touch labels.
- Inactive labels: opacity 40% → 50% for legibility; remove `border-t border-current/5` (use the new `--hairline`).
- On dark surfaces, use surface-dark-muted instead of `/40` opacity for inactive text.

**`BurgerMenu.tsx`** — keep behavior (focus trap, escape, persistence) untouched. Visual refinements only:
- Trigger: bars get 1px thicker only on hover; current is fine.
- Panel: width 280 → 300, `bg-background` → `bg-surface-cream` for separation from page (still no shadow); left edge keeps `border-l` but use `--hairline`.
- Header row: increase to 56px, title becomes `t-title`, close uses an icon-sized button (32×32) with hairline border.
- Section eyebrows: switch to `.t-eyebrow` utility for consistency.
- Active nav item: keep accent text, add a 2px-wide accent-color block (4px tall, no radius) before the label as a left marker; inactive items get a transparent marker (preserves indent).
- Language pills keep their pill shape (existing toggle exception); reduce padding 1px.
- Sign-out becomes the only button styled with a top hairline separator above it.

### 4. Memory updates

Update `mem://style/color-palette` and `mem://style/design-principles` with the softened surface values and the new `t-eyebrow / t-label / t-body / t-title / t-display` type-scale convention. Keep the brutalist Core rule unchanged.

### Out of scope (this pass)
Home, Dashboard, Milestones, Evidence, Payments, Activity, Team, Submit, Camera, Onboarding, CreateProject, Cascade. Those will reuse the new tokens/utilities once approved on the shell.

### Files touched
- `src/index.css` (tokens + utilities)
- `tailwind.config.ts` (hairline color)
- `src/pages/Auth.tsx`
- `src/components/AppLayout.tsx`
- `src/components/BottomNav.tsx`
- `src/components/BurgerMenu.tsx`
- `mem://style/color-palette`, `mem://style/design-principles`, `mem://index.md`
