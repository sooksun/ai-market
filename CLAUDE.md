# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

โปรเจกต์ **AI Procurement & Inventory Helper for School** — ระบบผู้ช่วยพัสดุและการเงินโรงเรียนด้วย AI ครอบคลุมตั้งแต่ขอซื้อ → เปรียบเทียบราคา → ตรวจระเบียบ → เสนออนุมัติ → ตรวจรับ → เบิกจ่าย → ลงทะเบียนพัสดุ → รายงาน

**สถานะปัจจุบัน:** Greenfield — ยังไม่มี source code มีเฉพาะเอกสาร PRD/plan/task เป็น `context.md`, `PRD.md`, `plan.md`, `task.md`

## Tech stack (เคาะแล้ว)

- **Monorepo** — pnpm workspaces + Turborepo
- **Frontend:** Next.js (App Router) + Tailwind CSS — `apps/web`
- **Backend:** NestJS + Prisma — `apps/api`
- **DB:** MySQL / MariaDB (Laragon)
- **Shared:** `packages/db` (Prisma client + schema), `packages/shared` (zod + types)
- **AI:** Claude API (Anthropic SDK) — ทุก call เก็บ `AiInvocation` (model + prompt version + raw I/O)
- **Auth:** NestJS Passport JWT + httpOnly cookie

โครงสร้างไดเรกทอรีเป้าหมาย:
```
apps/web/   apps/api/   packages/db/   packages/shared/
```

**กฎสำคัญของ stack นี้:**
- Type/DTO ใช้ร่วม web↔api ผ่าน `packages/shared` ห้ามนิยามซ้ำสองฝั่ง
- Prisma Client เป็น singleton (ป้องกัน hot-reload ซ้ำ)
- NestJS `AuditInterceptor` คือทางเดียวที่ mutation จะถูก log — ห้าม bypass
- Permission ตรวจฝั่ง api เป็น authoritative; ฝั่ง web แค่ซ่อน UI
- Migration: dev = `prisma migrate dev`, prod = `prisma migrate deploy` เท่านั้น

## Source-of-truth documents

อ่านก่อนทำงานเสมอ — ไฟล์เหล่านี้ขับเคลื่อนการตัดสินใจของระบบ:
- `context.md` — เอกสารต้นฉบับ vision + 5 รอบ MVP (ภาษาไทย)
- `PRD.md` — ข้อกำหนดผลิตภัณฑ์ที่สรุปจาก context
- `plan.md` — แผน implementation
- `task.md` — รายการ task แตกย่อย
- `frontend-design.md` — UX/UI/component pattern (Next.js + Tailwind)
- `database-design.md` — Prisma schema (Phase 0–4) + state machine
- `api-design.md` — REST contract (NestJS) + error codes + module layout
- `ai-design.md` — Claude API usage: 8 functions, prompts, guardrails, cost

ถ้า user ขอแก้ scope/feature ให้ตรวจว่ากระทบ 4 ไฟล์นี้หรือไม่ และอัปเดตให้สอดคล้องกัน

## หลักการที่ห้ามละเมิด (non-negotiable)

ระบบนี้เป็นเครื่องมือสำหรับ**งานพัสดุภาครัฐของโรงเรียน** ต้องตรวจสอบย้อนหลังได้และอ้างอิงระเบียบได้ ทุก feature ต้องเคารพหลักต่อไปนี้:

1. **AI ห้ามอนุมัติแทนคน** — AI เสนอแนะได้ แต่ทุก action ที่มีผลต้องให้ผู้ใช้ที่มีบทบาท (Procurement / Finance / Director) ยืนยัน
2. **Audit trail ครบ** — ทุก state change ต้องบันทึก who/what/when/why ลง `audit_logs` ห้ามมี action ที่แก้ข้อมูลโดยไม่ทิ้งร่องรอย
3. **ไม่ hardcode ระเบียบ** — vงเงิน threshold, วิธีจัดซื้อ, เอกสารที่ต้องมี ต้องเก็บใน `rule_configs` ให้ admin แก้ไขได้ เพราะระเบียบ/หนังสือเวียนเปลี่ยนได้
4. **ไม่เชื่อม e-GP โดยตรง** ใน MVP — ออกแบบเป็น “ระบบเตรียมข้อมูลก่อน/หลังเข้า e-GP” เท่านั้น เว้นแต่มี API ที่ได้รับอนุญาตชัดเจน
5. **Price snapshot ต้องมี timestamp** — ราคาจาก marketplace เปลี่ยนได้ตลอด ทุกครั้งที่ดึงราคาต้องเก็บเวลา + แหล่งที่มา
6. **AI ห้าม lock spec** — Module C (Spec Helper) ต้องตรวจคำที่เสี่ยงระบุยี่ห้อ/รุ่นเฉพาะ และเสนอเป็นคุณลักษณะขั้นต่ำแทน

## High-level architecture (เป้าหมาย)

แกนระบบ = **Web app** (ไม่ใช่ mobile-first) เพราะงานพัสดุเน้นเอกสาร ตาราง แนบไฟล์ export PDF/Excel

**Core Modules (A–I)** เรียงตามลำดับวงจรการจัดซื้อ:
- **A. Purchase Request** — คำขอซื้อ + AI Parser แยกรายการ
- **B. Budget Link** — ผูกคำขอกับโครงการ/แหล่งงบ + กันงบชั่วคราว
- **C. AI Specification Helper** — เขียนสเปก TOR แบบไม่ล็อกยี่ห้อ
- **D. Price & Vendor Comparison** — เปรียบเทียบ ≥3 ราย เก็บ price snapshot
- **E. Procurement Rule Assistant** — Rule Engine ปรับ threshold ได้
- **F. Approval Workflow** — เสนออนุมัติเป็นลำดับ + audit log
- **G. Receiving & Inspection** — ใบตรวจรับ checklist ตามสเปก
- **H. Inventory & Asset Register** — แยก **วัสดุ** (สิ้นเปลือง) vs **ครุภัณฑ์** (มีเลข + QR)
- **I. Finance Link** — สถานะเบิกจ่าย เลขใบสำคัญ หลักฐานจ่าย

**Roles** (ดู PRD §3): Requester, Project Owner, Procurement Officer, Finance Officer, Inspector, Director, Auditor — ทุก feature ต้อง map กับ role permission

**Data model หลัก** (ดู PRD §7): 25 entities — `schools`, `users`, `budgets`, `purchase_requests`, `purchase_request_items`, `vendor_quotations`, `price_snapshots`, `approval_workflows`, `receiving_records`, `asset_registers`, `audit_logs`, `ai_risk_flags`, `rule_configs` ฯลฯ

## MVP rounds (ห้ามลัดข้าม)

ระบบออกแบบเป็น 5 รอบ ต้องสร้างตามลำดับ:
1. **คำขอซื้อ + AI ช่วยจัดรายการ** — บอกลากระดาษ/ไลน์
2. **ตรวจงบ + เขียนสเปก + เตรียมเปรียบเทียบราคา**
3. **เอกสารพัสดุ + เปรียบเทียบราคา + เสนออนุมัติ** ← เป้าหมาย “ใช้งานจริงได้”
4. **ตรวจรับ + คลัง + เชื่อมการเงิน** — ปิดวงจรหลังซื้อ
5. **AI Audit + Dashboard + Multi-tenant**

**MVP 1 acceptance** (ดู PRD §12): ครูสร้างคำขอ, AI แยกรายการ ≥80%, ผูกงบได้, มี audit, ไม่มี auto-approve

## สิ่งที่ไม่ควรทำ (ตาม context §11)

- เชื่อม e-GP อัตโนมัติเต็มรูปแบบ
- ให้ AI เลือกผู้ขายโดยไม่มีคนยืนยัน
- Scraping หนักจาก marketplace
- ทำระบบบัญชีเต็มรูปแทนโปรแกรมการเงิน
- Mobile app ก่อนเว็บแอป
- ทำทุกแบบฟอร์มราชการตั้งแต่วันแรก

## ภาษา

User สื่อสารเป็นภาษาไทย — ตอบกลับและเขียนเอกสารภายในเป็นไทย ส่วน code identifier / commit message / API field ใช้ภาษาอังกฤษตามมาตรฐาน
