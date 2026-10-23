# Submission Notes

**Candidate:** Brady Fisher

**Repository:** [Brady-F/anvara-take-home](https://github.com/Brady-F/anvara-take-home)

Completed **Core Challenges 1–5**, **Design Bonus 2: Dashboard UI/UX**, and
**Design Bonus 3: Animations & Polish**. Other bonuses are not claimed.
See the [setup guide](setup.md) for installation, demo accounts, and verification commands.

## Implementation

### TypeScript and server rendering

- Application inputs, API responses, and component props are typed. Frontend types
  reflect Prisma's nullable fields, enums, and decimal values serialized as strings.
- Both dashboards fetch their owned lists on the server and pass data to components.
  Loading, empty, and error states are included; private requests use `no-store`.
- Lists and card contents render on the server. Client components handle navigation,
  filters' pending state, forms, dialogs, notifications, and animation.
- TypeScript 7 compiles the application. The TypeScript 6 API compatibility package
  supports typescript-eslint with the existing ESLint 9 configuration.

### Authentication and CRUD

- Express validates Better Auth sessions against the shared database and secret,
  bypasses cached session data, and derives ownership from the session's user.
  Campaigns, ad slots, profiles, placements, and dashboard statistics are scoped to
  their authorized users. Browser requests include credentials; server requests
  forward only the cookie header. CORS permits the configured frontend origin.
- Campaign and ad-slot create/update/delete endpoints validate writable fields,
  enums, money, dates, and ownership. Unknown fields and invalid input return `400`.
  Partial updates preserve omitted fields; ownership transfers are rejected.
- Successful updates return `200`; deletes return empty `204` responses. Deletes
  cascade to placements and, for campaigns, creatives through database relations.
- Campaign date updates read, validate, and write in a serializable transaction.
  Concurrent conflicts return `409` for retry. Unchanged timestamps are preserved;
  changed calendar dates save at midnight UTC. Prices retain cents.
- Prisma generates `.js` import extensions so the compiled backend runs under Node.
  Build/start scripts load the root `.env`, matching development. Setup uses locked
  dependencies and the existing seed to create both application and auth data.

### Server Actions and dashboard experience

- Authenticated Server Actions handle both dashboards' create/edit/delete operations.
  Express remains responsible for final authorization and validation. Successful
  mutations revalidate the relevant dashboard path.
- Forms retain input after errors, identify invalid fields, disable controls while
  pending, and show success feedback. Delete dialogs name the item and explain its
  cascades. Native dialogs contain focus and return it to an appropriate control.
- URL-based search, filters, and sorting survive reload and mutations. Summary values
  use the full owned dataset, independently of active filters.
- Responsive cards, consistent controls, and shared styling cover dashboards,
  marketplace, login, and the welcome page. Layout-matched shimmer skeletons preserve
  pending button sizes and provide descriptive screen-reader labels.
- Motion handles card movement and coordinated exits; CSS handles simpler transitions.
  Reduced-motion preferences disable animation, including changes during a session.
  The tradeoff is additional dashboard JavaScript in exchange for an established
  layout-animation implementation.

## Requirement decisions and limitations

- The assignment describes a public marketplace but also requires owner-only ad-slot
  reads. A separate read-only catalog allows authenticated sponsors and publishers to
  browse explicitly selected listing fields without private placements, pricing floors,
  or account details. Management APIs remain owner-only. Anonymous browsing and booking
  are unavailable; listing resets require the owning publisher.
- Foreign records return `403` and missing records return `404`, following the explicit
  challenge checklists over the conflicting `404` example. This reveals existence to
  an authenticated user of the appropriate role.
- React 19's `useActionState` replaces the requested deprecated `useFormState`;
  `useFormStatus` still controls pending UI. Visible shimmer replaces the example
  “Saving...” and “Deleting...” text, while those labels remain available to assistive
  technology.
- Filters operate over the complete authorized list, which fits the demo dataset.
  Larger inventories would need API filtering and pagination. Mutation dialogs require
  JavaScript; a no-script form flow is not implemented.
- AI tools assisted implementation and verification.

## Validation

Verified October 23, 2026, with Node 25.3.0 and pnpm 11.21.0:

| Check                                       | Result                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `pnpm typecheck`                            | Pass                                                                   |
| `pnpm lint`                                 | Pass; three existing logger console warnings                           |
| `pnpm test --run`                           | 211 passed: 102 backend, 109 frontend; nine original TODO placeholders |
| `pnpm build`                                | Pass with default Turbopack; webpack also passed                       |
| Compiled backend startup and `/api/health`  | Pass; PostgreSQL connected                                             |
| `pnpm dev`                                  | Both services start; frontend and database health checks pass          |
| `pnpm e2e` against both production services | All 20 Chromium/WebKit scenarios pass                                  |
| Fresh dependency installation               | Frozen-lockfile offline install passes in a separate source copy       |
| Fresh database setup                        | Prisma schema push and seed pass on an isolated database               |
| Formatting and patch checks                 | Targeted Prettier and `git diff --check` pass                          |

Regression tests cover authorization, field validation, mutation failures, Server Action
payloads and revalidation, server rendering, forms, and UI states. They include the
unavailable-listings filter retaining its owner scope and login recovering from a thrown
request; both tests reproduced the failures before their fixes.

HTTP regressions mock session/database boundaries. Browser tests supplement them with
real authentication, PostgreSQL, and both compiled services. They cover both roles,
CRUD, catalog restrictions, filtering, keyboard focus, 1440/390/320px layouts, failed
requests, and reduced motion. Fresh-source Prisma generation and typechecking also pass.

The nine inherited sponsorship API TODO tests are not counted as passing coverage;
they reference a starter API separate from the tested campaign/ad-slot routes.
No production load benchmark or hosted deployment was performed. Docker orchestration
in `setup-project` was inspected but not rerun; dependency installation, client
generation, schema setup, and seeding were verified separately.

## Screenshots

| View                | Desktop                                                  | Mobile                                                 |
| ------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| Sponsor dashboard   | [Desktop](screenshots/dashboard/sponsor-desktop.jpg)     | [Mobile](screenshots/dashboard/sponsor-mobile.jpg)     |
| Publisher dashboard | [Desktop](screenshots/dashboard/publisher-desktop.jpg)   | [Mobile](screenshots/dashboard/publisher-mobile.jpg)   |
| Marketplace         | [Desktop](screenshots/interface/marketplace-desktop.jpg) | [Mobile](screenshots/interface/marketplace-mobile.jpg) |
| Login               | [Desktop](screenshots/interface/login-desktop.jpg)       | [Mobile](screenshots/interface/login-mobile.jpg)       |

Additional views: [listing details](screenshots/interface/listing-detail-desktop.jpg),
[welcome page](screenshots/interface/welcome-desktop.jpg),
[field focus](screenshots/interface/controls-focus.jpg),
[sponsor dialog](screenshots/animations/sponsor-dialog.jpg), and
[publisher dialog](screenshots/animations/publisher-dialog.jpg).

<details>
<summary>Original assignment submission instructions</summary>

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

</details>
