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
| `dashboard/shift-summary` | E | Fully fabricated, explicitly commented as placeholder. |
| `dashboard/page.tsx` low-stock/expiring mock arrays | E | Always renders (backing routes don't exist — see §6). |
| `dashboard/returns` | E | No backend of any kind. |
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
