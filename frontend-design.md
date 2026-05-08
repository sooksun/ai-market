# Frontend Design

> ออกแบบฝั่ง `apps/web` (Next.js + Tailwind)
> มุ่ง MVP 1 เป็นหลัก แต่วาง foundation ให้ขยายไปจนถึง MVP 5 ได้

## 1. Design Principles

| หลัก | ความหมาย |
|------|---------|
| **เอกสารเป็นหลัก ไม่ใช่ marketing** | UI ต้องอ่านง่ายแบบฟอร์มราชการ ไม่หวือหวา ตารางและฟอร์มเป็นพระเอก |
| **ทุกการกระทำมีร่องรอย** | UI ต้องโชว์ "ใครทำ เมื่อไหร่" บนทุก record (header card / activity timeline) |
| **AI = ผู้ช่วยที่ขอคำยืนยัน** | ทุกผลลัพธ์ AI แสดงในรูป "ข้อเสนอ" + ปุ่ม Apply/Reject ห้ามแก้ข้อมูลเงียบ ๆ |
| **อ่านง่ายบนจอ + พิมพ์ได้** | ทุกหน้า detail ต้องมี print stylesheet หรือปุ่ม Export PDF |
| **มือถือ = แจ้งเตือน/ตรวจรับ** | Desktop-first; mobile รองรับเฉพาะ approval, ตรวจรับ, ดู dashboard |

## 2. Sitemap ตาม Role

```
/login
/me
/audit-logs                     (auditor, director)
/admin/rules                    (director)

# Requester (ครู)
/requests                       — รายการคำขอของฉัน
/requests/new
/requests/[id]
/requests/[id]/edit

# Procurement Officer
/procurement/inbox              — คำขอที่รอตรวจ
/procurement/requests/[id]
/procurement/specs/[itemId]     — Spec helper (Phase 2)
/procurement/quotations         — เปรียบเทียบราคา (Phase 3)
/procurement/documents          — เอกสารพัสดุ (Phase 3)
/procurement/inventory          — ทะเบียนวัสดุ/ครุภัณฑ์ (Phase 4)

# Project Owner
/projects
/projects/[id]                  — ดูคำขอที่ผูก + งบเหลือ

# Finance Officer
/finance/budgets                (Phase 2)
/finance/payments               (Phase 4)

# Inspector
/inspections                    (Phase 4)

# Director
/dashboard                      — ภาพรวม
/approvals                      — รออนุมัติ (Phase 3)
```

## 3. Layout System

### Shell หลัก
```
┌─────────────────────────────────────────────────────────┐
│ Topbar: logo · school name · breadcrumb · user · logout │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ Sidebar  │  Page content                                │
│ (role-   │  ┌──────────────────────────────────────┐   │
│ aware)   │  │ Page header: title + actions         │   │
│          │  ├──────────────────────────────────────┤   │
│          │  │ Body                                 │   │
│          │  │                                      │   │
│          │  └──────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────┘
```

- Sidebar collapse ได้, จดจำ state ใน localStorage
- Breadcrumb สร้างจาก route segments อัตโนมัติ
- Topbar แสดง role badge ปัจจุบัน + ปุ่มสลับ school (Phase 5)

### Detail page pattern (ใช้ทุก entity)
```
┌──────────────────────────────────────────────────┐
│ Title + status badge          [Actions ▾] [PDF]  │
│ doc_no · created by · created_at · updated_at    │
├──────────────────────────────────────────────────┤
│ ┌─ Tab: ข้อมูล | สเปก | ประวัติ | ความเห็น ─┐  │
│ │                                              │  │
│ │  Body of selected tab                        │  │
│ │                                              │  │
│ └──────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────┤
│ Sticky footer: ปุ่มสำคัญตาม status + role        │
└──────────────────────────────────────────────────┘
```

## 4. Design Tokens (Tailwind config)

โทนสุภาพแบบราชการ — ฟ้ากรมท่าเป็นหลัก ไม่ใช้สี vivid

```ts
// tailwind.config.ts (ตัดทอน)
theme: {
  extend: {
    colors: {
      brand: {
        50:  '#f0f5fa',
        100: '#dbe7f3',
        500: '#1e4a7a',  // ฟ้ากรมท่า — primary
        600: '#173b62',
        700: '#102b48',
      },
      status: {
        draft:     '#6b7280',  // gray
        submitted: '#2563eb',  // blue
        reviewing: '#d97706',  // amber
        returned:  '#dc2626',  // red
        approved:  '#16a34a',  // green
      },
      risk: {
        low:    '#16a34a',
        medium: '#d97706',
        high:   '#dc2626',
      },
    },
    fontFamily: {
      sans: ['"IBM Plex Sans Thai"', 'Sarabun', 'system-ui', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'monospace'],
    },
  }
}
```

**ฟอนต์:** IBM Plex Sans Thai หรือ Sarabun (อ่านง่าย รองรับเลขไทย/อารบิก)
**Spacing:** Tailwind default + เพิ่ม `18` (4.5rem) สำหรับ table row สูง
**Radius:** ใช้ `rounded-md` เป็นมาตรฐาน — ไม่กลมจนดูเป็น consumer app

## 5. Component Library (`packages/ui` หรือใน apps/web)

ใช้ **shadcn/ui** เป็น base (copy-in components, customize ได้) — ตัวที่ต้องมีใน MVP 1:

| Component | ใช้ที่ไหน |
|-----------|----------|
| `Button` | ทุกหน้า |
| `Input`, `Textarea`, `Select`, `Combobox` | ฟอร์มคำขอ |
| `DataTable` (TanStack Table) | รายการคำขอ, audit log |
| `Dialog`, `Sheet` | preview AI parser, edit row inline |
| `Form` (react-hook-form + zod) | ทุกฟอร์ม |
| `Tabs` | detail page |
| `Badge` (status, role) | ตาราง + header |
| `Toast` (sonner) | feedback การกระทำ |
| `DatePicker` | ฟอร์มงบ/ใบสั่ง |
| `FileDropzone` | upload Excel/PDF/รูป |
| `EmptyState` | ตารางว่าง |
| `ConfirmDialog` | ก่อน destructive action |

**Custom components ของระบบนี้:**
- `<StatusBadge status="reviewing" />` — map status → สี + label ไทย
- `<RoleGuard role={['procurement']}>` — ซ่อน UI ตาม role
- `<AiSuggestionCard>` — กล่องเสนอแนะ AI พร้อมปุ่ม Apply/Reject + แสดง model version
- `<RiskFlagBanner>` — banner เหลือง/แดงสำหรับ `ai_risk_flags`
- `<AuditTrail entityType entityId>` — timeline ดึงจาก audit_logs
- `<MoneyInput>` — input บาท/สตางค์ + format ไทย
- `<DocNoChip>` — เลขที่เอกสาร monospace + copy
- `<PrintButton>` — เรียก server-side PDF render

## 6. Folder Structure (`apps/web`)

```
apps/web/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── layout.tsx               # layout เปล่า (no sidebar)
│   ├── (app)/
│   │   ├── layout.tsx               # shell มี sidebar
│   │   ├── me/page.tsx
│   │   ├── dashboard/page.tsx
│   │   ├── requests/
│   │   │   ├── page.tsx             # list
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx         # detail
│   │   │       └── edit/page.tsx
│   │   ├── procurement/
│   │   │   └── inbox/page.tsx
│   │   ├── audit-logs/page.tsx
│   │   └── admin/
│   │       └── rules/page.tsx
│   ├── api/                         # Route handlers (proxy ไปที่ NestJS เมื่อจำเป็น)
│   ├── layout.tsx                   # root: fonts, providers
│   └── globals.css
├── components/
│   ├── ui/                          # shadcn primitives
│   ├── domain/                      # StatusBadge, AiSuggestionCard, ...
│   └── layout/                      # Sidebar, Topbar, AppShell
├── lib/
│   ├── api.ts                       # fetch wrapper (cookie + 401 refresh)
│   ├── auth.ts                      # session helper (server side)
│   ├── permissions.ts               # role check
│   ├── format.ts                    # money/date Thai formatting
│   └── i18n.ts
├── hooks/
│   ├── use-current-user.ts
│   ├── use-permission.ts
│   └── use-toast.ts
├── middleware.ts                    # auth + role guard ตาม route
├── tailwind.config.ts
├── next.config.ts
└── tsconfig.json
```

## 7. Data Fetching Strategy

| ประเภทข้อมูล | กลยุทธ์ |
|--------------|---------|
| Public + ไม่เปลี่ยน | Server Component + `fetch` cache |
| User-specific list (เช่น คำขอของฉัน) | Server Component (no cache) + Suspense |
| Form submission | Server Action → call NestJS endpoint |
| Realtime status (optional) | Polling 30s; SSE/WS รอ Phase 5 |
| AI invocation (long) | Client component + `useTransition` + skeleton |

ทุก fetch ผ่าน `lib/api.ts` ที่:
- แนบ cookie อัตโนมัติ
- จัดการ 401 → refresh token → retry 1 ครั้ง → redirect login
- Throw `ApiError` มี `status` + `code` + `message` ที่ component ใช้แสดงได้

## 8. Form Pattern มาตรฐาน

ใช้ react-hook-form + zod resolver — schema ใน `packages/shared`

```tsx
// ตัวอย่าง: หน้าสร้างคำขอ
const form = useForm<NewPurchaseRequestInput>({
  resolver: zodResolver(newPurchaseRequestSchema),
  defaultValues: { items: [{ name: '', quantity: 1, unit: 'ชิ้น' }] }
})

// section
// 1. ข้อมูลทั่วไป (title, reason, project, budget_source)
// 2. รายการพัสดุ — useFieldArray + ปุ่ม "ให้ AI แยกรายการ"
// 3. แนบไฟล์
// 4. ปุ่ม "บันทึกร่าง" / "ส่งเรื่อง"
```

**กฎฟอร์ม:**
- Validate ทั้ง client (UX) และ server (authoritative) ด้วย zod schema เดียวกัน
- ไม่มี alert(); ใช้ inline error + toast
- ปุ่ม destructive ต้อง `<ConfirmDialog>` ก่อน
- Auto-save draft ทุก 30s สำหรับฟอร์มยาว (คำขอ, สเปก)

## 9. Table Pattern มาตรฐาน

ใช้ TanStack Table + URL state (search/filter/page อยู่ใน `searchParams`)

- Column visibility toggle
- Bulk action (เฉพาะ procurement: รับเรื่องหลายคำขอ)
- Export ปุ่มอยู่บน toolbar (Excel, PDF)
- Row click → detail page (ไม่เปิด modal)
- Sticky header + horizontal scroll บนตารางเปรียบเทียบราคา

## 10. AI Interaction Pattern

ทุกจุดที่เรียก AI ต้องเป็น flow แบบเดียวกัน:

```
[User คลิกปุ่ม "ให้ AI ช่วย..."]
        ↓
[Loading state — skeleton + ข้อความ "กำลังให้ AI ช่วยคิด..."]
        ↓
[Response มา → แสดงใน <AiSuggestionCard>]
   - ผลลัพธ์ที่เสนอ
   - "ปรับโดย AI · model claude-X · เวลา HH:MM"
   - ปุ่ม [Apply] [Reject] [Edit ก่อน Apply]
   - Disclaimer: "AI เสนอแนะเท่านั้น โปรดตรวจสอบความถูกต้อง"
        ↓
[User เลือก action → log ลง ai_invocations + audit_logs]
```

**ห้าม** AI แก้ข้อมูลฟอร์มอัตโนมัติโดยไม่มี user confirm

## 11. Accessibility & i18n

- ทุก interactive element มี label/aria
- Focus ring ชัด (Tailwind `focus-visible:`)
- รองรับ keyboard navigation เต็ม (esp. ตารางและฟอร์ม)
- ภาษาไทย default; ตัวเลขใช้อารบิก (1, 2, 3) ไม่ใช่เลขไทย เพื่อ copy ไป Excel ง่าย
- วันที่ใช้ พ.ศ. โชว์ผู้ใช้ แต่เก็บ ISO/UTC ใน DB
- เงินใช้รูปแบบไทย: `12,345.67 บาท`

## 12. Print / Export

- ทุกหน้า detail สำคัญ (PR, ใบเปรียบเทียบ, ใบตรวจรับ) ต้องมีปุ่ม "พิมพ์/Export PDF"
- PDF render ฝั่ง NestJS ด้วย Puppeteer (template เป็นหน้า Next.js `/print/...` ที่ render โดย headless browser)
- Excel ใช้ `exceljs` ฝั่ง api

## 13. หน้าจอตัวอย่าง — MVP 1

### 13.1 `/requests/new` (สร้างคำขอ)
- Section 1: ชื่อเรื่อง · เหตุผล (textarea) · โครงการ (combobox) · แหล่งงบ
- Section 2: ตารางรายการ (ลำดับ · ชื่อ · จำนวน · หน่วย · สเปก · ลบ) + ปุ่ม "+ เพิ่มแถว" + ปุ่ม "✨ ให้ AI แยกรายการจากข้อความ" → modal วาง text → preview → apply
- Section 3: แนบไฟล์ (drag & drop)
- Footer sticky: บันทึกร่าง · ส่งเรื่อง

### 13.2 `/requests` (รายการของฉัน)
- Filter: status, ช่วงวันที่, ค้นหา
- Table: doc_no · title · status · created_at · จำนวนรายการ · งบที่ใช้
- ปุ่ม "+ สร้างคำขอ" มุมบนขวา

### 13.3 `/requests/[id]` (ดู/แก้)
- Header: title · status · doc_no · timestamps · ปุ่ม Action ตาม status
- Tabs: ข้อมูล · รายการ · สเปก · ประวัติ (audit) · ความเห็น
- Sidebar ขวา (lg+): risk flags + AI suggestions
- Sticky footer: ปุ่ม "ส่งเรื่อง" (ถ้า draft) / "ส่งกลับแก้" (ถ้า procurement) / "อนุมัติเข้ารอบเปรียบเทียบ"

### 13.4 `/procurement/inbox`
- Tabs: รอตรวจ (`submitted`) · กำลังตรวจ (`reviewing`) · ส่งกลับ (`returned`) · อนุมัติแล้ว (`approved-for-comparison`)
- Bulk action: รับเรื่อง

### 13.5 `/dashboard` (Director)
- Card: คำขอรอพิจารณา · งบใช้ไปทั้งโรงเรียน · จำนวน flag เสี่ยง
- Chart: คำขอตามเดือน · ตามโครงการ
- Table: คำขอที่รอผม

## 14. Out of Scope (ฝั่งหน้าเว็บ MVP 1)

- Mobile native UI (responsive พอ)
- Dark mode
- Multi-school switcher (Phase 5)
- Real-time collaboration / SSE
- LINE OA login (Phase 5)
