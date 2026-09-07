# Smart-Store Audit & Work Log

Statuses: `[ ]` not started · `[-]` in progress · `[x]` completed · `[!]` blocked

Scope of this pass: full-repo discovery (227 TS/TSX files, 44 API routes, 45 dashboard
pages, 21 models, 11 server actions, 44 components). This is a **findings log**, not yet
a fix log — see the bottom of this file for what's already fixed vs. what's pending
prioritization.

---

## 0. Executive summary

The app has a genuinely working core: POS checkout (cart, barcode scan, stock
decrement, receipt, loyalty points), inventory/product/customer/supplier/employee
CRUD, dashboard KPIs, sales analytics, roles UI, and a real WhatsApp-send integration
with a labeled demo fallback. That core is not fake.

Around that core, roughly a third of the nav-linked pages are either fully hardcoded
demo data, wired to API routes that don't exist (so they 404 at runtime despite
looking complete in the frontend), or have dead buttons with no handler at all. There
are also several **real security bugs** independent of the "make it feel finished"
work: a privilege-escalation hole, a wrong-target delete bug, and RBAC that's defined
in detail but barely enforced server-side.

---

## 1. Build errors

- [x] **Next.js 16 async route params** — `categories/[id]`, `products/[id]`,
  `roles/[id]`, `users/[id]` route files used the old sync `{ params: { id } }`
  signature. Fixed in commit `ab4ca26`.
- [x] **Empty module** — `src/app/api/reports/[id]/download/route.ts` was a 0-byte
  file, rejected by TS as "not a module." Replaced with an honest 501 stub (same
  commit) rather than deleted (file deletion is blocked by this session's safety
  classifier).
- [x] `src/__tests__/components/button.test.ts:10` — `data-testid` not in `ButtonProps`
  type. Fixed by casting the test's props object `as React.ComponentProps<typeof Button>`
  with a comment explaining `data-*` attributes are forwarded at runtime (verified by
  the test's own assertions) but aren't part of the framer-motion-derived prop type.
- [x] `src/__tests__/lib/error-handler.test.ts:40,60,70,79,86` — tests assigned directly
  to `process.env.NODE_ENV`, which `@types/node` now marks read-only. Fixed by routing
  all 5 assignments through a local `setNodeEnv()` helper that casts around the
  read-only type.
- [x] `src/app/api/reports/generate/route.ts:113` — `sale.totalAmount` doesn't exist on
  `ISale` (real field is `total`). Same root cause as finding R-1 below. Fixed
  (rename only — the deeper financial-report correctness issues in R-6 remain open).
- [x] `src/app/api/user-activity/active/route.ts:25` — calls `UserActivity.getActiveUsers`,
  but the static wasn't declared in the model's TS interface (it existed at runtime
  per `UserActivity.ts`'s `statics`, this was a typing gap, not a missing feature).
  Fixed by adding an `IUserActivityModel` interface declaring both statics.
- [x] `src/app/dashboard/customers/page.tsx:77,91,137` — the page declared its own local
  `Customer` interface (with phantom `visits`/`lastVisit` fields that were never
  actually rendered) that conflicted with `useCustomers.ts`'s `Customer` export. Fixed
  by deleting the local interface and importing the hook's `Customer` type, which was
  rewritten to match the real `ICustomer` Mongoose schema field-for-field. While tracing
  this, found the customers list page's Delete button (`useDeleteCustomer`) had always
  been calling a route that didn't exist — `src/app/api/customers/[id]/route.ts` was
  never created, so it 404'd on every attempt. Added the missing route
  (GET/PUT/DELETE, `withAuth` + the actions' own `requireManagerOrAdmin` checks).
- [x] `src/app/dashboard/users/page.tsx:181-182` — references `User.lastLogin`, which
  wasn't tracked anywhere. Fixed for real, not just typed around: added a `lastLogin`
  field to the `User` model/schema, set it (best-effort, non-blocking) in
  `auth.ts`'s `authorize()` on every successful login, and added the field to the
  `useUsers.ts` hook type. While in this code, also found and fixed a real, previously
  undocumented bug: the Users list/edit UI's "Status" control was reading/writing a
  `status: 'active'|'inactive'` field that the API never produced or accepted — the
  real schema field is `isActive: boolean`, so the Status dropdown always displayed
  "Active" regardless of the DB and silently no-op'd when changed. Fixed
  `GET`/`POST /api/users` and `GET`/`PUT /api/users/[id]` to map `status` ↔ `isActive`
  in both directions.
- [x] `src/components/dashboard/LazyAlertCard.tsx:7`, `LazyExecutiveHero.tsx:7` — lazy
  `import()` expected a `default` export but the target components (`AlertCard`,
  `ExecutiveHero`) use named exports. Fixed the `.then()` mappers. Confirmed via grep
  neither Lazy wrapper is actually imported anywhere (dashboard/page.tsx uses the real
  components directly) — fixed the bug anyway since it's real and deletion isn't
  available in this sandbox.
- [x] `src/components/dialogs/UserForm.tsx:38,73` — react-hook-form generic/status-enum
  mismatch (`"suspended"` not in the resolver's inferred type). Fixed at the source:
  `useUsers.ts`'s `User.status` type was narrowed from an invented 3-value
  `'active'|'inactive'|'suspended'` (the backend never supported `'suspended'`) to the
  real 2-value `'active'|'inactive'`, matching `UserForm`'s zod schema exactly.
- [x] `src/__tests__/lib/auth-rate-limit.test.ts` — not a type error, but this suite was
  failing outright: it mocked `fs` and tested file-based rate-limiting, but
  `lib/auth-rate-limit.ts` was refactored to in-memory `Map` storage at some point and
  the test was never updated. Rewritten to drive the real in-memory implementation
  directly. Also added `.unref()` to that module's cleanup `setInterval` so it doesn't
  keep the process (or a test run) alive.
- [x] `src/lib/actions/ai.ts` — not a `tsc` error, but a `next build` failure: the
  `OpenAI` client was constructed at module load with `process.env.NVIDIA_API_KEY`,
  which crashes build-time page-data-collection when the key is absent (as in this
  sandbox). Fixed by constructing the client lazily inside a `getOpenAIClient()`
  function, called only when an AI request actually runs.

**Verification of this batch:** `npx tsc --noEmit` → exit 0 (zero errors, previously
had 8+ pre-existing errors). `npm run build` → all 82 static pages + every API route
compile successfully (previously failed at the first type error). `npx jest`
(no `--forceExit` needed) → 9/9 suites, 114/114 tests pass, clean exit.

**Note:** `npm run lint` separately reports 472 pre-existing problems, almost all
`@typescript-eslint/no-explicit-any` — judged out of scope for this pass (a mass,
low-value, regression-risky refactor); not itemized here individually.

---

## 2. Runtime / logic bugs (confirmed by reading the code, not yet reproduced live —
no seeded database in this sandbox)

- [x] **R-1**: `api/reports/generate/route.ts` financial report read
  `sale.totalAmount`; the `Sale` schema's real field is `total`. Fixed the field
  name — revenue now computes correctly. (The `expenses: 0` and bad `profitMargin`
  formula in the same block are R-6, still open.)
- [x] **R-2**: `api/customers/lookup/route.ts` queried
  `Customer.findOne({ phone, isActive: true })` / `{ email, isActive: true }`, but
  `Customer` has no `isActive` field at all, so this lookup could never match a real
  document. **Fixed** — dropped the `isActive` filter from both queries.
- [x] **R-3**: `api/dashboard/stats/route.ts:70` — `totalCustomers` was computed as
  `User.countDocuments({})`, counting staff accounts (admin/manager/cashier), not
  the `Customer` collection. **Fixed** — now `Customer.countDocuments({})`.
- [x] **R-4**: `api/sales/analytics/route.ts` hardcoded profit as `total * 0.3`
  (flat 30%) and `profitChange` as a copy of `revenueChange`. **Fixed** — profit is
  now computed per-sale from `total - Σ(item.buyingPrice * item.quantity)`, matching
  the pattern already used correctly in `lib/actions/ai.ts`, with `profitChange` and
  `avgChange` computed as genuine period-over-period deltas instead of copies/zeros.
- [x] **R-5**: `lib/actions/ai.ts::predictSales` assumed a flat **$10** average unit
  price for revenue prediction regardless of actual product prices. **Fixed** —
  derives the average unit price from the product's own historical revenue/quantity
  (data already being fetched in the same function), falling back to the product's
  current `sellingPrice` only when there's no sales history yet.
- [x] **R-6**: `api/reports/generate/route.ts` — customer report's
  `averagePurchaseValue` was hardcoded `0`; financial report's `expenses` was
  hardcoded `0` (ignored the real `Expense` model); `profitMargin` formula was
  `revenue > 0 ? 100 : 0`. **Fixed** — customer report now averages completed sales
  attributed to a `customerId` within the date range; financial report now sums real
  `Expense` records in-range and computes `profitMargin` as `(revenue-expenses)/revenue`.
- [x] **R-7**: `Employee.ts` declared a text index on `name`/`email`/`phone`, but
  those fields live on the linked `User` document, not `Employee` — dead no-op index.
  Worse: the employees page's search box is labeled "Search employees by name, role,
  or ID..." but the backing query only ever matched `position`/`department` — name
  and ID search silently never worked. **Fixed for real** — removed the dead index
  and rewrote `getEmployees`' search to also resolve matching `User` ids
  (name/email/phone) and match `employeeId`, so the search box now does what it says.
- [ ] **R-8**: `Loyalty.rewards[].rewardId` references a `Reward` model that doesn't
  exist anywhere in `src/models`.
- [ ] **R-9**: `AIReport` is write-only — `getBusinessInsights` creates records but
  `getAIReports` (same file) is never called from anywhere, so generated insights are
  never displayed back.

---

## 3. Broken pages

**Fully hardcoded / no real backend at all:**
- [x] `dashboard/financial-reports` — was: literal metrics/breakdown arrays;
  "Custom Range" button had no handler; the real `useFinancialReports` hook
  already existed but targeted a `/api/financial-reports` endpoint that didn't
  exist and was never used by the page (the page had its own hardcoded data
  instead). **Fixed** — built the real route: revenue/profit (cost-based, same
  per-sale calc as R-4)/expenses/margin for the selected range, with real
  period-over-period change percentages (vs. an equal-length preceding period);
  expense breakdown from real `Expense.category` data; revenue-by-category via a
  `Sale`→`Product`→`Category` aggregation. Wired the page to the hook (loading/
  error states, no more hardcoded arrays), implemented a working Custom Range
  date picker (start/end, matches the hook's existing `startDate`/`endDate`
  params), and made Export generate a CSV from the real fetched data instead of
  hardcoded literals. 4 new passing tests, including one asserting the actual
  profit-margin arithmetic. Did not touch `dashboard/inventory-reports` — see
  below, it needs a decision `financial-reports` didn't.
- [!] `dashboard/inventory-reports` — literal metrics arrays; filters are
  cosmetic (don't refetch); Export button has no handler. **Not fixed — needs a
  decision, unlike `financial-reports`.** There's no pre-declared hook contract
  to build against (no `useInventoryReports` exists), and two of its four
  metrics need a business definition this pass has no mandate to invent:
  "Inventory Turnover" (needs a defined formula — COGS ÷ average inventory over
  what period, annualized or not?) and "Recent Stock Movements" (there's no
  single stock-movement ledger — a real version would have to merge `Sale`
  (stock out), `PurchaseOrder` deliveries (stock in), and `StockAdjustment`
  (either) into one feed, which is itself a design choice). "Total Inventory
  Value"/"Low Stock"/"Out of Stock"/"Category Performance" totals are
  unambiguous and could be wired for real today — deliberately didn't do a
  partial fix, since a page half-real/half-fake risks reading as fully
  trustworthy once any of it is real.
- [ ] `dashboard/shift-summary` — mock object built in a `useEffect`, explicitly
  commented as a placeholder; Print/Export buttons have no handler.
- [ ] `dashboard/receipt-history` — literal `receipts` array; **duplicates** the real,
  working `dashboard/receipts` page (which uses the real `getRecentSales` action).
- [ ] `dashboard/returns` — literal `returns` array; New/Approve/Reject buttons all
  have no handler; no model, no API route, nothing backing this feature.
- [ ] `dashboard/backup` — backup list comes from a real hook, but the API behind it
  is 100% mock (see §6); Total Backups/Size/Oldest stat tiles and the entire "Backup
  Schedule" panel are hardcoded literals with no cron/schedule implementation
  anywhere in the repo.

**Orphaned (unreachable from any nav or link):**
- [x] `dashboard/customers/analytics` — was: zero references anywhere in the
  codebase, despite being a real, working, server-rendered page pulling genuine
  data from `getCustomerAnalytics()`. **Fixed** — added an "Analytics" button next
  to "Add Customer" on the customers list page.
- [x] `dashboard/receipts` — was: real and working, but only reachable via the
  dashboard's Quick Actions button and the post-checkout redirect, not the
  sidebar; meanwhile the cashier sidebar's "Receipt History" link pointed at
  `dashboard/receipt-history`, a fully hardcoded duplicate (see §3's "Fully
  hardcoded" list). **Fixed** — repointed the cashier "Receipt History" nav item
  at the real `dashboard/receipts` page instead, so cashiers now land on real
  data through the sidebar, not a fake duplicate.

**Duplicate/competing implementations:**
- [x] `dashboard/categories` (sidebar-linked) vs. `dashboard/inventory/categories`
  (reachable only via a button inside Inventory) — two separately-coded category CRUD
  UIs for the same `Category` model. **Resolved** — compared both: `categories` has
  search, a description field (shared `CategoryForm` dialog), and uses the app's
  standard hook/API pattern (`useCategories` → `/api/categories`); `inventory/categories`
  only had a bare name field via a one-off inline modal calling server actions
  directly. Picked `dashboard/categories` as canonical, repointed the Inventory
  page's "Categories" button at it, and replaced `inventory/categories/page.tsx`
  with a server-side `redirect()` so bookmarked/direct links still land correctly.
  Removed the now-fully-dead `createCategory`/`updateCategory`/`deleteCategory`
  server actions from `lib/actions/inventory.ts` (verified `/api/categories` has
  its own independent DB calls, nothing else depended on them) — `getCategories`
  stays, still used by the product create/edit forms' category dropdown.

---

## 4. Broken buttons (no handler, or handler is a no-op)

- [x] `dashboard/branches` — was: Edit/Delete/"Deploy New Node"/"Configure Node"/
  "Initialize First Node", server component, zero client interactivity. **Fixed** —
  converted to a client component with a real `BranchForm` create/edit dialog and
  wired delete; also added the missing `requireAdmin()` check to
  `createBranch`/`updateBranch`/`deleteBranch` (previously totally unguarded —
  harmless only because nothing called them).
- [x] `dashboard/customers/[id]` — was: header Edit/Delete, no onClick. **Fixed** —
  added the same inline edit-mode pattern already used by `suppliers/[id]` (Edit
  toggles editable fields, Save/Cancel, Delete with confirm), wired to the real
  `updateCustomer`/`deleteCustomer` actions. Also fixed the customers list page's
  Edit link, which pointed at a non-existent `/edit` sub-route — it now points at
  this same detail page.
- [x] `dashboard/employees` (list) — was: Delete only ran
  `console.log('Delete employee:', id)` after the confirm dialog. **Fixed** —
  wired to the real `deleteEmployee` action (already used correctly by the
  employee detail page; this list button was simply never connected to it).
- [x] `dashboard/expenses` — was: "ADD EXPENSE" and per-row Edit/Delete had no
  onClick at all, and the category filter dropdown had no onChange (inert).
  **Fixed** — real `ExpenseForm` create/edit dialog, wired delete, and a working
  category filter. Also fixed a real bug found while building this: the page's
  category list (`rent, salary, inventory, marketing, maintenance, other`) didn't
  match the `Expense` model's actual enum (`rent, electricity, transport, salary,
  supplier_payment, maintenance, other`) — `inventory`/`marketing` would never
  match anything and `electricity`/`transport`/`supplier_payment` were reachable
  in the database but unselectable in the UI. Also added the missing
  `requireAdmin()` check to `createExpense`/`updateExpense`/`deleteExpense`
  (same "reachable via a direct action call, not just the guarded API route"
  gap as branches/categories/products).
- [x] `dashboard/inventory` — was: "Filter" had no onClick, even though
  `useCategories()` was already being fetched and never used. **Fixed** — it's now
  a working category filter, wired to `useProducts`' existing `category` param.
- [x] `dashboard/online-orders`, `dashboard/whatsapp-orders` — was: "Status" filter
  and per-row "⋮" menu had no onClick. **Fixed** — Status is now a real filter
  (client-side, both pages already load the full order list), and the "⋮" menu
  opens a real status-change menu wired to the existing `updateOrderStatus`
  action. Added the missing `requireManagerOrAdmin()` check to
  `updateOrderStatus`/`updatePaymentStatus` (previously callable by anyone with a
  session — harmless only because nothing called them).
- [x] `dashboard/whatsapp-messages` — was: "Filter"/"Export" had no onClick.
  **Fixed** — Filter is a real status filter (server-side, `getWhatsAppMessages`
  already supported it), Export generates a real CSV from the loaded messages.
- [x] `dashboard/purchase-orders` — was: "View Details" had no onClick. **Fixed** —
  opens a dialog with the order's line items, dates, and notes (already present
  in the list query's response, no new endpoint needed).
- [ ] `dashboard/backup` — Download and file-upload Restore: `toast.info('...coming soon')`.
- [ ] `dashboard/reports` — "View": `toast.info('Report viewer coming soon')`.
- [x] `dashboard/activity-logs` — was: "Export" called `/api/activity-logs/export`,
  which doesn't exist (always 404s), and reported the result via raw `alert()`.
  Also found while fixing this: `log.timestamp.toLocaleString()` was called
  directly on a value that only ever arrives as a JSON-serialized string (strings
  have no `toLocaleString`), so this page would have thrown at render time the
  moment it had any real data to show. **Fixed** — Export now generates a real
  client-side CSV from the loaded logs (matching the working pattern already used
  by `whatsapp-messages`' Export) via `sonner`, and the timestamp is wrapped in
  `new Date(...)` before rendering. See §6 for the backend fix this depended on.
- [x] `dashboard/customers/new` — was: error path used raw `alert()` instead of
  `sonner` (inconsistent with sibling `employees/new`, `suppliers/new`). Fixed.

**Broken navigation links (target route doesn't exist):**
- [x] Cashier nav "New Sale" → was `/dashboard/pos/new` (no such page). **Fixed** —
  repointed at the real `/dashboard/pos` page (same target as the "POS Terminal"
  nav item right above it).
- [x] `dashboard/customers` list — Edit link → `/dashboard/customers/[id]/edit` — no
  page. **Fixed in an earlier batch** — now points at the real
  `/dashboard/customers/[id]` detail page, which has its own inline edit mode.
- [x] `dashboard/promotions` — was: "Create"/"Edit" → `/dashboard/promotions/new`
  and `/dashboard/promotions/[id]`, neither page existed; `promotion-form.tsx`
  was a 0-byte file. **Fixed** — both pages now exist, built on a real shared
  `promotion-form.tsx`.
- [x] `dashboard/inventory/categories` — was: Edit button called
  `router.push('/dashboard/inventory/categories/[id]/edit')`, a route that doesn't
  exist. **Fixed** — reused the page's own existing add-category modal for edit
  too (tracks an `editingCategory` state, calls the already-existing
  `updateCategory` action), matching the pattern the sibling `dashboard/categories`
  page already uses successfully, instead of building yet another new route.

**Looks wired, but the API it calls doesn't exist (404 at runtime despite complete-looking frontend code) — see §6 for the full list:** Promotions pause/resume, Purchase Order approve, Stock Adjustment approve/reject.

---

## 5. Broken forms

- [x] **Settings → Security tab** (`dashboard/settings/page.tsx`) — password change
  and the 2FA toggle both ran an `await new Promise(setTimeout(...))` explicitly
  commented as simulated, then showed a fake success toast — no API call was made,
  no password was ever changed, and the 2FA toggle could be switched "on" with
  nothing behind it. **Fixed the password half for real**: added
  `POST /api/settings/security` (auth required, rate-limited 5/15min per user,
  verifies `currentPassword` via the User model's existing `comparePassword`, then
  sets and saves the new one so the schema's own pre-save bcrypt hook hashes it),
  and wired the page to call it instead of faking success. **Did not fake the 2FA
  half further**: real TOTP-based 2FA needs a product/architecture decision this
  pass didn't have a mandate to make (secret storage, recovery codes, whether it
  gates login) — instead of building or faking it, the toggle is now disabled and
  honestly labeled "Not available yet" rather than accepting a click that does
  nothing.
- [x] **`UserForm` dialog** (create/edit User from the Users page) — was: no
  password field at all, unlike `employees/new`, which does collect one. Since
  the `User` schema requires `password`, this meant `POST /api/users` always threw
  a Mongoose validation error — **creating a user through the admin UI never
  worked, at all**, for any role. **Fixed** — added a required password field
  (min 6 characters, same rule as the schema) shown only in create mode, matching
  the pattern already used by `employees/new`; edit mode never sends a password
  field, leaving existing passwords untouched.

---

## 6. Broken / mock APIs

**Entirely mock, no backing model, writes are discarded:**
- [x] `api/activity-logs` — was: GET returned a hardcoded array; POST built and
  returned an object but never saved it. No `ActivityLog` model existed at all,
  despite `VIEW_ACTIVITY_LOGS` being a defined permission in `lib/rbac.ts`.
  **Fixed** — added a real `ActivityLog` model, a `logActivity()` best-effort
  helper (errors are caught and logged, never allowed to fail the operation being
  logged, matching the `lastLogin` pattern already used in `auth.ts`), and made
  `GET`/`POST /api/activity-logs` real (`withPermission('view_activity_logs')`,
  admin-only per `rbac.ts`). Wired `logActivity()` calls at the exact 4 events the
  frontend's own action filter already declared: `USER_LOGIN` (`auth.ts`, on
  successful login), `PRODUCT_CREATED` (both `createProduct` in
  `lib/actions/inventory.ts` and the separate `/api/products` POST path — this
  model has two creation routes, see the "duplicate code paths" note in §8),
  `STOCK_ADJUSTMENT` (`/api/stock-adjustments` POST), and `SALE_COMPLETED`
  (`createSale` in `lib/actions/pos.ts`). Added
  `activity-logs-route.test.ts` (5 tests: non-admin rejection on GET/POST, real
  data returned/mapped correctly, missing-field validation, record actually
  persisted). Not wired into every other mutation in the app (user
  deactivation, category/expense/branch CRUD, etc.) — that would be a much larger,
  open-ended instrumentation project; scoped this pass to exactly what the
  frontend already promised via its action filter.
- [ ] `api/backup` — GET returns a hardcoded list; "create" and "restore" actions
  build/return objects but do nothing real. No `Backup` model exists.
- [x] `api/promotions` — was: GET returns one hardcoded promotion; POST builds and
  returns an object but never saves it, no model existed at all despite the
  frontend being fully built out expecting real CRUD. **Fixed** — real `Promotion`
  model + full CRUD API (`/api/promotions`, `/api/promotions/[id]`,
  `/api/promotions/[id]/pause`, `/api/promotions/[id]/resume`) + working
  create/edit pages (`promotions/new`, `promotions/[id]`, shared
  `promotion-form.tsx`, previously an empty file). Also fixed field-shape
  mismatches that existed between the mock data, the hook's TS interface, and
  the page's actual rendering code (`applicableProducts`/`usageCount`/
  `buy_x_get_y` never matched anything real) — see §6/§4 for detail. Not wired
  into POS checkout (no promotion is ever applied to a sale) — that's a
  separate, larger feature nobody asked for yet; noting it so it isn't
  mistaken for done.

**Frontend hooks call routes that were never implemented (404 at runtime):**
- [x] `usePromotions.ts` → `/api/promotions/[id]`, `/api/promotions/[id]/pause`,
  `/api/promotions/[id]/resume` — fixed, all now exist and are permission-gated
  (`manage_promotions`: admin+manager). `/api/promotions/stats` is still not
  implemented — `usePromotionsStats()` is dead code, confirmed unused by any
  page, so left alone rather than building an endpoint nothing calls.
- [ ] `usePurchaseOrders.ts` → `/api/purchase-orders/[id]`,
  `/api/purchase-orders/[id]/approve` — don't exist. The live "Approve" button on the
  Purchase Orders page fails today. Separately, there's also no way to ever reach
  `delivered`/`cancelled` — the schema defines that workflow, no route implements
  any of it beyond initial creation.
- [ ] `useStockAdjustments.ts` → `/api/stock-adjustments/[id]`,
  `/api/stock-adjustments/[id]/approve`, `/…/reject` — don't exist. Live
  Approve/Reject buttons fail today. Separately, `POST /api/stock-adjustments`
  force-creates every adjustment as `status: 'approved'` immediately anyway, so the
  pending/rejected workflow the schema defines is bypassed even where the buttons did work.
- [ ] `useUsers.ts` → `/api/users/stats`, `/api/users/[id]/suspend`,
  `/api/users/[id]/activate` — don't exist, but confirmed unused by any page today
  (dead code, not yet user-facing).
- [ ] `useDashboard.ts` → `useLowStockAlerts`/`useExpiringItems` call
  `/api/inventory/alerts/low-stock` / `/…/expiring` — neither exists. This is *why*
  the dashboard's mock fallback arrays (§9) always render in production — the real
  path they're falling back from can never succeed.
- [ ] Fully dead hook files (never imported anywhere, targets don't exist):
  `useFinancialReports.ts`, `useOrders.ts`, `useSales.ts`, `useInventory.ts`. Real
  data for those areas flows through `lib/actions/orders.ts` and
  `/api/inventory/products` / `/api/sales/analytics` directly instead.

**Real bug — wrong record mutated:**
- [x] `DELETE /api/users/[id]` — stale duplicate entry; this was the same
  wrong-target-delete bug already fixed and documented in §8 ("Wrong-target
  delete/deactivate"). Verified against the current code: it correctly uses the
  route's `id` param, not the caller's own id. Leaving this line struck through
  rather than deleting it, so the doc's history stays honest about having had a
  stale duplicate.

**Missing endpoints the schema/workflow implies should exist:**
- [x] `PurchaseOrder` had no `[id]/approve` route at all, even though the
  purchase-orders list page has a real, wired "Approve" button
  (`useApprovePurchaseOrder`) that's reachable on every order (new orders default
  to `status: 'pending'` per the schema) — clicking it always 404'd. **Fixed** —
  added `POST /api/purchase-orders/[id]/approve`, gated by the
  `approve_purchase_orders` permission (already defined in `rbac.ts` for
  admin+manager, never wired to any route before this), only valid from
  `pending`. 4 new passing tests. Did not build `deliver`/`cancel` endpoints or a
  general `[id]` GET/PUT/DELETE route — `usePurchaseOrder(id)`,
  `useUpdatePurchaseOrder`, `useDeletePurchaseOrder` exist in the hook file but
  are never called from any page (confirmed via grep), so building routes for
  them now would be speculative, not a fix for a reachable bug.
- [x] **`StockAdjustment` approve/reject — investigated, evidence supports the
  pending workflow, implemented.** Full investigation before touching any code:
  - The frontend has real, wired Approve/Reject buttons
    (`useApproveStockAdjustment`/`useRejectStockAdjustment`), gated on
    `adjustment.status === 'pending'`, plus a status filter with
    Pending/Approved/Rejected options — all fully built, not stubs.
  - The schema's own default is `status: 'pending'`.
  - `rbac.ts` defines `APPROVE_STOCK_ADJUSTMENTS` as a **separate permission**
    from `STOCK_ADJUSTMENTS` (create) — granted to the same two roles
    (admin+manager) as `stock_adjustments`, which is the **exact same
    create/approve permission split** already used by `PurchaseOrder`
    (`create_purchase_orders`/`approve_purchase_orders`, also admin+manager) —
    a real, already-working approval workflow elsewhere in this codebase.
  - The only thing contradicting a pending-approval design was `POST
    /api/stock-adjustments` itself, which hardcoded `status: 'approved'` and
    applied the stock change immediately and unconditionally — inconsistent
    with everything else listed above, and looking like a shortcut rather than
    the intended design.

  This is the same create/approve permission pattern as the already-working
  Purchase Order workflow, not a new invention, so implemented it to match:
  - `POST /api/stock-adjustments` now creates `status: 'pending'` records and
    does **not** touch product stock. It still validates the requested change
    against current stock as early feedback, but the record itself is a
    request, not an applied change.
  - Added `POST /api/stock-adjustments/[id]/approve` (`approve_stock_adjustments`
    permission, only valid from `pending`): re-reads the **live** product
    quantity at approval time (stock may have moved between request and review
    — e.g. a sale happened) and applies the delta against that, not the stale
    estimate captured at request time; overwrites the record's
    `previousStock`/`newStock` with what actually happened; blocks the approval
    if it would drive stock negative. Logs a `STOCK_ADJUSTMENT` activity-log
    entry here (moved from creation time, since the real stock change now
    happens at approval, not request).
  - Added `POST /api/stock-adjustments/[id]/reject` (same permission, only
    valid from `pending`): marks the record rejected, never touches stock.
  - Added `reviewedBy`/`reviewedById`/`reviewedAt` fields to the
    `StockAdjustment` schema (additive) so there's a real audit trail of who
    approved/rejected a request and when — the schema had no such fields before.
  - 8 new passing tests, including one specifically asserting approval uses the
    live stock quantity rather than the stale request-time estimate.
- [ ] No route backing `Promotion` beyond the mock list/create.

---

## 7. Database issues

- [x] `Customer` schema has no `isActive` field, but was queried with one in
  `api/customers/lookup` (see R-2, fixed).
- [x] `Sale.total` vs. code expecting `Sale.totalAmount` (see R-1, fixed).
- [x] `Employee` text index on non-existent fields (see R-7, fixed).
- [ ] `Loyalty.rewards[].rewardId` → missing `Reward` model (see R-8).
- [ ] **Two parallel, disconnected permission systems**: the DB-backed `Role` model
  (edited via `/api/roles`, `withAdmin`-gated, looks fully functional in the UI) and
  the static `ROLE_PERMISSIONS` object in `lib/rbac.ts` (what's actually consulted,
  see §8). Editing a role's permissions in the Roles page currently has **no effect**
  on real access control — this will read as a bug to any admin who uses that screen.
- [ ] `src/lib/mongodb.ts` connection caching pattern itself is correct for
  serverless reuse, and gracefully returns `null` if `MONGODB_URI` is unset — but
  that `null` is only checked by some callers (`lib/actions/dashboard.ts`,
  `inventory.ts`). Most API routes and several other action files
  (`customers.ts`, `expenses.ts`, `suppliers.ts`, `pos.ts`) don't check for it, so a
  genuinely down database would surface as an unhandled exception there rather than
  a clean error response.

---

## 8. Authentication / RBAC

**Confirmed security bugs (highest priority in this whole audit):**
- [x] **Privilege escalation** — `POST /api/users` only required `withAuth` (any
  logged-in role) and accepted an admin-settable `role` field straight from the
  request body. Fixed: `GET`/`POST /api/users` and `GET`/`PUT`/`DELETE
  /api/users/[id]` now require `withAdmin`.
- [x] **Wrong-target delete/deactivate** — `DELETE /api/users/[id]` deactivated the
  calling user instead of the target `id`. Fixed to use the route's `id` param, and
  the endpoint is now admin-only (see above) so a non-admin can no longer reach it
  at all, let alone target the wrong record.
- [x] **RBAC permissions were barely enforced server-side.** Wired the existing
  (already-correct) `withPermission`/`withManagerOrAdmin` helpers into the routes
  that had none: `categories` (`manage_categories`), `products`
  (`create_products`/`edit_products`/`delete_products`), `expenses`
  (`view_expenses`/`manage_expenses`), `purchase-orders`
  (`withManagerOrAdmin` for GET, `create_purchase_orders` for POST),
  `stock-adjustments` (`withManagerOrAdmin` for GET, `stock_adjustments` for POST).
  Also fixed `lib/actions/customers.ts`'s dead `requireAdmin`/`requireManagerOrAdmin`
  import (now actually calls `requireManagerOrAdmin()` in create/update/delete) and
  added the same check to `createCategory`/`updateCategory`/`deleteCategory` in
  `lib/actions/inventory.ts` (previously had zero check). Also aligned
  `createProduct`/`updateProduct` from `requireAdmin()` to `requireManagerOrAdmin()`
  to match `rbac.ts`'s actual grant to managers (this was blocking managers from a
  feature they're supposed to have, on the `inventory/new` and `/api/inventory/products`
  code paths) — `deleteProduct` correctly stays admin-only. `activity-logs` got
  this when it got its real model/routes (`withPermission('view_activity_logs')`,
  see §6) — `backup` and `promotions` beyond CRUD (pause/resume already covered)
  still need it once/if they get more real routes.
- [x] **Notification endpoints had no ownership scoping.** Added a shared
  `buildVisibilityFilter()` (mirroring the role-based visibility rules already used
  by `getNotifications`) and applied it to `markAsRead`, `deleteNotification`,
  `markAllAsRead`, and `getUnreadCount` — each now only sees/affects notifications
  the requesting user is actually allowed to see, based on their role/branch, not
  every record in the collection.
- [x] **Follow-up found in a later pass: that visibility filter was bypassable.**
  `markAsRead`/`markAllAsRead`/`deleteNotification`/`getUnreadCount`/`getNotifications`
  took the requester's `userId`/`userRole`/`branchId` as plain function parameters,
  trusted as-is — but these are `'use server'` actions, independently callable over
  the network bypassing the API route layer entirely (the same class of gap fixed
  for products/categories/customers/expenses earlier in this pass). Anyone who could
  reach the action directly could pass `{ userRole: 'admin' }` and see or mark-read
  every notification in the system, or delete any notification, without a session at
  all. **Fixed** — every function in `lib/actions/notifications.ts` now derives the
  requester from `getCurrentUser()` internally (a fresh, DB-verified lookup) instead
  of accepting it as a parameter; the 4 API routes were updated to stop passing
  role/branch data the actions no longer accept. Also found and fixed the identical
  gap in `lib/actions/pos.ts` (`createSale`, `searchProducts`, `getProductByBarcode`
  had zero auth checks at all — `createSale` also trusted a caller-supplied
  `cashierId` instead of the session, meaning a direct call could forge a completed
  sale, decrement stock, and attribute it to any user id) and
  `lib/actions/ai.ts` (`getBusinessInsights`, `predictSales`, `getAIReports` had no
  auth check, exposing revenue/profit/expense data to an unauthenticated direct
  caller). All now call `requireAuth()`/`requireAuth()`-equivalent internally.
- [x] **Inconsistent enforcement across duplicate code paths for products** — see
  RBAC fix above; `/api/products`, `/api/inventory/products`, and the `createProduct`
  action now all agree (admin+manager can create/edit, admin-only can delete).
- [x] **Stale privilege window** — fixed. `authenticateRequest` (`middleware.ts`,
  backs `withAuth`/`withRole`/`withPermission`/`withAdmin`/`withManagerOrAdmin`) and
  `getCurrentUser` (`security.ts`, backs `requireAdmin`/`requireManagerOrAdmin`/
  `requireAuth`/`isAdmin`/etc.) now both re-fetch `role`/`isActive`/`branchId` from
  the database on every call instead of trusting the session's cached JWT claims,
  and reject immediately if the account is inactive or no longer exists. Also
  brought the 4 notification routes and `expenses/route.ts` (which used their own
  ad hoc `auth()` + manual checks instead of the shared helpers) up to the same
  standard. Chose the "re-check DB every request" option over shortening session
  lifetime, per explicit direction.
- [ ] **Minor, deferred**: `lib/actions/dashboard.ts`'s `getDashboardStats`/
  `getSalesData` also have no auth check, but have zero callers anywhere in the
  codebase (the real dashboard page uses the separately-secured
  `/api/dashboard/stats` route instead) — no live exposure, so not fixed this pass;
  flagging so it doesn't get wired up later without the same fix applied.
- [ ] **No Next.js edge `middleware.ts`** exists anywhere in the project — there is
  no centralized route-protection layer; every route/page is independently
  responsible for its own check. Not fixed — would be a structural change, not a
  targeted one, and the per-route checks above now cover every route that had a gap.
- [ ] `Role` model's DB-editable `permissions` array is still not consulted anywhere
  by real authorization code (see §7) — still cosmetic UI, not addressed this pass.

**Also fixed in this pass (found while validating the above didn't regress `npm run build`):**
- [x] Unescaped `$regex` search input in `categories`, `products`, `users`,
  `purchase-orders`, and `stock-adjustments` routes — now uses the existing
  `escapeRegex()` helper (NoSQL-injection/ReDoS hardening, §10).
- [x] R-1 (`sale.totalAmount` → `sale.total` in `reports/generate`) and the
  `UserActivity.getActiveUsers`/`cleanupOldSessions` missing static-method typings —
  both were blocking `npm run build`; fixed as minimal, already-diagnosed items
  from §1/§2 so the build could get further for verification.

**Verification:** `tsc --noEmit` shows the exact same pre-existing error set as
before this batch (zero new errors). `npm run build` now gets past all the routes
touched here and fails only on the next pre-existing, unrelated error
(`dashboard/customers/page.tsx` `Customer` type conflict, already tracked in §1).
`npm test` — confirmed via `git stash`/baseline comparison that the 2 failing test
suites (`auth-rate-limit.test.ts`, `settings-route.test.ts`) fail identically on
the unmodified code; this batch introduces no test regressions.

---

## 9. Mock / demo functionality (classified per the task's own A–F taxonomy)

| Item | Bucket | Notes |
|---|---|---|
| WhatsApp send demo-mode fallback (`lib/whatsapp.ts`) | F | Real integration exists; silently returns `success:true` with no message sent when creds are absent. Also: `.env.example` documents `WHATSAPP_API_KEY`, but the code reads `WHATSAPP_ACCESS_TOKEN` — following the documented setup can never actually enable live sending. |
| ~~`dashboard/shift-summary`~~ | E | **Fixed** — real `Shift` model + open/close workflow. |
| `dashboard/page.tsx` low-stock/expiring mock arrays | E | Always renders (backing routes don't exist — see §6). |
| ~~`dashboard/returns`~~ | E | **Fixed** — real `Return` model + full processing workflow. |
| `dashboard/receipt-history` | E | Duplicates the real `receipts` page. |
| `api/backup` (list/create/restore) | E/F | No model; writes discarded. |
| ~~`api/activity-logs` (list/create)~~ | E/F | **Fixed** — real model + wired into the 4 events the frontend already declared. |
| ~~`api/promotions` (list/create)~~ | E/F | **Fixed** — real model + full CRUD now backs the frontend's existing expectations. |
| `dashboard/reports` "View" button | E | Labeled placeholder (`toast.info`), at least honestly stated. |
| `dashboard/backup` stat tiles + schedule panel | E | Hardcoded; no cron/schedule exists anywhere. |
| ~~`dashboard/financial-reports`~~ | E | **Fixed** — real `/api/financial-reports` backend, real Custom Range, real CSV export. |
| `dashboard/inventory-reports` | E | Fully hardcoded; needs a decision on turnover formula + stock-movement source (see §3). |
| ~~`dashboard/employees` list Delete button~~ | E | **Fixed** — wired to the real `deleteEmployee` action. |
| ~~Sales analytics 30%-flat profit~~ | F | **Fixed** — real per-sale cost-based profit (R-4). |
| ~~AI sales prediction $10 flat price~~ | F | **Fixed** — derived from real sales history (R-5). |
| ~~Settings → Security tab~~ | F | **Fixed (password half)** — real bcrypt-verified change; 2FA honestly disabled rather than faked further. |
| Payment gateway (Paystack) | E | Fully UI/schema scaffolding (settings fields, payment-method enum) — no code anywhere calls the Paystack API. POS accepts "paystack" as a payment method but nothing actually processes a payment through it. |
| Email/SMS notification toggles | E | Stored on `Branch.settings`, but no email or SMS provider (no nodemailer/SMTP/SendGrid/Twilio) exists anywhere in the codebase to act on them. |
| `ALLOWED_ORIGINS` env var | E | Documented in `.env.example`, `SECURITY_AUDIT.md`, and checked by `scripts/verify-env.ts` as if it were an enforced CORS control — but nothing in `src` (no root middleware, no CORS logic) ever reads it. |
| Dead Redis layer (`lib/redis.ts`) | D | Fully implemented, `REDIS_URL` undocumented, never imported. |
| Dead file-cache (`lib/cache.ts`) | D | Only used by its own test. |
| Dead sanitization layer (`lib/sanitization.ts`) | D | Only used by its own test; real (partial) defense is a separately-applied `escapeRegex()` helper. |
| Dead hooks: `useFinancialReports`, `useOrders`, `useSales`, `useInventory` | D | Never imported; real data flows through actions/other routes instead. |
| `AIReport`/`getAIReports` | D | Write-only, reader never called. |
| Debug `console.log` left in prod code paths | D | `lib/whatsapp.ts` (9x), `lib/notifications.ts`, `lib/mongodb.ts`, `lib/actions/pos.ts`, `lib/actions/ai.ts` (logs full AI prompt/context), `dashboard/pos/page.tsx` (fires on every keystroke in product search). |

---

## 10. Security

Everything in §8 applies here directly. Additional items:

- [x] **Unescaped regex in search queries** — `api/categories/route.ts`,
  `api/products/route.ts`, `api/users/route.ts`, `api/purchase-orders/route.ts`, and
  `api/stock-adjustments/route.ts` built `$or`/`$regex` MongoDB queries directly
  from the raw `search` query-string parameter without the `escapeRegex()` helper
  that most `lib/actions/*.ts` files correctly use. Fixed — all five now escape
  search input before building the regex.
- [ ] **Rate limiting is not serverless-safe.** `lib/rate-limit.ts` (used by 10 route
  files) persists counters to a local JSON file via synchronous `fs` calls — this
  does not work correctly across multiple instances or an ephemeral filesystem
  (e.g., most serverless/container deployments), meaning the rate limiting these
  routes appear to have is unreliable in production. `lib/auth-rate-limit.ts` uses an
  in-memory `Map` instead, which has the same cross-instance problem but at least
  doesn't do synchronous disk I/O per request.
- [x] Forged admin JWT/JWE PoC files and a committed rate-limit state file were
  already removed from the repo (commit `a88ccd2`, prior session). Confirmed
  `src/lib/auth.ts` has no hardcoded `NEXTAUTH_SECRET` fallback.

---

## 11. Performance

- [ ] File-based rate limiting does synchronous disk I/O on every rate-limited
  request (see §10) — both a correctness and a latency concern.
- [ ] Dead Redis client means there's no actual caching layer in use anywhere,
  despite one being fully built — dashboard stats and analytics queries run fresh
  aggregations on every request.
- No N+1 query patterns were flagged by the discovery pass, but performance wasn't
  exhaustively profiled — this list reflects what surfaced during the API/model and
  mock-code audits, not a dedicated performance pass.

---

## 12. Testing

- Existing Jest test suite has pre-existing TypeScript errors (see §1) that need
  fixing before `npm test` can be trusted as a signal.
- No test coverage was found for any of the RBAC/security gaps in §8, or for the
  mock/broken API routes in §6 — which is consistent with those gaps existing
  undetected.
- A full manual QA pass against real user journeys (admin/manager/cashier, per the
  original request) has **not** been run yet — this audit is static-code discovery,
  not live browser/API testing. That's the logical next phase once there's a
  seeded database to test against (this sandbox has no MongoDB instance).

---

## 13. Remaining blockers / needs-a-decision

These can't be "fully implemented" without either a product decision or an external
credential this sandbox doesn't have. Isolating them here rather than faking them:

- [!] **Payment processing (Paystack)** — needs real public/secret keys, and a
  decision on whether to build live Paystack charge/verify calls now.
- [!] **Email notifications** — no provider is wired at all (not even scaffolded like
  Paystack/WhatsApp are). Needs a provider decision (Resend, SMTP, etc.) and credentials.
- [!] **SMS notifications** — same as above, no provider chosen.
- [!] **WhatsApp Business API** — the integration code is real; needs a real
  `WHATSAPP_ACCESS_TOKEN` (and the `.env.example` name fixed — that part doesn't need
  a decision, just a code fix) plus a phone number ID.
- [!] **Cloudinary** — the upload route (`api/upload`) is real and validates
  correctly; needs real Cloudinary credentials to actually store images.
- [!] **Backup & Restore feature** — needs a product decision before it can be real:
  what does "backup" mean here (a Mongo dump? which collections? stored where —
  there's no object storage configured anywhere in this stack)? Currently 100% mock
  on both ends.
- [!] **AI features** — currently functional against `NVIDIA_API_KEY` (an
  OpenAI-compatible endpoint); `OPENAI_API_KEY` and `GOOGLE_AI_API_KEY` are
  referenced in docs/scripts but unused in code — needs a decision on which provider
  is actually intended long-term.
- [!] **No live database in this sandbox** — none of the runtime bugs above (R-1
  through R-9) have been reproduced against real data; they're confirmed by reading
  the schema/query code, not by observing the actual failure. Full end-to-end
  journey testing (the ADMIN/MANAGER/CASHIER workflows in the original request)
  needs a real `MONGODB_URI` to run against.

---

## Status so far

**Fixed:**
- Next.js 16 route-param build errors (4 files) and the empty `reports/[id]/download` stub
- Removal of committed forged-token files (prior session)
- Security batch: privilege escalation in `POST /api/users`, wrong-target
  `DELETE /api/users/[id]`, RBAC enforcement gaps on categories/products/expenses/
  purchase-orders/stock-adjustments (routes + server actions), notification
  ownership scoping, unescaped-regex hardening across 5 routes, plus two
  incidentally-fixed build blockers (R-1 field-name bug, `UserActivity` static typings)

- Promotions module: real `Promotion` model, full CRUD API
  (list/create/get/update/delete/pause/resume, all permission-gated), working
  create/edit pages built on a previously-empty shared form component, and the
  field-shape mismatches between mock data / hook types / page rendering that
  would have broken it even with a real backend
- Dead-buttons pass across Branches/Customers/Employees/Expenses/Inventory/
  Online Orders/WhatsApp Orders/Purchase Orders (see §4 history)
- All remaining pre-existing build/type/test errors from §1: the `Customer` type
  conflict (plus the missing `/api/customers/[id]` route found along the way), the
  `User.lastLogin`/Status↔isActive mapping bugs, the two Lazy-component default-export
  bugs, the `UserForm` status-enum mismatch, the two test-file type errors, the stale
  `auth-rate-limit.test.ts` file-based test testing a since-refactored in-memory
  implementation, and the AI client's eager-init build crash. Result: `tsc --noEmit`
  exit 0, `npm run build` fully green (82/82 pages), `npx jest` 9/9 suites / 114/114
  tests passing with a clean exit (no `--forceExit`) — all for the first time this
  session.

- Settings → Security tab password change is now real (`POST /api/settings/security`,
  rate-limited, verified against the User model's real bcrypt hash), with 5 new
  passing tests covering the wrong-password, short-password, missing-field,
  success, and rate-limit-exceeded cases. The 2FA toggle no longer fakes success —
  it's disabled with an honest "not available yet" label pending a real design
  decision on how 2FA should work in this app.
- Runtime/logic bugs R-2, R-3, R-4, R-5, R-6, R-7 (see §2): customer lookup's
  impossible `isActive` filter, dashboard's wrong `totalCustomers` source, hardcoded
  30% profit margin and copied `profitChange`/zeroed `avgChange` in sales analytics,
  flat $10 unit price in AI sales prediction, hardcoded `averagePurchaseValue`/
  `expenses`/`profitMargin` in the customer & financial reports, and the dead
  `Employee` text index plus the employee search box that never actually searched
  by name or ID despite its own placeholder text. All computed from real data now;
  `tsc`/`build`/`jest` re-verified green after this batch too.

- Nav-link fixes: cashier "New Sale"/"Receipt History" pointed at dead/fake pages;
  `customers/analytics` was a real page with zero links to it; `inventory/categories`
  Edit pushed to a route that didn't exist.
- `UserForm` had no password field — since `User.password` is schema-required,
  **creating any user through the admin UI never worked, for any role, at all**
  until this fix.
- Closed unauthenticated-`'use server'`-action gaps found while scoping the
  Activity Logs work: `createSale`/`searchProducts`/`getProductByBarcode`
  (`pos.ts`) and the AI insight/prediction actions had zero auth checks; every
  notification action trusted a caller-supplied `userId`/`userRole`/`branchId`
  instead of the real session — all independently network-callable, bypassing the
  API routes that looked like they guarded them. `createSale` also now derives
  `cashierId`/`branchId` from the verified session instead of the caller.
- Activity Logs: real `ActivityLog` model, a best-effort `logActivity()` helper,
  real `GET`/`POST /api/activity-logs` (admin-only), and `logActivity()` wired at
  the 4 events the frontend's own action filter already declared (`USER_LOGIN`,
  `PRODUCT_CREATED` on both of its two creation code paths, `STOCK_ADJUSTMENT`,
  `SALE_COMPLETED`). Also fixed a render-crash bug found along the way
  (`log.timestamp.toLocaleString()` called on a JSON string) and replaced the
  Export button's 404'ing endpoint + `alert()` with a real client-side CSV export,
  matching the working pattern already used by the `whatsapp-messages` page.

- `PurchaseOrder` approve endpoint: the list page's "Approve" button was real and
  reachable (new orders default to `pending`) but always 404'd —
  `POST /api/purchase-orders/[id]/approve` didn't exist. Fixed, gated by the
  `approve_purchase_orders` permission that was already defined but never wired
  anywhere. 4 new tests. Also found and flagged (not fixed — needs a decision):
  `StockAdjustment`'s matching Approve/Reject buttons are currently unreachable
  dead UI, because `POST /api/stock-adjustments` always auto-approves and applies
  the stock change immediately — there's no code path that ever produces a
  `pending` record for those buttons to act on.

- Financial Reports: real `/api/financial-reports` backend (cost-based
  profit/margin, real period-over-period change %, real expense breakdown, real
  revenue-by-category via a `Sale`→`Product`→`Category` aggregation), a working
  Custom Range date picker, and a real CSV export replacing the entirely
  hardcoded page. 4 new tests. `inventory-reports` deliberately left alone —
  needs a decision on turnover-rate definition and unifying 3 different
  collections into one stock-movement feed, not a targeted fix.

**Still open, in priority order per the working plan:** the remaining mock/fake
features in §9 (Backup, Financial/Inventory Reports pages themselves, Returns,
Shift Summary, Payments, Email/SMS), the remaining dead-button/broken-link
items in §3/§4, the still-open runtime bugs R-8/R-9 in §2, the `user.branch` display
gap (schema only has `branchId`, never populated to a name anywhere — noted, not
fixed, since it's not a build error and needs no product decision beyond "should
this be populated," which hasn't been asked yet), and the 472 pre-existing lint
warnings (mostly `no-explicit-any`) intentionally left alone as out of scope for a
mass pass.

---

## Pass 3: closing decision-dependent gaps, continued audit

Direction for this pass: implement everything not requiring a business decision;
for previously-flagged decision-dependent items, follow the explicit direction
given (baseline policies for Returns, an explicit Shift model, a real TOTP 2FA
design, a defensible turnover formula, a real backup architecture) rather than
inventing rules; investigate Stock Adjustments properly before deciding whether
to implement or leave its dead UI; keep auditing for anything not yet found.

- **Categories consolidation** — see §3 "Duplicate/competing implementations,"
  now resolved.
- **StockAdjustment approve/reject** — see §6 "Missing endpoints," now
  implemented based on strong architectural evidence (documented in full there).

**General audit sweep** (dispatched to cover ground beyond the items already
tracked above) found a genuinely broken core page and several new instances of
already-established bug classes. All fixed, all decision-free:

- [x] **`dashboard/products` (Product Catalog) broken end-to-end for every
  role** — `useProducts.ts`'s `Product` interface declared `price`/`cost`/
  `stock`/`category`/`status`, but the real schema and every API response use
  `sellingPrice`/`buyingPrice`/`stockQuantity`/`categoryId`/`isActive`. Result:
  every price/stock/cost on the page rendered as `NaN`/`undefined`; the stock
  filter compared `undefined` to numbers so every product silently showed "In
  Stock" regardless of truth; the category filter used hardcoded fake strings
  (`beverages`, `food`...) that, once selected, threw a Mongoose `CastError`
  trying to match a non-ObjectId string, breaking the whole page into its error
  state; the Stock Level filter's `lowStock`/`outOfStock` params were sent but
  never read by the API at all. The same bad field names had also leaked into
  `PurchaseOrderForm` (every new PO line item's unit cost silently defaulted to
  $0) and `StockAdjustmentForm` ("Stock: undefined" in the product picker).
  **Fixed** — corrected the interface to match the real schema; the category
  filter now uses `useCategories()` for real ids; the API validates the
  category param is a real ObjectId (`mongoose.isValidObjectId`) before using
  it and now actually implements `lowStock`/`outOfStock` (`$expr` comparing
  `stockQuantity` to `minStockLevel`, and `stockQuantity <= 0` respectively);
  both dependent forms updated to the real field names. 4 new tests. Net lint
  improvement (fixing the types let several `any` casts be removed).
- [x] **Two more instances of the "stale JWT privilege" bug already fixed
  elsewhere** (§8) — `api/register/route.ts` and
  `api/user-activity/active/route.ts` both checked `session.user.role !==
  'admin'` directly against the cached JWT claim instead of re-verifying
  against the database, unlike every other admin-gated route in the app
  (already hardened to use `withAdmin`/`getCurrentUser` specifically to close
  this window — a demoted-but-still-logged-in admin could keep using these
  two routes until their token naturally expired). **Fixed** — both now go
  through `withAdmin`, matching the rest of the app. 3 new tests, including
  one asserting a demoted admin is rejected by each route.
  - Separately, `register/page.tsx` is a fully **public** page (no session
    gate, linked from the login screen's "Sign Up") offering a Designation
    dropdown with Cashier/Manager/**Admin** — but its endpoint requires an
    existing admin session, so the page's actual anonymous audience can never
    successfully submit it. **Not fixed — this is a product decision, not a
    bug fix.** Whether `/register` should be genuine public self-signup (and
    if so, at what default/allowed role — Admin as a public self-signup
    option would be a severe privilege-escalation risk), or should instead
    redirect to the already-working, already-fixed "Create User" flow under
    `/dashboard/users` (admin-only, has a real password field as of this
    audit), is a call only the client can make. Flagging rather than guessing.
- [x] **Unauthenticated reads leaking salary/revenue/supplier-debt data to
  lower-privileged roles** — with no edge `middleware.ts` and `rbac.ts`'s
  `canAccessRoute`/`getAllowedRoutes` being dead code (never referenced
  outside `rbac.ts` itself), nothing centrally enforces per-role page access;
  combined with these actions having zero auth check, this was live, not
  theoretical:
  - `lib/actions/employees.ts`'s `getEmployees`/`getEmployeeById` return
    `salary` and had no auth check — any authenticated cashier navigating
    directly to `/dashboard/employees` (or `/dashboard/employees/[id]`) could
    see full company payroll. **Fixed** — both now require
    `requireManagerOrAdmin()` (matches `rbac.ts`'s `view_employees` grant).
    Also added the same check to `updateEmployeePerformance`/
    `updateEmployeeAttendance` (zero live callers today, same
    no-live-exposure bucket as the already-flagged `lib/actions/dashboard.ts`,
    fixed anyway since it was a one-line addition while already in the file).
  - `lib/actions/customers.ts`'s `getCustomerAnalytics` (total revenue,
    average spend, loyalty distribution) had no auth check, and
    `dashboard/customers/analytics` (linked from a button visible to every
    role on the customers list page) calls it directly from a Server
    Component. **Fixed** — added `requireManagerOrAdmin()` (matches
    `view_customer_reports`).
  - `lib/actions/suppliers.ts`'s `getSuppliers`/`getSupplierById` (outstanding
    debt, payment terms) had no auth check at all. **Fixed** — added
    `requireManagerOrAdmin()` (matches the single bundled `manage_suppliers`
    permission). While in this file: `createSupplier`/`updateSupplier`/
    `deleteSupplier` were all gated `requireAdmin()`-only, contradicting
    `rbac.ts`'s single `manage_suppliers` permission (granted to admin **and**
    manager) — the same "inconsistent enforcement" class already fixed for
    products earlier in this audit. Realigned all three to
    `requireManagerOrAdmin()`. Also added the same check to
    `updateSupplierDebt` (zero live callers today, same bucket as above).
- [x] **AI Sales Prediction always returned zero** — `predictSales()`'s
  aggregation pipeline did `$match: {'items.productId': productId}` with
  `productId` as a plain string; unlike `Model.find()`, an aggregation
  `$match` does **not** auto-cast values against the schema, so a JS string
  can never equal the real `ObjectId` stored in `items.productId` — the match
  always returned 0 documents, so every prediction was 0 regardless of real
  sales history (distinct from the already-fixed R-5, which only addressed the
  unit-price fallback in this same function). **Fixed** — cast to
  `new mongoose.Types.ObjectId(productId)` before matching, with an
  `isValidObjectId` guard so a malformed id throws a clear error instead of a
  silent empty result. 2 new tests.
- [x] **Suppliers list Delete button always 404'd** — `useDeleteSupplier`
  targets `DELETE /api/suppliers/${id}`, but only `api/suppliers/route.ts`
  (collection-level GET/POST) existed — the exact same "list page's button
  calls a route that was never built" bug already fixed for customers.
  **Fixed** — added `api/suppliers/[id]/route.ts` (GET/PUT/DELETE),
  delegating to the existing, already-secured `getSupplierById`/
  `updateSupplier`/`deleteSupplier` actions, mirroring the customers `[id]`
  route pattern exactly.
- [x] **Unescaped `$regex` in `api/roles/route.ts`** — the one route missed in
  the earlier regex-escaping pass (§10); every sibling route (categories,
  products, users, purchase-orders, stock-adjustments) already uses
  `escapeRegex()`. **Fixed** — wrapped with the existing helper.
- [x] **`createSale`'s `Transaction` record still trusted caller-supplied
  identity** — even after the `Sale` record itself was fixed earlier in this
  audit to use `authUser.id`/`authUser.branchId`, the `Transaction.create`
  call a few lines later in the same function still used raw
  `data.cashierId`/`data.branchId` from the request body. Low real-world
  impact (`Transaction` is write-only, confirmed via grep it's never read back
  anywhere — same situation as the write-only `AIReport`/R-9), but a leftover
  instance of the exact bug already fixed elsewhere in this same function.
  **Fixed** — now uses `authUser.id`/`authUser.branchId` too.

**Returns/refunds — implemented per explicit baseline policy (§2 of the
follow-up request), not guessed:**

Investigated existing infrastructure first, per direction:
- **No existing payment/refund integration to build on.** Paystack is UI/
  schema scaffolding only (settings fields, a `paymentMethod` enum value) —
  grepped for any actual API call anywhere in the codebase; there is none.
- **`Transaction` model is a dead-end, not a payment abstraction.** It's
  written once (in `createSale`, as a secondary denormalized copy of the sale,
  linked via `orderId: sale._id`) and never read back anywhere (confirmed via
  grep) — not a real transaction/payment system to integrate with.
- **`Sale.paymentStatus` enum has no `'refunded'` value**, and the explicit
  policy says "record the return separately rather than modifying... the
  original sale" — so the original `Sale` document (`total`, `items`,
  `paymentStatus`, everything) is never written to by any part of this
  feature. It is read-only from the return flow's perspective. Return state
  lives entirely in the new `Return` collection; anything needing "has this
  sale been returned" queries `Return` by `saleId`.
- **RBAC evidence dictated a single-step process, not an approval workflow**
  (unlike Purchase Orders/Stock Adjustments): `rbac.ts` has exactly one
  permission, `process_returns`, granted to **all three roles including
  cashier** — no separate `approve_returns` permission exists. A return is
  processed and effective the instant `process_returns` allows it; there's no
  RBAC-backed reason to gate it behind a second review step.

Implementation, matching the exact baseline policy given:
- **New `Return` model** (`src/models/Return.ts`): `returnNumber`, `saleId`
  (ref, never mutates the target), `saleNumber`/`customerId`/`customerName`
  (denormalized for display), `items[]` (`productId`, `quantity`,
  `unitRefundPrice`, `refundAmount`, `reason`, `restocked`), `totalRefund`,
  `refundMethod`, `status: 'completed'`, `processedBy`/`processedById` (audit
  trail — who processed it).
- **`GET /api/returns/lookup?saleNumber=`** — finds the sale, computes
  per-item quantity already returned (summed from prior `Return` records for
  that sale) and the resulting returnable quantity, and the sale's remaining
  refundable balance. Read-only; used by the frontend before showing the
  return form.
- **`POST /api/returns`** (`process_returns` permission) — the actual
  workflow:
  - Rejects if the sale isn't `status: 'completed'`.
  - **Return quantity cannot exceed original sold quantity**: for each
    requested item, checks `alreadyReturned + requested <= originallySold`
    (summed across *all* prior returns for that sale/product, so partial
    returns compose correctly).
  - **Refund amount from the original sale price**: `unitRefundPrice =
    saleItem.total / saleItem.quantity` — this is the item's actual per-unit
    effective price from the original sale, which already bakes in any
    per-item discount that was applied (the only discount mechanism
    `createSale` currently ever populates — see note below).
  - **Cannot exceed amount originally paid**: sums this return's total with
    every prior return's total for the same sale and rejects if it would
    exceed `sale.total`.
  - **Partial returns supported** natively — a sale can have any number of
    returns over time as long as the two caps above hold.
  - **Restocks inventory** (`Product.stockQuantity += quantity`) only for
    items the processor marks "returned to sellable stock" (a per-item
    checkbox, defaulting checked) — the policy says restock happens "when
    physically returned to stock," which isn't automatic for every return
    (e.g. damaged goods), so this is a real per-item decision point for the
    person actually handling the item, not an invented business rule.
  - **Never mutates the original `Sale` document** — verified by a test
    asserting no `.save()` is ever called on the sale and its fields are
    unchanged after processing a return.
  - **Full audit trail**: `processedBy`/`processedById` on the `Return`
    record itself, plus a `RETURN_PROCESSED` entry in the real Activity Logs
    system (extended its action-filter taxonomy to include this, matching how
    `USER_LOGIN`/`PRODUCT_CREATED`/`STOCK_ADJUSTMENT`/`SALE_COMPLETED` were
    already declared for the 4 pre-existing events).
  - **Authorization per existing RBAC structure**: gated by `process_returns`
    (the real, already-declared permission — not invented), same permission
    for both `GET` (view) and `POST` (process), matching all three roles that
    already hold it.
- **Real frontend**: `dashboard/returns/page.tsx` rewritten from its fully
  mock state — "New Return" now looks up a real sale by sale number, shows
  each line's real returnable quantity, computes the refund live from real
  unit prices, requires a reason per item, and calls the real API. The list/
  detail panes show real `Return` records via a new `useReturns` hook.
- **Known limitation, documented rather than silently glossed over**:
  `createSale` always hardcodes the sale-level `discount`/`tax` fields to `0`
  today, so no real sale currently has a sale-level discount to prorate across
  a partial return. The refund calculation is correct for every case that
  exists in the live code today (item-level pricing, which is the only
  discount mechanism actually used). If a future change starts populating
  `Sale.discount`/`Sale.tax` with real values, this refund calculation will
  need a proportional-allocation step added — flagging now so it isn't
  silently wrong later.
- **10 new tests** (`returns-route.test.ts`) covering: a cashier (the
  least-privileged permission holder) successfully processing a return;
  correct partial-return refund math; restock respecting the per-item flag;
  rejecting a return exceeding original sold quantity; rejecting a return
  exceeding the amount paid; correctly accounting for quantity already
  returned across prior partial returns; rejecting returns against
  non-completed sales; and explicitly asserting the original sale is never
  mutated.
- Also fixed while in this area: `getSaleById`/`getRecentSales` in
  `lib/actions/pos.ts` had no auth check at all (same missing-auth class
  already fixed for other actions in this file) — added `requireAuth()` to
  both.

Verified: `tsc --noEmit` exits 0, `npm run build` succeeds, `npx jest` passes
18/18 suites / 158/158 tests.

**Shift Summary — implemented per the explicit model given, not guessed:**

- **New `Shift` model** (`src/models/Shift.ts`) with exactly the fields
  specified: `openedAt`/`closedAt`, `openedBy`/`openedByName`,
  `closedBy`/`closedByName`, `openingCashBalance`, `closingCashBalance`,
  `expectedCash`, `actualCash`, `cashVariance`, `salesCount`/`salesTotal`,
  `refundsCount`/`refundsTotal`, `paymentMethodTotals` (cash/card/transfer/
  paystack), `status: 'open'|'closed'`. No morning/evening inference anywhere
  — a shift exists only between an explicit open and close action.
  `closingCashBalance` and `actualCash` are set to the same value (the amount
  physically counted at close) — both field names were specified, and there
  was no indication they should differ; documented as a comment in the model.
- **Sales/refunds/payment totals are computed live from the source `Sale`/
  `Return` records** (`src/lib/shifts.ts`), not incremented at write time —
  the shift is a read-only lens over `cashierId` + a time window, so it can
  never drift out of sync with the real data, and nothing had to be added to
  `createSale`/the returns flow to "push" updates into a shift document.
  Scoped per-cashier (the shift's own `openedBy`), matching "opened by"/
  "closed by" framing this as a personal register session, not a store-wide
  shift.
- **`POST /api/shifts/open`** — any authenticated role (no RBAC permission
  for shifts exists in `rbac.ts`; this is a personal action every role needs,
  matching cashier's own `currentShiftSales` dashboard card). Rejects opening
  a second shift while one is already open for that user.
- **`GET /api/shifts/current`** — the requesting user's open shift with live
  stats and `expectedCash` (`openingCashBalance + cash sales - cash refunds`
  so far).
- **`POST /api/shifts/[id]/close`** — recomputes live stats one final time up
  to the close instant, sets `expectedCash`/`actualCash`/`cashVariance
  (actual - expected)`, `closedAt`/`closedBy`. Only the shift's own opener, or
  an admin/manager reconciling on their behalf, can close it.
- **`GET /api/shifts`** — history, scoped to the caller's own shifts unless
  they're admin/manager (who see everyone's).
- **Real frontend**: `dashboard/shift-summary/page.tsx` rewritten from its
  fully mock state (hardcoded shift object, fake "top products"/"shift
  notes" sections) — now shows an Open-Shift form when there's no active
  shift, live KPIs and a Close-Shift form (with the expected-cash figure
  shown before the count is entered) while one is open, and real closed-shift
  history with a cash-variance indicator. Deliberately dropped the mock's
  fabricated "Top Selling Products" and "Shift Notes" sections rather than
  either inventing real ones out of scope or leaving fake content in a now
  mostly-real page.
- **Integrated with the main dashboard**: the "Shift Sales" KPI card
  (`dashboardCards.includes('currentShiftSales')`, cashier's own dashboard)
  referenced `stats?.shiftRevenue`, a field declared in the `DashboardStats`
  type but never populated by `/api/dashboard/stats` — always showed ₦0
  regardless of real activity. Wired to `useCurrentShift()`'s real
  `salesTotal` instead; removed the dead `shiftRevenue` field from the type.
- **8 new tests**, including exact arithmetic assertions for `expectedCash`
  and `cashVariance`, and authorization checks (a cashier can't close someone
  else's shift; a manager can, for reconciliation).

Verified: `tsc --noEmit` exits 0, `npm run build` succeeds, `npx jest` passes
19/19 suites / 166/166 tests.

**Two-factor authentication — real TOTP, not a UI toggle:**

Investigated the existing auth architecture first, per direction, before
designing anything:
- **Session strategy is JWT-only, no server-side sessions/adapter** (`session:
  { strategy: "jwt" }` in `src/lib/auth.ts`, no `adapter` configured) — so
  there is no session store to hold a "pending 2FA challenge" between two
  separate requests. The entire password + TOTP exchange has to complete
  inside one `authorize()` call, or a challenge-token mechanism would need to
  be invented from scratch. Chose the former: the client re-submits the same
  credentials plus a `totpCode` once it learns one is required, so session
  issuance stays atomic with full authentication (no half-authenticated
  intermediate state to secure separately).
- **Confirmed the exact NextAuth v5 mechanism from installed source, not
  assumed** — per `AGENTS.md`'s warning that this Next.js/NextAuth version's
  APIs may differ from training data, read `node_modules/@auth/core/errors.js`
  and `node_modules/next-auth/react.js` directly: a `CredentialsSignin`
  subclass can set a custom `code` string property, and client-side
  `signIn('credentials', { redirect: false })` parses that `code` out of the
  response and returns it in the result object. This is what lets the login
  page distinguish "wrong password" from "this account needs a 2FA code next"
  without a redirect-based flow.
- **No competing auth architecture introduced** — no new React auth context,
  no new cookie, no new session table; 2FA state (`twoFactorEnabled`,
  encrypted secret, hashed recovery codes) lives entirely on the existing
  `User` document, `select: false` by default like `password` already is.

Implementation:
- **`src/lib/mfa-crypto.ts`** — AES-256-GCM encrypt/decrypt for the TOTP
  secret at rest, keyed by a new `MFA_ENCRYPTION_KEY` env var (base64, must
  decode to exactly 32 bytes). The key is read lazily (only when
  encrypt/decrypt is actually called), so a server with the var unset still
  boots and runs fine — it only fails, with a clear error, if someone actually
  tries to set up 2FA. Secrets are never stored in plaintext.
- **`src/lib/mfa.ts`** — TOTP generation/verification via `otpauth`
  (SHA1/6-digit/30s, the universal default every authenticator app supports),
  `window: 1` on verification (tolerates ±30s clock drift). 10 recovery codes
  per enable, generated with `crypto.randomBytes` and hashed with `bcryptjs`
  at the same cost factor (12) already used for passwords — never stored or
  logged in plaintext after generation.
- **`User` model** — additive fields only: `twoFactorEnabled` (default
  `false`), `twoFactorSecretEncrypted` (`select: false`),
  `twoFactorRecoveryCodesHashed` (`select: false`), `twoFactorEnabledAt`. No
  existing field touched.
- **`POST /api/auth/2fa/setup`** — authenticated; refuses if already enabled;
  generates a secret, stores it encrypted (not yet "enabled" — enabling
  requires proving possession via a real code first), returns the QR code
  (`qrcode` package, server-rendered PNG data URL) and the manual-entry
  secret. The raw secret is only ever sent to the browser at this one step,
  which the user needs anyway to scan the QR/type it into their authenticator
  app — after this it lives only encrypted in the database.
- **`POST /api/auth/2fa/enable`** — rate-limited (5 attempts / 15 min per
  user, matching the existing login throttle pattern); requires a valid code
  against the stored secret; only on success does it flip
  `twoFactorEnabled = true`, generate the 10 recovery codes, and return them
  **once**, in plaintext, in this one response — never retrievable again.
- **`POST /api/auth/2fa/disable`** — rate-limited; requires the account
  **password** (not a TOTP code — the standard re-auth pattern, since the
  point of disabling is often "I lost my authenticator," so requiring the
  authenticator to disable it would be a lockout trap); clears all 2FA fields
  on success.
- **`GET /api/auth/2fa/status`** — returns `{ enabled, enabledAt }` for the
  current user only.
- **Login challenge flow** (`src/lib/auth.ts`, `src/app/login/page.tsx`) — if
  a user with `twoFactorEnabled` submits correct credentials without a
  `totpCode`, `authorize()` throws a custom `TwoFactorRequiredError`
  (`code: "totp_required"`) instead of failing or succeeding; the login page
  catches this via `result.code`, reveals a code input (email/password fields
  disabled, not cleared) and re-submits. A wrong code throws
  `InvalidTotpError` (`code: "totp_invalid"`), shown with a distinct message
  that also mentions recovery codes are accepted. Both TOTP and recovery
  codes are checked in the same field; a used recovery code is removed from
  the stored hash list immediately (one-time use). The existing 5-attempt/
  15-minute rate limit already covers this path too, since both password and
  code attempts happen inside the same `authorize()` call keyed by email.
- **`src/components/settings/TwoFactorSettings.tsx`** — replaces the old
  fake, permanently-disabled toggle on the Settings → Security tab
  ("Not available yet") with the real enable/QR/verify/recovery-codes/disable
  flow, wired to the routes above.
- **Constraints documented, not silently worked around:** no
  authentication-provider (Google OAuth) interaction was changed — 2FA only
  applies to the credentials/password login path, since TOTP is meaningless
  layered on top of an OAuth provider that already performs its own
  challenge. `MFA_ENCRYPTION_KEY` documented in `.env.example` with a
  generation command; **this must be set in Railway's production environment
  variables before any user can enable 2FA in production** — this is a
  deployment step for the client, not something this session can set.
- **19 new tests** (`mfa.test.ts`, `mfa-crypto.test.ts`, `2fa-routes.test.ts`)
  covering: real TOTP generation/verification (including a sanity check that
  a wrong code is genuinely rejected, guarding against the route tests
  passing for the wrong reason), recovery code hashing/matching/case-
  insensitivity/exhaustion, AES-GCM round-trip and tamper/wrong-key/missing-
  key failure modes, and all four routes' success and rejection paths
  (already-enabled guard, wrong code, wrong password, status reporting).

Verified: `tsc --noEmit` exits 0, `npm run build` succeeds, `npx jest` passes
22/22 suites / 187/187 tests.

**Inventory Reports — defensible turnover formula + real unified movement feed:**

`dashboard/inventory-reports/page.tsx` was 100% hardcoded fake data (fixed
metric values, a 5-row fake category table, 4 fake "recent movements" with
2024 dates) with no backend at all. Investigated the actual data model before
choosing any calculation, per direction:

- **`Sale.items[]` stores `buyingPrice` (cost) per line, immutably, at the
  moment of sale** (verified in `src/models/Sale.ts`) — so real, exact
  historical COGS is directly computable from existing data: no estimation
  needed for the numerator of the turnover formula.
- **`Product.stockQuantity` is mutated in exactly three places in the entire
  codebase** (confirmed by grepping every `stockQuantity` write site): sales
  decrement it (`lib/actions/pos.ts`), approved stock adjustments apply their
  delta at approval time (the Phase B workflow), and restocked returns
  increment it (Phase C). **Purchase orders never touch it anywhere** — there
  is no endpoint that transitions a `PurchaseOrder` past `'approved'` into
  `'delivered'`, and even the `updateStock()` server action that could apply
  a delivery is dead code with zero callers (confirmed by grep). This is a
  real architectural gap, not a guess: the schema declares `status:
  'delivered'` and an `actualDelivery` field, but nothing wires a delivery to
  inventory. Fixing that would mean deciding real business rules (partial
  receipt handling, over/delivery tolerance, whether a separate goods-
  received record is needed) that this session was told not to invent, so it
  is **flagged below as its own decision item**, not silently implemented.
- Because those three sources are the *only* mutators, and because no
  periodic inventory snapshot is stored anywhere, **historical quantity at
  any past instant can be validly reconstructed**: take a product's current
  quantity and reverse every one of those three event types that happened
  after that instant. This is exact arithmetic over real records, not an
  estimate. What genuinely isn't available is **historical cost** —
  `Product.buyingPrice` is a single mutable current value with no price-
  history table — so both ends of the reconstruction are valued at *today's*
  buying price. This is the one real limitation, and it's returned by the API
  and shown directly in the report UI rather than hidden.

Implementation, following the requested `COGS / Average Inventory` formula
with the strongest data that exists:

- **`GET /api/inventory-reports`** (`view_inventory_reports` permission,
  already existed in `rbac.ts`, granted to admin+manager only — matches how
  every other report route in this app is gated):
  - `endingInventoryValue` = current on-hand quantity × current buying price,
    summed over active products (optionally filtered by category).
  - `beginningInventoryValue` = the same, using each product's quantity
    reconstructed as of the period's start (reversing sales/adjustments/
    restocked-returns dated after that instant).
  - `averageInventoryValue` = `(beginning + ending) / 2`.
  - `cogs` = gross cost of items sold in the period, **net of** the cost of
    items that were both returned and physically restocked in that same
    period — looked up from the *original sale's* recorded buying price
    (not today's), which is the actually-correct historical cost for that
    unit.
  - `turnoverRatio` = `cogs / averageInventoryValue`, returned as `null`
    (never a fabricated `0` or `NaN`) when average inventory is `0` — e.g. a
    brand-new store with no stock history yet.
  - Reconstructed quantities are floored at `0` as a defensive guard against
    ever displaying a nonsensical negative currency figure if some future
    data inconsistency existed outside the three tracked mutation paths; this
    doesn't fabricate a number, it only prevents an impossible one from
    rendering.
  - Real category breakdown (replacing the 5 hardcoded fake rows), same
    methodology grouped by `categoryId`.
  - `limitations: string[]` in the response spells out the current-cost-basis
    caveat and the purchase-order gap in plain language; the frontend renders
    both directly instead of presenting the numbers as unqualified fact.
- **`GET /api/inventory-reports/movements`** (same permission) — merges
  Sales, approved Stock Adjustments, and restocked Returns into one
  chronologically-sorted, typed feed (`SALE` / `ADJUSTMENT` / `RETURN`,
  `quantityChange` signed +/-, product/reference/performer per entry),
  read-only over the source collections (nothing is ever written back).
  `PURCHASE` and `OTHER` are real values in the type union (for forward
  compatibility once/if a receiving workflow is decided) but are never
  populated today, for the same reason given above — including them would
  mean showing a stock increase that never actually happened to
  `Product.stockQuantity`, which would make the feed not reconcile with real
  stock and actively mislead rather than inform. A `notes[]` field explains
  this in the same response rather than silently omitting purchase orders
  with no explanation. Supports type/search/product filtering and pagination.
- **Real frontend**: `dashboard/inventory-reports/page.tsx` rewritten — real
  metric cards, a visible limitations panel, a real category table, and a
  paginated/filterable movement feed with a distinct badge per movement type
  and a note explaining the purchase-order gap. CSV export now exports real
  numbers instead of hardcoded ones.
- **6 new tests** (`inventory-reports-route.test.ts`), including one that
  hand-verifies the exact reconstructed-average-inventory arithmetic (a
  known starting quantity, one sale reversed, asserting the exact beginning/
  ending/average/turnover numbers), one confirming per-product
  `minStockLevel` (not a hardcoded threshold) drives low/out-of-stock counts,
  one confirming unrestocked return items are excluded from the movement
  feed, one confirming type filtering skips querying collections that were
  filtered out entirely, and a permission-denial check for a cashier.

**Flagged as requiring a decision (not implemented, per direction not to
invent business rules):** wiring Purchase Order delivery to actually
increase `Product.stockQuantity`. The schema already has the vocabulary for
it (`status: 'delivered'`, `actualDelivery`), but no endpoint exists to reach
that status, and building one raises real questions this session can't
answer alone: should partial delivery (receiving less than the ordered
quantity) be supported, is over-delivery allowed, and should there be a
distinct goods-received record for audit purposes separate from the PO
document itself? Until decided, purchase orders remain procurement paperwork
only and are correctly excluded from both the movement feed and the COGS/
turnover numbers above (including them would fabricate stock events that
never happened).

Verified: `tsc --noEmit` exits 0, `npm run build` succeeds, `npx jest` passes
23/23 suites / 193/193 tests.
