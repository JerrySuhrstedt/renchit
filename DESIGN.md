---
name: renchit
description: A site audit tool with the warmth of Mailchimp, not the density of an SEO suite.
colors:
  brand: "#fc5434"
  brand-strong: "#c43d1c"
  brand-tint: "#fef0eb"
  cream-ground: "#fdf8f3"
  ink: "#241c15"
  critical: "#dc2626"
  critical-tint: "#fdecec"
  warning: "#b45309"
  warning-tint: "#fdf1e0"
  info: "#2563eb"
  info-tint: "#eaf1fe"
  success: "#15803d"
  success-tint: "#e9f7ee"
  border: "#eadfd1"
  muted-foreground: "#7a6f61"
typography:
  display:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui"
    fontSize: "clamp(2rem, 4vw, 3rem)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.6
  label:
    fontFamily: "Inter Tight, ui-sans-serif, system-ui"
    fontSize: "0.75rem"
    fontWeight: 700
    letterSpacing: "0.06em"
rounded:
  sm: "0.66rem"
  md: "0.88rem"
  lg: "1.1rem"
  xl: "1.54rem"
  2xl: "1.98rem"
  3xl: "2.42rem"
  pill: "999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1.25rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.brand-strong}"
    textColor: "#fffaf7"
    rounded: "{rounded.2xl}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.brand-strong}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  card:
    backgroundColor: "#ffffff"
    rounded: "{rounded.3xl}"
---

# Design System: renchit

## Overview

**Creative North Star: "The Friendly Mechanic"**

renchit is what happens when a site-auditing tool is designed by the same
instincts that make Mailchimp pleasant to open on a Monday morning: warm
paper-white ground instead of clinical SaaS gray, one confident loud color
instead of a dashboard of competing accents, and copy that explains a problem
the way a friend would rather than the way a spec sheet would. The product's
entire pitch is "we do one job, and we do it without making you feel dumb" —
the visual system exists to prove that in the first five seconds, before any
copy is read.

Confirmed visual rejections: no dense data-table SaaS chrome, no gradient
text, no kicker/eyebrow labels, no modals, no hard-edged neobrutalist
shadows, no colored side-borders standing in for severity.

**Key Characteristics:**
- Warm cream ground, never sterile white-on-white
- One committed brand accent (the pinned coral-red) used sparingly and precisely
- Big, soft, rounded-3xl cards as the primary container language
- A single real illustrated asset (the renchit logo mark) as the system's recurring motif, not decorative icon soup
- Severity communicated by tinted pill + colored dot, never by colored borders
- One authored motion set-piece: the health-score dial's animated reveal

## Colors

A restrained neutral field (cream + warm near-black ink) carries the whole
surface; the coral-red is the only saturated color allowed to command
attention, and status colors are deliberately a different hue family so they
never get mistaken for a call to action.

### Primary
- **Renchit Coral** (`#fc5434`): The pinned brand color. Used at full strength only for large/decorative fields — the renchit mark, the "renchit" wordmark accent, the health dial's ring stroke, hover glows. Never used as body text (fails 4.5:1 on cream) or button fills.
- **Coral Ember** (`#c43d1c`): A deepened variant of the brand color, same hue family, used wherever brand color needs to carry white text at AA contrast — primary buttons, the "Open" filter tab, the renchit wordmark.
- **Coral Whisper** (`#fef0eb`): The brand's tint, used as a soft background wash behind brand-colored icons (e.g. the crawling-state avatar).

### Neutral
- **Warm Paper** (`#fdf8f3`): Page background. A daytime-desk cream, never pure white — this is the single biggest lever that separates the product from a generic SaaS dashboard.
- **Ink** (`#241c15`): Primary text color. Warm near-black, matched to the brand kit's companion dark color (`#231f20`).
- **Card White** (`#ffffff`): Card and popover surfaces, sitting one step lighter than the page ground so cards read as physically raised paper.
- **Parchment Border** (`#eadfd1`): Hairline borders on cards, inputs, and dividers.
- **Muted Clay** (`#7a6f61`): Secondary/supporting text (timestamps, helper copy).

### Status (severity/category signal — intentionally distinct hue family from brand)
- **Alarm Red** (`#dc2626` / tint `#fdecec`): Critical issues — broken pages, missing H1, noindex.
- **Amber Caution** (`#b45309` / tint `#fdf1e0`): Warnings — issues worth attention but not urgent.
- **Steady Blue** (`#2563eb` / tint `#eaf1fe`): Informational, low-stakes findings.
- **Confirmed Green** (`#15803d` / tint `#e9f7ee`): Healthy score band, resolved issues, "nothing left to fix" empty state.

### Traffic Light Lamps (dashboard uptime signal only)
A literal object, so these are fixed rather than themed: a signal on a street corner is the same color at midnight as at noon, and the lamps always sit on their own dark housing.
- **Lamp Red** (`#e8342c`): Site is down.
- **Lamp Amber** (`#f7b32b`): No usable reading — the last check is older than its schedule allows.
- **Lamp Green** (`#34c759`): Site is answering.
- **Housing** (`#2a2521`, edge `#4a423b`, unlit lens `#1b1815`): The signal body. Unlit lamps keep a 15% trace of their own color, the way a real lens does.

Brighter than the status palette above because a lit lamp has to read as lit. Do not reuse these anywhere else; a traffic light means uptime and nothing else.

### Named Rules
**The One Loud Color Rule.** Renchit Coral is the only saturated brand color on any screen. Status colors exist to inform, not to compete with it — they always render at lower visual weight (smaller pills, never full-bleed fields). The traffic light is the single deliberate exception: it is contained inside its own dark housing, which is what keeps it from competing with the brand.

## Typography

**Display & Body Font:** Inter Tight (self-hosted via next/font, fallback: ui-sans-serif, system-ui)
**Character:** A tightly-tracked, confident grotesque — crisp and modern without reading as cold or corporate. One family carries the whole system; hierarchy comes from weight and size, not from mixing faces.

### Hierarchy
- **Display** (extrabold/800, `clamp(2rem, 4vw, 3rem)`, tight tracking `-0.02em`): Dashboard hero headline ("Is your site okay? Let's find out."), the health score number.
- **Headline** (extrabold/800, 1.5rem–1.75rem): Site hostname on the results view, section H1s.
- **Title** (bold/700, 1rem–1.125rem): Card titles, issue titles, "Past audits" section label.
- **Body** (medium/500, 0.875rem–1rem, line-height 1.6): Issue descriptions, fix-step copy, helper text.
- **Label** (bold/700, 0.75rem, tracking `0.06em`, uppercase): Category group headers only ("TECHNICAL", "CONTENT").

### Named Rules
**The No-Kicker Rule.** Headings never sit under a small eyebrow label. The heading carries its own weight.

## Layout

Single-column, centered content with a `max-w-3xl`–`max-w-5xl` reading measure depending on screen density (dashboard is wider to host the history list; the results view is narrower to keep issue cards readable). Generous vertical rhythm: sections are separated by `2.5rem`+ gaps, and every heading has more space above it than below it. Mobile collapses all multi-column rows (URL input + button, header) into stacked full-width elements with no layout logic changes — the grid is forgiving by construction rather than needing separate mobile-specific composition.

## Elevation & Depth

Cards are flat at rest with only a hairline border, and pick up a soft, offset, blurred shadow on hover to suggest they've lifted off the page (`0 1px 2px rgba(36,28,21,0.04), 0 12px 32px -16px rgba(36,28,21,0.18)`). No zero-offset "glow" shadows, no hard-edged block shadows — depth is ambient, not structural chrome.

### Named Rules
**The Lift-On-Intent Rule.** Elevation is a response to hover/interaction, not a static resting state. A card sitting still is flat; a card you're about to click lifts.

## Shapes

Corners are large and soft throughout — `rounded-3xl` (2.42rem) on primary cards, `rounded-2xl` on buttons and inputs, `rounded-full` on pills, badges, and the health dial. Nothing in the system uses a sharp corner; the softness is deliberate and consistent, reinforcing the "friendly, not clinical" premise. Borders are always a single hairline in Parchment Border — never a thick or colored rule.

## Components

### Buttons
- **Shape:** `rounded-2xl` (0.88rem) for primary actions, `rounded-full` for secondary/ghost pill actions.
- **Primary:** Coral Ember (`#c43d1c`) background, `#fffaf7` text, bold weight, no shadow at rest.
- **Ghost/Secondary:** Transparent background, hairline border, hover state adds a brand-colored border + text tint (e.g. re-run audit button).
- **Hover/Focus:** Primary buttons darken slightly on hover; all interactive elements get a 2px brand-colored focus ring on keyboard focus (`:focus-visible`).

### Cards / Containers
- **Corner Style:** `rounded-3xl` for hero/results cards, `rounded-2xl` for issue cards, `rounded-full` for pills.
- **Background:** Card White on Warm Paper ground.
- **Shadow Strategy:** flat at rest, soft-lift on hover (see Elevation).
- **Border:** single hairline Parchment Border.
- **Internal Padding:** generous — `1.25rem`–`2.5rem` depending on card size.

### Inputs / Fields
- **Style:** Borderless input nested inside a bordered pill-shaped container alongside its submit button (the URL entry field is one visually unified pill, not a separate input + button pair).
- **Focus:** Removes the default browser ring in favor of the container's own hover/focus treatment, keeping the compound control feeling like one object.

### Status Pills / Badges
- **Style:** Full-pill shape, tinted background at ~10% color strength, full-strength colored text, small solid dot as a secondary signal (never relies on color alone).

### The Health Score Dial (signature component)
An SVG radial gauge that animates from 0 on mount: an exponential ease-out count-up drives both the numeric readout and the ring's `stroke-dashoffset` in lockstep, colored by the resulting score band (red/amber/green). This is the system's one authored "big moment" — used at two scales (large hero on the results view, small inline badge in the history list) but never elsewhere, so it keeps its impact.

### Navigation
- Single sticky top bar: renchit wordmark, translucent cream background with backdrop blur so scrolled content softly shows through. No nav links beyond the logo-as-home-link — the product is single-purpose enough that it doesn't need one.

## Do's and Don'ts

### Do:
- **Do** keep Renchit Coral (`#fc5434`) reserved for large/decorative fields and the deepened Coral Ember (`#c43d1c`) for anything carrying body-sized text, to hold WCAG AA contrast.
- **Do** use the real renchit logo mark as the system's one recurring illustrated motif (empty states, loading states, favicon) rather than introducing generic icon illustrations.
- **Do** keep severity communicated via tinted pill + dot, never a colored card border.
- **Do** use `rounded-3xl`/`rounded-2xl`/`rounded-full` exclusively — no sharp corners anywhere in the system.

### Don't:
- **Don't** introduce a second saturated accent color; status colors stay visually subordinate to brand coral.
- **Don't** use colored left/right borders on cards or list items to signal severity or category.
- **Don't** add a kicker/eyebrow label above headings.
- **Don't** use a modal for anything in this product — the audit flow is a linear page-to-page journey by design.
