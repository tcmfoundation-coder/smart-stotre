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
- [ ] `src/__tests__/components/button.test.ts:10` — `data-testid` not in `ButtonProps`
  type (test predates a prop addition or the prop was never added to the type).
- [ ] `src/__tests__/lib/error-handler.test.ts:40,60,70,79,86` — tests assign directly
  to `process.env.NODE_ENV`, which TS's `ProcessEnv` type now marks read-only.
- [x] `src/app/api/reports/generate/route.ts:113` — `sale.totalAmount` doesn't exist on
  `ISale` (real field is `total`). Same root cause as finding R-1 below. Fixed
  (rename only — the deeper financial-report correctness issues in R-6 remain open).
- [x] `src/app/api/user-activity/active/route.ts:25` — calls `UserActivity.getActiveUsers`,
  but the static wasn't declared in the model's TS interface (it existed at runtime
  per `UserActivity.ts`'s `statics`, this was a typing gap, not a missing feature).
  Fixed by adding an `IUserActivityModel` interface declaring both statics.
- [ ] `src/app/dashboard/customers/page.tsx:77,91,137` — two different `Customer` types
  are in scope (likely one from `src/types` and a narrower inline one), causing
  `.reduce()`/`.map()` overload failures.
- [ ] `src/app/dashboard/users/page.tsx:181-182` — references `User.lastLogin`, which
  isn't on the `User` type.
- [ ] `src/components/dashboard/LazyAlertCard.tsx:7`, `LazyExecutiveHero.tsx:7` — lazy
  `import()` expects a `default` export that the target component files don't have.
- [ ] `src/components/dialogs/UserForm.tsx:38,73` — react-hook-form generic/status-enum
  mismatch (`"suspended"` not in the resolver's inferred type).

**Note:** `npm run build` stops at the *first* type error, so the list above is the
full `tsc --noEmit` picture, not necessarily the exact order `next build` will hit
them in. `npm run lint` separately reports 271 pre-existing errors / 231 warnings,
almost all `@typescript-eslint/no-explicit-any` — not itemized here individually.

---

## 2. Runtime / logic bugs (confirmed by reading the code, not yet reproduced live —
no seeded database in this sandbox)

- [x] **R-1**: `api/reports/generate/route.ts` financial report read
  `sale.totalAmount`; the `Sale` schema's real field is `total`. Fixed the field
  name — revenue now computes correctly. (The `expenses: 0` and bad `profitMargin`
  formula in the same block are R-6, still open.)
- [ ] **R-2**: `api/customers/lookup/route.ts` queries
  `Customer.findOne({ phone, isActive: true })` / `{ email, isActive: true }`, but
  `Customer` has no `isActive` field at all. This lookup can **never** match a real
  document — customer lookup during POS checkout always reports "not found," which
  likely causes duplicate customer records instead of reuse (contrast with
  `customers/auto-create` and `pos.ts::createSale`, which dedupe correctly by phone
  with no `isActive` filter).
- [ ] **R-3**: `api/dashboard/stats/route.ts:70` — `totalCustomers` is computed as
  `User.countDocuments({})` — it counts staff accounts (admin/manager/cashier), not
  the `Customer` collection. The dashboard's "Total Customers" KPI is wrong data, not
  fake data — an easy, well-defined fix.
- [ ] **R-4**: `api/sales/analytics/route.ts` hardcodes profit as `total * 0.3`
  (flat 30%) instead of computing from `buyingPrice`/`sellingPrice`, which the
  codebase already does correctly elsewhere (`lib/actions/ai.ts:41`). `profitChange`
  is also just a copy of `revenueChange`, not a real calculation.
- [ ] **R-5**: `lib/actions/ai.ts::predictSales` assumes a flat **$10** average unit
  price for revenue prediction regardless of actual product prices.
- [ ] **R-6**: `api/reports/generate/route.ts` — customer report's
  `averagePurchaseValue` is hardcoded `0`; financial report's `expenses` is hardcoded
  `0` (ignores the real `Expense` model); `profitMargin` formula is
  `revenue > 0 ? 100 : 0` (not `(revenue-expenses)/revenue`).
- [ ] **R-7**: `Employee.ts` declares a text index on `name`/`email`/`phone`, but
  those fields live on the linked `User` document, not `Employee` — the index is a
  dead no-op.
- [ ] **R-8**: `Loyalty.rewards[].rewardId` references a `Reward` model that doesn't
  exist anywhere in `src/models`.
- [ ] **R-9**: `AIReport` is write-only — `getBusinessInsights` creates records but
  `getAIReports` (same file) is never called from anywhere, so generated insights are
  never displayed back.

---

## 3. Broken pages

**Fully hardcoded / no real backend at all:**
- [ ] `dashboard/financial-reports` — literal metrics/breakdown arrays; "Custom Range"
  button has no handler; the real `useFinancialReports` hook exists but targets a
  `/api/financial-reports` endpoint that doesn't exist and is never actually used here.
- [ ] `dashboard/inventory-reports` — literal metrics arrays; filters are cosmetic
  (don't refetch); Export button has no handler.
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
- [ ] `dashboard/customers/analytics` — zero references anywhere in the codebase.
- [ ] `dashboard/receipts` — real and working, but only reachable via the dashboard's
  Quick Actions button and the post-checkout redirect, not the sidebar.

**Duplicate/competing implementations:**
- [ ] `dashboard/categories` (sidebar-linked) vs. `dashboard/inventory/categories`
  (reachable only via a button inside Inventory) — two separately-coded category CRUD
  UIs for the same `Category` model.

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
- [ ] `dashboard/activity-logs` — "Export": calls `/api/activity-logs/export`, which
  doesn't exist (always 404s), and reports the result via raw `alert()` instead of
  the app's own `sonner` toast system.
- [x] `dashboard/customers/new` — was: error path used raw `alert()` instead of
  `sonner` (inconsistent with sibling `employees/new`, `suppliers/new`). Fixed.

**Broken navigation links (target route doesn't exist):**
- [ ] Cashier nav "New Sale" → `/dashboard/pos/new` — no page (`config/navigation.ts`).
- [ ] `dashboard/customers` list — Edit link → `/dashboard/customers/[id]/edit` — no page.
- [x] `dashboard/promotions` — was: "Create"/"Edit" → `/dashboard/promotions/new`
  and `/dashboard/promotions/[id]`, neither page existed; `promotion-form.tsx`
  was a 0-byte file. **Fixed** — both pages now exist, built on a real shared
  `promotion-form.tsx`.
- [ ] `dashboard/inventory/categories` — Edit → `/dashboard/inventory/categories/[id]/edit` — no page.

**Looks wired, but the API it calls doesn't exist (404 at runtime despite complete-looking frontend code) — see §6 for the full list:** Promotions pause/resume, Purchase Order approve, Stock Adjustment approve/reject.

---

## 5. Broken forms

- [ ] **Settings → Security tab** (`dashboard/settings/page.tsx`) — password
  change and 2FA toggle run an `await new Promise(setTimeout(...))` explicitly
  commented as simulated, then show a fake success toast. No API call is made; no
  password is ever changed; 2FA state is never persisted. This sits right next to the
  General/Notifications/Payments/Online tabs on the same page, which **do** correctly
  save to the real `/api/settings` route — so the fake tab is easy to mistake for working.
- [ ] **`UserForm` dialog** (create/edit User from the Users page) has no password
  field at all, unlike `employees/new`, which does collect one. A user created via
  this dialog has no way to get a usable password through that flow.

---

## 6. Broken / mock APIs

**Entirely mock, no backing model, writes are discarded:**
- [ ] `api/activity-logs` — GET returns a hardcoded array; POST builds and returns an
  object but never saves it. No `ActivityLog` model exists at all, despite
  `VIEW_ACTIVITY_LOGS` being a defined permission in `lib/rbac.ts`.
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
- [ ] `DELETE /api/users/[id]` reads `id` from the route params but never uses it —
  it calls `User.findByIdAndUpdate(user._id, ...)` using the **calling admin's own
  id** from the auth check, not the target id in the URL. Deactivating any user in
  the Users list actually deactivates your own account, and reports success as if it
  worked correctly.

**Missing endpoints the schema/workflow implies should exist:**
- [ ] No `[id]` route for `PurchaseOrder` at all (approve/deliver/cancel transitions).
- [ ] No `[id]` route for `StockAdjustment` approve/reject (see above).
- [ ] No route backing `Promotion` beyond the mock list/create.

---

## 7. Database issues

- [ ] `Customer` schema has no `isActive` field, but is queried with one in
  `api/customers/lookup` (see R-2).
- [ ] `Sale.total` vs. code expecting `Sale.totalAmount` (see R-1).
- [ ] `Employee` text index on non-existent fields (see R-7).
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
  code paths) — `deleteProduct` correctly stays admin-only. `backup`, `activity-logs`,
  and `promotions` still need this once they get real models/routes (see §6).
- [x] **Notification endpoints had no ownership scoping.** Added a shared
  `buildVisibilityFilter()` (mirroring the role-based visibility rules already used
  by `getNotifications`) and applied it to `markAsRead`, `deleteNotification`,
  `markAllAsRead`, and `getUnreadCount` — each now only sees/affects notifications
  the requesting user is actually allowed to see, based on their role/branch, not
  every record in the collection.
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
| `api/activity-logs` (list/create) | E/F | No model; writes discarded. |
| ~~`api/promotions` (list/create)~~ | E/F | **Fixed** — real model + full CRUD now backs the frontend's existing expectations. |
| `dashboard/reports` "View" button | E | Labeled placeholder (`toast.info`), at least honestly stated. |
| `dashboard/backup` stat tiles + schedule panel | E | Hardcoded; no cron/schedule exists anywhere. |
| `dashboard/financial-reports`, `inventory-reports` | E | Fully hardcoded metrics presented as live. |
| `dashboard/employees` list Delete button | E | `console.log` only, real action exists but isn't called. |
| Sales analytics 30%-flat profit | F | Real feature, fabricated business assumption. |
| AI sales prediction $10 flat price | F | Real feature, fabricated business assumption. |
| Settings → Security tab | F | Fake delay + fake success, no real call. |
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

**Still open, in priority order per the working plan:** the remaining mock/fake
features in §9 (Backup, Activity Logs, Financial/Inventory Reports, Returns, Shift
Summary, Payments, Email/SMS), the dead-button list in §4, the broken-link list in
§3/§4, and the remaining pre-existing build errors in §1 (customers page `Customer`
type conflict, `User.lastLogin`, Lazy component default exports, `UserForm`
generic mismatch, test-file type errors).
