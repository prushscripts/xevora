FULL PROJECT CONTEXT — XEVORA & FYNLO
Date: April 1, 2026
Founder: James (CEO, Prush Logistics Group LLC)
Location: Wallkill, Orange County, New York

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHO JAMES IS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
James is the founder and CEO of Prush Logistics Group LLC, 
a commercial trucking/logistics company based in Wallkill, NY. 
He has two drivers: Alex Rivera (Truck 1) and Chris Morgan 
(Truck 2), both running the Healey Route. He also owns and 
operates FleetPulse (fleetpulsehq.com — a fleet management 
SaaS built in Next.js 14), RedlineOS (redlineos.space — a 
personal operator dashboard tracking his path to $1M), and 
VorttAI (an HVAC company). James builds using Windsurf and 
Cursor AI editors with Next.js 14, TypeScript, Tailwind CSS, 
Supabase, Framer Motion, and Vercel. He prefers prompts 
delivered as single copyable blocks.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT 1: XEVORA (xevora.io)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT IT IS:
Xevora is a modern workforce infrastructure SaaS — GPS time 
tracking, automated payroll, and field operations management 
built specifically for small businesses with mobile/field 
workers (trucking, HVAC, construction, landscaping, trades). 
It competes directly with ADP and Homebase but is built for 
operators who don't sit at desks.

THE ONE LINE:
"ADP was built for companies that have an HR department. 
Xevora was built for companies that don't."

KEY DIFFERENTIATORS vs ADP/Homebase:
- GPS clock-in from mobile (one tap, location stamped)
- Built for W2 + 1099 workers simultaneously
- AI-powered anomaly detection and compliance alerts
- Mobile-first (ADP's app is 2.8 stars)
- Onboarding in 20 minutes vs days for ADP
- Starts at $49/month flat vs ADP's $150-400+
- Built by an actual operator who runs drivers daily

TECH STACK:
- Frontend: Next.js 14, TypeScript, Tailwind CSS
- Auth + DB: Supabase
- Payroll Rails: Check.com (checkhq.com) — applied, 
  category selected: Workforce SaaS
- AI: Anthropic Claude API
- Email: Resend
- Animations: Framer Motion
- Deployment: Vercel
- Domain: xevora.io (purchased via Namecheap, 
  DNS pointed to Vercel)

CURRENT STATUS:
✅ Domain live at xevora.io
✅ Coming soon landing page live (pure HTML/CSS/JS)
✅ Supabase project created (Xevora org, East US)
✅ Waitlist table created in Supabase with RLS policy
✅ Email capture working (saves to Supabase waitlist table)
✅ GitHub repo: prushscripts/xevora
✅ Vercel auto-deploy on push
✅ deploy.bat created (auto git add/commit/push)
✅ X (Twitter) account: @Xevora_IO
✅ X profile picture (hex+X logo mark)
✅ X header banner (1500x500)
✅ OG image (1200x630) for link previews
✅ Favicon package installed (all sizes)
✅ Navigation tabs added to landing page:
   Overview | Features & Roadmap | Why Xevora | 
   Pricing | Fynlo ↗
✅ Dashboard mockup preview section on landing page
✅ Login page built (pages/login.html)
✅ Dashboard page built (pages/dashboard.html)
✅ Post-login cinematic animation sequence
✅ Invite code system on login page
✅ Micro-interactions and transitions added
✅ Check.com partner application submitted
✅ Contact: james@xevora.io (forwarding setup needed)

FOLDER STRUCTURE:
C:\Users\James\Documents\1- Xevora.IO\
├── .git/
├── branding/
│   ├── PFP (profile picture PNG)
│   └── XBanner (Twitter header PNG)
├── pages/
│   ├── dashboard.html
│   └── login.html
├── public/
│   ├── favicon/ (all favicon sizes)
│   └── images/ (og.png)
├── index.html (root — landing page)
├── vercel.json
├── deploy.bat
└── README.md

DESIGN SYSTEM:
- Background: #03060D
- Primary Blue: #2563EB
- Bright Blue: #3B82F6
- Pale Blue: #60A5FA
- Text: #F1F5FF
- Muted: #4E6D92
- Border: rgba(37,99,235,0.22)
- Fonts: Syne (800 headings) + DM Sans (300/400/500 body)
- Logo: Hexagon + X mark + diamond center accent

LOGO/BRANDING:
The Xevora mark is a hexagon with an X inside and a small 
diamond accent at the center intersection. Colors: hex fill 
#0B1422, X fill #2563EB, diamond #60A5FA, hex border 
rgba(37,99,235,0.5). Vertex dots at each hex point.

INVITE CODES (for login page preview access):
XEVORA2026, PRUSH001, EARLYBIRD, OPERATOR1

PRICING (planned):
- Starter: $49/mo — up to 10 workers
- Growth: $99/mo — up to 30 workers  
- Pro: $199/mo — unlimited workers

ROADMAP — STAGE 1 (current build):
Build in pure HTML/CSS/JS first as coming soon + preview.
Then rebuild in Next.js 14 with full app.

Stage 1 — Ship (Weeks 1-8) — charge $29/mo:
- Auth (Supabase): login, register, email OTP verification
- Animated splash/loading screen on login
- GPS clock-in/out (mobile, one tap)
- Worker management (add, invite, manage)
- Time entry approval queue
- Basic dashboard with live stats

Stage 2 — Charge (Weeks 8-14) — charge $49-99/mo:
- Stripe billing integration
- In-app notifications
- Reports V1 (hours, overtime, CSV export)
- Company settings and team roles

Stage 3 — Complete (Week 14+) — charge $99-199/mo:
- Check.com payroll integration
- Direct deposit setup
- Pay stub PDF generation
- 1099 auto-generation
- AI assistant (Claude API)
- Full reports suite

Stage 4 — Scale (Month 6+):
- PWA mobile app
- QuickBooks sync
- Mileage tracking
- Benefits administration
- Fynlo integration (invoicing)
- White-label option

PATH TO $1M ARR:
416 customers × $199/month = $1M ARR
= 0.001% of US small businesses

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROJECT 2: FYNLO (fynlo.io)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT IT IS:
Fynlo is a modern bookkeeping and invoicing platform — the 
QuickBooks alternative built for field-based small businesses. 
Smart invoicing, expense tracking, job costing, P&L reports, 
and tax preparation. Will integrate directly with Xevora so 
labor costs flow automatically from timesheet to books.

STATUS:
✅ Name decided: Fynlo
✅ Landing page built (fynlo-index.html)
⬜ Domain to purchase: fynlo.io
⬜ Vercel project to create
⬜ GitHub repo to create

DESIGN DIRECTION (intentionally different from Xevora):
- Accent color: #00C896 (green — signals finance/money)
- Font: Cabinet Grotesk (rounder, friendlier than Syne)
- Same dark foundation (#050A0A) so products feel like siblings
- Logo: simple square mark with ledger/flow lines icon
- Tagline: "Your books. Finally clear."

PLANNED FEATURES:
- Smart invoicing (create, send, auto-reminders)
- Expense tracking (photo receipt capture, auto-categorize)
- Job costing (margin per route/project/contract)
- P&L reports (auto-generated)
- Xevora sync (labor costs flow automatically)
- Tax ready (quarterly estimates, 1099 summaries)
- QuickBooks import

RELATIONSHIP TO XEVORA:
Fynlo + Xevora = complete financial control for operators.
Xevora handles payroll + time. Fynlo handles invoicing + books.
Eventually marketed as the "Xevora Suite."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THINGS STILL TO DO — XEVORA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⬜ Set up james@xevora.io email 
   (Cloudflare email routing — free forwarding to 
   james@prushlogistics.com, Zoho free tier for sending)
⬜ Start Next.js 14 app build in Cursor 
   (full roadmap prompt ready to paste)
⬜ Check.com approval follow-up
⬜ Add source column to waitlist table to track 
   Xevora vs Fynlo signups
⬜ Run SQL: ALTER TABLE waitlist ADD COLUMN IF NOT 
   EXISTS source text;
⬜ Product Hunt launch prep (after MVP)
⬜ Reddit outreach (r/smallbusiness, r/Truckers, r/HVAC)
⬜ LinkedIn founder content strategy

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
THINGS STILL TO DO — FYNLO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⬜ Buy fynlo.io domain
⬜ Create GitHub repo: prushscripts/fynlo
⬜ Create Vercel project
⬜ Deploy landing page
⬜ Set up X account: @FynloIO or @Fynlo_IO
⬜ Create Fynlo branding (logo mark, colors)
⬜ Add Fynlo to Supabase waitlist 
   (source field already planned)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUPABASE DETAILS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Project: xevora (under Xevora org)
URL: https://gvjcjofsglhnxvtymicf.supabase.co
Region: East US (North Virginia)
Waitlist table columns: id, email, name, company, 
industry, source, created_at

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JAMES'S OTHER PROJECTS (for context)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- FleetPulse (fleetpulsehq.com) — fleet management SaaS, 
  Next.js 14, competitor to Fleetio, already built
- RedlineOS (redlineos.space) — personal operator dashboard, 
  "Road to $1M" tracker, Supabase auth, Claude API
- VorttAI — HVAC company brand
- Prush Logistics Group LLC — the actual trucking business, 
  Wallkill NY, two vans (RAM ProMaster + Nissan NV2500)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
JAMES'S PREFERENCES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Prompts as single copyable code blocks
- No fluff, straight answers
- Builds with Windsurf and Cursor
- Stack: Next.js 14, TypeScript, Tailwind, Supabase, Vercel
- Design philosophy: $100M company feel, dark theme, 
  premium micro-interactions, mobile-first
- Email: james@xevora.io (or james@prushlogistics.com)
- GitHub: prushscripts