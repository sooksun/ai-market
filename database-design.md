# Database Design

> Prisma schema สำหรับ MariaDB/MySQL — อยู่ที่ `packages/db/prisma/schema.prisma`
> เน้น MVP 1–3 (Phase 4–5 ระบุโครงคร่าว)

## 1. Conventions

- **ID:** `cuid()` ทุกตาราง (string) — ไม่ใช้ auto-increment เพื่อให้ generate ฝั่ง client ได้ + ปลอด enumeration
- **เวลา:** `createdAt`, `updatedAt` ทุกตาราง (UTC); `deletedAt` สำหรับ soft delete
- **Multi-tenant:** ทุกตาราง business มี `schoolId` (index แรกสุดของทุก composite index)
- **ชื่อ:** Prisma model = PascalCase singular (`PurchaseRequest`); column = camelCase; `@@map` กลับเป็น snake_case ใน DB
- **Enum:** ใช้ Prisma enum ทุกที่ที่ค่ามีจำกัด (status, role, ...) ห้าม free-text
- **Money:** `Decimal(15, 2)` หน่วยบาท — ห้ามใช้ float
- **JSON:** ใช้ `Json` type สำหรับ payload AI / rule_configs / before-after audit
- **Soft delete:** filter ทุก query ด้วย `deletedAt: null` ผ่าน Prisma middleware
- **Index:** ทุก FK + ทุก column ที่ filter บ่อย (status, schoolId, createdAt)

## 2. Schema (ครบ Phase 0–4)

```prisma
// packages/db/prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

// ─────────────────────────────────────────────
// Phase 0 — Foundation
// ─────────────────────────────────────────────

model School {
  id        String   @id @default(cuid())
  name      String
  shortName String?  @map("short_name")
  taxId     String?  @map("tax_id")
  address   String?  @db.Text
  phone     String?
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  users             User[]
  rules             RuleConfig[]
  projects          Project[]
  budgetSources     BudgetSource[]
  budgets           Budget[]
  vendors           Vendor[]
  purchaseRequests  PurchaseRequest[]
  auditLogs         AuditLog[]
  receivings        ReceivingRecord[]
  inventoryItems    InventoryItem[]
  assets            AssetRegister[]
  payments          PaymentRecord[]

  @@map("schools")
}

model User {
  id          String   @id @default(cuid())
  schoolId    String   @map("school_id")
  email       String   @unique
  passwordHash String  @map("password_hash")
  fullName    String   @map("full_name")
  phone       String?
  active      Boolean  @default(true)
  lastLoginAt DateTime? @map("last_login_at")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  school     School     @relation(fields: [schoolId], references: [id])
  roles      UserRole[]
  // back-relations
  purchaseRequests   PurchaseRequest[]  @relation("RequesterRequests")
  approvalActions    ApprovalAction[]
  auditLogs          AuditLog[]
  ruleUpdates        RuleConfig[]       @relation("RuleUpdater")

  @@index([schoolId])
  @@map("users")
}

enum Role {
  REQUESTER
  PROJECT_OWNER
  PROCUREMENT
  FINANCE
  INSPECTOR
  DIRECTOR
  AUDITOR
  ADMIN
}

model UserRole {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  role      Role
  createdAt DateTime @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, role])
  @@map("user_roles")
}

model AuditLog {
  id         String   @id @default(cuid())
  schoolId   String?  @map("school_id")
  userId     String?  @map("user_id")
  action     String                              // e.g. "purchase_request.submit"
  entityType String   @map("entity_type")        // "PurchaseRequest"
  entityId   String?  @map("entity_id")
  before     Json?                               // snapshot ก่อนแก้
  after      Json?                               // snapshot หลังแก้
  ip         String?
  userAgent  String?  @map("user_agent") @db.Text
  createdAt  DateTime @default(now()) @map("created_at")

  school School? @relation(fields: [schoolId], references: [id])
  user   User?   @relation(fields: [userId], references: [id])

  @@index([schoolId, entityType, entityId])
  @@index([userId, createdAt])
  @@index([action, createdAt])
  @@map("audit_logs")
}

model RuleConfig {
  id         String   @id @default(cuid())
  schoolId   String?  @map("school_id")        // null = global default
  key        String                              // "spec_lock_words", ...
  value      Json                                // structure ขึ้นกับ key
  type       String                              // "list" | "thresholds" | "checklist"
  description String? @db.Text
  updatedById String? @map("updated_by_id")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  school    School? @relation(fields: [schoolId], references: [id])
  updatedBy User?   @relation("RuleUpdater", fields: [updatedById], references: [id])

  @@unique([schoolId, key])
  @@map("rule_configs")
}

model AiInvocation {
  id            String   @id @default(cuid())
  schoolId      String?  @map("school_id")
  userId        String?  @map("user_id")
  endpoint      String                            // "ai.parse_items"
  model         String                            // "claude-opus-4-7"
  promptVersion String   @map("prompt_version")
  input         Json
  output        Json?
  tokenInput    Int?     @map("token_input")
  tokenOutput   Int?     @map("token_output")
  latencyMs     Int?     @map("latency_ms")
  status        String                            // "success" | "error"
  errorMessage  String?  @map("error_message") @db.Text
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([endpoint, createdAt])
  @@index([userId, createdAt])
  @@map("ai_invocations")
}

// ─────────────────────────────────────────────
// Phase 2 — Budget
// ─────────────────────────────────────────────

model Project {
  id          String   @id @default(cuid())
  schoolId    String   @map("school_id")
  code        String                            // "PRJ-2568-001"
  name        String
  description String?  @db.Text
  ownerId     String?  @map("owner_id")        // Project Owner user
  fiscalYear  Int      @map("fiscal_year")     // พ.ศ.
  startDate   DateTime? @map("start_date") @db.Date
  endDate     DateTime? @map("end_date") @db.Date
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  school   School    @relation(fields: [schoolId], references: [id])
  budgets  Budget[]
  requests PurchaseRequest[]

  @@unique([schoolId, code])
  @@index([schoolId, fiscalYear])
  @@map("projects")
}

model BudgetSource {
  id        String   @id @default(cuid())
  schoolId  String   @map("school_id")
  code      String                              // "SUBSIDY", "INCOME", ...
  name      String                              // "เงินอุดหนุน", ...
  active    Boolean  @default(true)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  school  School   @relation(fields: [schoolId], references: [id])
  budgets Budget[]

  @@unique([schoolId, code])
  @@map("budget_sources")
}

model Budget {
  id             String   @id @default(cuid())
  schoolId       String   @map("school_id")
  projectId      String   @map("project_id")
  budgetSourceId String   @map("budget_source_id")
  fiscalYear     Int      @map("fiscal_year")
  amount         Decimal  @db.Decimal(15, 2)   // วงเงินตั้ง
  notes          String?  @db.Text
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  school       School        @relation(fields: [schoolId], references: [id])
  project      Project       @relation(fields: [projectId], references: [id])
  budgetSource BudgetSource  @relation(fields: [budgetSourceId], references: [id])
  movements    BudgetMovement[]
  requests     PurchaseRequest[]

  @@unique([projectId, budgetSourceId, fiscalYear])
  @@index([schoolId, fiscalYear])
  @@map("budgets")
}

enum BudgetMovementType {
  HOLD       // กันงบเมื่อ submit คำขอ
  RELEASE    // คืนงบเมื่อ reject/cancel
  COMMIT     // ผูกพันเมื่ออนุมัติ
  SPEND      // จ่ายจริงเมื่อมี payment
  ADJUST     // ปรับมือ (admin เท่านั้น)
}

model BudgetMovement {
  id        String   @id @default(cuid())
  budgetId  String   @map("budget_id")
  type      BudgetMovementType
  amount    Decimal  @db.Decimal(15, 2)        // +/- ตามทิศ
  refType   String?  @map("ref_type")          // "PurchaseRequest" | "Payment"
  refId     String?  @map("ref_id")
  byUserId  String?  @map("by_user_id")
  notes     String?
  createdAt DateTime @default(now()) @map("created_at")

  budget Budget @relation(fields: [budgetId], references: [id])

  @@index([budgetId, createdAt])
  @@index([refType, refId])
  @@map("budget_movements")
}

// ─────────────────────────────────────────────
// Phase 1 — Purchase Request
// ─────────────────────────────────────────────

enum PurchaseRequestStatus {
  DRAFT
  SUBMITTED
  REVIEWING
  RETURNED
  APPROVED_FOR_COMPARISON
  IN_COMPARISON               // Phase 3
  PENDING_APPROVAL            // Phase 3
  APPROVED                    // Phase 3
  REJECTED                    // Phase 3
  IN_RECEIVING                // Phase 4
  RECEIVED                    // Phase 4
  CLOSED                      // Phase 4
  CANCELLED
}

enum ItemClass {
  MATERIAL                    // วัสดุ
  ASSET                       // ครุภัณฑ์
  SERVICE                     // งานจ้าง
  UNCLASSIFIED
}

model PurchaseRequest {
  id          String   @id @default(cuid())
  schoolId    String   @map("school_id")
  docNo       String   @map("doc_no")           // "PR-2568-0001" — generate เมื่อ submit
  title       String
  reason      String   @db.Text
  status      PurchaseRequestStatus @default(DRAFT)

  requesterId String   @map("requester_id")
  projectId   String?  @map("project_id")
  budgetId    String?  @map("budget_id")
  totalAmount Decimal? @map("total_amount") @db.Decimal(15, 2)

  submittedAt DateTime? @map("submitted_at")
  approvedAt  DateTime? @map("approved_at")
  closedAt    DateTime? @map("closed_at")

  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  school     School         @relation(fields: [schoolId], references: [id])
  requester  User           @relation("RequesterRequests", fields: [requesterId], references: [id])
  project    Project?       @relation(fields: [projectId], references: [id])
  budget     Budget?        @relation(fields: [budgetId], references: [id])

  items         PurchaseRequestItem[]
  attachments   Attachment[]
  riskFlags     AiRiskFlag[]
  quotations    VendorQuotation[]                // Phase 3
  approvals     ApprovalAction[]                 // Phase 3
  documents     ProcurementDocument[]            // Phase 3
  receivings    ReceivingRecord[]                // Phase 4

  @@unique([schoolId, docNo])
  @@index([schoolId, status, createdAt])
  @@index([requesterId, createdAt])
  @@index([projectId])
  @@map("purchase_requests")
}

model PurchaseRequestItem {
  id              String   @id @default(cuid())
  purchaseRequestId String  @map("purchase_request_id")
  ordinal         Int                                    // ลำดับใน PR
  name            String
  quantity        Decimal  @db.Decimal(12, 2)
  unit            String                                  // "ชิ้น", "เครื่อง", ...
  unitPriceEst    Decimal? @map("unit_price_est") @db.Decimal(15, 2)
  rawText         String?  @map("raw_text") @db.Text     // ข้อความต้นฉบับก่อน AI parse
  parsedByAi      Boolean  @default(false) @map("parsed_by_ai")
  classifiedType  ItemClass @default(UNCLASSIFIED) @map("classified_type")
  classifiedByAi  Boolean  @default(false) @map("classified_by_ai")
  notes           String?  @db.Text
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  purchaseRequest PurchaseRequest      @relation(fields: [purchaseRequestId], references: [id], onDelete: Cascade)
  specifications  ItemSpecification[]
  riskFlags       AiRiskFlag[]
  quotationItems  QuotationItem[]                       // Phase 3
  receivingItems  ReceivingItem[]                       // Phase 4

  @@unique([purchaseRequestId, ordinal])
  @@index([purchaseRequestId])
  @@map("purchase_request_items")
}

enum SpecLevel {
  MUST_HAVE
  NICE_TO_HAVE
  INFO
}

enum SpecSource {
  HUMAN
  AI
}

model ItemSpecification {
  id        String   @id @default(cuid())
  itemId    String   @map("item_id")
  key       String                          // "CPU", "RAM", "warranty"
  value     String                          // "ไม่น้อยกว่า ..."
  level     SpecLevel @default(MUST_HAVE)
  source    SpecSource @default(HUMAN)
  ordinal   Int       @default(0)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  item PurchaseRequestItem @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([itemId])
  @@map("item_specifications")
}

enum RiskSeverity {
  LOW
  MEDIUM
  HIGH
}

enum RiskType {
  AMBIGUOUS_SPEC          // สเปกคลุมเครือ
  BRAND_LOCK              // ระบุยี่ห้อ/รุ่น
  PRICE_OUTLIER           // ราคาผิดปกติ (Phase 3)
  INSUFFICIENT_QUOTES     // ใบเสนอราคาน้อย (Phase 3)
  MISSING_DOC             // เอกสารขาด (Phase 3)
  BUDGET_OVERRUN          // งบไม่พอ (Phase 2)
  REASON_MISSING          // ไม่มีเหตุผลความจำเป็น
  CLASSIFICATION_UNCERTAIN
  OTHER
}

model AiRiskFlag {
  id              String   @id @default(cuid())
  purchaseRequestId String? @map("purchase_request_id")
  itemId          String?  @map("item_id")
  type            RiskType
  severity        RiskSeverity @default(MEDIUM)
  message         String   @db.Text
  detail          Json?                          // structured payload
  modelVersion    String?  @map("model_version")
  invocationId    String?  @map("invocation_id")  // FK soft to AiInvocation
  dismissedById   String?  @map("dismissed_by_id")
  dismissedAt     DateTime? @map("dismissed_at")
  dismissedReason String?  @map("dismissed_reason") @db.Text
  createdAt       DateTime @default(now()) @map("created_at")

  purchaseRequest PurchaseRequest?     @relation(fields: [purchaseRequestId], references: [id], onDelete: Cascade)
  item            PurchaseRequestItem? @relation(fields: [itemId], references: [id], onDelete: Cascade)

  @@index([purchaseRequestId])
  @@index([itemId])
  @@index([type, severity])
  @@map("ai_risk_flags")
}

model Attachment {
  id          String   @id @default(cuid())
  schoolId    String   @map("school_id")
  ownerType   String   @map("owner_type")        // polymorphic: "PurchaseRequest", "Receiving", ...
  ownerId     String   @map("owner_id")
  filename    String
  mimeType    String   @map("mime_type")
  sizeBytes   Int      @map("size_bytes")
  storagePath String   @map("storage_path")      // path ใน object storage / disk
  uploadedById String? @map("uploaded_by_id")
  createdAt   DateTime @default(now()) @map("created_at")

  purchaseRequest PurchaseRequest? @relation(fields: [ownerId], references: [id], map: "fk_att_pr", onDelete: NoAction, onUpdate: NoAction)
  // หมายเหตุ: polymorphic — ใช้ ownerType+ownerId เช็คในแอป

  @@index([schoolId, ownerType, ownerId])
  @@map("attachments")
}

// ─────────────────────────────────────────────
// Phase 3 — Vendor / Quotation / Approval / Documents
// ─────────────────────────────────────────────

model Vendor {
  id          String   @id @default(cuid())
  schoolId    String   @map("school_id")
  name        String
  taxId       String?  @map("tax_id")
  phone       String?
  email       String?
  address     String?  @db.Text
  trustScore  Int?     @map("trust_score")        // 0-100, manual หรือคำนวณ
  notes       String?  @db.Text
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  school     School            @relation(fields: [schoolId], references: [id])
  quotations VendorQuotation[]

  @@unique([schoolId, taxId])
  @@index([schoolId, name])
  @@map("vendors")
}

enum QuotationSource {
  MANUAL_ENTRY
  PDF_UPLOAD
  IMAGE_OCR
  EXCEL_UPLOAD
  MARKETPLACE
}

model VendorQuotation {
  id                String   @id @default(cuid())
  schoolId          String   @map("school_id")
  purchaseRequestId String   @map("purchase_request_id")
  vendorId          String   @map("vendor_id")
  quoteNo           String?  @map("quote_no")
  quoteDate         DateTime? @map("quote_date") @db.Date
  totalAmount       Decimal  @map("total_amount") @db.Decimal(15, 2)
  shippingFee       Decimal  @default(0) @map("shipping_fee") @db.Decimal(15, 2)
  validUntil        DateTime? @map("valid_until") @db.Date
  source            QuotationSource @default(MANUAL_ENTRY)
  attachmentId      String?  @map("attachment_id")
  notes             String?  @db.Text
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  deletedAt         DateTime? @map("deleted_at")

  vendor          Vendor          @relation(fields: [vendorId], references: [id])
  purchaseRequest PurchaseRequest @relation(fields: [purchaseRequestId], references: [id], onDelete: Cascade)
  items           QuotationItem[]
  snapshots       PriceSnapshot[]

  @@index([schoolId, purchaseRequestId])
  @@index([vendorId])
  @@map("vendor_quotations")
}

model QuotationItem {
  id           String   @id @default(cuid())
  quotationId  String   @map("quotation_id")
  prItemId     String?  @map("pr_item_id")     // map กลับไปที่รายการใน PR
  description  String                          // ตามที่ vendor ระบุ
  quantity     Decimal  @db.Decimal(12, 2)
  unit         String
  unitPrice    Decimal  @map("unit_price") @db.Decimal(15, 2)
  totalPrice   Decimal  @map("total_price") @db.Decimal(15, 2)
  specMatch    Boolean? @map("spec_match")     // true/false/null = ยังไม่ตรวจ
  specMatchNote String? @map("spec_match_note") @db.Text
  ordinal      Int      @default(0)

  quotation VendorQuotation     @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  prItem    PurchaseRequestItem? @relation(fields: [prItemId], references: [id])

  @@index([quotationId])
  @@map("quotation_items")
}

model PriceSnapshot {
  id           String   @id @default(cuid())
  schoolId     String   @map("school_id")
  productKey   String   @map("product_key")    // ชื่อ/รหัสสินค้า normalized
  source       String                            // "shopee", "lazada", "ร้านท้องถิ่น"
  sourceUrl    String?  @map("source_url") @db.Text
  price        Decimal  @db.Decimal(15, 2)
  currency     String   @default("THB")
  capturedAt   DateTime @map("captured_at")
  evidenceFile String?  @map("evidence_file")  // attachment id
  quotationId  String?  @map("quotation_id")
  createdAt    DateTime @default(now()) @map("created_at")

  quotation VendorQuotation? @relation(fields: [quotationId], references: [id])

  @@index([schoolId, productKey, capturedAt])
  @@map("price_snapshots")
}

enum ProcurementMethod {
  SPECIFIC_METHOD          // วิธีเฉพาะเจาะจง
  PRICE_LIST               // ราคามาตรฐาน
  E_BIDDING
  SELECTED                 // คัดเลือก
  GENERAL_BIDDING          // ประกาศทั่วไป
  OTHER
}

model ApprovalWorkflow {
  id          String   @id @default(cuid())
  schoolId    String   @map("school_id")
  name        String                              // "งบไม่เกิน 100k"
  appliesWhen Json                                // expression: {amountMax: 100000, types: ["MATERIAL"]}
  steps       Json                                // [{order, role, requireAll, ...}]
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  @@index([schoolId, active])
  @@map("approval_workflows")
}

enum ApprovalDecision {
  APPROVED
  RETURNED
  REJECTED
  COMMENTED
}

model ApprovalAction {
  id                String   @id @default(cuid())
  schoolId          String   @map("school_id")
  purchaseRequestId String   @map("purchase_request_id")
  stepOrder         Int      @map("step_order")
  role              Role
  byUserId          String   @map("by_user_id")
  decision          ApprovalDecision
  comment           String?  @db.Text
  attachmentId      String?  @map("attachment_id")
  actedAt           DateTime @default(now()) @map("acted_at")

  purchaseRequest PurchaseRequest @relation(fields: [purchaseRequestId], references: [id], onDelete: Cascade)
  byUser          User            @relation(fields: [byUserId], references: [id])

  @@index([purchaseRequestId, stepOrder])
  @@index([byUserId, actedAt])
  @@map("approval_actions")
}

model DocumentTemplate {
  id          String   @id @default(cuid())
  schoolId    String?  @map("school_id")    // null = global
  code        String                          // "PR_MEMO" | "TOR" | "COMPARE_TABLE" | "PURCHASE_ORDER" | "RECEIVE_FORM"
  name        String
  engine      String   @default("handlebars")
  template    String   @db.LongText          // raw template
  version     Int      @default(1)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  documents ProcurementDocument[]

  @@unique([schoolId, code, version])
  @@map("document_templates")
}

model ProcurementDocument {
  id                String   @id @default(cuid())
  schoolId          String   @map("school_id")
  purchaseRequestId String   @map("purchase_request_id")
  templateId        String   @map("template_id")
  docNo             String?  @map("doc_no")
  title             String
  payload           Json                                    // ค่าที่ใส่ลง template
  renderedPdfPath   String?  @map("rendered_pdf_path")
  status            String   @default("draft")              // draft|signed|cancelled
  signedAt          DateTime? @map("signed_at")
  createdById       String?  @map("created_by_id")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  purchaseRequest PurchaseRequest  @relation(fields: [purchaseRequestId], references: [id], onDelete: Cascade)
  template        DocumentTemplate @relation(fields: [templateId], references: [id])

  @@index([schoolId, purchaseRequestId])
  @@map("procurement_documents")
}

// ─────────────────────────────────────────────
// Phase 4 — Receiving / Inventory / Asset / Payment
// ─────────────────────────────────────────────

enum ReceivingStatus {
  PENDING
  PARTIAL
  COMPLETE
  REJECTED
}

model ReceivingRecord {
  id                String   @id @default(cuid())
  schoolId          String   @map("school_id")
  purchaseRequestId String   @map("purchase_request_id")
  docNo             String?  @map("doc_no")
  receivedAt        DateTime @map("received_at")
  status            ReceivingStatus @default(PENDING)
  committee         Json?                                   // [{userId, role, signed}]
  notes             String?  @db.Text
  createdById       String?  @map("created_by_id")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  school          School           @relation(fields: [schoolId], references: [id])
  purchaseRequest PurchaseRequest  @relation(fields: [purchaseRequestId], references: [id])
  items           ReceivingItem[]

  @@unique([schoolId, docNo])
  @@index([purchaseRequestId])
  @@map("receiving_records")
}

model ReceivingItem {
  id              String   @id @default(cuid())
  receivingId     String   @map("receiving_id")
  prItemId        String   @map("pr_item_id")
  quantityOrdered Decimal  @map("quantity_ordered") @db.Decimal(12, 2)
  quantityReceived Decimal @map("quantity_received") @db.Decimal(12, 2)
  defective       Decimal  @default(0) @db.Decimal(12, 2)
  specPass        Boolean? @map("spec_pass")
  notes           String?  @db.Text

  receiving ReceivingRecord     @relation(fields: [receivingId], references: [id], onDelete: Cascade)
  prItem    PurchaseRequestItem @relation(fields: [prItemId], references: [id])

  @@index([receivingId])
  @@map("receiving_items")
}

model InventoryItem {
  id           String   @id @default(cuid())
  schoolId     String   @map("school_id")
  code         String                              // รหัสวัสดุ
  name         String
  unit         String
  categoryCode String?  @map("category_code")
  reorderPoint Decimal? @map("reorder_point") @db.Decimal(12, 2)
  onHand       Decimal  @default(0) @map("on_hand") @db.Decimal(12, 2)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")
  deletedAt    DateTime? @map("deleted_at")

  school    School          @relation(fields: [schoolId], references: [id])
  movements StockMovement[]

  @@unique([schoolId, code])
  @@index([schoolId, name])
  @@map("inventory_items")
}

enum StockMovementType {
  RECEIVE     // รับเข้า (จาก receiving)
  ISSUE       // เบิกออก
  ADJUST
  RETURN
  WRITE_OFF
}

model StockMovement {
  id               String   @id @default(cuid())
  inventoryItemId  String   @map("inventory_item_id")
  type             StockMovementType
  quantity         Decimal  @db.Decimal(12, 2)
  refType          String?  @map("ref_type")
  refId            String?  @map("ref_id")
  notes            String?
  byUserId         String?  @map("by_user_id")
  createdAt        DateTime @default(now()) @map("created_at")

  inventoryItem InventoryItem @relation(fields: [inventoryItemId], references: [id])

  @@index([inventoryItemId, createdAt])
  @@map("stock_movements")
}

enum AssetStatus {
  IN_USE
  IN_STORAGE
  UNDER_REPAIR
  DAMAGED
  DISPOSED
}

model AssetRegister {
  id              String   @id @default(cuid())
  schoolId        String   @map("school_id")
  assetNo         String   @map("asset_no")          // เลขครุภัณฑ์
  name            String
  category        String?
  brand           String?
  model           String?
  serialNo        String?  @map("serial_no")
  acquiredAt      DateTime? @map("acquired_at") @db.Date
  cost            Decimal? @db.Decimal(15, 2)
  fundingSource   String?  @map("funding_source")
  location        String?
  responsibleUserId String? @map("responsible_user_id")
  status          AssetStatus @default(IN_USE)
  qrCode          String?  @map("qr_code")
  prItemId        String?  @map("pr_item_id")        // ที่มาจาก PR ไหน
  notes           String?  @db.Text
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  school     School           @relation(fields: [schoolId], references: [id])
  maintenances AssetMaintenance[]

  @@unique([schoolId, assetNo])
  @@index([schoolId, status])
  @@index([responsibleUserId])
  @@map("asset_registers")
}

model AssetMaintenance {
  id        String   @id @default(cuid())
  assetId   String   @map("asset_id")
  date      DateTime @db.Date
  type      String                          // "ซ่อม" / "บำรุงรักษา"
  cost      Decimal? @db.Decimal(15, 2)
  notes     String?  @db.Text
  createdAt DateTime @default(now()) @map("created_at")

  asset AssetRegister @relation(fields: [assetId], references: [id], onDelete: Cascade)

  @@index([assetId, date])
  @@map("asset_maintenances")
}

enum PaymentStatus {
  PENDING
  PARTIAL
  PAID
  CANCELLED
}

model PaymentRecord {
  id                String   @id @default(cuid())
  schoolId          String   @map("school_id")
  purchaseRequestId String   @map("purchase_request_id")
  voucherNo         String?  @map("voucher_no")     // เลขใบสำคัญ
  amount            Decimal  @db.Decimal(15, 2)
  paymentMethod     String?  @map("payment_method") // "transfer" | "cheque" | "cash"
  paidAt            DateTime? @map("paid_at") @db.Date
  payeeVendorId    String?  @map("payee_vendor_id")
  status            PaymentStatus @default(PENDING)
  evidenceFile      String?  @map("evidence_file")
  notes             String?  @db.Text
  byUserId          String?  @map("by_user_id")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  school          School          @relation(fields: [schoolId], references: [id])
  purchaseRequest PurchaseRequest @relation(fields: [purchaseRequestId], references: [id])

  @@unique([schoolId, voucherNo])
  @@index([schoolId, status])
  @@index([purchaseRequestId])
  @@map("payment_records")
}
```

> **หมายเหตุ:** `Attachment` polymorphic — Prisma ไม่รองรับ FK polymorphic จริง ๆ ฉบับนี้ใช้ `ownerType + ownerId` แล้วเช็คในแอป (ไม่ผูก FK ข้ามตาราง)

## 3. State Transition — PurchaseRequest

```
DRAFT
  └─[submit]─> SUBMITTED
                  ├─[claim]──> REVIEWING
                  │              ├─[return]────> RETURNED ──[resubmit]──> SUBMITTED
                  │              ├─[cancel]────> CANCELLED
                  │              └─[approve]───> APPROVED_FOR_COMPARISON
                  │                                  └─[start-compare]─> IN_COMPARISON
                  │                                                         └─[finalize]─> PENDING_APPROVAL
                  │                                                                            ├─[approve]──> APPROVED
                  │                                                                            └─[reject]───> REJECTED
                  └─[withdraw]─> CANCELLED   (only by requester before claim)

APPROVED ──[receive]──> IN_RECEIVING ──[complete]──> RECEIVED ──[pay+register]──> CLOSED
```

State machine ต้อง enforce ใน service layer; เปลี่ยน status ต้องผ่าน method เฉพาะ (`submit()`, `approve()`, ...) ไม่ใช่ update field ตรง

## 4. Index Strategy

| ตาราง | Index สำคัญ |
|------|------|
| purchase_requests | `(schoolId, status, createdAt)`, `(requesterId, createdAt)` |
| purchase_request_items | `(purchaseRequestId)` |
| audit_logs | `(schoolId, entityType, entityId)`, `(userId, createdAt)`, `(action, createdAt)` |
| ai_invocations | `(endpoint, createdAt)`, `(userId, createdAt)` |
| ai_risk_flags | `(purchaseRequestId)`, `(type, severity)` |
| budgets | `(projectId, budgetSourceId, fiscalYear)` unique |
| budget_movements | `(budgetId, createdAt)`, `(refType, refId)` |
| price_snapshots | `(schoolId, productKey, capturedAt)` |
| asset_registers | `(schoolId, assetNo)` unique, `(schoolId, status)` |

## 5. Seed Data (Phase 0)

- 1 School: "โรงเรียนทดสอบ"
- 8 Users: 1 ต่อ role + 1 admin (password = `dev1234` hashed)
- 5 BudgetSource มาตรฐาน: เงินอุดหนุน · เงินรายได้ · โครงการเฉพาะกิจ · เงินบริจาค · อื่น ๆ
- 3 RuleConfig:
  - `spec_lock_words` = `{ words: ["Lenovo", "Dell", "Apple", "ยี่ห้อ", "รุ่น"] }`
  - `procurement_thresholds` = `{ specific_method_max: 500000 }`
  - `required_docs_by_method` = `{ SPECIFIC_METHOD: ["memo","compare_table","tor"], ... }`
- 5 DocumentTemplate (raw handlebars เปล่า ๆ พอให้ render ได้)

## 6. Migration Order (ลำดับสร้าง)

1. `init` — School, User, Role, UserRole, AuditLog, RuleConfig, AiInvocation
2. `pr-module` — PurchaseRequest, PurchaseRequestItem, ItemSpecification, AiRiskFlag, Attachment
3. `budget-module` — Project, BudgetSource, Budget, BudgetMovement + add FK `projectId`/`budgetId` to PR
4. `vendor-module` — Vendor, VendorQuotation, QuotationItem, PriceSnapshot
5. `approval-module` — ApprovalWorkflow, ApprovalAction
6. `document-module` — DocumentTemplate, ProcurementDocument
7. `receiving-module` — ReceivingRecord, ReceivingItem
8. `inventory-module` — InventoryItem, StockMovement
9. `asset-module` — AssetRegister, AssetMaintenance
10. `finance-module` — PaymentRecord

## 7. ที่ยังต้องตัดสินใจ

- **Object storage:** ไฟล์ attachment เก็บที่ไหน? local disk + path? S3-compatible (MinIO)? — กระทบ field `storagePath` + cleanup job
- **Doc number generator:** sequence ต่อโรงเรียน/ปีงบ — สร้างเป็น service `DocNumberService` ใช้ table แยก หรือใช้ MySQL atomic counter
- **Soft delete strategy:** Prisma middleware filter ทุก query หรือเขียน `where: { deletedAt: null }` ทุกที่
- **Audit before/after:** เก็บ JSON ทั้งก้อน vs เก็บเฉพาะ field ที่เปลี่ยน — เริ่มทั้งก้อน (เข้าใจง่าย) ขยับเป็น diff ถ้าตารางใหญ่
