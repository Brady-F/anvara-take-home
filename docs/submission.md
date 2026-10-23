# Submission Guide

## ⚠️ Important: Do NOT Fork This Repository

Please follow these instructions carefully to submit your work.

## Implementation Notes — Challenge 1

Completed Challenges 1–5, Design Bonus 2: Dashboard UI/UX, and Design Bonus 3:
Animations & Polish (implementation notes below).
Other bonuses remain pending.

- Replaced explicit `any` types in application code with typed API inputs/responses,
  component state, and utilities; removed unused code.
- Matched frontend types to Prisma's nullable fields, enum values, and decimal JSON
  strings. Display calculations convert those strings to numbers as needed.
- Removed unsupported `dimensions` and `pricingModel` fields from ad-slot creation
  and reused `getParam` to narrow Express route parameters.
- Added missing CORS declarations. Kept TypeScript 7 for compilation; used Microsoft's
  TypeScript 6 API compatibility package for typescript-eslint and ESLint 9 for the
  existing React plugin. TypeScript handles undefined-name checks in frontend TS files.
- Kept navigation role state tied to the current user to satisfy React's effect lint
  rule without changing to Server Components.

Validation: `pnpm typecheck`, `pnpm lint`, and `pnpm test --run` pass using pnpm 11.21.0.
Lint retains four existing console warnings; ten added utility tests pass, while
the nine original API test placeholders remain TODOs. Both services start with
`pnpm dev`; browser checks passed for the marketplace, ad-slot detail, sponsor and
publisher dashboards, and logout. Read-only API checks confirmed decimal serialization.

Final test review retained both test files, separated unrelated helper checks, and
verified that `sleep` stays pending until its requested delay. Backend tests cover
parameter narrowing, pagination/defaults, filter allowlisting, currency formatting,
and percentage changes including zero. Frontend tests cover debounce timing and
argument types, query decoding/duplicates, price formatting, conditional class names,
and sleep timing/return type. Fake timers avoid real waits; only debounce uses a spy.
These utility tests do not establish API mutation or authorization correctness.

The backend build passes. Default `pnpm build` encounters a Turbopack port-binding
restriction in the verification environment. The frontend production build passes with
`pnpm exec dotenv -e .env -- pnpm --filter @anvara/frontend build --webpack` from the
repository root. The root `.env` must be loaded or its variables supplied by the build
environment; no bundler or build-script changes were made.

Challenge 1 did not implement API authentication, ownership checks, CRUD completion,
or Server Actions. No database reset or seed was run. GitHub publication remains pending.

## Implementation Notes — Challenge 2

- The sponsor page awaits an authenticated Server Action, then passes campaigns to
  the list and cards as props. Both components now render on the server without
  client hooks or a second browser session/role lookup.
- The action verifies the session and sponsor role itself and derives the sponsor ID
  from that session's role response. Missing sponsor IDs fail rather than fetching
  every campaign. Anonymous visitors go to `/login`; other roles go to `/`.
- Role and campaign requests use `cache: 'no-store'` to keep private data fresh and
  avoid shared caching. The action uses the existing typed API client for role lookup
  because `getUserRole` hides backend failures as a missing role. Failures reach the
  route error boundary, which shows a generic message and a retry button.
- Added `loading.tsx` and retained the empty state. Only the error boundary needs
  client JavaScript within this route; it uses Next.js 16.3's `retry` prop to refetch.
  Shared navigation remains an existing Client Component with its own role request.
- Kept the existing UI and dependencies. Backend authentication/ownership enforcement
  remains Challenge 3; moving fetching to the server does not secure the Express API.
- Campaign dates use `en-US` formatting in UTC, so the displayed calendar day does
  not change with the server's time zone. A regression test runs under New York time
  and verifies that midnight UTC start/end dates do not shift to the previous day.

Validation: `pnpm typecheck`, `pnpm lint`, `pnpm test --run`, and
`pnpm exec dotenv -e .env -- pnpm build` pass with pnpm 11.21.0. There are 24 passing
tests, including 14 new Challenge 2 cases, plus nine existing API TODOs. Lint retains
the same four console warnings. The new tests cover session/role guards, sponsor
scoping, missing IDs, uncached requests, empty results, HTTP/connection failures,
server-rendered campaign markup, loading, and retry wiring. The small Vitest config
enables the existing React plugin and `@/` alias for these component/action tests.

Browser checks confirmed loading, campaign display, a graceful error after stopping
the backend, and recovery through Try again after restarting it. A disposable HTTP
check confirmed campaign content in raw HTML with scripts removed and redirects for
anonymous/publisher visitors. Next.js may stream redirects in an HTTP 200 response.
The production client-reference manifest excludes the campaign list and card.
No database reset or seed was run for this challenge. GitHub publication remains pending.

## Implementation Notes — Challenge 3

- Implemented `requireAuth` with Better Auth's `getSession` and `fromNodeHeaders`.
  Express validates the signed cookie against the same database and secret as Next.js,
  bypasses cookie-cached session data, and attaches session identity and database-derived
  sponsor/publisher IDs. Missing, invalid, expired, and revoked sessions return `401`;
  infrastructure failures fail closed with a generic `500` response.
- Campaign/ad-slot routers enforce sponsor/publisher roles, scope lists to the session
  profile, reject conflicting query/body owner IDs, and derive creation ownership from
  that profile. ID-path middleware covers GET and future PUT/DELETE handlers: foreign
  resources return `403`, missing resources return `404`. Detail reads and listing-reset
  writes also include the owner ID in their final query.
- Closed alternate access through sponsor/publisher profiles, placements, role lookup,
  and dashboard stats. Removed nested expansions of counterpart campaigns/ad slots;
  existing placements remain visible to their participating sponsor/publisher. Sponsor
  profile creation now requires a session and binds `userId` to that session.
- Browser API/role requests include credentials; both dashboard server requests forward
  only the cookie header. Private API requests/responses use `no-store`. Express allows
  credentialed CORS only for the origin in `BETTER_AUTH_URL` (default localhost:3847)
  and rejects other browser origins before mutations. Both auth instances require the
  configured database and shared secret; removed the hardcoded secret fallback and
  restored Better Auth's default CSRF checks. Added only the existing workspace's
  `@types/pg` development dependency to the backend.
- **Conflict decisions:** Brady explicitly chose Challenge 3's strict owner-only ad-slot
  policy over the public marketplace description. Anonymous/sponsor marketplace reads
  and sponsor booking are denied; listing resets require the owning publisher. Placement
  creation also requires ownership of its campaign, creative, and target publisher/slot,
  so ordinary cross-publisher placement creation is denied. No public alternative was
  added. Followed Challenge 3's explicit `403` requirement over Challenge 4's conflicting
  `404` example; this deliberately reveals resource existence to an authenticated user
  of the appropriate role. The docs also conflict on completion requirements and grading
  weights; this change implements only the requested challenge and makes no grading
  assumptions.
- PUT/DELETE implementations and broader mutation validation remain Challenge 4 work.
  An owner reaching an unimplemented PUT/DELETE handler still receives Express's `404`;
  authentication and ownership checks execute first. No bonuses or UI redesign were added.

Validation: pnpm 11.21.0; `pnpm typecheck`, `pnpm lint`, `pnpm test --run`, and
`pnpm exec dotenv -e .env -- pnpm build` pass. There are 81 passing tests and nine
original API TODOs; lint retains the same four console warnings. The 54 backend security
cases use an ephemeral HTTP server with mocked Better Auth/database boundaries to check
route wiring, roles, session-derived scoping, spoofed IDs, status codes, alternate access,
booking helpers, failure handling, and CORS. Three frontend request tests and the updated
sponsor action regression verify credentials, cookie forwarding, and uncached requests.
These tests do not prove database integration on their own.

A disposable live check separately verified real signed cookies, both demo accounts'
scoped lists/owned details, foreign and missing resources, wrong roles, tampered cookies,
expired sessions, and revocation after logout. Only newly issued smoke-test sessions were
expired; no application records were changed or database reset/seed run. Browser checks
verified both dashboards, role navigation, logout, and anonymous redirect to login. The
smoke script/screenshots and Next.js-generated agent notes are outside the repository;
they are verification artifacts, not regression tests or submission files. Challenge 3
is committed locally; GitHub publication remains pending.

Follow-up review fixed malformed enum/availability/placement-ID query filters: these
now return `400` before resource queries, using Prisma's generated enum values rather
than trusting TypeScript casts. Live checks reproduced the earlier enum-filter `500`s
and confirmed the new `400`s. Placement creation now denies a sponsor without a publisher
profile before looking up campaign/slot/creative IDs, avoiding unnecessary queries and
an existence probe through a route that cannot authorize that user. A regression case
also checks all resource relationships for an account owning both profiles (permitted by
the existing schema). Frontend creation inputs now permit omission of server-derived
owner IDs, and the campaign helper delegates cache policy to the shared API client.
The CORS test sets its own frontend origin so deployment environment variables cannot
change the test's expected origin. Review assumed the take-home's local deployment;
no load benchmark or production deployment review was performed.

### Marketplace access follow-up — October 23, 2026

The sponsor demo's marketplace error was a `403` from the deliberately publisher-only
`/api/ad-slots` endpoint, not an API/database outage. The README describes a public
marketplace, while Challenge 3 requires owner-only ad-slot reads. Brady approved a
limited exception to the earlier conflict decision: authenticated sponsors and
publishers may browse a separate read-only catalog. Anonymous browsing remains denied.

- Added `GET /api/marketplace/ad-slots` and `GET /api/marketplace/ad-slots/:id`, with
  an explicit selection of listing fields and publisher ID/name/website. Private
  placements, account details, pricing floors, and dashboard data are excluded.
  Both available and unavailable listings appear, with their current availability.
- Marketplace list/detail pages use these catalog endpoints. `/api/ad-slots`, its
  ownership checks, and all mutation permissions remain unchanged. Booking remains
  unavailable; removed its nonfunctional UI and limited listing reset controls to the
  owning publisher. Anonymous visitors see a sign-in link instead of a retry loop.
- This supersedes the earlier denial of sponsor marketplace reads only. It is an
  explicit product decision to reconcile the conflicting docs, not a claim that
  Challenge 3 itself requests cross-owner reads. No dependencies or schema changes.

Validation: cached pinned pnpm 11.21.0; typecheck, lint, the production build with the
root environment loaded, and all **203 regression tests** pass
(101 backend, 102 frontend); nine original API placeholders remain TODOs. Lint has
three existing console warnings. Tests cover catalog access and allowed fields,
missing listings, failures, unavailable writes, frontend endpoint selection, sign-in
guidance, and publisher-only reset behavior; existing ownership tests remain intact.
All **four focused browser scenarios** pass in Chromium and WebKit against the local
development stack: sponsor list/detail access and restricted response fields, private
API denial, anonymous sign-in guidance, and publisher loading/navigation/motion.
These browser scenarios do not create, reset, or delete application records.

## Implementation Notes — Challenge 4

- Added campaign and ad-slot PUT/DELETE endpoints using the existing authentication,
  role, and ownership middleware. Final writes also include the session-derived owner
  ID. Successful updates return the persisted resource with `200`; deletes return an
  empty `204`. Missing resources return `404`, including deletion races reported by
  Prisma; unexpected failures are logged and return generic JSON `500` responses.
- Fixed ad-slot creation and applied the same validation to campaign/ad-slot creation
  and updates. Request bodies must be objects containing supported writable fields.
  Names cannot be blank; budgets/base prices must be positive JSON numbers fitting
  Decimal(10,2). Optional rates/floors permit zero or null. Enum values, text, targeting
  arrays, boolean availability, and positive integer dimensions are checked before
  writing. Unknown/read-only fields and empty updates return `400`. Owner IDs may be
  omitted or match the session; attempted ownership transfers return `403`.
- PUT accepts partial updates, following the challenge's `{ name, budget }` example.
  Omitted fields are preserved, nullable fields can be cleared, and empty targeting
  arrays are supported. Dates accept calendar dates or ISO timestamps with a timezone;
  invalid dates, year zero, and end dates at/before the start are rejected. A one-sided date update
  is checked against the stored counterpart. Campaign creation retains empty targeting
  defaults and Prisma's default DRAFT status when omitted.
- Kept the existing database schema: campaign deletion cascades to its creatives and
  placements; slot deletion cascades to its placements. Each delete is one Prisma
  operation with database-enforced cascading, so no manual multi-table delete sequence
  or separate transaction is needed. These endpoints perform hard deletes.
- **Conflict decisions:** retained Challenge 3's documented owner-only policy and the
  explicit `403` requirement in both challenges' checklists, despite Challenge 4's
  conflicting `404` example. The public marketplace conflict and completion/grading
  conflicts remain as documented above. No new public access, dashboard mutations,
  frontend CRUD helpers, dependencies, schema changes, or bonus features were added;
  dashboard controls and Server Actions remain Challenge 5 work.

Validation used the cached pinned pnpm 11.21.0 executable. `pnpm typecheck`, `pnpm lint`,
`pnpm test --run`, `pnpm exec dotenv -e .env -- pnpm build`, and targeted Prettier checks
pass. There are 115 passing tests, including 34 added CRUD cases in the existing HTTP
security suite, plus nine unchanged original API TODOs. Lint retains four existing
frontend console warnings. The regression cases cover partial updates, supported and
invalid fields, owner-derived writes, attempted transfers, authentication/roles,
foreign/missing resources, empty delete responses, deletion races, and logged generic
server failures. They mock the session/database boundaries; the separate live check
below verifies actual persistence and cascades. Local socket permissions were needed
for the HTTP tests, dev servers, and Next.js build.

`pnpm dev` starts both services. A disposable live HTTP/Prisma smoke check authenticated
both demo accounts with real signed cookies, created/read/listed/updated records,
verified database persistence and decimal serialization, rejected invalid/foreign/
missing/anonymous requests, and checked empty `204` deletes. Newly created creatives
and placements verified actual PostgreSQL cascade behavior for both resource types.
All smoke-test records and sessions were cleaned up; existing application records were
not changed, and no reset or seed ran. The script and generated Next.js agent notes
are retained outside the repository as disposable verification artifacts. No new UI
was introduced or browser walkthrough performed for this backend challenge; no load
benchmark was run. Challenge 4 is committed locally; GitHub publication remains pending.

Review follow-up:

- Fixed a concurrent-date-edit race: changing the start and end dates in separate
  requests could validate both against the old dates, then save an inverted range.
  Campaign PUT now reads, validates, and writes inside one serializable Prisma
  transaction. A write conflict returns JSON `409` with an instruction to retry;
  this adds the appropriate conflict response to the challenge's listed status codes.
  No automatic retry loop or new dependency was added.
- Confirmed PostgreSQL rejects null bytes in text and year-zero timestamps. These
  inputs previously passed validation and caused `500`s. All writable text fields,
  including targeting entries, now reject null bytes; dates reject year zero,
  including timestamps whose timezone offset moves the UTC instant into year zero.
  Invalid input returns `400` before a database write.
- Extended the existing regression suite to cover those inputs, transaction scoping,
  serializable isolation, and the `409` response. The added cases failed before the
  fixes and passed afterward. A disposable real-database check forced two authenticated
  HTTP date updates to read the same initial range: one returned `200`, one `409`, the
  stored range stayed valid, and retrying the conflicting edit returned `400`. It also
  verified the invalid text/date `400`s. Its new campaign and session were cleaned up.
  Typecheck, lint, tests, build, and targeted formatting pass after the review. The
  existing validation helpers remain small functions shared by both create/update
  paths; no additional validation framework or abstraction was needed.

---

## Implementation Notes — Challenge 5

- Added authenticated Server Actions for campaign and ad-slot create/update/delete.
  Actions forward the incoming cookie header to the existing API; Express remains the
  authority for roles, ownership, and database validation. Form data never supplies
  an owner ID. Each successful mutation revalidates its dashboard path.
- Both dashboards render their owned lists on the server. Publisher loading/error
  boundaries now match the sponsor route, and publisher fetches no longer depend on
  a browser effect that would stay stale after revalidation. Lists/cards remain Server
  Components; small client editors handle the forms and shared success announcement.
- Forms provide field-specific validation, retained input after errors, prefilled
  edits, pending Save/Delete buttons, cancellation, and success feedback. Successful
  saves close the form and return focus to its trigger. Native delete confirmations
  explain the existing cascade to placements and, for campaigns, creatives.
- **Version decision:** the challenge requests `useFormState`, but the installed
  React 19 deprecates it and emits a rename warning. Brady approved `useActionState`
  instead; pending buttons still use the requested `useFormStatus` hook. No dependency
  changes, bonuses, or dashboard redesign were added.
- Forms edit the displayed core fields, campaign status, and ad-slot availability.
  Campaign dates use calendar-day inputs; new or changed dates save midnight UTC,
  while unchanged dates retain their exact stored timestamps. Money follows the
  API's positive amount, two-decimal, `Decimal(10,2)` limits. Other optional API fields
  are left unchanged by edits. The API client now accepts empty `204` deletes, preserves
  useful `4xx` errors, and hides unexpected `5xx` details.
- Preserved the previously approved owner-only access and `403` decisions. The docs'
  completion/grading conflicts do not change this challenge's scope. GitHub publication
  remains pending user authorization.

Validation: typecheck, lint, tests, production build (with the root `.env` loaded),
and targeted formatting checks pass using the installed pnpm 11.21.0 directly. The
global launcher's registry verification was unavailable. There are 164 passing tests,
nine existing API TODOs, and the same four pre-existing console lint warnings. Backend
HTTP tests require local port access; the initial sandboxed run failed to bind its
server, then passed with that access. Regression tests cover action payloads/cookies,
validation, session failures, backend errors, successful-only revalidation, server
rendered lists, and form interactions (retained values, prefilled dates, pending
buttons, cancellation, focus, delete confirmation, feedback, and rejected requests). A disposable live
HTTP check exercised all six real Next.js Server Actions against the existing local
database and confirmed persisted creates/updates/deletes, invalid input, wrong roles,
and anonymous access. Its records and newly issued sessions were cleaned up; no
reset or seed ran. Browser checks verified sponsor creation, validation, pending state,
automatic refresh, and persisted edits. Follow-up browser checks completed publisher
create/edit/delete, required-field and price validation, retained input, prefilled edits,
type/availability changes, successful form closure, and persistence after reload.
The in-app browser controls stalled around native confirmation prompts; a separate
Chrome tab controlled through native UI completed both dashboards' delete flows.
Cancelling the publisher confirmation preserved its record; accepting each deletion
removed only its disposable test record, showed success feedback, and stayed deleted
after reload. Temporarily pausing the local API verified disabled `Saving...`, `Cancel`,
and `Deleting...` buttons; resuming it completed both sponsor mutations. The final
Chrome dashboard console showed no errors. Both browser test records were removed.
No application changes were needed for this follow-up. Screenshots, disposable smoke
scripts, and Next.js-generated agent notes are outside the submission.

Review follow-up:

- Fixed campaign edits that silently truncated unchanged timestamps to midnight or
  rejected an existing same-day time range. The editor now omits unchanged dates;
  update actions allow those omissions, and the existing API transaction validates
  the merged date range. Creation still requires both dates. A real browser edit of
  a campaign running 10:30–16:45 on one day preserved both timestamps, including their
  milliseconds, while updating its name and budget; database-backed reads confirmed it.
- Fixed fields remaining editable during Save and the Edit trigger remaining active
  during Delete. The shared pending controls now use a native disabled fieldset;
  no extra pending-state store or form library was added. Regression tests reproduced
  the failures before the fixes, and Chrome checks verified disabled inputs, disabled
  Edit/Delete controls, normal completion after API recovery, and focus after Cancel.
- Improved contrast of new error/success/delete text in the existing dark theme.
  The generic form helpers, shared feedback context, and separate domain actions were
  retained because both dashboards use them; no speculative abstraction was added.
- Compliance review retained Brady's approved `useActionState` substitution and the
  earlier owner-only/`403` decisions. The listed CRUD, validation, pending, feedback,
  authentication, and revalidation behavior is implemented. Opening and submitting
  these client-controlled forms requires JavaScript; the challenge lists progressive
  enhancement as a concept/benefit, but does not explicitly require a no-script UI.
  Native disclosures with direct Server Action bindings would be needed for that.
- Review assumed the take-home's local deployment. No dependency changes, reset,
  seed, commit, or push were performed. Only disposable review records were removed.

Review validation: typecheck, lint, all 164 tests, the production build with the root
`.env` loaded, targeted formatting, and `git diff --check` pass. Nine existing API TODOs
and four existing console lint warnings remain. Browser checks and database-backed
reads described above supplement the mocked regression tests; no production load test
or no-script implementation was added.

## Implementation Notes — Design Bonus 2: Dashboard UI/UX

- Redesigned both dashboards and shared navigation with a warm, consistently light
  canvas, Anvara blue actions, system typography, compact summaries, and responsive
  three/two/one-column cards. The reference was Airbnb's
  [listing management](https://www.airbnb.com/resources/hosting-homes/a/introducing-the-listings-tab-638):
  clear item details and accessible actions. Financial details and restrained format
  icons establish card identity without invented analytics or cover imagery.
- Added URL-based name search, status/availability/format filters, and sorting through
  a GET form. Invalid query values fall back safely. Filtering runs on the server over
  the already-authorized list; summary values always use the complete owned dataset.
  Selections survive reload, Back, and mutations. This suits the take-home dataset;
  larger inventories would need API filtering and pagination.
- Replaced inline editors and browser confirmations with a small native-dialog
  component. Forms retain input after failure, focus invalid fields, disable controls
  and dismissal while pending, and restore focus when closed. When an updated or
  deleted item disappears, focus returns to Create. Deletion names the item and its
  existing placement/creative cascade, with Cancel focused initially. Success notices
  remain until dismissed or another mutation starts.
- Kept the existing Server Actions, validation, ownership and `403` decisions,
  successful-only revalidation, currency cents, and UTC date/timestamp behavior.
  Lists, summaries, cards, and query filtering remain server-rendered. Client code
  handles navigation, dialogs/forms, Apply pending feedback, and notices. No new
  dependencies, API/schema changes, or dark-mode switch were added. Mutation dialogs
  still require JavaScript.
- A requested visual follow-up carries the same light design through marketplace
  listings/details, login, and the welcome page used before/after login. Shared format
  icons, readable availability, and precise monthly prices now match the dashboards.
  The native selects retain their behavior with a chevron inset 14px from the edge.
  Blue field outlines are removed; a neutral fill identifies focused fields, and
  links/buttons retain a neutral keyboard outline. Below 360px, dashboard filters
  stack to avoid truncating longer selections. Existing marketplace access and booking
  permissions are unchanged.

Validation with pnpm 11.21.0: typecheck, lint, all **181 tests** (93 backend and 88
frontend), production build with the root environment loaded, targeted Prettier checks,
and `git diff --check` pass. The nine original API TODOs and four existing console lint
warnings remain. New coverage checks combined filters, sorting/defaults, summaries
independent of filters, empty results, every status/format label, cents, UTC dates,
dialogs, retained invalid input, pending controls, rejected requests, feedback, focus
restoration after refresh, navigation, and logout failure. Existing ownership, action
payload, timestamp-preservation, revalidation, and server-rendering tests were retained.
The DOM test environment simulates native dialog methods; browser checks supplement it.
Follow-up tests verify marketplace links/labels/cents and safe failures, plus account
selection and disabled login controls during a request and recovery after rejection.

Browser verification covered both roles at 1440px, 768px, 390px, and a 320px overflow
check. Checks included long names, maximum supported amounts, mobile dialogs, keyboard
focus/Escape, 200% Chrome zoom and dialog scrolling, and shared navigation on login and
marketplace pages. Chrome media emulation confirmed a light dashboard under a dark
preference and zero transition duration with reduced motion. Core text, primary-action,
and status colors exceed 4.5:1 contrast. Loading skeletons, filtered-empty states,
pending controls, validation, API failure, and retry recovery were inspected; empty
accounts are covered by component tests without clearing seeded data.

Both demo roles created and edited disposable records in the browser. Real Next.js
delete actions were exercised over HTTP, and follow-up reads confirmed both records
were removed; browser checks covered the named confirmation and cancellation. Pausing
the local API verified pending behavior, and restarting it verified error recovery.
The production Chrome console showed no application errors. No reset, seed, commit,
push, or production deployment was performed. Screenshots use existing demo data.

| Dashboard | Desktop (1440px)                                          | Mobile (390px)                                           |
| --------- | --------------------------------------------------------- | -------------------------------------------------------- |
| Sponsor   | [Screenshot](screenshots/dashboard/sponsor-desktop.jpg)   | [Screenshot](screenshots/dashboard/sponsor-mobile.jpg)   |
| Publisher | [Screenshot](screenshots/dashboard/publisher-desktop.jpg) | [Screenshot](screenshots/dashboard/publisher-mobile.jpg) |

Follow-up screenshots: [field focus and arrows](screenshots/interface/controls-focus.jpg),
[marketplace desktop](screenshots/interface/marketplace-desktop.jpg),
[marketplace mobile](screenshots/interface/marketplace-mobile.jpg),
[listing details](screenshots/interface/listing-detail-desktop.jpg),
[login desktop](screenshots/interface/login-desktop.jpg),
[login mobile](screenshots/interface/login-mobile.jpg), and
[welcome page](screenshots/interface/welcome-desktop.jpg).
Browser checks confirmed both demo sign-ins, logout, listing navigation, dropdown
selection, dialog field styling, and layouts down to 320px. This visual follow-up
did not create, book, reset, or delete application records.

## Implementation Notes — Design Bonus 3: Animations & Polish

- Added the approved Motion dependency to the frontend for card entrances/exits,
  position-only grid rearrangement, and coordinated dialog/notice exits. CSS handles
  page fades, button presses, field focus transitions, marketplace hover, and pending
  indicators. Transitions take 120–220ms with restrained easing; existing loading
  skeletons and persistent dismissible notices remain.
- Both dashboard lists pass server-rendered cards into one small client grid wrapper.
  Record IDs preserve component identity through filtering and sorting. Initial cards
  remain visible in server HTML; later additions fade in, removals become inert, and
  surviving cards move without scaling their text. Empty results use the same wrapper.
  Server Actions, payloads, successful-only revalidation, validation, ownership rules,
  and the earlier marketplace/403 decisions are unchanged.
- Native dialogs retain focus containment and pending restrictions through their exit.
  Controls cannot submit again while closing. Focus returns after the trigger is
  re-enabled, or to Create when a later refresh removes that trigger. Browser tests
  exposed and verified both timing cases. Reduced motion disables CSS and JavaScript
  animation, including opacity and spinners. A small media-query subscription also
  handles preference changes during a session; Motion 14.6's built-in hook captures
  only the initial preference.
- Tradeoff: Motion adds dashboard client JavaScript but avoids maintaining a custom
  layout/exit engine. No route-exit choreography, optimistic mutations, confetti,
  parallax, inline editors, new backend behavior, or other bonuses were added.

Validation with pnpm 11.21.0: typecheck, lint, **190 regression tests** (93 backend,
97 frontend), and the production build with the root environment loaded pass. Lint
retains the same four console warnings and the nine original API TODOs remain.
The added tests cover identity, interrupted exits, empty transitions, inactive closing
controls, reduced-motion changes, and focus after delayed card removal. Existing server
HTML and mutation regressions were retained; Vitest excludes the separate browser suite.

All **10 Playwright scenarios passed against the production frontend**. They cover
both roles in Chromium and WebKit, desktop and
390px mobile, plus 320px overflow checks. They exercise real Server Actions and layout
movement, create/edit/delete, validation, cancelled deletion, a held/rejected request,
filtered removal, rapid filters, keyboard focus/Escape, notifications, marketplace
loading/hover/navigation, and changing reduced motion. Tests create uniquely named
records and remove only those records. Follow-up reads confirmed the original demo
inventory remained. No reset, seed, commit, or push was performed.

Run browser checks against the existing seeded local stack: start `pnpm dev`, install
the browsers once with `pnpm exec playwright install chromium webkit`, then run
`pnpm e2e` in another terminal. The suite uses localhost ports 3847/4291 and the existing
demo accounts; it does not provision or clear the database.

Production limitation found during verification: the existing backend `start` script
fails resolving the extensionless generated Prisma `internal/class` import. The backend
build itself passes. The production frontend preview therefore uses the existing
development API; repairing the backend launch script/generated imports is outside
this animation change. No production deployment or large-inventory benchmark was run.

Screenshots: [sponsor desktop](screenshots/animations/sponsor-desktop.jpg),
[sponsor dialog](screenshots/animations/sponsor-dialog.jpg),
[publisher mobile](screenshots/animations/publisher-mobile.jpg), and
[publisher dialog](screenshots/animations/publisher-dialog.jpg).

### Loading-state follow-up

Replaced text-only loading and button spinners with a shared CSS shimmer. Dashboard
placeholders follow each role's summary, filters, and card contents; marketplace cards
and listing details reserve their actual sections. Known dashboard headings remain
visible so text wraps consistently. Pending login/logout, filters, save/delete, and
listing reset keep the button's original size and preserve entered form values.
Screen readers retain descriptive loading labels, and reduced motion uses static
skeletons. No new dependencies or data/API changes were needed.

Challenge 5's visible “Saving...”/“Deleting...” examples now use skeletons at Brady's
request; those labels remain available to assistive technology. Unknown record counts
and text lengths use three representative cards, so final content can still change height.

Validation using cached pnpm 11.21.0: typecheck, lint (three existing console warnings),
production build with root environment loaded, and 209 regression tests pass (101 backend, 108 frontend;
nine existing API TODOs remain). Ten targeted Chromium/WebKit scenarios pass, covering
held requests, desktop/390px/320px layouts, reduced motion, stable login button size,
request failure recovery, and existing navigation/dialog behavior. Both dashboard
skeletons were also rendered with the app stylesheet and inspected at those widths.
The added component checks cover dashboard structure, accessible pending labels,
account/role loading, and replacement of listing skeletons when data arrives.
No database reset/seed, record mutations, commit, or push was performed. The full CRUD
browser suite was not rerun for this presentation-only follow-up.

## Quick Submission Steps

1. **Clone** the repository
2. **Create** your own public repository
3. **Work** on the challenges
4. **Push** your code
5. **Submit** your repository URL

---

## Detailed Instructions

### Step 1: Clone the Repository

Clone this repository to your local machine:

```bash
git clone https://github.com/anvara-project/take-home.git
cd take-home
```

### Step 2: Create Your Own Repository

Create a **new public repository** on your GitHub account:

1. Go to [GitHub.com](https://github.com) and click "New Repository"
2. Name it something like `anvara-takehome-[yourname]`
3. Make it **PUBLIC** ⚠️ (we need to access it to review, feel free to delete it after)
4. Do NOT initialize with README, .gitignore, or license

### Step 3: Update Remote and Push

Update the remote to point to your new repository:

```bash
# Remove the original remote
git remote remove origin

# Add your new repository as origin
git remote add origin https://github.com/YOUR_USERNAME/anvara-takehome-[yourname].git

# Push all branches and history
git push -u origin main
```

### Step 4: Work on the Challenges

1. Follow the [setup guide](setup.md)
2. Complete the [challenges](challenges/README.md)
3. Commit frequently with clear messages
4. Push your commits regularly

**Good commit example:**

```bash
git add .
git commit -m "Fix: Replace any types with proper interfaces in helpers.ts"
git push
```

### Step 5: Submit Your Repository URL

Once you've completed the challenges:

1. ✅ Make sure all changes are committed and pushed
2. ✅ Verify your repository is **PUBLIC**
3. ✅ Run final checks (see below)
4. ✅ Send the repository URL via email

**Submission format:**

```
Repository: https://github.com/yourname/anvara-takehome-yourname
Name: Your Name
Completed: All 5 core challenges + Bonus 1, Bonus 3
Notes: Added unit tests with 80% coverage. Used React Query for state management.
Time Spent: ~14.5 hours
```

---

## What We'll Review

### ✅ Commit History (20%)

We want to see your problem-solving process:

- Clear, descriptive commit messages
- Logical progression through challenges
- How you approached debugging and fixes

**Good commits:**

```bash
✅ "Fix: Replace any types with proper TypeScript interfaces"
✅ "Add: Campaign CRUD endpoints with authorization"
✅ "Refactor: Convert sponsor dashboard to Server Components"
```

**Avoid:**

```bash
❌ "fix"
❌ "changes"
❌ "update"
```

### ✅ Code Quality (30%)

- TypeScript type safety (no `any` types)
- Clean, readable, well-organized code
- Proper error handling
- Following best practices
- Consistent formatting

### ✅ Functionality (40%)

- Completed challenges work correctly
- Application runs without errors
- Features work as specified
- Authentication and authorization work correctly
- Tests pass (if you added any)

**Note:** You don't need to complete all challenges! We evaluate based on the quality of what you complete and how far you progress.

### ✅ Documentation (10%)

- Clear commit messages
- Comments explaining complex logic
- Any additional notes or README updates
- Bonus challenge documentation

---

## Pre-Submission Checklist

Before submitting, verify:

### Tests & Quality

- [ ] `pnpm typecheck` passes with no errors
- [ ] `pnpm lint` passes with no errors
- [ ] `pnpm format` has been run
- [ ] `pnpm test` passes (if you added tests)
- [ ] `pnpm dev` starts both frontend and backend
- [ ] Can log in as sponsor and publisher
- [ ] All features work in the browser

### Repository

- [ ] All changes are committed
- [ ] All commits are pushed to GitHub
- [ ] Repository is **PUBLIC**
- [ ] No sensitive data (passwords, API keys) committed
- [ ] `.env` file is NOT committed (should be in `.gitignore`)

### Documentation

- [ ] Commit messages are clear and descriptive
- [ ] Added any necessary comments to complex code
- [ ] Updated README if you made significant changes
- [ ] Noted which bonus challenges you completed

---

## Common Issues

### Issue: Repository is Private

**Solution:** Go to Settings → Danger Zone → Change visibility → Make public

### Issue: Forgot to Push Changes

**Solution:**

```bash
git status  # Check uncommitted changes
git add .
git commit -m "Your message"
git push
```

### Issue: Can't Push to Repository

**Solution:**

```bash
# Verify remote URL
git remote -v

# Should show YOUR repository, not the original
# If not, repeat Step 3 above
```

### Issue: TypeCheck Fails

**Solution:** This is expected initially! Challenge 1 is to fix these errors. Make sure you've completed all challenges before submitting.

---

## Time Expectations

- Work at your own pace - there's no time limit
- Submit when you feel you've shown your best work
- Where you stop helps us understand your current skill level
- Quality matters more than quantity

Some candidates complete 2-3 challenges, others finish all 5 plus bonuses. Both are valuable outcomes!

---

## What Happens Next?

After you submit:

1. **We'll clone your repository** and review your code
2. **We'll run the setup** to verify everything works
3. **We'll review your commits** to understand your approach
4. **We'll test your implementation** in the browser
5. **We'll provide feedback** asap

---

## Tips for Success

### 🎯 Complete What You Can

Work through the challenges in order (1 → 2 → 3 → 4 → 5) and complete as many as you can. Each challenge builds on previous ones and helps us evaluate different skill areas.

**Don't stress about finishing everything!** Where you stop is meaningful data for us:

- Stopping after Challenge 2-3? That's okay - we can see your frontend and TypeScript skills
- Made it to Challenge 4-5? Great - you've shown full-stack capabilities
- Finished everything? Awesome - tackle the bonus challenges!

The goal is to see your best work, not to race through everything.

### 💾 Commit Frequently

Make small, focused commits as you work through each challenge. This helps us understand your problem-solving process.

### 📝 Write Clear Commit Messages

Follow the pattern: `Type: Brief description`

- **Fix**: Bug fixes
- **Add**: New features
- **Refactor**: Code improvements
- **Docs**: Documentation changes
- **Test**: Adding tests

### 🧪 Test Your Work

Before submitting:

- Test in the browser with both demo accounts
- Verify all CRUD operations work
- Check the console for errors
- Run the type checker and linter

### 🚫 Don't Commit Sensitive Data

The `.env` file should NOT be committed. Make sure it's in `.gitignore`.

### 💬 Add Notes

If you made interesting decisions or want to highlight something, add a note in your submission email or update the README.

---

## Questions?

If you have questions about:

- **Setup issues**: Check the [setup guide](setup.md)
- **Challenge requirements**: Review the [challenges documentation](challenges/README.md)
- **Submission process**: Email [nick@anvara.com](mailto:nick@anvara.com)

---

## Good Luck! 🚀

Take your time, work at your own pace, and complete as many challenges as you can. **There's no time limit** - submit whenever you feel you've shown us your best work.

Remember: we're evaluating the quality of what you complete and your problem-solving approach, not racing to finish everything. Whether you complete 2 challenges or 6, we're excited to see your work!

And if you made it this far here's a hint. Maybe there's more than five?

Show us what you can do! 💪

---

[← Back to Documentation](README.md)
