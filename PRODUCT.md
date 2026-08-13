# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router) + TypeScript + Tailwind v4 + shadcn/ui, with Prisma + SQLite for persistence. Already scaffolded and running before this design pass began.

## Users

Primary user is a small business owner or solo marketer managing their own website's SEO — not an SEO professional. They are not deeply technical and are put off by jargon-heavy dashboards. They want to know "is my site okay, and if not, what do I fix" without learning an entire discipline first.

## Product Purpose

renchit crawls a user's website, finds concrete SEO and technical issues (missing titles, broken links, missing alt text, slow pages, thin content, etc.), and explains each one in plain English with a specific fix. Audits are saved so the user can track whether their site is improving over time. Success = the user runs an audit, understands what's wrong without needing to Google every term, fixes real issues, and sees their health score go up on the next run.

## Positioning

Ahrefs and SEMrush are built for SEO professionals: hundreds of features, dense data tables, steep learning curves. renchit deliberately does one job — site health auditing — and does it with the simplicity and warmth of a tool like Mailchimp: big, friendly, plain-spoken, satisfying to use. The mechanism a competitor can't casually copy is the radical scope reduction paired with AAA-polish execution, not a data or feature advantage.

## Operating Context

Workflow: user lands on the dashboard, enters their site URL, watches a live crawl (up to 50 pages), then reviews a results screen with an overall health score and issues grouped by category/severity, each with a fix explanation. They can mark issues resolved or ignored, and re-run audits later to compare progress against history. All data is real (no mock data) — crawling and checks run for real against the user's live site.

## Capabilities and Constraints

- Real backend, fully working: POST /api/audits {url} starts a crawl+audit job; GET /api/audits lists past audits; GET /api/audits/[id] returns full results (pages + issues); PATCH /api/issues/[id] marks an issue resolved/ignored.
- Crawl is capped at 50 pages per audit, same-origin only, with basic robots.txt respect.
- Issue severities: critical, warning, info. Categories: technical, content, meta, links, performance.
- Health score is 0-100, computed server-side from issue severity/volume.
- No user accounts/auth in this version — single-user local tool.
- No paid third-party SEO data (no keyword volume, backlinks, or rank tracking) — this version is Site Audit only.

## Brand Commitments

Name: "renchit" — a standalone brand, deliberately not presented as a SumoLab
sub-product (SumoLab LLC remains the legal entity in the footer only). Working metaphor: a wrench for tightening up/fixing your site. Visual canon pinned by the user: sit alongside Mailchimp's product design language — warm, confident, plain-spoken, big rounded cards, friendly geometric shapes, playful micro-motion, never dense/cold SaaS-dashboard chrome. Accent color pinned by the user: #FC5434 (a bold coral-red), used as the single committed accent per Mailchimp's own restrained-neutrals-plus-one-loud-color strategy.

## Evidence on Hand

No existing content, testimonials, or case studies. This is a new product; do not fabricate customer proof, benchmarks, or pricing.

## Product Principles

1. Plain English over jargon — every issue must be explainable to someone who has never heard the term "canonical tag."
2. Do one job extremely well rather than many jobs adequately — resist feature creep beyond site auditing.
3. Make progress visible and satisfying — the health score and before/after comparison are the emotional payoff of using the tool.
4. Real data only — no placeholder/mock findings; every issue shown comes from an actual crawl of the user's site.
5. Simplicity is the competitive advantage, not a limitation — design should feel confident and uncluttered, never like a lesser version of a "real" SEO tool.

## Accessibility & Inclusion

No formal standard specified. Given the target user is non-technical and the product is web-based, aim for solid baseline accessibility (WCAG AA color contrast, keyboard navigability, screen-reader-sensible markup) as a quality floor.
