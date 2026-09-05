# THE WORKSHOP — Final Implementation Plan v2.0
### Zero-budget · Antigravity-ready · Hardened

---

## Changelog from v1
- Biometric scan redesigned: visual "scan" experience stays, real identity/tiering moves off biometrics onto a credential system that's actually legally sound and technically reliable (Section 2).
- Device fingerprint reframed: kept, but repurposed from "identity proof" (unreliable) to "anti-abuse signal" (exactly what it's actually good at).
- Added: your local LLM integration architecture (Section 3).
- Added: full $0 hosting architecture, revised around Cloudflare after checking current 2026 free-tier terms — this matters more than it sounds like it should (Section 4).
- Added: honest security architecture — strong, not mythical (Section 5).
- Added: monetization design that doesn't fight the aesthetic, plus a hosting-provider catch that would have quietly broken your monetization plan if we hadn't checked it (Section 6).
- Carried over, condensed: the cinematic intro sequence and the 9-sector holo-table (Sections 7–8).
- New: a unified, reusable 3D-asset generation prompt script (Section 9), the phased $0 roadmap (Section 10), and an Antigravity-ready execution brief (Section 11).

---

## 1. Elevator Pitch (v2)

A visitor arrives at a blast door in a cave. A biometric panel scans their face — genuinely, not just for show: a face embedding and device fingerprint become that visitor's real credential, recognized on return visits and unlocking deeper tiers of the site, exactly like Tony Stark's door reading who's standing in front of it. Where a visitor's jurisdiction makes that too legally exposed to offer, or their scan simply fails, the same door falls back to a phone-verified or email-linked credential instead — same tiering, no visitor turned away at the door. Inside, an AI — genuinely your own personally-trained model, running on your own machine — rises from a holo-table, greets them by whatever name/tier they're recognized as, and becomes both the emotional centerpiece and the literal navigation system for a circular, infinite, nine-sector workbench holding your real work, resume, calendar, photos, guestbook, and contact info. The whole thing runs on $0/month infrastructure and can carry tasteful, in-universe monetization without ever looking like a website with ads on it.

---

## 2. Identity, Personalization & Access — Path B, Hardened As Far As Solo/$0 Allows

**Decision locked:** real biometric capture and storage, accepted risk. Everything below is built to make that specific choice as defensible and as low-exposure as a solo, zero-budget build genuinely can — these aren't optional extras, they're what separates "hardened" from "a checkbox with extra steps."

### 2.1 What actually gets stored (and what deliberately doesn't)
- **Never store raw face images.** Only store a mathematical face *embedding* — a vector derived from the face by a model like face-api.js or MediaPipe. This is standard practice for every major biometric system (Face ID, banking apps included) and it's the one mitigation that actually matters: even in a breach, an embedding alone doesn't hand over a usable photo of anyone.
- Encrypt embeddings at rest — encrypt in the Worker using the Web Crypto API before writing to D1, decrypt only in-memory at match time, never store the decryption key alongside the data.
- The full stored record, and nothing beyond it: encrypted embedding, device fingerprint, typed full name, a consent record (2.2), account tier, timestamps.

### 2.2 Consent, built as close to a real written release as a web form gets
A bare checkbox is weak evidence, especially against Illinois BIPA case law, which has repeatedly wanted something closer to a genuine written release. Build the strongest realistic version:
1. Full-screen disclosure (not small-print in a modal) stating plainly: what's captured (an embedding, not a photo), why, how long it's retained, and exactly how to request deletion.
2. Visitor types their full legal name as an affirmative act — not just a click.
3. Generate a "digital release" record: name + a hash of the exact disclosure text shown + timestamp + IP + device fingerprint — and **email a copy to the visitor** via Resend as their own durable proof of what they agreed to. This cuts both ways: it's your evidence of consent, and it's real transparency for them, which is what makes consent defensible rather than merely claimed.
4. Store this release record separately from the biometric data itself, so a future deletion request removes the biometric data without destroying your audit trail that consent was once given.

### 2.3 Jurisdiction gating — the single highest-leverage risk reduction you have
Cloudflare Workers exposes the visitor's country on every request for free (`request.cf.country`), no extra service needed. Use it: for visitors from the jurisdictions with the sharpest biometric-specific exposure — Illinois, Texas, Washington, and the EU/UK under GDPR at minimum — **automatically route to the non-biometric Tier 1 path instead** (magic-link email, same personalization outcome, zero biometric capture). Nobody is excluded from the site; the highest-liability feature is simply scoped down to where you're most exposed. This one decision reduces your real risk more than any amount of consent-copy wording ever will — build it in from day one, not as a v2 patch.

### 2.4 Tiering
- **Tier 0 — Anonymous:** default. Full core experience — most visitors, recruiters included, should never feel blocked from the actual point of the site.
- **Tier 1 — Recognized:** magic-link email (also the automatic path for gated jurisdictions, 2.3).
- **Tier 2 — Verified, via face match:** embedding comparison against the visitor's stored record. Build for regular failure from day one — lighting, camera quality, and angle will cause real false negatives; a returning visitor failing their own face match and getting silently locked out is a support nightmare you can avoid by design.
- **Conditional-failure fallback — phone/SMS OTP** (Firebase Phone Auth free tier): exactly your original spec. If face matching fails, or the visitor is in a gated jurisdiction, phone verification is the path that still gets them to Tier 2.
- **Device fingerprint:** kept as a cross-check exactly as you originally specified — but on a mismatch, flag the record for your own review rather than hard-blocking the visitor. A fingerprint changing because someone updated their browser is common; treating it as a hard identity failure will lock out real, legitimate returning visitors regularly.

### 2.5 Data rights — the cheap infrastructure that actually matters
- A self-serve deletion endpoint (linked in every email sent) that wipes the embedding, fingerprint, and name on request. This is genuinely cheap to build — one Worker route — and it's the single piece of "compliance infrastructure" that most meaningfully reduces your exposure if a deletion request ever comes in.
- Auto-expire and delete any record with zero logins for 12 months, so the amount of sensitive data sitting in your database at any moment stays as small as possible — that's the actual variable that determines how bad a future breach would be.
- **Budget one real thing beyond $0 if you can:** a generated privacy policy (e.g. Termly's free tier) is a reasonable starting draft, but a single one-time consult with a lawyer before this feature is live to more than a handful of trusted visitors is the one place in this entire plan where spending real money is genuinely worth it — biometric data is the one category where "I did my best on a forum's advice" holds up worse than almost anything else you could ship.

---

## 3. The Hologram AI — Integrating Your Local LLM

Your model stays exactly where it is — on your PC. Nothing here asks you to retrain it, shrink it, or move it to the cloud. The job is to connect it to the public site safely and reliably without exposing your machine or your wallet.

### 3.1 Architecture
```
Visitor's browser
      │  (chat message)
      ▼
Cloudflare Worker (free)  ── rate-limits, validates, strips anything unsafe
      │
      ▼
Cloudflare Tunnel (free, "cloudflared" daemon running on your PC)
      │  (outbound-only connection — your PC initiates it, so no router
      │   ports are opened and no inbound firewall holes are needed)
      ▼
Your local LLM server (e.g. served via Ollama / llama.cpp / your own
inference script), running inside a Docker container for isolation
```

### 3.2 Why this specific shape
- **Cloudflare Tunnel** means your home network never has an open port facing the internet — the connection is always initiated from your side outward. This is the single biggest risk reducer for "exposing a personal PC to the public web," and it's free.
- **Docker-isolating the inference server** means even if something did go wrong at the model layer, it can't see or touch the rest of your filesystem, browser sessions, or other local services.
- **The Worker in front of it** is where you enforce: max messages per visitor per hour (device-fingerprint-based, from 2.2), a hard per-message token/character cap, input filtering (reject anything trying to jailbreak the model into leaving its "workshop guide" persona or extracting your system prompt), and a request timeout — so a burst of traffic or a bad actor can't peg your home PC's CPU/GPU or run your electricity bill up.
- **Availability is honest, not faked. Fallback: locked in.** Your PC won't be on 24/7, so the Worker pings the tunnel on each request; if it's unreachable, requests transparently route to a small free-tier hosted model (Cloudflare Workers AI's free daily inference allowance is the simplest same-vendor option) running the *same system prompt/persona* your local model uses, so the voice stays consistent even though the depth of personalization drops. Make the shift part of the narrative rather than hiding it — a single line the fallback model is instructed to open with, something like "the deep mind is resting; I'm a lighter echo of it for now" — turns an infrastructure limitation into an in-universe detail instead of a bug users notice and wonder about.

### 3.3 The "lighthouse" navigation function
Give the model a small, explicit tool/function-calling interface — not just chat — so it can actually drive the UI, matching your "navigates the messy workspace" idea:
```json
{
  "name": "navigate_to_sector",
  "description": "Rotate the holo-table to a specific sector and optionally open its interface",
  "parameters": { "sector": "RS1|RS2|RS3|WORKSTATION|LS3|LS2|LS1", "open": "boolean" }
}
```
The frontend listens for this tool call and drives the same GSAP/camera rotation system a visitor's scroll would (Section 8) — so "hey, show me your GitHub work" from the visitor becomes the model calling `navigate_to_sector("RS1", true)`, and the table physically turns. This is a strong, genuinely novel signature interaction, and it's a natural fit for a model you built yourself rather than a generic chatbot.

---

## 4. Zero-Budget Architecture

I checked current (August 2026) free-tier terms rather than assume — one of them changes your hosting decision outright, covered in 4.2.

### 4.1 The stack
| Layer | Service | Free tier (current) | Why |
|---|---|---|---|
| Frontend hosting | **Cloudflare Pages** | Unlimited bandwidth, 500 builds/month | No traffic-based cap to worry about as the site gets attention |
| Backend/API | **Cloudflare Workers** | 100,000 requests/day | Runs your credential system, rate limiting, LLM proxy |
| Database | **Cloudflare D1** | 5GB storage, 5M reads + 100K writes/month | Visitor records (Tier 1/2), guestbook entries, resume data |
| Real-time state | **Cloudflare Durable Objects** | 400K GB-seconds, 1M requests/month | Powers the live collaborative guestbook (LS2) and the AI-navigation session state |
| Object/media storage | **Cloudflare R2** | 10GB storage, 1M operations/month, **zero egress fees** (unlike S3) | Photo/video album (LS3), 3D model/texture assets |
| Caching/session | **Cloudflare KV** | 1GB storage, 100K reads/writes per day | Session tokens, cached GitHub API responses |
| Email (magic links) | **Resend** | 3,000 emails/month free | Tier 1 login |
| SMS (optional Tier 2) | **Firebase Phone Auth** | Meaningful free monthly volume before billing | Optional higher-assurance verification |
| Exposing local LLM | **Cloudflare Tunnel** | Free, unlimited | Section 3 |
| DNS/CDN/security | **Cloudflare (root account)** | Free | WAF rules, bot protection, SSL — same account as everything above |
| Resume PDF generation | **Browser-side** (`@react-pdf/renderer` or `pdf-lib`, client-side) | Free, no server cost | Avoids paying for a server-side rendering function entirely |
| 3D asset generation | See Section 9 | Free tiers of Meshy AI / Tripo / Luma — enough for a bounded set of hero props | One-time asset creation, not a running cost |

**Everything above lives in one Cloudflare account.** That's a deliberate choice: fewer vendors, one dashboard, one set of free-tier limits to track, and — critically — Cloudflare's services talk to each other with no cross-network egress cost, which is often where "free tier" plans quietly fail in practice.

### 4.2 The catch that would have broken your monetization plan
Vercel's free Hobby plan — the default choice most people reach for — explicitly restricts free-tier use to **non-commercial** projects; the moment the site carries ads, sponsorships, or any paid tier, you're technically required to upgrade to a paid plan. Cloudflare Pages' free tier has no such restriction — commercial use is explicitly allowed at $0. Given Section 6 below, this is a genuine, non-cosmetic reason Cloudflare is the right host for this specific project, not just a preference.

---

## 5. Security Architecture — Genuinely Strong, Honestly Framed

Not "impregnable" — no one can promise that. This is the real bar: strong enough that essentially every realistic threat against a personal site bounces off it, built entirely on free-tier tools.

| Layer | Measure |
|---|---|
| Network edge | Cloudflare WAF (free tier includes managed rules) + bot-fight mode, in front of everything |
| Rate limiting | Per-device (fingerprint) and per-IP limits on every write endpoint — guestbook posts, chat messages, login attempts, resume generation |
| Auth | Magic-link + optional SMS OTP only (Section 2) — no passwords to leak, no biometric templates to leak |
| Data minimization | Store the least possible data per visitor: email (hashed where feasible), tier, timestamps. No biometric data, ever, per Section 2 |
| Input handling | Every piece of user-generated content (guestbook, chat) sanitized against XSS before storage and again before render — critical since guestbook content gets shown to *future* visitors, making it a stored-XSS target if unsanitized |
| Secrets | API keys (Resend, GitHub, etc.) in Cloudflare Worker environment secrets, never in client-side code or committed to the repo |
| Local LLM exposure | Outbound-only tunnel, Dockerized isolation, hard rate/token caps (Section 3) |
| Dependency hygiene | `npm audit` / Dependabot on the repo (free on GitHub) to catch known-vulnerable packages before they ship |
| Content moderation | Guestbook: profanity/abuse filter on write + an owner-only moderation view to delete anything, since this is the one place arbitrary strangers can publish content that appears on your site |
| Monitoring | Cloudflare's free analytics + a simple alert (e.g., a Worker that pings you via email/webhook) if request volume spikes abnormally — your early-warning system, since you won't have a security team watching dashboards |

This is a real, defensible security posture for a solo, zero-budget project — the kind that stops opportunistic attackers, scrapers, spam bots, and casual abuse cold. It is not, and cannot honestly be marketed as, something that stops a resourced state intelligence service. No individual project can make that claim truthfully, and I'd rather tell you that plainly than write you a security section that sounds impressive and isn't.

---

## 6. Monetization Without Breaking the Experience

A jury (and a recruiter) will penalize anything that reads as a banner ad instantly — so the design constraint is: **monetization has to be in-universe or it doesn't ship.** Ranked by how well they preserve the aesthetic:

1. **"Supply requisition" sponsor props (best fit).** If a tool/brand you genuinely use sponsors you, render their logo as a physical prop *in the workstation area* (a branded device on a shelf, a tool with their mark) — the same way real award-winning sites handle sponsor credit (a credits/thanks panel), not as a banner. Extremely rare, high-trust, doesn't cost you any design integrity.
2. **"Support the workshop" — a single, quiet, in-universe tip/sponsor link.** Styled as a power-cell/reactor icon in the footer sector (LS1), linking to GitHub Sponsors or Buy Me a Coffee. No animation begging for attention — one small, permanent, dignified element.
3. **Tier 2 "verified operative" perks for recruiters, optionally paid.** If a company wants priority contact routing or an enhanced tailored-resume export, that's a legitimate small paid feature — B2B-ish, not ad-like, and fits naturally into the resume station (RS2) you already spec'd.
4. **Affiliate links inside the workstation minigame**, if/when it ships (real tools you actually use, framed as "requisition this device" — low frequency, high relevance, opt-in by nature since the visitor has to interact with that specific prop).

**Skip traditional ad networks entirely.** They're the fastest way to tank both the aesthetic and your Awwwards/FWA score, and on a portfolio site the real ROI is career opportunities, not ad revenue — a few dollars a month from a tip link is a realistic, honest expectation, not a business model.

---

## 7. Act I — Cinematic Intro (unified style bible + beats)

### 7.1 Shared style bible (stated once, referenced by every beat below — this is what "unified" fixes about your original draft, which repeated this paragraph six times)
> Photoreal 3D render, Unreal Engine 5 / Octane aesthetic, 8K detail target, chiaroscuro dual-tone lighting (warm amber key + cool cyan accent), vertical 9:16 framing, volumetric haze, hard-surface sci-fi materials (gunmetal, brushed titanium, weathered iron) set inside rough, unlit cave rock. No IP-specific iconography (Section 7.3).

### 7.2 Beats (each beat = only its delta from the style bible above)
| Beat | Delta from style bible | Technical realization |
|---|---|---|
| 1. Exterior door | Massive blast door in cave mouth, faint green status LEDs, biometric panel visible but not detailed | Pre-rendered looping video (AI video-gen, Section 9) — too fidelity-heavy for real-time |
| 2. Panel close-up | Cyan point-cloud face-scan UI, REGISTER/VERIFY/RESET buttons, iris scanner | **Real-time DOM/WebGL overlay** — this is interactive (Section 2), can't be baked video |
| 3. Entry / darkness | Pitch black, silhouette of circular workbench barely visible | Pre-rendered video, extremely short (~2s), cheap to load |
| 4. Table wakes, maps room | Cyan wireframe grid sweeps outward from table across cave floor/walls | Real-time Three.js (grid = shader-driven, genuinely cheap to render live) |
| 5. Entity forms | Wireframe cube + plasma vortex rises from table | Real-time Three.js — this *is* your signature moment, must be live, not video (it needs to react to the visitor later) |
| 6. Entity greets, powers on lab | Warm lights snap on, cyan hologram remains, full room now visible | GSAP timeline crossfading pre-rendered ambient lighting textures with the live scene |
| 7. Handoff to interactive page | Camera settles at workbench height | Transition into Section 8's live navigation state |

**Why the mix:** true photoreal UE5-fidelity rendering isn't achievable live in a browser at acceptable frame rates — so beats 1 and 3 (pure atmosphere, no interaction) are pre-rendered video loops generated once via an AI video tool and never re-rendered per visitor, while beats 2, 4, and 5 (anything a visitor touches or that must react to them) are real, live WebGL. This hybrid is what makes "10D cinematic" and "$0, runs on everyone's phone" simultaneously true.

### 7.3 Originality guardrails (protecting your own "not going to copy" goal)
No arc-reactor iconography, no red/gold palette (you're already cyan/amber — good, keep it that way), no "J.A.R.V.I.S."-style naming, no replication of the specific HUD graphic language used in the actual films. Original typography, original icon set, original sound design (Section 9 covers asset generation for exactly this reason).

---

## 8. Act II — The Holo-Table (navigation model, unified)

**The sector math, resolved:** 9 physical wedges (40° each) around the table. Sector 0 = entry hinge. Going right = RS1→RS4, going left = LS1→LS4. RS4 and LS4 sit directly opposite sector 0 and are physically adjacent to each other — which is *why* they can share one combined long station without contradicting the "9 sectors" count. 9 wedges, 8 distinct functional experiences.

```
                    RS2   RS3
              RS1              RS4 ─┐
                                     ├── combined workstation
        [ Sector 0 — Entry ]  LS4 ─┘
              LS1              
                    LS2   LS3
```

| Sector | Function | Data/backend need |
|---|---|---|
| 0 | Hinged entry to AI/holo-table core | Session init, ties to Section 2 tier |
| RS1 | Live GitHub project blueprints | GitHub API, cached in KV (rate-limit-safe) |
| RS2 | Resume builder — visitor picks fields, generates tailored resume | D1-stored structured work history; client-side PDF export |
| RS3 | Holo-calendar (Google Calendar replica) | Google Calendar API, **read-only, free/busy or curated view only** — don't expose full private event details publicly |
| RS4+LS4 | **Cut from scope for now** (locked decision) — see design note below | None required |
| LS3 | Holo-globe: visitor's IP-based approximate location + owner's photo/video album | IP geolocation (standard, disclose in privacy notice), R2-stored media with geo/date metadata |
| LS2 | Public guestbook (infinite sticky notes, mouse+keyboard editable) | Durable Objects (real-time) + D1 (persistence) + moderation (Section 5) |
| LS1 | Public info hub — blog, social tab embeds, contact | Static content + official embed widgets per platform (note: some platforms require app review for API-based embeds — start with simple links/official embed snippets, not custom scraping) |

**Design note on the cut sector:** don't delete the physical space — an empty gap in an otherwise-complete circular table would read as unfinished, not intentional. Dress RS4+LS4 as an in-narrative sealed/tarped-over section of the workshop (a static, unlit prop set — no interaction, no build cost beyond a decorative pass) so the table still reads as a complete, deliberate 9-sector object. This keeps the geometry and the navigation model exactly as spec'd, with zero functional build cost, and gives you a clean, already-fitting home for the workstation whenever it comes back into scope.

**Navigation input mapping:** scroll up (desktop) = clockwise toward RS side; scroll down = counter-clockwise toward LS side; continuous rotation with magnetic snap to the nearest sector on scroll-idle. **Mobile:** horizontal swipe/drag replaces scroll (vertical scroll stays free for any in-sector content). **Accessibility fallback (non-negotiable, not optional):** a visible sector-jump menu (prev/next buttons + a labeled list) so keyboard and screen-reader users aren't dependent on a gesture at all.

---

## 9. Unified 3D Asset Generation Script

One reusable template, not six separate essays — fill in the bracketed deltas per object. Use this with a free-tier AI 3D/image/video generator (Meshy AI, Tripo, Luma AI Genie all have usable free tiers as of 2026 — check current limits before committing to one, they change often) for hero assets, and hand-model simpler props in Blender (free) where a generator's output needs cleanup for real-time use anyway.

```
STYLE (constant across every asset — paste unchanged every time):
Hard-surface sci-fi, gunmetal/brushed-titanium/weathered-iron materials,
subtle cyan-accent circuitry, no text/branding/logos, designed for
real-time PBR rendering (favor clean topology over baked micro-detail —
a generator's "hyper-detailed" output usually needs decimation for
real-time use anyway), original silhouette — explicitly NOT a red/gold
Iron Man suit palette, NOT arc-reactor iconography.

OBJECT: [name, e.g. "biometric door panel"]
FORM: [primary shape/silhouette in one sentence]
DETAIL: [2-3 specific surface features — bolts, vents, seams]
EMISSIVE: [what glows, what color, how bright — keep to ONE glow color per object]
SCALE: [real-world size reference, e.g. "roughly the size of an ATM"]
INTERACTION: [what it does when clicked/hovered/approached — this
determines whether it needs rigged/animated parts or is static]
POLY BUDGET: [state a real number — e.g. "under 15k triangles" — every
asset in a scrollable scene needs an explicit budget or the whole
experience's frame rate degrades silently as you add more props]
```

Example filled in for the entry panel:
```
OBJECT: biometric door panel
FORM: vertical rounded-rect terminal, recessed into the door's centerline
DETAIL: circular iris-scanner housing below the screen, three backlit
buttons along the bottom edge, hex-bolt trim around the frame
EMISSIVE: cyan only — screen, iris ring, button backlights
SCALE: roughly torso-height, ATM-sized
INTERACTION: buttons are real DOM hitboxes layered over the 3D mesh
(REGISTER/VERIFY/RESET), screen texture swaps via GSAP timeline states
POLY BUDGET: under 8k triangles (it's viewed close-up but is one object
among many in the scene)
```

Run this template once per hero object (door, panel, holo-table, entity, 2–3 signature workstation props) rather than generating everything — matching Part 1's "sell one object properly" principle from your original three references still applies here at scale: a handful of *excellent* assets beats twenty mediocre ones, and it's also the only way this stays inside free-tier generation limits and a real-time frame budget.

---

## 10. Phased $0 Roadmap

| Phase | Ships | Explicitly deferred |
|---|---|---|
| **MVP** | Beats 1–3 intro (video), real-time door panel + entity (beats 2, 4, 5), full 9-sector table (RS4+LS4 dressed as sealed/decorative) with RS1 (GitHub), RS3 (calendar), LS1 (info hub), LS2 (guestbook), Tier 0 + Tier 1 (magic-link) access, jurisdiction gating live from day one (2.3) | Face-match Tier 2, RS2 (resume builder), LS3 (globe/album), local LLM integration |
| **Phase 2** | Face-match Tier 2 + phone-OTP fallback (Section 2.4), resume builder, holo-globe/album, local LLM hooked up via tunnel with hosted fallback (Section 3) | Monetization, workstation area |
| **Phase 3** | Monetization elements (Section 6) | Workstation/assembly area — revisit only if it earns a real design brief later, per your call to cut it |

This sequencing ships a genuinely complete, deployable, award-submission-eligible site at the end of MVP — everything after that is real, valuable expansion, not a blocker to launching.

---

## 11. Antigravity-Ready Execution Brief

Antigravity works best when given a clear goal plus explicit phase boundaries, since its Plan mode will generate its own step-by-step artifact from what you give it — paste the block below as your first prompt, then let it draft a plan before it writes any code (confirm the plan matches this document before approving execution):

```
Build a personal portfolio site codenamed "The Workshop." Full spec is in
/docs/workshop-plan-v2.md — read it fully before planning.

Build order (do not skip ahead):
1. Scaffold: Vite+React+TypeScript, Cloudflare Pages/Workers/D1 project
   structure per Section 4.1.
2. Design tokens, global styles, Lenis smooth scroll, base layout shell.
3. Section 2 credential system in full — jurisdiction gating (2.3),
   consent/disclosure flow (2.2), magic-link auth via Resend, encrypted
   embedding storage, and the deletion endpoint (2.5) — BEFORE any 3D
   work or face-match UI. This is the highest-liability part of the
   whole build; de-risk and test it in isolation first, not last.
4. Real-time door panel (Section 7, beat 2) as an isolated component,
   reviewed against Section 9's asset spec before wiring into the full
   scene.
5. Holo-table navigation shell (Section 8) with placeholder content in
   all 8 sectors — get rotation/scroll/accessibility fallback solid
   before building out any single sector's real functionality.
6. Sectors in MVP order per Section 10: RS1, RS3, LS1, LS2.
7. Security pass per Section 5 before any public deploy.
8. Deploy to Cloudflare Pages, verify against QA checklist before
   sharing the link with anyone.

After each numbered step, stop and show me a working preview before
proceeding to the next — do not build multiple steps unreviewed.
```

Put the full contents of this document at `/docs/workshop-plan-v2.md` in your repo before running that prompt — this is exactly the persistent-source-of-truth pattern from Section 6 of our first conversation, and it matters even more now that the spec is this large.

---

## 12. Decisions Locked

1. **Biometric approach: Path B**, real capture and storage, hardened per Section 2 — jurisdiction gating, encrypted embeddings only (never raw images), a real written-release-style consent flow, phone-OTP fallback, and a self-serve deletion endpoint are all now non-optional parts of the spec, not nice-to-haves.
2. **RS4+LS4 workstation: cut from MVP and Phase 2 scope**, dressed as a sealed/decorative prop set so the 9-sector table still reads as complete (design note, Section 8). Revisit with a real design brief later if it earns its place.
3. **Local LLM fallback: a generic hosted model** (Cloudflare Workers AI) takes over when your PC is offline, running the same persona/system prompt with an in-narrative line acknowledging the shift (Section 3.2), rather than the AI going silent.

No open forks remain — Section 11's Antigravity brief is ready to run as written.
