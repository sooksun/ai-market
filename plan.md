# Plan — Implementation Strategy

> เอกสารนี้คือแผนการลงมือ implement ตาม PRD.md
> มุ่งทำ **MVP 1–3 แบบบาง** เป็นเป้าเริ่มต้น (คำขอซื้อ → ตรวจงบ → สเปก → เปรียบเทียบ → export)

## 0. Tech stack (เคาะแล้ว)

| ส่วน | เทคโนโลยี |
|------|-----------|
| โครงสร้างโค้ด | **Monorepo** (เสนอใช้ pnpm workspaces + Turborepo) |
| Frontend | **Next.js (App Router) + Tailwind CSS** |
| Backend | **NestJS + Prisma ORM** |
| Database | **MySQL / MariaDB** (ใช้ MariaDB ใน Laragon ได้ทันที) |
| AI | **Claude API** (Anthropic SDK) |
| OCR | Tesseract (เริ่ม) → ถ้าผลแย่ค่อย swap เป็น Claude vision หรือ Google Vision |
| Auth | NestJS Passport + JWT (httpOnly cookie) — role-based |

### โครงสร้าง monorepo ที่เสนอ

```
ai-market/
├── apps/
│   ├── web/              # Next.js (frontend)
│   └── api/              # NestJS (backend)
├── packages/
│   ├── db/               # Prisma schema + client (shared)
│   ├── shared/           # types, zod schemas, constants ใช้ร่วม web↔api
│   └── ui/               # (optional) Tailwind component library
├── package.json          # root + pnpm workspace
├── pnpm-workspace.yaml
├── turbo.json
└── .env.example
```

### ที่ยังต้องเคาะ (non-blocking สำหรับ Phase 0)

1. **Multi-tenant** — เริ่ม single-school ก่อนแต่ schema ใส่ `school_id` ทุกตารางเลย → ขยายเป็น multi-school ได้โดยไม่ต้อง migrate ข้อมูล
2. **Hosting** — on-prem โรงเรียน หรือ cloud? กระทบเรื่อง backup + LINE OA webhook URL
3. **Email/Notification provider** — SMTP โรงเรียน vs Resend/SES
4. **PDF rendering** — Puppeteer (ใน NestJS) vs server-side template (เช่น `@react-pdf/renderer` ฝั่ง web)

**ข้อเสนอ default ที่จะใช้ถ้าไม่บอกเป็นอื่น:** schema ใส่ `school_id` ตั้งแต่ต้น, on-prem, SMTP, Puppeteer สำหรับ PDF

## 1. Phase 0 — Foundation (รอบ 0 ก่อน MVP 1)

เป้าหมาย: backbone ที่ทุก module พึ่ง

### 1.1 Monorepo bootstrap
- [ ] `pnpm init` + `pnpm-workspace.yaml` (apps/*, packages/*)
- [ ] เพิ่ม Turborepo (`turbo.json` กำหนด pipeline build/dev/lint)
- [ ] ตั้ง `tsconfig.base.json` ที่ root + extend ใน apps/packages
- [ ] ESLint + Prettier ระดับ root + per-package overrides
- [ ] `.env.example` + `.gitignore`

### 1.2 packages/db (Prisma)
- [ ] `prisma init` ใน `packages/db`
- [ ] DataSource MariaDB/MySQL
- [ ] Model: `School`, `User`, `Role`, `UserRole`, `AuditLog`, `RuleConfig`
- [ ] Soft-delete convention (column `deleted_at`)
- [ ] Migration แรก + seed ผู้ใช้ทดสอบทุก role
- [ ] Export Prisma Client เป็น singleton

### 1.3 apps/api (NestJS)
- [ ] Scaffold ด้วย `nest new`
- [ ] `PrismaModule` ใช้ client จาก `packages/db`
- [ ] Auth: Passport JWT + httpOnly cookie + refresh token
- [ ] `RolesGuard` + `@Roles()` decorator
- [ ] `AuditInterceptor` ที่ wrap mutation ทุก endpoint → เขียน `AuditLog` (capture user, action, before/after, ip)
- [ ] Global validation pipe + class-validator
- [ ] Health check `/healthz`

### 1.4 apps/web (Next.js)
- [ ] `create-next-app` (App Router, TypeScript, Tailwind)
- [ ] Tailwind config + theme + i18n (ไทย default — `next-intl` หรือ key map)
- [ ] Layout หลัก + sidebar ตาม role
- [ ] Auth flow: login page → POST `/auth/login` → set cookie → middleware ตรวจ role
- [ ] หน้า `/me` แสดง role
- [ ] Server Actions / fetch wrapper ที่แนบ cookie อัตโนมัติ

### 1.5 packages/shared
- [ ] Zod schema ใช้ร่วม (login DTO, role enum)
- [ ] Type ของ AuditLog action

**เกณฑ์ผ่าน Phase 0:**
- [ ] รัน `pnpm dev` ขึ้น web + api พร้อมกัน
- [ ] Login ได้ทุก role (7 roles)
- [ ] ทุกการเปลี่ยนข้อมูลถูกบันทึกใน `audit_logs` อัตโนมัติผ่าน interceptor
- [ ] แก้ rule_configs ผ่าน admin UI ได้

## 2. Phase 1 — MVP 1: คำขอซื้อ + AI Parser

| งาน | หมายเหตุ |
|------|---------|
| Schema: `purchase_requests`, `purchase_request_items`, `item_specifications` | สถานะ: draft / submitted / reviewing / returned / approved-for-comparison |
| หน้าสร้างคำขอ (Requester) | ใส่รายการแบบตาราง + แนบไฟล์ |
| AI Parser endpoint | input: ข้อความ/Excel → output: รายการพัสดุ ใช้ Claude API + structured output |
| AI cloudiness check | flag รายการที่สเปกคลุมเครือ → เก็บลง `ai_risk_flags` |
| หน้ารายการคำขอ (Procurement Officer) | filter ตาม status, ส่งกลับแก้ไขพร้อมความเห็น |
| Export Excel/PDF | ใช้ template เริ่มต้น |
| Dashboard ผู้บริหาร | นับตามสถานะ |

**Acceptance ตาม PRD §6** — ครบทุกข้อก่อนปิด phase

## 3. Phase 2 — MVP 2: ตรวจงบ + Spec Helper

| งาน | หมายเหตุ |
|------|---------|
| Schema: `projects`, `budget_sources`, `budgets`, `budget_movements` | แยก source: อุดหนุน / รายได้ / โครงการเฉพาะ |
| ผูกคำขอ → โครงการ + แหล่งงบ | check คงเหลือก่อน submit |
| กันงบชั่วคราว (soft hold) | release เมื่อ reject / commit เมื่อ approve |
| AI Spec Writer | แปลงคำขอ → สเปกกลาง + เตือนคำเสี่ยง (ระบุยี่ห้อ/รุ่น) |
| AI หมวดวัสดุ/ครุภัณฑ์/งานจ้าง | classification |
| Checklist เอกสารที่ต้องมี | อิง `rule_configs` |
| Import ใบเสนอราคา (PDF/รูป/Excel) | OCR + manual correction UI |

## 4. Phase 3 — MVP 3: เปรียบเทียบราคา + เอกสาร + อนุมัติ

| งาน | หมายเหตุ |
|------|---------|
| Schema: `vendors`, `vendor_quotations`, `quotation_items`, `price_snapshots` | ทุก snapshot มี timestamp + source |
| ตารางเปรียบเทียบ ≥3 ราย | ค่าส่ง + ความน่าเชื่อถือ + match สเปก |
| AI สรุปเหตุผลการเลือกผู้ขาย | คนต้อง confirm |
| Schema: `approval_workflows`, `approval_steps` | กำหนดสายอนุมัติได้ |
| หน้าอนุมัติ + ส่งกลับแก้ + ลงความเห็น | สร้างเลขที่เอกสาร |
| `procurement_documents` + `document_templates` | บันทึกข้อความ / TOR / รายงานพิจารณา / ใบสั่งซื้อภายใน |
| Export PDF/Excel ทุก template | |
| Rule Engine MVP | วงเงิน → วิธีจัดซื้อ → เอกสารที่ต้องมี (อิง `rule_configs` แก้ผ่าน admin UI) |

## 5. Phase 4 — MVP 4 (รอบหลัง): ตรวจรับ + คลัง + การเงิน

ดู PRD §5 รอบ 4 — ทำหลังรอบ 1–3 ใช้งานจริงในโรงเรียนจริงแล้ว 1 ภาคเรียน

## 6. Phase 5 — MVP 5 (รอบหลัง): AI Audit + Multi-tenant

ดู PRD §5 รอบ 5

## 7. Cross-cutting concerns

- **Audit log:** `AuditInterceptor` ที่ NestJS — ห้าม bypass (ห้ามเรียก `prisma.*` ตรงนอก service ที่ผ่าน interceptor)
- **Rule Engine:** ทุก threshold/condition อ่านจาก `rule_configs` เสมอ ห้าม hardcode ใน TS
- **AI guardrails:** ทุก AI output ต้อง store พร้อม model version + prompt version + raw response → ตาราง `ai_invocations`
- **Permissions:** ตรวจที่ NestJS guard (server-side authoritative) **และ** ซ่อนปุ่มฝั่ง Next.js (UX); อย่าใช้ฝั่ง web เพียงอย่างเดียว
- **i18n:** UI ภาษาไทย default ใช้ `next-intl` หรือ key-map ของเอง
- **Shared types:** กำหนด DTO/schema ที่ `packages/shared` แล้วให้ทั้ง web และ api import — อย่าซ้ำ type ระหว่างฝั่ง
- **Prisma Client singleton:** ใช้ pattern ป้องกัน client ซ้ำเวลา hot-reload (Next dev / Nest watch)
- **Migration policy:** dev ใช้ `prisma migrate dev`; prod ใช้ `prisma migrate deploy` เท่านั้น — ห้าม `db push` บน prod

## 8. ความเสี่ยงที่ต้องจัดการ

| ความเสี่ยง | แผนรับมือ |
|-----------|---------|
| AI แยกหน่วย/สเปกผิด | UI ให้เจ้าหน้าที่แก้ได้เสมอ + log การแก้ |
| OCR ใบเสนอราคาเพี้ยน | manual override + flag confidence ต่ำ |
| ระเบียบเปลี่ยน | rule_configs admin UI |
| ข้อมูลงบไม่ตรงระบบการเงินจริง | reconcile รายเดือน + รายงาน drift |
| ผู้ใช้ไม่ลงทะเบียนพัสดุหลังซื้อ | dashboard “ค้างลงทะเบียน” + เตือน |

## 9. Definition of Done (ทุก feature)

- [ ] Schema migration + seed (ถ้ามี)
- [ ] Permission ตาม role ครบ
- [ ] Audit log บันทึกครบ
- [ ] UI ภาษาไทยและตอบสนอง mobile-friendly สำหรับหน้าหลัก ๆ
- [ ] Test: happy path + edge case ที่ระบุใน task.md
- [ ] เอกสาร user (สั้น ๆ) อย่างน้อย screenshot + ขั้นตอน
