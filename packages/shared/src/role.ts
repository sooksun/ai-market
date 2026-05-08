import { z } from 'zod';

export const RoleSchema = z.enum([
  'REQUESTER',
  'PROJECT_OWNER',
  'PROCUREMENT',
  'FINANCE',
  'INSPECTOR',
  'DIRECTOR',
  'AUDITOR',
  'ADMIN',
]);

export type Role = z.infer<typeof RoleSchema>;

export const ROLE_LABELS_TH: Record<Role, string> = {
  REQUESTER: 'ผู้ขอซื้อ',
  PROJECT_OWNER: 'หัวหน้าโครงการ',
  PROCUREMENT: 'เจ้าหน้าที่พัสดุ',
  FINANCE: 'เจ้าหน้าที่การเงิน',
  INSPECTOR: 'กรรมการตรวจรับ',
  DIRECTOR: 'ผู้บริหาร',
  AUDITOR: 'ผู้ตรวจสอบ',
  ADMIN: 'ผู้ดูแลระบบ',
};
