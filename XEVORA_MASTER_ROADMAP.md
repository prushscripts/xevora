# XEVORA — MASTER ROADMAP
## Road to $100M ARR
**Last Updated:** April 1, 2026
**Author:** James (CEO, Prush Logistics Group LLC)
**Status:** Phase 1 — Active Development

---

## THE OPPORTUNITY

### Market Gap in One Paragraph
Every payroll and workforce platform in existence was built for
desk workers. ADP was built for HR departments. Gusto was built
for tech startups. Homebase was built for restaurants. Not a
single one was built for the operator who runs 2-50 field workers
from a truck, a job site, or a loading dock. Xevora is the first
workforce and payroll platform built ground-up for field operators
— trucking, HVAC, construction, landscaping, logistics, and trades.

### Competitor Weaknesses (Researched April 2026)

| | ADP | Gusto | Homebase | XEVORA |
|---|---|---|---|---|
| Starting Price | $79/mo + $4-6/emp + add-ons | $49/mo + $6/emp | $39/mo + $6/emp | $49/mo flat |
| GPS Clock-In | ❌ Separate add-on | ❌ None | ⚠️ Basic only | ✅ Native |
| W2 + 1099 Together | ⚠️ Complex | ✅ Yes | ❌ W2 only | ✅ Yes |
| Mobile App Rating | ⭐ 2.8 | ⭐ 3.9 | ⭐ 4.2 | 🎯 Built mobile-first |
| Field Worker Focus | ❌ No | ❌ No | ❌ Restaurant/retail | ✅ Core identity |
| Onboarding Time | ❌ Days | ⚠️ Hours | ⚠️ Hours | ✅ 20 minutes |
| Transparent Pricing | ❌ Custom quote | ✅ Yes | ✅ Yes | ✅ Yes |
| Operator-Built | ❌ No | ❌ No | ❌ No | ✅ CEO runs trucks daily |

### Xevora's Unfair Advantages
1. GPS-native clock-in — no add-on required, ever
2. W2 + 1099 on the same platform simultaneously
3. Built by an operator who runs a real trucking company
4. 20-minute onboarding vs days for ADP
5. Flat transparent pricing — no surprise add-ons
6. FleetPulse integration — driver data flows automatically
7. Fynlo integration — labor costs flow to books automatically
8. AI-powered anomaly detection and payroll assistance
9. Mobile-first — built for job sites, not offices

### Path to $100M ARR
- $199/mo average x 42,000 customers = $100M ARR
- US has 33M small businesses
- 3.5M trucking/logistics companies alone
- 5M+ HVAC/construction/trades companies
- Target 0.5% of that market = $100M+

---

## SAVE POINT SYSTEM

Update this every single session before stopping work.

CURRENT SAVE POINT:
  Phase:           1
  Step:            P1-S1 (not started)
  Last completed:  HTML prototype — login + dashboard
  Next task:       Scaffold Next.js 14 app in Cursor
  Blocker:         None
  Date:            April 1, 2026

---

## TECH STACK

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, Tailwind CSS |
| Animations | Framer Motion |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Payroll Rails | Check.com (application submitted) |
| AI | Anthropic Claude API |
| Email | Resend |
| Payments | Stripe |
| Charts | Recharts |
| Deployment | Vercel |
| Domain | xevora.io |

---

## PHASE OVERVIEW

| Phase | Name | Timeline | Charge | Key Milestone |
|---|---|---|---|---|
| 1 | Foundation | Weeks 1-6 | Free beta | Auth, company setup, worker management |
| 2 | Time Tracking | Weeks 6-10 | $29/mo | GPS clock-in, approvals, timesheets |
| 3 | Payroll Core | Weeks 10-16 | $49-99/mo | Manual payroll, tax calc, pay stubs |
| 4 | Payroll Auto | Weeks 16-22 | $99-199/mo | Check.com, direct deposit, tax filing |
| 5 | Intelligence | Weeks 22-28 | $199/mo | AI assistant, analytics, integrations |
| 6 | Scale | Month 8+ | $199-499/mo | PWA, enterprise, white label |

---

## PHASE 1 — FOUNDATION
Timeline: Weeks 1-6
Goal: Solid Next.js app with real auth, company setup, worker management
Save Point ID: P1

### P1-S1: Project Scaffold
[ ] Next.js 14 App Router with TypeScript
[ ] Tailwind CSS + DM Sans + Syne fonts configured
[ ] Supabase client initialized
[ ] Environment variables (.env.local)
[ ] Folder structure (/app, /components, /lib, /types)
[ ] Vercel project connected to GitHub
[ ] xevora.io domain pointing to Vercel

### P1-S2: Authentication
[ ] Email/password sign up with validation
[ ] Email/password sign in
[ ] Email verification (Supabase handles)
[ ] Password reset — REAL Supabase integration
[ ] Middleware protecting all /dashboard routes
[ ] Auth context provider (useAuth hook)
[ ] Persistent session across page refreshes
[ ] Sign out clears session fully
[ ] Loading states during auth operations
[ ] Error messages (wrong password, unverified, etc)

### P1-S3: Onboarding Wizard
[ ] 3-step company setup (shown on first login only)
[ ] Step 1: Company name, industry, size
[ ] Step 2: Address, phone, EIN (optional for beta)
[ ] Step 3: Payroll frequency, timezone
[ ] Progress indicator between steps
[ ] Data saved to companies table in Supabase
[ ] Skip allowed for beta testing
[ ] Redirects to dashboard on complete

### P1-S4: Dashboard
[ ] Stat cards: Active Workers, Hours This Week,
    Next Payroll Amount, YTD Paid Out
[ ] All stats pull from real Supabase data
[ ] Workers Clocked In table (live)
[ ] Payroll This Period summary card
[ ] Quick Actions: Add Worker, Run Payroll,
    View Reports, AI Assistant
[ ] Onboarding checklist (dismissible)
[ ] Recent activity feed
[ ] Mobile responsive (bottom nav on mobile)
[ ] Skeleton loading states
[ ] Empty states when no data

### P1-S5: Worker Management
[ ] Workers list — search, filter by status/type
[ ] Add worker form with all fields:
    Name, email, phone, type (W2/1099),
    pay type (hourly/salary/per_mile),
    pay rate, hire date, address, SSN last 4
[ ] Edit worker (all fields)
[ ] Archive worker (soft delete)
[ ] Worker profile page
[ ] Worker status badge (Active/Inactive/On Break)
[ ] Pay type badge (W2/1099)
[ ] Sort by name, pay rate, hire date

### P1-S6: Settings
[ ] Company profile (name, address, phone, logo upload)
[ ] Payroll settings (frequency, overtime rules)
[ ] GPS settings (require GPS on clock-in, geofence radius)
[ ] Notification preferences
[ ] Invite team members (email invite, admin role only)
[ ] Billing page (placeholder — "Manage Plan")
[ ] Danger zone (delete company — admin only)

### P1-S7: Layout and Navigation
[ ] Persistent left sidebar on desktop
[ ] Sidebar items: Dashboard, Workers, Time Tracking,
    Payroll, Reports, Settings
[ ] "Powered by Xavorn" in sidebar footer
[ ] Mobile bottom navigation (5 icons)
[ ] Notification bell with unread count
[ ] User avatar dropdown (Profile, Settings, Sign Out)
[ ] Page titles and breadcrumbs
[ ] 404 page
[ ] Error boundary with fallback UI
[ ] Dark theme only (no toggle)
[ ] Xevora color system: #03060D bg, #2563EB primary

---

## PHASE 2 — TIME TRACKING
Timeline: Weeks 6-10
Goal: GPS clock-in for workers, approval queue for managers
Save Point ID: P2
Charge: $29/mo beta

### P2-S1: Worker Clock-In Page
[ ] Public URL: xevora.io/clock/[company-slug]
[ ] Worker identifies via phone number or PIN
[ ] Single GPS capture on clock-in
[ ] One-tap Clock In button
[ ] One-tap Clock Out button
[ ] Start/End Break buttons
[ ] Current status display (Clocked In / On Break)
[ ] Time elapsed display
[ ] No app install required — pure mobile web
[ ] Works offline (queues and syncs on reconnect)
[ ] Confirmation screen after clock-in

### P2-S2: Time Entry Management
[ ] Time entries page with all entries
[ ] Filter by worker, date range, status
[ ] Approve single entry
[ ] Approve all pending (bulk)
[ ] Edit entry manually (admin override)
[ ] Add missing entry manually
[ ] Flag entry for review
[ ] Delete entry (with audit log)
[ ] Export to CSV

### P2-S3: GPS Verification
[ ] Capture lat/lng on every clock-in
[ ] Display clock-in location on mini map
[ ] Geofence check against company settings
[ ] Alert if outside allowed radius
[ ] Reverse geocode address from coordinates
[ ] GPS accuracy display (meters)
[ ] Manual override for GPS failures

### P2-S4: Timesheet Views
[ ] Weekly timesheet per worker
[ ] Pay period summary view
[ ] Regular hours vs overtime breakdown (auto)
[ ] Hours vs scheduled hours comparison
[ ] Total hours per pay period per worker
[ ] Printable/exportable timesheet PDF
[ ] Color coding (approved = green, pending = yellow)

### P2-S5: Notifications
[ ] Email on worker clock-in (to admin)
[ ] Email on worker clock-out (to admin)
[ ] Alert for missed clock-out after X hours
[ ] Alert when worker approaches overtime threshold
[ ] Daily summary email (sent at 8pm)
[ ] All emails via Resend with Xevora branding

---

## PHASE 3 — PAYROLL CORE
Timeline: Weeks 10-16
Goal: Manual payroll runs, tax calculations, pay stub PDFs
Save Point ID: P3
Charge: $49-99/mo

### P3-S1: Payroll Run Engine
[ ] Create new payroll run (select pay period)
[ ] Auto-pull approved time entries for period
[ ] Calculate gross pay (hours x rate)
[ ] Overtime at 1.5x after 40hrs (configurable)
[ ] Per-mile pay calculation
[ ] Salary proration for partial periods
[ ] Bonus and commission line items
[ ] Deductions (health insurance, garnishments)
[ ] Full payroll preview before submission
[ ] Edit individual worker line items
[ ] Save as draft, submit when ready

### P3-S2: Tax Calculations
[ ] Federal income tax withholding tables
[ ] State income tax (all 50 states database)
[ ] Social Security: 6.2% employee, 6.2% employer
[ ] Medicare: 1.45% employee, 1.45% employer
[ ] Additional Medicare 0.9% over $200K
[ ] FUTA: 6% on first $7K (employer only)
[ ] SUTA: varies by state
[ ] 1099 workers: zero withholding (they handle own taxes)
[ ] Annual tax table updates

### P3-S3: Pay Stubs
[ ] Auto-generated PDF per worker per payroll run
[ ] Company name, logo, address
[ ] Worker name, address, last 4 SSN
[ ] Pay period start and end
[ ] Pay date
[ ] Hours breakdown (regular/OT/other)
[ ] Earnings breakdown
[ ] Deductions itemized
[ ] Gross pay, total deductions, net pay
[ ] YTD gross, YTD deductions, YTD net
[ ] Email delivery to worker automatically
[ ] Worker portal to download past stubs

### P3-S4: Payroll Reports
[ ] Payroll summary (all workers, one run)
[ ] Worker earnings history
[ ] Tax liability report
[ ] Labor cost by week/month/quarter
[ ] Overtime report
[ ] 1099 payments report (for year-end)
[ ] Export CSV and PDF
[ ] Print view

### P3-S5: Payroll History
[ ] All past payroll runs listed
[ ] Filter by date, status
[ ] Re-download any pay stub
[ ] View run details
[ ] Void a payroll run (with reason)
[ ] Amendment workflow

---

## PHASE 4 — PAYROLL AUTOMATION
Timeline: Weeks 16-22
Goal: Check.com direct deposit, automated tax filing
Save Point ID: P4
Charge: $99-199/mo

### P4-S1: Check.com Integration
[ ] Check.com API fully integrated
[ ] Company bank account setup and verification
[ ] Worker bank account collection (AES-256 encrypted)
[ ] Direct deposit per worker (checking or savings)
[ ] Submit payroll to Check.com API
[ ] Real-time webhook status updates
[ ] Failed ACH handling and retry logic
[ ] Same-day ACH option (premium)
[ ] Paper check fallback option

### P4-S2: Tax Filing Automation
[ ] Federal 941 quarterly payroll tax return
[ ] State unemployment (SUTA) filings
[ ] W-2 generation for all W2 workers (annual)
[ ] 1099-NEC generation for all contractors (annual)
[ ] E-delivery of W-2/1099 to workers
[ ] IRS electronic filing integration
[ ] State e-filing (supported states)
[ ] Tax payment scheduling
[ ] IRS notice management workflow

### P4-S3: Worker Self-Service Portal
[ ] Worker-specific login (xevora.io/worker)
[ ] View all pay stubs
[ ] Download W-2 and 1099 documents
[ ] Update direct deposit information
[ ] Update W-4 withholding
[ ] View time entries and hours
[ ] Request time off
[ ] Update personal information
[ ] Emergency contact management

### P4-S4: Compliance Engine
[ ] New hire reporting automation (all 50 states)
[ ] I-9 document collection and storage
[ ] W-4 digital collection and storage
[ ] State-specific overtime law alerts
[ ] Minimum wage compliance checks (by state)
[ ] Garnishment processing
[ ] Workers compensation calculation helper
[ ] Compliance calendar (upcoming deadlines)

---

## PHASE 5 — INTELLIGENCE
Timeline: Weeks 22-28
Goal: AI features that make Xevora feel magical
Save Point ID: P5
Charge: $199/mo standard

### P5-S1: AI Payroll Assistant
[ ] Natural language commands
    ("Pay everyone for last week")
    ("Show me overtime this month")
    ("Who hasn't clocked in today?")
[ ] Anomaly detection and flagging
    (24-hour shift, unusual location, duplicate entry)
[ ] Smart pre-payroll checklist
    ("3 workers have unapproved hours")
[ ] Compliance alerts in plain English
[ ] Claude API with field-ops system prompt
[ ] Conversation history per company
[ ] AI suggestions surfaced on dashboard

### P5-S2: Advanced Analytics
[ ] Labor cost trends (weekly/monthly/quarterly)
[ ] Cost per job or route
[ ] Worker productivity index
[ ] Overtime pattern detection
[ ] Turnover risk indicators
[ ] Revenue per labor dollar
[ ] Predictive payroll cost estimate
[ ] Department and team breakdowns
[ ] Benchmark against industry averages

### P5-S3: Fynlo Integration
[ ] Labor costs push to Fynlo automatically after payroll run
[ ] Job costing: cost per route, per contract, per client
[ ] Invoice generation triggered by job completion
[ ] Shared P&L view across Xevora + Fynlo
[ ] Single login across both products (SSO)
[ ] Combined dashboard showing ops + financials

### P5-S4: FleetPulse Integration
[ ] Driver clock-in synced from FleetPulse GPS data
[ ] Mileage-based pay pulled from FleetPulse routes
[ ] Route-based job costing
[ ] Shared driver profile database
[ ] Single login across FleetPulse + Xevora
[ ] Combined operator dashboard

---

## PHASE 6 — SCALE
Timeline: Month 8+
Goal: Mobile app, enterprise, white label
Save Point ID: P6
Charge: $199-499/mo + enterprise contracts

### P6-S1: PWA Mobile App
[ ] Installable on iOS and Android (no app store)
[ ] Push notifications for clock-ins, approvals, payroll
[ ] Offline-capable with sync queue
[ ] Worker app (clock-in focused)
[ ] Manager app (full dashboard)
[ ] Biometric login (Face ID / fingerprint)

### P6-S2: Enterprise Features
[ ] Multiple locations / divisions
[ ] Role-based permissions (Admin/Manager/Viewer/Worker)
[ ] Custom approval workflows
[ ] SSO with Google and Microsoft
[ ] REST API with documentation
[ ] Webhooks for payroll events
[ ] Custom branding per company
[ ] Dedicated account manager
[ ] SLA guarantee

### P6-S3: Integrations
[ ] QuickBooks Online (two-way sync)
[ ] Xero (two-way sync)
[ ] FreshBooks
[ ] ADP migration import tool
[ ] Gusto migration import tool
[ ] Zapier (300+ app connections)
[ ] Slack notifications
[ ] Google Calendar sync
[ ] Trucking TMS integrations

### P6-S4: White Label
[ ] White label for insurance companies
[ ] White label for fleet management companies
[ ] White label for staffing agencies
[ ] Custom domain per white-label client
[ ] Branded mobile app
[ ] Revenue share model (20-30%)
[ ] Partner portal

---

## PRICING STRATEGY

### Beta (Now — Phase 2)
Free for first 10 customers. Collect feedback relentlessly.

### Phase 2 Launch
Starter:  $49/mo  — up to 10 workers
Growth:   $99/mo  — up to 30 workers (Most Popular)
Pro:      $199/mo — unlimited workers

### Phase 4 (Full Payroll)
Starter:  $79/mo  — up to 10 workers
Growth:   $149/mo — up to 30 workers
Pro:      $249/mo — unlimited workers
Enterprise: Custom — 100+ workers

### Revenue Milestones
$1M ARR:   417 customers x $199/mo
$10M ARR:  4,200 customers x $199/mo
$50M ARR:  21,000 customers x $199/mo
$100M ARR: 42,000 customers x $199/mo = 0.5% of market

---

## VALUATION COMPS

Homebase:  $500M+ valuation (100K customers, hourly teams)
Gusto:     $9.5B valuation (300K+ customers, SMB payroll)
Rippling:  $13.5B valuation (workforce platform)
ADP:       $100B+ market cap

Xevora's niche (field operators) is underserved by ALL of them.
A focused, well-executed wedge into this market at 42K customers
is a realistic $800M-1.5B outcome.

---

## GO-TO-MARKET

Phase 1-2:  James uses Xevora for Prush Logistics daily.
            10 beta users from trucking/HVAC network.
            Reddit: r/Truckers, r/HVAC, r/smallbusiness

Phase 3-4:  SEO content ("ADP alternative for trucking").
            YouTube and TikTok operator content.
            LinkedIn founder story content weekly.

Phase 5-6:  FleetPulse cross-sell (built-in funnel).
            Trucking and HVAC association partnerships.
            White label deals with insurance companies.

---

*This is the single source of truth for Xevora development.
Update the SAVE POINT at the end of every session.*
