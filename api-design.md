# API Design

> NestJS REST API ที่ `apps/api`
> Base URL: `/api/v1` — versioned path

## 1. Conventions

### URL
- Plural kebab-case: `/purchase-requests`, `/budget-sources`
- Custom action: `/purchase-requests/:id/submit` (verb หลัง ID)
- Nested เฉพาะที่จำเป็น: `/purchase-requests/:id/items` แทน `/purchase-request-items?prId=`

### HTTP method
| Method | ใช้กับ |
|--------|-------|
| GET | อ่าน |
| POST | สร้าง · trigger action |
| PATCH | แก้บางส่วน (default สำหรับ update) |
| PUT | แทนทั้ง resource (ใช้น้อย) |
| DELETE | ลบ (soft delete) |

### Status code
- 200 — สำเร็จ + body
- 201 — สร้างใหม่ + body + `Location` header
- 204 — สำเร็จ ไม่มี body (delete, logout)
- 400 — validation error
- 401 — ไม่ได้ login
- 403 — login แล้วแต่ไม่มีสิทธิ์
- 404 — ไม่พบ
- 409 — state conflict (เช่น submit ซ้ำ)
- 422 — business rule fail (งบไม่พอ, doc_no ชน)
- 429 — rate limit
- 500 — server error

### Response envelope
**สำหรับ list:**
```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 142,
    "totalPages": 8
  }
}
```

**สำหรับ single resource:**
```json
{ "data": { ... } }
```

**สำหรับ error (RFC 7807-style):**
```json
{
  "error": {
    "code": "BUDGET_INSUFFICIENT",
    "message": "งบประมาณคงเหลือไม่พอ",
    "details": [
      { "field": "budgetId", "message": "remaining 6,300 < requested 12,500" }
    ],
    "traceId": "req_a1b2c3"
  }
}
```

`code` คือ enum string ตายตัว (frontend ใช้ตัดสินใจ); `message` ภาษาไทย; `details` optional

### Pagination
Query: `?page=1&pageSize=20` — pageSize max 100; default 20

### Filtering
Query string ตรง field: `?status=SUBMITTED&projectId=xxx&dateFrom=2025-01-01&dateTo=2025-12-31`
Search: `?q=keyword`
Sort: `?sort=-createdAt,docNo` (`-` = desc)

### Field selection (optional)
`?fields=id,docNo,status` — server return เฉพาะ field ที่ขอ

### Auth
- Cookie httpOnly: `aim_session` (access token, 15 min)
- Cookie httpOnly: `aim_refresh` (refresh token, 7 day)
- Header: `X-CSRF-Token` ส่งกลับมาทุก mutation
- ทุก response set `X-Trace-Id`

### Idempotency
Header `Idempotency-Key: <uuid>` สำหรับ POST ที่ retry ได้ (submit, payment) — server cache 24h

### Rate limit
- Auth: 10/min/IP
- AI endpoints: 30/min/user
- Default: 120/min/user

## 2. Auth Endpoints

| Method | Path | Body | สิทธิ์ |
|--------|------|------|--------|
| POST | `/auth/login` | `{ email, password }` | public |
| POST | `/auth/refresh` | — (cookie) | public |
| POST | `/auth/logout` | — | logged-in |
| GET | `/auth/me` | — | logged-in |
| POST | `/auth/change-password` | `{ oldPassword, newPassword }` | self |

**`POST /auth/login` response:**
```json
{
  "data": {
    "user": {
      "id": "ckxxx",
      "email": "teacher@school.ac.th",
      "fullName": "สมชาย ใจดี",
      "schoolId": "ckyyy",
      "roles": ["REQUESTER"]
    }
  }
}
```
Set cookies: `aim_session`, `aim_refresh`

## 3. Phase 0 — Foundation Endpoints

### 3.1 Schools (admin)
```
GET    /schools                      ADMIN
GET    /schools/:id                  ADMIN, member of school
PATCH  /schools/:id                  ADMIN
```

### 3.2 Users
```
GET    /users                        ADMIN, DIRECTOR (limit to own school)
POST   /users                        ADMIN
GET    /users/:id                    ADMIN, DIRECTOR, self
PATCH  /users/:id                    ADMIN, self (limited fields)
DELETE /users/:id                    ADMIN
POST   /users/:id/roles              ADMIN  body: { role: "PROCUREMENT" }
DELETE /users/:id/roles/:role        ADMIN
```

### 3.3 Audit Logs (read-only)
```
GET /audit-logs?entityType=&entityId=&userId=&dateFrom=&dateTo=
   AUDITOR, DIRECTOR
GET /audit-logs/:id   AUDITOR, DIRECTOR
```

### 3.4 Rule Configs
```
GET   /rule-configs                  any logged-in (read สำหรับใช้คำนวณ)
GET   /rule-configs/:key             any logged-in
PUT   /rule-configs/:key             ADMIN, DIRECTOR
   body: { value: { ... } }
```

## 4. Phase 1 — Purchase Request Endpoints

### 4.1 List & detail
```
GET /purchase-requests
   ?status=&requesterId=&projectId=&q=&page=&pageSize=&sort=
   - REQUESTER เห็นเฉพาะของตัวเอง
   - PROCUREMENT เห็นทั้งโรงเรียน
   - DIRECTOR/AUDITOR เห็นทุกอัน
GET /purchase-requests/:id
   - includes: items, attachments, riskFlags (counts)
   - ?expand=items,specifications,riskFlags  เพื่อ inline สาขา
```

### 4.2 Mutations (CRUD)
```
POST /purchase-requests                       REQUESTER
   body: {
     title, reason,
     projectId?, budgetId?,
     items: [{ name, quantity, unit, unitPriceEst?, rawText?, specifications?: [...] }]
   }
   → 201 { data: PurchaseRequest } status=DRAFT

PATCH /purchase-requests/:id                  REQUESTER (own, status DRAFT/RETURNED)
   body: partial fields

DELETE /purchase-requests/:id                 REQUESTER (own, status DRAFT only) → soft delete
```

### 4.3 Items (nested)
```
POST   /purchase-requests/:id/items           REQUESTER (own, draft/returned)
PATCH  /purchase-requests/:id/items/:itemId
DELETE /purchase-requests/:id/items/:itemId
PUT    /purchase-requests/:id/items           REQUESTER  bulk replace (สำหรับ AI parser apply)
   body: { items: [...] }
```

### 4.4 Specifications (nested)
```
GET    /purchase-request-items/:itemId/specifications
POST   /purchase-request-items/:itemId/specifications
PATCH  /specifications/:specId
DELETE /specifications/:specId
```

### 4.5 State transitions (custom action)
```
POST /purchase-requests/:id/submit           REQUESTER (own)
   - DRAFT/RETURNED → SUBMITTED
   - generates docNo
   - kicks AI cloudiness check (background)

POST /purchase-requests/:id/withdraw         REQUESTER (own, status SUBMITTED)
   - → CANCELLED

POST /purchase-requests/:id/claim            PROCUREMENT
   - SUBMITTED → REVIEWING

POST /purchase-requests/:id/return           PROCUREMENT
   body: { reason, items?: [{ itemId, comment }] }
   - REVIEWING → RETURNED

POST /purchase-requests/:id/approve-for-comparison  PROCUREMENT
   - REVIEWING → APPROVED_FOR_COMPARISON
```

### 4.6 Attachments
```
POST   /purchase-requests/:id/attachments  multipart/form-data (file)
GET    /attachments/:id                    redirect / proxy ดาวน์โหลด
DELETE /attachments/:id
```

### 4.7 Risk flags
```
GET  /purchase-requests/:id/risk-flags
POST /purchase-requests/:id/risk-flags/:flagId/dismiss
   body: { reason }
   PROCUREMENT, DIRECTOR
```

### 4.8 Export
```
GET /purchase-requests/:id/export?format=pdf|xlsx
   → 200 application/pdf | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
   - Content-Disposition: attachment; filename="PR-2568-0001.pdf"
```

## 5. AI Endpoints

ทุก endpoint:
- log ลง `ai_invocations`
- มี rate limit 30/min/user
- response มี field `invocationId` ให้ frontend อ้างได้

### 5.1 Parse items
```
POST /ai/parse-items                         REQUESTER, PROCUREMENT
body (one of):
  { type: "text", content: "ปากกาน้ำเงิน 10 ด้าม กระดาษ A4 5 รีม" }
  { type: "excel", attachmentId: "ckxxx" }
  { type: "csv",   content: "..." }
response:
  {
    data: {
      invocationId: "ckaaa",
      items: [
        { name: "ปากกา", quantity: 10, unit: "ด้าม", confidence: 0.92, rawText: "..." },
        ...
      ]
    }
  }
```

### 5.2 Cloudiness check (sync, lightweight)
```
POST /ai/check-cloudiness                    PROCUREMENT
body: { purchaseRequestId }
response: { data: { invocationId, flags: [{ itemId, type, severity, message }] } }
   - ฝั่ง server เขียน flags ลง ai_risk_flags อัตโนมัติ
```

### 5.3 Spec writer (Phase 2)
```
POST /ai/spec-writer                         PROCUREMENT
body: { itemId }
response: {
  data: {
    invocationId,
    suggestions: [
      { key, value, level, source: "AI", confidence },
      ...
    ],
    riskFlags: [
      { type: "BRAND_LOCK", message: "...", word: "Lenovo" }
    ]
  }
}
```

### 5.4 Classify (Phase 2)
```
POST /ai/classify-item                       PROCUREMENT
body: { itemId | name, specifications? }
response: { data: { invocationId, classifiedType: "ASSET", confidence: 0.88, reason: "..." } }
```

### 5.5 Compare summarize (Phase 3)
```
POST /ai/compare-summary                     PROCUREMENT
body: { purchaseRequestId, recommendVendorId }
response: { data: { invocationId, summary: "...", risks: [...] } }
```

### 5.6 Audit assistant (Phase 5)
```
POST /ai/audit-scan                          AUDITOR, DIRECTOR
body: { purchaseRequestId }
response: { data: { invocationId, findings: [{ severity, message, evidence }] } }
```

## 6. Phase 2 — Budget Endpoints

```
# Projects
GET   /projects?fiscalYear=&active=
POST  /projects                              PROJECT_OWNER, DIRECTOR
GET   /projects/:id
PATCH /projects/:id
DELETE /projects/:id                         (soft, only if no PR linked)

# Budget sources
GET   /budget-sources
POST  /budget-sources                        ADMIN, FINANCE
PATCH /budget-sources/:id

# Budgets (per project + source + fiscal year)
GET   /budgets?projectId=&fiscalYear=&sourceId=
POST  /budgets                               FINANCE
GET   /budgets/:id            includes: { allocated, held, committed, spent, remaining }
PATCH /budgets/:id                           FINANCE (audit trail bigtime)
GET   /budgets/:id/movements
POST  /budgets/:id/adjust                    FINANCE
   body: { amount, notes }   → BudgetMovement type=ADJUST

# Validate (called by frontend when picking project)
POST  /budgets/check
   body: { budgetId, amount }
   response: { data: { ok: true, remaining: 6300 } }
       or:    { error: { code: "BUDGET_INSUFFICIENT", ... } }
```

## 7. Phase 3 — Vendor / Quotation / Approval / Documents

### 7.1 Vendors
```
GET   /vendors?q=&active=
POST  /vendors                               PROCUREMENT
PATCH /vendors/:id
DELETE /vendors/:id
```

### 7.2 Quotations
```
GET   /purchase-requests/:id/quotations
POST  /purchase-requests/:id/quotations      PROCUREMENT
   body: {
     vendorId, quoteNo?, quoteDate?, totalAmount, shippingFee?, source,
     items: [{ prItemId?, description, quantity, unit, unitPrice }]
   }
PATCH /quotations/:id
DELETE /quotations/:id
POST  /quotations/import                     PROCUREMENT
   multipart: file=PDF/IMG/XLSX, vendorId, prId
   → run OCR → returns parsed preview { data: { ... }, requiresConfirmation: true }
POST  /quotations/:id/confirm-import         PROCUREMENT
   body: { items, totalAmount, ... }   (after manual edit)
```

### 7.3 Price snapshots
```
POST /price-snapshots
   body: { productKey, source, sourceUrl?, price, capturedAt, evidenceFile? }
GET  /price-snapshots?productKey=&dateFrom=&dateTo=
```

### 7.4 Comparison
```
GET /purchase-requests/:id/comparison
   response: {
     data: {
       items: [{ prItemId, name, candidates: [{ vendorId, unitPrice, specMatch, totalPrice }] }],
       summary: { totals, recommended: vendorId? }
     }
   }
```

### 7.5 Approval workflow
```
GET   /approval-workflows                    DIRECTOR, ADMIN
POST  /approval-workflows                    DIRECTOR
PATCH /approval-workflows/:id

GET   /purchase-requests/:id/approval-actions
POST  /purchase-requests/:id/start-approval  PROCUREMENT
   - APPROVED_FOR_COMPARISON → PENDING_APPROVAL
   - resolve workflow + create pending steps
POST  /purchase-requests/:id/decide          (role determined by current step)
   body: { decision: "APPROVED|RETURNED|REJECTED|COMMENTED", comment?, attachmentId? }
   - records ApprovalAction
   - if last step + APPROVED → status APPROVED + budget COMMIT
```

### 7.6 Documents
```
GET   /document-templates                    PROCUREMENT, ADMIN
POST  /document-templates                    ADMIN
PATCH /document-templates/:id

GET   /purchase-requests/:id/documents
POST  /purchase-requests/:id/documents       PROCUREMENT
   body: { templateId, payload }
   → renders + stores PDF
GET   /procurement-documents/:id
GET   /procurement-documents/:id/pdf         download
POST  /procurement-documents/:id/regenerate
```

## 8. Phase 4 — Receiving / Inventory / Asset / Payment

### 8.1 Receiving
```
GET   /purchase-requests/:id/receivings
POST  /purchase-requests/:id/receivings      INSPECTOR, PROCUREMENT
   body: { receivedAt, items: [{ prItemId, quantityReceived, defective?, specPass?, notes? }], committee? }
PATCH /receivings/:id
POST  /receivings/:id/complete               INSPECTOR
   - ตรวจรับครบ → triggers inventory upsert + asset register prompts
```

### 8.2 Inventory (วัสดุ)
```
GET   /inventory-items?q=&category=
POST  /inventory-items                       PROCUREMENT
PATCH /inventory-items/:id
GET   /inventory-items/:id/movements
POST  /inventory-items/:id/issue             PROCUREMENT  body: { quantity, refType, refId, notes }
POST  /inventory-items/:id/adjust            PROCUREMENT
```

### 8.3 Assets (ครุภัณฑ์)
```
GET   /assets?q=&status=&responsibleUserId=
POST  /assets                                PROCUREMENT
   body: { name, category, brand?, model?, ..., prItemId? }
PATCH /assets/:id
POST  /assets/:id/transfer                   PROCUREMENT
   body: { responsibleUserId, location, notes? }
POST  /assets/:id/maintenance                PROCUREMENT
   body: { date, type, cost?, notes? }
GET   /assets/:id/qr                         returns PNG of QR code
```

### 8.4 Payments
```
GET  /purchase-requests/:id/payments
POST /purchase-requests/:id/payments         FINANCE
   body: { voucherNo?, amount, paymentMethod, paidAt?, payeeVendorId?, evidenceFile? }
PATCH /payments/:id                          FINANCE
POST  /payments/:id/mark-paid                FINANCE
   body: { voucherNo, paidAt, evidenceFile }
   - status PAID → BudgetMovement type=SPEND
```

## 9. Phase 5 — Dashboards

```
GET /dashboard/director?fiscalYear=
   response: {
     data: {
       requestsByStatus: { ... },
       budgetUsed: { allocated, spent, remaining },
       riskCount: { high, medium, low },
       overdueReceiving: 3,
       pendingApprovals: 5
     }
   }

GET /dashboard/procurement
GET /dashboard/finance
```

## 10. Common Error Codes

| code | HTTP | คำอธิบาย |
|------|------|---------|
| `UNAUTHENTICATED` | 401 | ไม่ได้ login / token หมดอายุ |
| `FORBIDDEN` | 403 | role ไม่อนุญาต |
| `NOT_FOUND` | 404 | resource ไม่พบ |
| `VALIDATION_ERROR` | 400 | zod/class-validator fail |
| `INVALID_STATE_TRANSITION` | 409 | เช่น submit ของ DRAFT ที่ submit ไปแล้ว |
| `BUDGET_INSUFFICIENT` | 422 | งบเหลือไม่พอ |
| `BRAND_LOCK_DETECTED` | 422 | spec มีคำเสี่ยง — ต้อง confirm |
| `MISSING_REQUIRED_DOC` | 422 | เอกสารยังไม่ครบตาม rule |
| `DUPLICATE_DOC_NO` | 409 | doc_no ชน |
| `AI_PROVIDER_ERROR` | 502 | Claude API fail |
| `AI_RATE_LIMITED` | 429 | เกิน quota |
| `OCR_FAILED` | 422 | OCR ผลพอใช้ไม่ได้ |
| `IDEMPOTENCY_KEY_REUSED` | 409 | key ซ้ำกับ request เก่า |

## 11. NestJS Module Structure (`apps/api/src`)

```
src/
├── main.ts
├── app.module.ts
├── config/                      # ConfigModule + env validation
├── common/
│   ├── decorators/              # @Roles, @CurrentUser, @CurrentSchool
│   ├── guards/                  # JwtAuthGuard, RolesGuard
│   ├── interceptors/            # AuditInterceptor, TransformInterceptor
│   ├── filters/                 # AllExceptionsFilter (เป็น envelope)
│   ├── pipes/                   # ZodValidationPipe
│   └── utils/                   # docNumber, money, paginate
├── prisma/                      # PrismaModule + service singleton
├── auth/
│   ├── auth.module.ts
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── strategies/              # JwtStrategy, RefreshStrategy
│   └── dto/
├── users/
├── audit-logs/
├── rule-configs/
├── ai/
│   ├── ai.module.ts
│   ├── anthropic.service.ts     # client singleton + prompt cache
│   ├── prompts/                 # parse-items, spec-writer, ...
│   ├── parse-items.service.ts
│   ├── spec-writer.service.ts
│   └── ai.controller.ts
├── purchase-requests/
│   ├── pr.controller.ts
│   ├── pr.service.ts            # state machine here
│   ├── pr-state.ts              # transition map
│   ├── items.controller.ts
│   ├── items.service.ts
│   └── dto/
├── projects/
├── budgets/
│   ├── budgets.service.ts
│   └── budget-mover.service.ts  # HOLD/RELEASE/COMMIT/SPEND helper
├── vendors/
├── quotations/
├── approvals/
├── documents/
│   ├── templates.controller.ts
│   ├── render.service.ts        # handlebars + Puppeteer
│   └── pdf.service.ts
├── receivings/
├── inventory/
├── assets/
├── payments/
└── dashboard/
```

## 12. Cross-cutting NestJS bits

### Guards
- `JwtAuthGuard` — global, except `/auth/login`, `/healthz`
- `RolesGuard` + `@Roles('PROCUREMENT', 'DIRECTOR')`
- `SchoolScopeGuard` — ตรวจว่า resource ที่ขอ อยู่ใน schoolId เดียวกับ user

### Interceptors
- `TransformInterceptor` — wrap response → `{ data: ... }`
- `AuditInterceptor` — เขียน `audit_logs` ทุก mutation (POST/PATCH/PUT/DELETE) อัตโนมัติ
  - อ่าน metadata `@AuditAction('purchase_request.submit')`
  - capture ก่อน-หลังจาก service return value

### Pipes
- `ZodValidationPipe` — รับ schema จาก `packages/shared`

### Filters
- `AllExceptionsFilter` — แปลง exception → error envelope, log + traceId

### State machine pattern
ทุก mutation ที่เปลี่ยน status ของ PurchaseRequest **ต้อง** เรียกผ่าน method service เฉพาะ:
```ts
class PurchaseRequestService {
  async submit(id, user) { ... }       // checks DRAFT/RETURNED → SUBMITTED
  async claim(id, user) { ... }        // checks SUBMITTED → REVIEWING
  async return(id, user, reason) { ... }
  async approveForComparison(id, user) { ... }
  // ...
}
```
Controller ห้ามเรียก `prisma.purchaseRequest.update({ data: { status } })` ตรง — ต้อง throw ถ้าทำ

### Background jobs
- **BullMQ** (Redis) สำหรับ AI cloudiness check, OCR, PDF render
- Queue: `ai`, `ocr`, `pdf`
- Worker process แยก หรือใน api process เดียวกันก็ได้ใน MVP 1

## 13. Versioning
- ใช้ URL prefix `/api/v1`; major bump ก็เพิ่ม `/v2` ขนานกัน
- Field deprecation: เก็บไว้ + เพิ่ม `Deprecation` header

## 14. ที่ยังต้องตัดสินใจ

- **CSRF strategy:** double-submit cookie หรือ SameSite=Strict ก็พอ?
- **File upload limit:** 25MB ต่อไฟล์ (เริ่ม) — ตำแหน่งเก็บ?
- **Webhook** สำหรับ LINE OA / e-mail แจ้งเตือน — Phase 5
- **OpenAPI spec:** generate จาก NestJS Swagger module เพื่อให้ frontend type-check ได้ — ทำตั้งแต่ Phase 0
