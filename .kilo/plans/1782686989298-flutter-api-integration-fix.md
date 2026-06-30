# Plan: Align cakramerp-flex Flutter App with Backend API

**Goal:** Fix every place where the Flutter app (`cakramerp-flex/`) calls a non-existent/wrong backend endpoint, sends a mismatched DTO, or uses hardcoded data instead of the real API. Align Flutter to the **existing** NestJS backend (`cakramerp-service`) — no backend changes.

**Source of truth:** Backend controllers under `cakramerp-service/src/modules/**/controllers/*.controller.ts` and the web app's `cakramerp-app/src/lib/url-client.ts`.

**Verification command:** `flutter analyze` (run from `cakramerp-flex/`); then manual smoke-test each fixed flow.

---

## Task 1 — Token/session lifecycle (auth hardening)

**Root cause:** `ApiService` (singleton) holds its own `_token`, but `AuthProvider.init()` loads the token from SharedPreferences into `AuthProvider._token` and never syncs it to `ApiService`. On cold start, `ApiService._token` is null → requests send no Bearer header → 401. Also `_handleResponse` clears the token on 401 but never redirects.

**Decision:** Sync token in AuthProvider; clear session + redirect to `/login` on 401.

### 1.1 `lib/main.dart`
- Add `final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();` (top-level).
- Pass `navigatorKey: navigatorKey` to `MaterialApp`.
- After building providers, register the 401 handler: `ApiService().onUnauthorized = () { navigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (_) => false); };` (do this inside `MyApp.build` or a post-frame callback so `AuthProvider` exists). Alternatively set the callback inside `AuthProvider.init()` using a static navigator key.

### 1.2 `lib/services/api_service.dart`
- Add `void Function()? onUnauthorized;` field.
- In `_handleResponse`, on `statusCode == 401`: clear `_token`, remove from prefs, then invoke `onUnauthorized?.call()` (guard null).
- Keep `init()` but make it idempotent; it's now actually used.

### 1.3 `lib/providers/auth_provider.dart`
- In `init()`, after loading `_token` from prefs, call `ApiService().setToken(_token!)` when token is non-null (this populates `ApiService._token` on cold start).
- Ensure `login()` already calls `api.setToken()` (it does — keep). Ensure `logout()` calls `api.clearToken()`. Ensure `refresh()` calls `api.setToken()` after refreshing (it currently updates prefs but NOT `api.setToken` — add it).
- Register `ApiService().onUnauthorized` in `init()` to call a `handleUnauthorized()` that clears `_user`/`_tokens`/`_token`, removes prefs keys, `notifyListeners()`. (Redirection handled by the navigator key registered in main.dart; AuthProvider just clears state.)

---

## Task 2 — Self-service (`/my/...`) fixes

### 2.1 Leave types (endpoint doesn't exist)
**Backend:** No `GET /my/leave/types` endpoint. The web app derives leave-type options from `GET /my/leave/balance` (each balance carries `leaveTypeId` + `leaveType`/`leaveTypeName`).

- `lib/providers/self_service_provider.dart`: remove `fetchLeaveTypes()`, `_leaveTypes`, `leaveTypes` getter. Keep `fetchLeaveBalances()` (already correct).
- `lib/screens/leave_screen.dart` (`_showApplyLeaveDialog`): remove the `defaultLeaveTypes` hardcoded fallback and the `fetchLeaveTypes()` call in `initState`. Build the dropdown from `context.read<SelfServiceProvider>().leaveBalances`, using `b.leaveTypeId` as value and `b.leaveTypeName` (with remaining) as label — mirroring `cakramerp-app/src/routes/_app/my/leave.tsx:200-203`.
- `lib/models/leave.dart`: `LeaveType` class can be removed or left unused (remove imports as needed).

### 2.2 Attendance discrepancy (wrong endpoints)
**Backend:** Only `POST /my/attendance/flag-discrepancy` exists (`FlagDiscrepancyHttpDto`: `date`, `reason`, `correctClockIn?`, `correctClockOut?`). There is **no** GET list endpoint.

- `lib/providers/self_service_provider.dart`:
  - Rename `submitDiscrepancyReport` body target from `POST /my/attendance/discrepancies` → `POST /my/attendance/flag-discrepancy`. The payload keys already match the DTO (`date`, `reason`, `correctClockIn`, `correctClockOut`) — keep them.
  - Remove `fetchDiscrepancyReports()`, `_discrepancyReports`, `discrepancyReports` getter.
- `lib/screens/attendance_screen.dart`:
  - Remove `fetchDiscrepancyReports()` call from `initState` and the refresh handler.
  - Remove the "Discrepancy Reports" `SectionHeader` + list section + `_DiscrepancyCard` widget.
  - Keep the "Report Discrepancy" `GradientButton` + `_showDiscrepancyForm` (now hits the correct endpoint).
- `lib/models/attendance.dart`: remove `DiscrepancyReport` model (and its usages) or leave the class but stop referencing it.

### 2.3 Profile update (wrong HTTP method)
**Backend:** `@Put('profile')` (PUT, not PATCH).

- `lib/providers/self_service_provider.dart` `updateProfile`: change `_api.patch('/my/profile', ...)` → `_api.put('/my/profile', body: data)`. (DTO `UpdateProfileHttpDto` accepts `fullName`, `phone`, `address`, `bankAccountNumber`, `bankName` — the form sends the latter four; fine.)

---

## Task 3 — Customer portal fixes

### 3.1 Create-request screen uses admin endpoints (403)
**Problem:** `portal_request_create.dart` calls `LaboratoryProvider.fetchContracts` (`/laboratory/post-approval/contracts`) and `LaboratoryProvider.fetchTestingServices` (`/laboratory/testing-services`) — both require admin permissions; customers get 403.

- `lib/providers/portal_provider.dart`: add `List<TestingService> _testingServices` + getter + `fetchTestingServices()` hitting `GET /portal/lab/testing-services` (exists on `CustomerPortalController`). Parse via the existing `TestingService` model.
- `lib/screens/portal/portal_request_create.dart`: replace `LaboratoryProvider` reads with `PortalProvider` — `fetchContracts(status: 'active')` (already exists, hits `/portal/lab/contracts`) and `fetchTestingServices()`. Update `initState` and the `context.watch` calls. Watch `PortalProvider.contracts`/`testingServices`.

### 3.2 Create-request DTO field mismatches (400)
**Backend `CreatePortalTestingRequestDto`:** uses `labContractId` (UUID) for contract billing; each line uses `testingServiceId` (UUID), `serviceName`, `sampleQuantity?`.

- `lib/screens/portal/portal_request_create.dart`:
  - `_submit`: change `data['contractId']` → `data['labContractId']`.
  - `_SampleLine.toJson()`: change `'serviceId'` → `'testingServiceId'`.

### 3.3 Download response shape (silent failures)
**Backend:** returns `{ url }` (see `customer-portal-lab.controller.ts` `downloadResultCertificate` → `{ url }`; download-contract → `{ url, filename }`).

- `lib/providers/portal_provider.dart`:
  - `downloadDocument`: change `data['downloadUrl']` → `data['url']`.
  - `downloadCertificate`: change `data['downloadUrl']` → `data['url']`.
- `OpenFile.open(url)` is given a remote presigned URL — it needs a local path. Add a helper that downloads the URL to a temp file (`http.get` → `Directory.systemTemp`), then `OpenFile.open(tempPath)`. Apply in:
  - `lib/screens/portal/portal_request_detail.dart` `_downloadDocument`.
  - `lib/screens/portal/portal_results.dart` certificate download (`_ResultDetailSheet`).
  - Guard network failures with a SnackBar.

### 3.4 Schedule allocator (DTO mismatch)
**Backend `POST /portal/lab/contracts/:id/schedules`** requires `sampleAllocations: [{ contractSampleId, allocatedQuantity }]` — not `qtySamples`. Contract sample IDs come from `GET /portal/lab/contracts/:id`, which returns `sampleLines` (each: `id`, `sampleQuantity`, `completedQuantity`, `pendingQuantity`, `availableForSchedule`).

- `lib/models/laboratory.dart`: extend `LabContract` with `List<ContractSampleLine> sampleLines`. Add `ContractSampleLine` model parsing `id`, `sampleQuantity`, `completedQuantity`, `pendingQuantity`, `availableForSchedule`.
- `lib/providers/portal_provider.dart`: `getContract` already calls `GET /portal/lab/contracts/:id` and stores `_currentContract`; ensure the model parses `sampleLines`.
- `lib/screens/portal/portal_contract_detail.dart` `_CreateScheduleForm`:
  - Receive the contract's `sampleLines` (from `currentContract`).
  - Render one qty input per sample line, initialized to 0, capped at `availableForSchedule`, validator `> 0` and `<= availableForSchedule`.
  - On submit, build:
    ```
    {
      'scheduledDate': isoString,
      'scheduledTime': string,
      'scheduledLocation': string,
      'sampleAllocations': sampleLines
          .where(allocated > 0)
          .map((s) => {'contractSampleId': s.id, 'allocatedQuantity': qty})
          .toList()
    }
    ```
  - Validate that at least one allocation > 0 before submitting.

### 3.5 Dead named route (dashboard recent-item tap)
- `lib/screens/portal/portal_dashboard.dart` `_RequestItem.onTap`: replace `Navigator.of(context).pushNamed('/portal/requests/${request.id}')` (route never registered in `main.dart`) with `Navigator.of(context).push(MaterialPageRoute(builder: (_) => PortalRequestDetail(requestId: request.id)))` — matching `portal_requests.dart`.

---

## Task 4 — Lab admin Contracts screen

### 4.1 Switch to the CRUD endpoint
**Backend:** `/laboratory/post-approval/contracts` has GET/POST only (no PUT/DELETE) → edit/delete 404. The CRUD-capable endpoint is `/laboratory/contracts` (`lab-contract.controller.ts`: GET list, GET/:id, POST, PUT/:id, DELETE/:id). The web app uses `/laboratory/contracts` for contract management (`url-client.ts:334`).

- `lib/providers/laboratory_provider.dart`:
  - `fetchContracts`: change `/laboratory/post-approval/contracts` → `/laboratory/contracts`.
  - `createContract`: change base to `/laboratory/contracts`.
  - `updateContract`: `PUT /laboratory/contracts/$id`.
  - `deleteContract`: `DELETE /laboratory/contracts/$id`.

### 4.2 Expand the contract form to match DTO
**Backend `CreateLabContractHttpDto`:** `contractNumber` (req), `customerId` (req), `customerName?`, `projectName?`, `startDate` (req, ISO date), `endDate` (req, ISO date), `contractValue` (req, number), `totalQuota?`, `attachments?`.

- `lib/screens/laboratory/laboratory_contracts_screen.dart` `_showForm`: add fields:
  - Customer dropdown populated from `CustomerProvider.fetchCustomers()` (watch `customers`); selected `customerId` + carry `customerName`.
  - `startDate`, `endDate` (date pickers → `yyyy-MM-dd`).
  - `contractValue` (number).
  - `totalQuota` (number, optional).
  - Keep `contractNumber`, `projectName`, `notes`(notes not in DTO — drop or send as part of projectName).
- Submit payload: `{ contractNumber, customerId, customerName, projectName, startDate, endDate, contractValue, totalQuota }`.
- Edit (`updateContract`) sends the `UpdateLabContractHttpDto` subset (`contractNumber?`, `startDate?`, `endDate?`, `contractValue?`, `totalQuota?`).

### 4.3 Verify model field mapping
- `lib/models/laboratory.dart` `LabContract.fromJson` reads `totalAmount`; the `/laboratory/contracts` entity likely returns `contractValue`. Make the parser tolerant: `totalAmount: toDouble(json['totalAmount'] ?? json['contractValue'])`. Confirm `totalQuota`/`usedQuota`/`remainingQuota`/`isUnlimited`/`status` field names against an actual response (adjust aliases if needed).

---

## Task 5 — Cleanup (dead code)

- `lib/providers/portal_provider.dart`: remove unused `_scheduleSamples`, `_documents` (and their getters `scheduleSamples`, `documents`) — never populated.
- Remove now-unused imports after the above edits (leave it to `flutter analyze` to flag).

---

## Secondary verification (after primary tasks)

These admin screens hit real endpoints but their form payloads may not match DTOs exactly — verify and patch field names if they 400:
- `laboratory_requests_screen.dart` form payload vs `testing-request` create DTO.
- `laboratory_schedules_screen.dart` form payload (`scheduledLocation`, `laboranName`) vs `CreateScheduleHttpDto`.
- `laboratory_services_screen.dart` form payload vs `CreateTestingServiceHttpDto`.

If a required field is missing, add it to the form (same approach as Task 4.2).

---

## Validation

1. `cd cakramerp-flex && flutter analyze` — must be clean (no errors; resolve any unused-import/field warnings introduced).
2. Manual smoke-test against `https://api.labmuliajo.com/api/v1`:
   - **Auth:** cold-start with stored token → home/portal loads data (token synced). 401 → redirected to login.
   - **Self-service:** leave apply dropdown shows real leave types (from balances); submit succeeds. Discrepancy form submits to `flag-discrepancy`; no broken list section. Profile edit saves (PUT).
   - **Portal (customer):** create request lists real contracts/services; submit succeeds (correct DTO). Download documents open. Schedule create with sample allocations submits (201).
   - **Lab admin:** contracts create/edit/delete work (`/laboratory/contracts`).

## Risks
- Model `fromJson` field-name drift between Flutter models and actual API responses — each parser should tolerate aliases (`a ?? b`).
- The `LabSchedule.qtySamples` field isn't returned by the portal schedule list; it will render 0. Acceptable (cosmetic); don't block.
- `open_file` opening remote URLs is platform-dependent — the temp-file download step is required for reliability.

## Out of scope
- No backend (NestJS) changes.
- No new Flutter dependencies unless the temp-download helper needs one (it can use the existing `http` + `dart:io` `Directory.systemTemp`; do not add `url_launcher`).
- Refresh-token retry queue (401 → refresh → retry) is deferred; current behavior is clear-session + redirect.
