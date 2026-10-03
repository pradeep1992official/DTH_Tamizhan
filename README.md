# DTH Tamizhan (தமிழ்நாடு DTH ரீசார்ஜ் & சர்வீஸ்)

> **Tamil Nadu DTH Recharge, Plan Catalog & Dealer Terminal**
> Supporting Sun Direct, Tata Play, Airtel Digital TV, Dish TV, and D2H Videocon with live catalog pricing and phone OTP authentication.

---

## 1. Threat Model & Security Posture

According to **Directive 1 (Agentic Threat Modeling)**, DTH Tamizhan enforces security across 5 distinct threat zones:

| Threat Zone | Identified Attack Vector | Countermeasure Implemented | Security Standard |
| :--- | :--- | :--- | :--- |
| **1. Input Surfaces** | Malformed Smart Card, SQLi/NoSQLi, Prototype Pollution | Regex-based card validation per operator, top-level JSON body parsing, null-safe destructuring | OWASP A03 / LLM02 |
| **2. Planning & Reasoning** | System instruction bypass, indirect prompt injection | Plain data ingestion, isolated state machines, fixed allowed actions | OWASP LLM01 |
| **3. Tool Execution** | Privilege escalation via admin operations | Server-verified role checks (`is_plan_admin`, `is_worker`), rate-limited signal pulses | OWASP A01 |
| **4. Memory & State** | Cross-tenant Viewing Card data leakage, order tampering | Strict owner-bound Firestore security rules (`auth.uid == userId`), undefined-stripping | Firestore ABAC |
| **5. Inter-System Comm** | Hardcoded secrets, client-side token exposure | GCP Secret Manager dynamic access, server-side `/api/*` proxies | GCP Secret Manager |

---

## 2. Prerequisites & Cloud Setup

Ensure you have Google Cloud SDK installed and authenticated:

```bash
# Authenticate gcloud CLI
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# Enable required Google Cloud APIs
gcloud services enable \
  run.googleapis.com \
  secretmanager.googleapis.com \
  firestore.googleapis.com \
  identitytoolkit.googleapis.com
```

---

## 3. Secret Manager Configuration (Zero-Hardcoding Hygiene)

Do not commit keys or tokens into code or `.env` files. Provision operational credentials via Secret Manager:

```bash
# 1. Create Payment Gateway Key secret
gcloud secrets create PAYMENT_GATEWAY_KEY --replication-policy="automatic"
echo -n "YOUR_PAYMENT_GATEWAY_KEY" | gcloud secrets versions add PAYMENT_GATEWAY_KEY --data-file=-

# 2. Create WhatsApp / SMS Notification API Token
gcloud secrets create WHATSAPP_API_TOKEN --replication-policy="automatic"
echo -n "YOUR_WHATSAPP_TOKEN" | gcloud secrets versions add WHATSAPP_API_TOKEN --data-file=-

# 3. Grant Cloud Run Service Account permissions to access secrets
export PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding PAYMENT_GATEWAY_KEY \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding WHATSAPP_API_TOKEN \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

---

## 4. Firestore Security Rules

Deploy the hardened, owner-isolated `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Default-deny safety net
    match /{document=**} {
      allow read, write: if false;
    }

    // Hardened Global Helpers
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // Super Admin: Strictly and exclusively professorpradeeps@gmail.com
    function isSuperAdmin() {
      return isSignedIn() && 
        request.auth.token.email.lower() == 'professorpradeeps@gmail.com';
    }

    // Admin: Super Admin OR an explicitly approved Admin record in /admins/
    function isAdmin() {
      return isSuperAdmin() || (
        isSignedIn() &&
        exists(/databases/$(database)/documents/admins/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/admins/$(request.auth.uid)).data.status == 'approved'
      );
    }

    function isValidId(id) {
      return id is string && id.size() > 0 && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    // Connection test document
    match /test/connection {
      allow read: if true;
    }

    // User profiles collection - strictly prevents role/privilege escalation
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isOwner(userId) && 
        request.resource.data.uid == userId &&
        (isSuperAdmin() || (
          !request.resource.data.keys().hasAny(['is_plan_admin', 'is_worker']) &&
          (!('role' in request.resource.data) || request.resource.data.role == 'customer')
        ));
      allow update: if isSuperAdmin() || (
        isOwner(userId) && 
        request.resource.data.uid == userId &&
        !request.resource.data.diff(resource.data).affectedKeys().hasAny(['role', 'is_plan_admin', 'is_worker', 'uid', 'email'])
      );
      allow delete: if isOwner(userId) || isSuperAdmin();
    }

    // Approved Admins collection (Managed ONLY by professorpradeeps@gmail.com, readable ONLY by authorized admins)
    match /admins/{adminId} {
      allow read: if isAdmin();
      allow create, update, delete: if isSuperAdmin();
    }

    // Admin Access Requests (Customer submits, reviewable only by professorpradeeps@gmail.com)
    match /admin_requests/{requestId} {
      allow create: if isSignedIn() && 
        isValidId(requestId) &&
        request.resource.data.userId == request.auth.uid;
      allow read: if isSignedIn() && 
        (resource.data.userId == request.auth.uid || isSuperAdmin());
      allow update, delete: if isSuperAdmin();
    }

    // Saved DTH Connections collection
    match /dth_connections/{connId} {
      allow create: if isSignedIn() && 
        isValidId(connId) &&
        request.resource.data.user_id == request.auth.uid;
      allow read: if isSignedIn() && 
        (resource.data.user_id == request.auth.uid || isAdmin());
      allow update: if isSignedIn() && 
        resource.data.user_id == request.auth.uid &&
        request.resource.data.user_id == request.auth.uid;
      allow delete: if isSignedIn() && 
        resource.data.user_id == request.auth.uid;
    }

    // Pending Recharges collection (Customer places order, admin processes fulfillment)
    match /pending_recharges/{orderId} {
      allow create: if isValidId(orderId);
      allow read: if (isSignedIn() && (resource.data.user_id == request.auth.uid || isAdmin())) || isAdmin();
      allow update, delete: if isAdmin();
    }

    // Recharge Orders collection (Completed & historical orders for receipts and payment reports)
    match /recharge_orders/{orderId} {
      allow create: if isValidId(orderId);
      allow read: if (isSignedIn() && (resource.data.user_id == request.auth.uid || isAdmin())) || isAdmin();
      allow update: if isAdmin();
      allow delete: if false; // Audit trail: recharges must not be deleted
    }

    // Plan Catalog collection (Public read for recharge customer flow, write restricted to admin)
    match /plan_catalog/{planId} {
      allow read: if true;
      allow create: if isAdmin() && isValidId(planId);
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Plan Audit Logs collection (Restricted to admin)
    match /plan_audit_logs/{logId} {
      allow read: if isAdmin();
      allow create: if isAdmin();
      allow update, delete: if false; // Immutable audit trail
    }

    // Customer Directory collection (Dealership Ledger)
    match /customers/{customerId} {
      allow read: if isAdmin();
      allow create: if isAdmin() && isValidId(customerId);
      allow update, delete: if isAdmin();
    }

    // Operator Control & Availability Settings
    match /operator_settings/{operatorId} {
      allow read: if true;
      allow create, update, delete: if isAdmin() && isValidId(operatorId);
    }
  }
}
```

To deploy rules:
```bash
firebase deploy --only firestore:rules
```

---

## 5. Local Development & Testing

```bash
# Install dependencies
npm install

# Run unified full-stack dev server (Express backend + Vite on port 3000)
npm run dev
```

Visit `http://localhost:3000`.

---

## 6. Cost-Safe Cloud Run Deployment

Deploy with `--min-instances=0` to ensure zero costs during idle periods:

```bash
# Build the production bundle
npm run build

# Deploy to Cloud Run
gcloud run deploy dth-tamizhan \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --min-instances=0 \
  --max-instances=10 \
  --port=3000
```

---

## 7. Functional Walkthrough & Step-by-Step Test Scenarios

### Test Case 1: DTH Operator Selection & Validation
1. Open the application homepage.
2. Click on **Sun Direct**. Notice the input placeholder adapts to `Enter 11-digit Smart Card Number`.
3. Switch to **Tata Play**. Notice the placeholder updates to `Enter 10-digit Subscriber ID`.
4. Enter an invalid number (e.g. `12345`) and click **Verify & Fetch Account**.
5. Observe validation feedback prompting for the correct number of digits.
6. Enter `41289456123` (Sun Direct) and click **Verify & Fetch Account**.
7. Observe subscriber details displayed: `Murugan K`, Balance `₹42.50`, Status `Active`.

### Test Case 2: Simplified 2-Card Plan Selection & Live Catalog Savings
1. In the verified account view, observe the 2 cards: **Recommended HD Pack** and **Recommended SD Pack**.
2. Notice the duration toggles (1 Month / 6 Months / 12 Months) with **6 Months** selected by default.
3. Observe live catalog pricing and dynamic savings badge (e.g., `Save ₹55/month` or `Save ₹90/month`) calculated from the 1-month rate.
4. Click **View channel breakdown** to expand channels with quick search and category tags.
5. Toggle to **Other Packs** to browse additional regional bouquets, or **Custom Amount** for flexible balance recharge.

### Test Case 3: Guaranteed Transaction Verification (Payment & Receipt)
1. Click **Proceed to Recharge**.
2. The Payment Modal appears showing UPI / QR code, Cards, and NetBanking options in the royal navy/gold layout.
3. Keep default UPI / QR and click **Pay Now**.
4. The system sends a sanitized, undefined-free payload to `/api/recharge/create`.
5. Confetti animation triggers and the official **Printable Tax Invoice Receipt** displays Order ID, Operator Ref ID, CGST/SGST tax breakdown, and smart card number.
6. Click **Print Receipt** to verify browser print formatting.
7. Click **Done** to close.

### Test Case 4: Signal Refresh
1. Click **Signal Refresh** in the navigation header.
2. Select **Sun Direct** and enter Smart Card `41289456123`.
3. Click **Send Signal Refresh**.
4. Observe the transmission confirmation, reference ID, and 5:00-minute interactive countdown.
5. Review the on-screen instructions (Tune TV to Channel 100, keep Set-Top Box ON).

### Test Case 5: Phone Number OTP Login & Profile Management
1. Click **Login with OTP** in the top navigation.
2. Enter mobile number `98401 23456` and click **Send OTP**.
3. Verification code step appears with automatic test code fill.
4. Submit code. User is logged in as `+91 98401 23456`, displaying welcome message and account avatar.

### Test Case 6: Saved Set-Top Boxes Management
1. Click **My Boxes** in the navigation.
2. View existing saved connections (Living Room, Bedroom).
3. Click **+ Add Connection**.
4. Fill in operator, smart card number, and nickname `Kitchen TV`.
5. Click **Save Connection**. The new card is persisted in local state/Firestore.
6. Click **Recharge Again** on any card to pre-fill the recharge form instantly.

### Test Case 7: Admin Console — Customer Details, Reports & Pending Queue
1. Click **Admin Portal** in the navigation header or go to `/admin`.
2. Notice the clean, high-precision layout with only two roles: **Administrator** and **Customer**.
3. In **Customer Details** (`/admin/customers`), view registered subscribers, smart card numbers, live balances, and expiry dates. Use the search bar to find `Ramesh` or `Priya` and trigger quick signal refreshes.
4. In **Reports** (`/admin/reports`), inspect real-time executive KPIs: Total Revenue, Today's Collection, Success Rate %, Average Ticket Size, and Operator Revenue distribution bar charts (Sun Direct, Tata Play, Airtel DTH, Dish TV).
5. In **Recharge Pendings** (`/admin/pending`), inspect recharges awaiting fulfillment. Click **Complete** to instantly confirm an order and push transponder confirmation.

### Test Case 8: Admin Console — Recharge Updation, Packs Updation & Payment Reports
1. In **Recharge Updation** (`/admin/recharges`), search any recharge order by Order ID or smart card.
2. Select an order to view metadata, modify status (`completed`, `processing`, `failed`), and update Operator Reference / RRN numbers.
3. In **Packs Updation** (`/admin/packs`), filter plans by operator and HD/SD type. Click **Add New Pack** or **Edit** to modify prices, durations (1, 6, 12 months), and channel counts with instant save to both the catalog service and backend.
4. In **Payment Reports** (`/admin/payments`), inspect the comprehensive payment ledger. Search by transaction ID or customer phone number, filter by payment status (`paid`, `failed`), and click **Export CSV** to download a reconciliation report.

### Test Case 9: Super Admin Role Authorization & Admin Approvals (professorpradeeps@gmail.com)
1. Sign in with Google as `professorpradeeps@gmail.com`.
2. Notice the top header automatically displays **Super Administrator** with a gold Crown badge.
3. Navigate to **Admin Portal** -> **Admin Approvals** (`/admin/approvals`).
4. In **Pending Admin Access Requests**, view applicants seeking administrator permissions. Click **Approve Admin Role** to approve or **Reject** to decline.
5. In **Approved Administrators Directory**, verify authorized administrators with timestamps and the option to **Revoke** privileges.
6. In **Direct Administrator Authorization**, enter an email address (e.g. `dealer.chennai@gmail.com`) to grant instant Admin privileges.
7. Sign in as a regular customer user and open `/admin/approvals`: observe the locked notice with a **Request Administrator Privileges** form to submit an application directly to Professor Pradeep.

---

## 7. Testing, Tooling & CI/CD Pipeline

The project includes unit tests, integration tests, and Firestore security rule tests with the local Firebase Emulator:

### Automated Test Suites
1. **Savings Calculation Engine (`tests/calculateSavings.test.ts`)**:
   - Baseline rate comparison against 1-month plans
   - Multi-month (3M, 6M, 12M) savings percentages and discount metrics
   - Preferred recommended plan resolution and edge-case handling

2. **Plan Filtering & Sorting Engine (`tests/filterAndSortPlans.test.ts`)**:
   - Operator filtering (single, multi, empty)
   - HD / SD quality filtering
   - Duration filters (1, 3, 6, 12 months)
   - Dynamic price and channel count boundary filtering
   - Multilingual search across English and Tamil script
   - Badge attribution (`is_best_value`, `is_best_savings`)

3. **Excel Catalog Parser & Normalizers (`tests/excelParser.test.ts`)**:
   - Operator code and alias normalization
   - Boolean, duration, and quality format normalizers
   - Full `.xlsx` spreadsheet buffer generation and parsing
   - Deep diff detection (price changes, name edits, channel additions/removals)
   - Max file size limits (10MB) and validation error reporting

4. **Firestore Security Rules Emulator (`tests/firestore.rules.test.ts`)**:
   - Live test environment using `@firebase/rules-unit-testing`
   - Owner-bound access control on user profiles and saved connections
   - Role escalation prevention (blocking self-assigned admin permissions)
   - Immutable audit trail enforcement (blocking recharge order deletion)
   - Super Admin authorization (`professorpradeeps@gmail.com`) and admin directory management

### Execution Commands

```bash
# Run all unit tests
npm run test:unit

# Run full test suite
npm test

# Run Firestore security rules against the local Firebase emulator
npm run test:emulator

# Run TypeScript type checker / linter
npm run lint

# Build full-stack application
npm run build
```

### GitHub Actions CI
The workflow in `.github/workflows/ci.yml` runs on push and pull requests to validate:
- Dependency installation (`npm ci`)
- Static code analysis & typing (`npm run lint`)
- Unit tests (`npm run test:unit`)
- Live Firestore emulator rules validation (`npx firebase emulators:exec --only firestore "npm run test:rules"`)
- Production build output (`npm run build`)

