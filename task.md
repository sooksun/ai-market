# Task Breakdown

> รายการ task แตกย่อยตาม `plan.md` — ใช้ tick `[x]` เมื่อจบ
> ลำดับ task เคารพ dependency: ทำตามลำดับใน Phase, แต่ภายใน Phase บาง task ขนานกันได้

---

## Phase 0 — Foundation

### 0.1 Monorepo bootstrap
- [ ] `pnpm init` + `pnpm-workspace.yaml` (`apps/*`, `packages/*`)
- [ ] ติดตั้ง Turborepo + `turbo.json` (pipeline: dev / build / lint / test)
- [ ] `tsconfig.base.json` ที่ root + extend ใน apps/packages
- [ ] ESLint + Prettier shared config
- [ ] `.env.example` + `.gitignore` + `git init`
- [ ] README ภาษาไทยสั้น ๆ: วิธี clone / install / รัน

### 0.2 packages/db (Prisma + MariaDB)
- [ ] `prisma init` ใน `packages/db` (provider = mysql)
- [ ] กำหนด `DATABASE_URL` ชี้ MariaDB ของ Laragon
- [ ] Model: `School`, `User`, `Role`, `UserRole`, `AuditLog`, `RuleConfig`
- [ ] ทุกตารางมี `school_id` (multi-tenant ready)
- [ ] `prisma migrate dev --name init`
- [ ] Seed 1 โรงเรียน + ผู้ใช้ครบ 7 role (`pnpm db:seed`)
- [ ] Export Prisma Client เป็น singleton

### 0.3 apps/api (NestJS)
- [ ] `nest new apps/api` (หรือ scaffold เอง)
- [ ] `PrismaModule` import จาก `packages/db`
- [ ] `ConfigModule` อ่าน `.env` (DATABASE_URL, JWT_SECRET, ANTHROPIC_API_KEY)
- [ ] Auth module: Passport JWT, login endpoint, refresh, logout
- [ ] httpOnly cookie + CSRF token
- [ ] `RolesGuard` + `@Roles()` decorator (เปิด 7 role)
- [ ] `AuditInterceptor` — capture user/action/before/after/ip ลง `AuditLog`
- [ ] Global `ValidationPipe` + `class-validator`
- [ ] Health check `/healthz`
- [ ] CORS เปิดให้ apps/web

### 0.4 apps/web (Next.js)
- [ ] `create-next-app apps/web` (App Router, TS, Tailwind)
- [ ] Tailwind config + custom theme (สีโทนราชการสุภาพ)
- [ ] i18n ภาษาไทย default (เลือก `next-intl` หรือ key map)
- [ ] Layout: sidebar + topbar แสดง user/role ปัจจุบัน
- [ ] Login page → POST api → set cookie → redirect
- [ ] Middleware ตรวจ session + role per route group
- [ ] Fetch wrapper (แนบ cookie + handle 401 refresh)
- [ ] หน้า `/me`

### 0.5 packages/shared
- [ ] Zod schema: LoginDto, UserDto, RoleEnum
- [ ] Audit action enum
- [ ] Re-export ให้ทั้ง web + api ใช้

### 0.6 Rule Configs
- [ ] Model `RuleConfig` (key, value JSON, type, schoolId nullable, updatedBy, updatedAt)
- [ ] Service + endpoint CRUD (admin only)
- [ ] หน้า admin UI ฝั่ง web
- [ ] Seed ค่าเริ่มต้น: `spec_lock_words`, `procurement_thresholds`, `required_docs_by_method`

### 0.7 Audit log viewer
- [ ] Endpoint `GET /audit-logs` (auditor/director only) filter user/model/date
- [ ] หน้า `/audit-logs` ฝั่ง web

**Phase 0 ผ่านเมื่อ:**
- [ ] `pnpm dev` ขึ้น web (3000) + api (3001) พร้อมกัน
- [ ] Login ครบ 7 role
- [ ] ทุก mutation มี row ใน `audit_logs` อัตโนมัติ
- [ ] แก้ rule_configs ผ่าน admin UI ได้

---

## Phase 1 — MVP 1: คำขอซื้อ + AI Parser

### 1.1 Prisma schema (packages/db)
- [ ] `PurchaseRequest` (id, schoolId, requesterId, projectId?, budgetId?, title, reason, status, docNo, submittedAt, ...)
- [ ] `PurchaseRequestItem` (id, prId, name, quantity, unit, rawText, parsedByAi, classifiedType)
- [ ] `ItemSpecification` (id, itemId, key, value, source: enum AI/HUMAN)
- [ ] `AiRiskFlag` (id, prId, itemId?, type, severity, message, modelVersion, dismissedBy?)
- [ ] `AiInvocation` (id, endpoint, model, promptVersion, input JSON, output JSON, userId, createdAt) — สำหรับ audit AI
- [ ] `prisma migrate dev --name pr-module`

### 1.2 Requester UI
- [ ] หน้าสร้างคำขอ: header (ชื่อ/เหตุผล) + ตารางรายการ
- [ ] เพิ่ม/ลบ/แก้แถวรายการ
- [ ] Save draft / Submit
- [ ] รายการของฉัน + filter status
- [ ] หน้า detail แสดงประวัติ comment + status timeline

### 1.3 AI Parser (NestJS)
- [ ] `AiModule` + Anthropic SDK client (singleton)
- [ ] Endpoint `POST /ai/parse-items` รับ text/Excel/CSV (multer)
- [ ] Claude API call ใช้ structured output (tool use / JSON schema) → array of items
- [ ] เก็บทุก call ลง `AiInvocation`
- [ ] Prompt caching เปิดเฉพาะ system prompt + few-shot
- [ ] UI: ปุ่ม “ให้ AI ช่วยแยกรายการ” → modal preview → apply

### 1.4 AI Cloudiness Check
- [ ] เมื่อ submit → background job ตรวจรายการคลุมเครือ
- [ ] สร้าง `ai_risk_flags` พร้อมข้อความเตือน
- [ ] UI แสดง flag เป็น banner เหลืองในหน้า detail
- [ ] ผู้ใช้ dismiss ได้ (เก็บ `dismissed_by`)

### 1.5 Procurement Officer flow
- [ ] หน้ารายการคำขอ filter status
- [ ] รับเรื่อง → status `reviewing`
- [ ] ส่งกลับแก้ → status `returned` + comment + email/notify
- [ ] อนุมัติเข้ารอบเปรียบเทียบราคา → status `approved-for-comparison`

### 1.6 Export
- [ ] Export Excel รายการคำขอ (ของฉัน / ทั้งโรงเรียน)
- [ ] Export PDF detail คำขอ 1 ฉบับ

### 1.7 Director dashboard (เริ่มต้น)
- [ ] นับคำขอตามสถานะ
- [ ] รายการรอพิจารณา top 10

### 1.8 Acceptance test (PRD §6)
- [ ] ครูสร้างคำขอได้
- [ ] AI แยกรายการ ≥80% (ทดสอบกับ sample 20 ชุด)
- [ ] ผูกโครงการ/งบได้ (placeholder dropdown ก่อน Phase 2)
- [ ] ส่งกลับแก้ไขได้
- [ ] สถานะ 5 ค่าครบ
- [ ] ประวัติแก้ไขใน audit_logs
- [ ] Export Excel + PDF ผ่าน
- [ ] AI flag สเปกไม่ชัดเจน
- [ ] ผู้บริหารดูคำขอรอพิจารณาได้
- [ ] **ไม่มี** auto-approve

---

## Phase 2 — MVP 2: Budget + Spec Helper

### 2.1 Budget schema + UI
- [ ] `projects`, `budget_sources`, `budgets`, `budget_movements` (hold / commit / release / spend)
- [ ] หน้าตั้งงบโครงการ (Project Owner / Finance)
- [ ] ผูก PR → project + budget_source
- [ ] Soft hold เมื่อ submit / release เมื่อ reject / commit เมื่อ approve

### 2.2 Budget validation
- [ ] เตือนงบไม่พอตอนเลือก project
- [ ] รายงานงบคงเหลือต่อโครงการ

### 2.3 AI Spec Writer
- [ ] Endpoint แปลง raw item → spec กลาง
- [ ] UI ดู spec เดิม vs spec AI เสนอ พร้อมตอบรับ/ปฏิเสธรายข้อ
- [ ] ตรวจคำเสี่ยงล็อกยี่ห้อ (อ่านจาก `rule_configs.spec_lock_words`)
- [ ] แยก must-have vs nice-to-have

### 2.4 AI Classifier (วัสดุ/ครุภัณฑ์/งานจ้าง)
- [ ] เพิ่ม column `classified_type` ใน items
- [ ] AI เสนอ → คนยืนยัน

### 2.5 Document checklist
- [ ] อ่านจาก rule_configs ตามวิธีจัดซื้อ
- [ ] UI checklist ในหน้า PR detail

### 2.6 Import ใบเสนอราคา
- [ ] Upload PDF / รูป / Excel
- [ ] OCR pipeline → preview ตาราง → ผู้ใช้แก้ก่อน save
- [ ] เก็บไฟล์ต้นฉบับ + ข้อมูล parsed

---

## Phase 3 — MVP 3: เปรียบเทียบราคา + เอกสาร + อนุมัติ

### 3.1 Vendor + Quotation schema
- [ ] `vendors`, `vendor_quotations`, `quotation_items`, `price_snapshots`
- [ ] CRUD ร้านค้า

### 3.2 ตารางเปรียบเทียบ
- [ ] หน้าเปรียบเทียบ ≥3 ราย ราคา + ค่าส่ง + match spec
- [ ] AI สรุปเหตุผลเลือก → คน confirm

### 3.3 Approval Workflow
- [ ] `approval_workflows`, `approval_steps`
- [ ] กำหนดสายอนุมัติต่อประเภทคำขอ
- [ ] หน้าอนุมัติ + ความเห็น + แนบไฟล์

### 3.4 Document Templates
- [ ] `procurement_documents`, `document_templates`
- [ ] Template: บันทึกข้อความ / รายละเอียดคุณลักษณะ / ตารางเปรียบเทียบ / รายงานพิจารณา / ใบสั่งซื้อภายใน
- [ ] Engine render → PDF + Excel

### 3.5 Rule Engine
- [ ] วงเงิน → วิธีจัดซื้อ → เอกสารที่ต้องมี
- [ ] Admin UI แก้ผ่าน rule_configs

---

## Phase 4 และ Phase 5

จะแตก task ละเอียดเมื่อใกล้ถึง — ดู `plan.md` §5–6

---

## Backlog / Cross-cutting

- [ ] Performance: index audit_logs (model, model_id), purchase_requests (status, school_id)
- [ ] Security: rate limit AI endpoints, sanitize uploaded files (PDF/Excel)
- [ ] DevOps: backup script, .env example, deployment guide
- [ ] User docs: คู่มือผู้ใช้สั้น ๆ ต่อ role
