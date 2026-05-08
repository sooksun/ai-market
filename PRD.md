# PRD — AI Procurement & Inventory Helper for School

> เอกสารฉบับนี้สรุปจาก `context.md` เพื่อใช้เป็นข้อกำหนดผลิตภัณฑ์ที่อ้างอิงได้
> ฉบับเต็มและเหตุผลเชิงนโยบายอยู่ที่ `context.md`

## 1. Product Vision

เว็บแอปช่วยโรงเรียนจัดการงานพัสดุครบวงจร: รวบรวมความต้องการซื้อ → ตรวจงบ → เปรียบเทียบราคา → จัดทำเอกสาร → ตรวจรับ → ลงทะเบียนวัสดุ/ครุภัณฑ์ → เชื่อมงานการเงิน → รายงาน

**ตอบคำถามให้ได้ว่า:** ซื้อจำเป็นไหม / อยู่ในแผนไหน / ใช้วิธีจัดซื้อแบบใด / มีหลักฐานเปรียบเทียบราคาพอยัง / สเปกตรงไหม / ใครขอ-ตรวจ-อนุมัติ / ลงทะเบียนแล้วยัง / เบิกจ่ายแล้วยัง / ตรวจย้อนหลังได้ไหม

**ขอบเขตที่ชัดเจน:** MVP ระยะแรก = ระบบเตรียมข้อมูลก่อน/หลังเข้า e-GP ไม่ใช่ระบบที่เขียนข้อมูลแทน e-GP

## 2. Guiding Principles

| # | หลัก | นัยต่อการ implement |
|---|------|---------------------|
| 1 | AI ช่วยเตรียม/วิเคราะห์/ตรวจเตือน/สรุป — ไม่ตัดสินใจแทน | ทุก action ต้องมี human-in-the-loop |
| 2 | ทุกขั้นต้องตรวจสอบย้อนหลังได้ | `audit_logs` ครอบคลุมทุก mutation |
| 3 | ระเบียบเปลี่ยนได้ | Rule Engine + threshold ใน `rule_configs` |
| 4 | หลักฐานราคาต้องมี timestamp | `price_snapshots` เก็บแหล่งที่มา + เวลา |
| 5 | AI ห้าม lock spec ยี่ห้อ | Module C ต้องเตือนคำเสี่ยงทุกครั้ง |

## 3. User Roles & Permissions

| Role | สิทธิ์หลัก |
|------|-----------|
| Teacher / Requester | สร้าง/แก้คำขอ ติดตามสถานะ |
| Project Owner | ตรวจความจำเป็นและงบโครงการ |
| Procurement Officer | ตรวจสเปก เปรียบเทียบราคา จัดทำเอกสาร ลงทะเบียนพัสดุ |
| Finance Officer | ตรวจงบ บันทึกจ่าย แนบหลักฐาน |
| Inspector / Committee | ตรวจรับ ลงความเห็น |
| Director | อนุมัติ ดู dashboard |
| Auditor | ดูรายงาน + audit log (read-only) |

## 4. Core Modules

### Module A — Purchase Request
ครูสร้างคำขอ → ระบุรายการ จำนวน หน่วย เหตุผล → แนบแผน/โครงการ → AI ช่วยปรับถ้อยคำเป็นภาษาราชการ + เตือนรายการคลุมเครือ

### Module B — Budget Link
ผูกคำขอกับโครงการ + แหล่งงบ (อุดหนุน / รายได้ / โครงการเฉพาะ) → ตรวจคงเหลือ → กันงบชั่วคราว → เตือนงบไม่พอ

### Module C — AI Specification Helper
เขียนสเปกกลาง / ตรวจคำเสี่ยงล็อกยี่ห้อ / แยก must-have vs nice-to-have / สร้าง checklist ตรวจรับ / สร้างเกณฑ์เปรียบเทียบ

### Module D — Price & Vendor Comparison
ค้นราคาจาก marketplace ที่เข้าถึงได้ + นำเข้าใบเสนอราคา (PDF/รูป/Excel) + ร้านท้องถิ่น → ตารางเปรียบเทียบ ≥3 ราย พร้อม timestamp

### Module E — Procurement Rule Assistant
Rule Engine ตรวจวงเงิน / แนะนำวิธีจัดซื้อ / เตือนเอกสารที่ต้องมี / เตือนกรณีต้องประกาศราคากลาง — threshold ปรับได้ผ่าน admin

### Module F — Approval Workflow
ส่งต่อเป็นลำดับ → ส่งกลับแก้ → ลงความเห็น → แนบเอกสาร → บันทึกเวลา/ผู้ดำเนินการ → สร้างเลขเอกสาร

### Module G — Receiving & Inspection
ใบตรวจรับ + checklist ตามสเปก + แนบรูป + จำนวนรับจริง + ของขาด/ชำรุด → สถานะ ครบ/บางส่วน/ไม่รับ

### Module H — Inventory & Asset Register
- **วัสดุ:** รับเข้า เบิกออก คงเหลือ จุดสั่งซื้อใหม่ รายงานใช้รายเดือน
- **ครุภัณฑ์:** เลขครุภัณฑ์ หมวด สถานที่ใช้ ผู้รับผิดชอบ ราคา รูป QR ประวัติซ่อม สถานะ

### Module I — Finance Link
สถานะรอเบิก/จ่ายแล้ว เลขใบสำคัญ วันจ่าย วิธีจ่าย หลักฐานจ่าย สรุปงบใช้จริง vs กันไว้ รายงานค้างจ่าย

## 5. MVP Roadmap (5 รอบ)

| รอบ | ชื่อ | แก่น | Acceptance สำคัญ |
|-----|------|------|-------------------|
| 1 | คำขอซื้ออัจฉริยะ | รวมความต้องการซื้อให้เป็นระบบ | ครูสร้างคำขอได้, AI แยกรายการ ≥80%, ผูกงบได้, มี audit, ไม่มี auto-approve |
| 2 | ตรวจงบ + เขียนสเปก | คำขอพร้อมจัดซื้อ | Budget ledger, AI spec writer, เตือนล็อกยี่ห้อ, นำเข้าใบเสนอราคา |
| 3 | เอกสาร + เปรียบเทียบราคา + อนุมัติ | ใช้งานจริง | Workflow อนุมัติ, ตารางเปรียบเทียบ, export PDF/Excel, audit log ละเอียด |
| 4 | ตรวจรับ + คลัง + การเงิน | ปิดวงจรหลังซื้อ | ใบตรวจรับ, QR ครุภัณฑ์, สถานะเบิกจ่าย, dashboard งบใช้จริง |
| 5 | AI Audit + Multi-tenant | SaaS ระดับเครือข่าย | AI Audit, dashboard ผู้บริหาร, แจ้งเตือน, knowledge base ระเบียบ, LINE OA |

**กลยุทธ์ที่แนะนำ:** ทำ MVP 1–3 รวมกันแบบบางก่อน — คำขอซื้อ → ตรวจงบ → AI ช่วยเขียนสเปก → เปรียบเทียบราคา → Export เอกสารเสนออนุมัติ

## 6. Acceptance Criteria — MVP รอบ 1 (ล็อก)

- [ ] ครูสร้างคำขอซื้อได้
- [ ] AI แยกรายการพัสดุได้ ≥ 80%
- [ ] ระบบผูกคำขอกับโครงการ/งบได้
- [ ] เจ้าหน้าที่พัสดุตรวจและส่งกลับแก้ไขได้
- [ ] สถานะงานชัดเจน (draft / submitted / reviewing / returned / approved-for-comparison)
- [ ] มีประวัติการแก้ไข
- [ ] Export รายการเป็น Excel/PDF ได้
- [ ] AI เตือนรายการที่สเปกไม่ชัดเจน
- [ ] ผู้บริหารดูรายการรอพิจารณาได้
- [ ] **ไม่มี** การอนุมัติอัตโนมัติโดย AI

## 7. Data Model (entities หลัก)

```
schools, users, roles
budgets, budget_sources, projects
purchase_requests, purchase_request_items, item_specifications
vendors, vendor_quotations, quotation_items, price_snapshots
procurement_methods, procurement_documents
approval_workflows, approval_steps
receiving_records, receiving_items
inventory_items, asset_registers, stock_movements
payment_records
audit_logs, ai_risk_flags
document_templates, rule_configs
```

## 8. AI Functions

| Function | บทบาท |
|----------|------|
| AI Parser | แปลงข้อความ/รูป/Excel → รายการพัสดุ |
| AI Spec Writer | เขียนสเปกกลาง ไม่ระบุยี่ห้อ |
| AI Price Comparator | เทียบราคา + ค่าส่ง + ความน่าเชื่อถือ |
| AI Document Drafter | ร่างบันทึกข้อความ/รายงาน |
| AI Compliance Checker | ตรวจครบถ้วนเอกสาร/เงื่อนไข |
| AI Audit Assistant | หาความเสี่ยง: ราคาผิดปกติ ใบเสนอราคาน้อย สเปกล็อก เอกสารขาด |

หลักร่วม: **AI เสนอแนะได้ แต่คนต้องตรวจและยืนยัน**

## 9. หน้าจอหลัก

Dashboard (ผู้บริหาร / พัสดุ / การเงิน) · สร้างคำขอซื้อ · เขียนสเปก · เปรียบเทียบราคา · เอกสารพัสดุ · อนุมัติ · ตรวจรับ · ทะเบียนวัสดุ · ทะเบียนครุภัณฑ์ · สถานะเบิกจ่าย · รายงาน · AI Audit · ตั้งค่า rule/threshold/template

## 10. Out of Scope (MVP รอบแรก)

- เชื่อม e-GP อัตโนมัติเต็มรูปแบบ
- ให้ AI สั่งซื้อ/เลือกผู้ขายโดยไม่มีคนยืนยัน
- Scraping หนักจาก marketplace
- ระบบบัญชีเต็มรูปแบบ
- Mobile app (ทำเว็บก่อน)
- แบบฟอร์มราชการครบทุกแบบตั้งแต่วันแรก
