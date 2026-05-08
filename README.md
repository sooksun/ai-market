# AI Market — ผู้ช่วยพัสดุโรงเรียน

ระบบช่วยงานพัสดุและการเงินโรงเรียนด้วย AI — ตั้งแต่ขอซื้อ → เปรียบเทียบราคา → ตรวจระเบียบ → เสนออนุมัติ → ตรวจรับ → เบิกจ่าย → ลงทะเบียนพัสดุ → รายงาน

> ดู vision/PRD ฉบับเต็มที่ [`context.md`](./context.md), [`PRD.md`](./PRD.md), [`plan.md`](./plan.md), [`task.md`](./task.md)
> Design: [`frontend-design.md`](./frontend-design.md), [`database-design.md`](./database-design.md), [`api-design.md`](./api-design.md)

## โครงสร้าง Monorepo

```
ai-market/
├── apps/
│   ├── api/           # NestJS — REST API ที่ /api/v1
│   └── web/           # Next.js 15 (App Router) + Tailwind
├── packages/
│   ├── db/            # Prisma schema + client (MariaDB/MySQL)
│   └── shared/        # zod schemas + types ใช้ร่วม web↔api
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## ความต้องการ

- Node.js ≥ 20 (ทดสอบบน 24)
- pnpm ≥ 10
- MariaDB / MySQL (ใช้ Laragon ได้เลย)

## เริ่มต้นใช้งาน

```powershell
# 1. ติดตั้ง dependencies
pnpm install

# 2. คัดลอก env
Copy-Item .env.example .env
# แก้ DATABASE_URL ให้ตรงกับ MariaDB ของคุณ

# 3. สร้าง Prisma client + DB
pnpm db:generate
pnpm db:migrate          # จะสร้างตาราง + รัน migration
pnpm db:seed             # ใส่ข้อมูลทดสอบ (1 โรงเรียน + 8 ผู้ใช้)

# 4. รัน dev (web + api ขนานกัน)
pnpm dev
```

หลังรัน `pnpm dev`:
- Web: http://localhost:3000
- API: http://localhost:3100/api/v1
- Health: http://localhost:3100/api/v1/healthz

## ผู้ใช้ทดสอบ (หลัง seed)

รหัสผ่านทุก user: `dev1234`

| email | role |
|-------|------|
| requester@test.local | REQUESTER |
| projectowner@test.local | PROJECT_OWNER |
| procurement@test.local | PROCUREMENT |
| finance@test.local | FINANCE |
| inspector@test.local | INSPECTOR |
| director@test.local | DIRECTOR |
| auditor@test.local | AUDITOR |
| admin@test.local | ADMIN |

## คำสั่งที่ใช้บ่อย

```powershell
pnpm dev                  # รัน web + api ขนาน
pnpm build                # build ทุก package
pnpm typecheck            # tsc --noEmit ทุก package
pnpm lint                 # lint ทุก package
pnpm format               # prettier เขียนทับ

pnpm db:generate          # prisma generate
pnpm db:migrate           # prisma migrate dev (จะ prompt ชื่อ migration)
# ตั้งชื่อ migration ตรง ๆ — เลี่ยง pnpm "--" double-wrap:
pnpm --filter @ai-market/db migrate:dev --name your-migration-name
pnpm db:studio            # เปิด Prisma Studio
pnpm db:seed              # seed ข้อมูลทดสอบ

pnpm --filter @ai-market/api dev      # รันเฉพาะ API
pnpm --filter @ai-market/web dev      # รันเฉพาะ Web
```

## สถานะปัจจุบัน

Phase 1 vertical slice พร้อมใช้งาน:
- ✓ Auth: `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` (JWT + httpOnly cookie)
- ✓ Role-based guard (`@Roles('PROCUREMENT', 'ADMIN')` etc.)
- ✓ Audit Interceptor (เขียน `audit_logs` ทุก mutation อัตโนมัติ)
- ✓ Purchase Request: `GET /purchase-requests`, `POST /purchase-requests`, `GET/:id`, `PATCH/:id`,
  + state actions: `submit`, `withdraw`, `claim`, `return`, `approve-for-comparison`
- ✓ AI parse-items: `POST /ai/parse-items` (Claude Haiku 4.5, structured output, prompt cached)
- ✓ AI Cloudiness check: `POST /ai/check-cloudiness` (manual re-run) + auto trigger ตอน `submit` (background, fire-and-forget)
- ✓ Risk flags: `POST /purchase-requests/:id/risk-flags/:flagId/dismiss`
- ✓ Audit logs: `GET /audit-logs` (filter: entityType, entityId, userId, action, dateFrom/To, q · pagination)
- ✓ Excel export: `GET /purchase-requests/:id/export.xlsx` (4 sheets: ข้อมูล · รายการ · สเปก · ความเสี่ยง)
- ✓ Print/PDF page: `/requests/[id]/print` — บันทึกข้อความรูปแบบราชการ + `@media print` CSS (Ctrl+P → save as PDF)
- ✓ Director dashboard: `GET /dashboard/director` (summary cards, status breakdown, risk severity, top requesters, AI usage, recent activity)
- ✓ Project / BudgetSource (Phase 1.8 placeholder): `GET /projects`, `GET /budget-sources` (read-only list) + ผูกใน PR ผ่าน `projectId` / `budgetSourceId`
- ✓ Rule Configs CRUD (ADMIN only): `GET/POST/PATCH/DELETE /rule-configs` + audit log อัตโนมัติ
- ✓ AI parse-items รับ Excel / CSV: `POST /ai/parse-items/upload` (multipart, multer, สูงสุด 5MB · sheet แรก)
- ✓ i18n via next-intl (locale=th, messages/th.json) — label constants ย้ายเข้า messages แล้ว
- ✓ Web: `/login`, `/dashboard`, `/requests`, `/requests/new`, `/requests/[id]` (detail + Excel + Print buttons), `/requests/[id]/edit`, `/requests/[id]/print`, `/inbox`, `/audit-logs`, `/admin/rule-configs` (ADMIN), `/me`

ยังต้องทำใน Phase 1 (ถ้าต้องการ):
- Refresh token rotation (ปัจจุบันแค่ verify + reissue)
- Server-side PDF render via Puppeteer / @react-pdf (ตอนนี้ใช้ browser print)
- CSRF token (ตอนนี้ใช้แค่ httpOnly + SameSite=Lax)

## ภาษา

UI/เอกสารภายใน: ภาษาไทย · Code identifier / commit / API field: ภาษาอังกฤษ
