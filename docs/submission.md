# Submission Guide

## ⚠️ Important: Do NOT Fork This Repository

Please follow these instructions carefully to submit your work.

## Implementation Notes — Challenge 1

Completed Challenges 1–3 (implementation notes below).
Challenges 4–5 and bonuses remain pending.

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

---

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
