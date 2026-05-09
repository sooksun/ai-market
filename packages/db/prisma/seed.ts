import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'dev1234';

async function main() {
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const school = await prisma.school.upsert({
    where: { id: 'seed-school-001' },
    update: {},
    create: {
      id: 'seed-school-001',
      name: 'โรงเรียนทดสอบ',
      shortName: 'ทดสอบ',
      phone: '02-000-0000',
    },
  });

  const seedUsers: { email: string; fullName: string; role: Role }[] = [
    { email: 'requester@test.local', fullName: 'ครูสมชาย ใจดี', role: Role.REQUESTER },
    { email: 'projectowner@test.local', fullName: 'หัวหน้าโครงการ', role: Role.PROJECT_OWNER },
    { email: 'procurement@test.local', fullName: 'เจ้าหน้าที่พัสดุ', role: Role.PROCUREMENT },
    { email: 'finance@test.local', fullName: 'เจ้าหน้าที่การเงิน', role: Role.FINANCE },
    { email: 'inspector@test.local', fullName: 'กรรมการตรวจรับ', role: Role.INSPECTOR },
    { email: 'director@test.local', fullName: 'ผู้อำนวยการ', role: Role.DIRECTOR },
    { email: 'auditor@test.local', fullName: 'ผู้ตรวจสอบภายใน', role: Role.AUDITOR },
    { email: 'admin@test.local', fullName: 'ผู้ดูแลระบบ', role: Role.ADMIN },
  ];

  for (const u of seedUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        schoolId: school.id,
      },
    });
    await prisma.userRole.upsert({
      where: { userId_role: { userId: user.id, role: u.role } },
      update: {},
      create: { userId: user.id, role: u.role },
    });
  }

  const ruleSeeds: { key: string; type: string; value: unknown; description: string }[] = [
    {
      key: 'spec_lock_words',
      type: 'list',
      value: { words: ['Lenovo', 'Dell', 'HP', 'Apple', 'ยี่ห้อ', 'รุ่น'] },
      description: 'คำที่บ่งชี้ว่าสเปกอาจล็อกยี่ห้อ',
    },
    {
      key: 'procurement_thresholds',
      type: 'thresholds',
      value: { specific_method_max: 500000 },
      description: 'วงเงินสูงสุดของวิธีจัดซื้อแต่ละแบบ (บาท)',
    },
    {
      key: 'required_docs_by_method',
      type: 'checklist',
      value: {
        SPECIFIC_METHOD: ['memo', 'compare_table', 'tor'],
        E_BIDDING: ['memo', 'tor', 'price_announcement'],
      },
      description: 'เอกสารที่ต้องมีตามวิธีจัดซื้อ',
    },
  ];

  for (const r of ruleSeeds) {
    await prisma.ruleConfig.upsert({
      where: { schoolId_key: { schoolId: school.id, key: r.key } },
      update: { value: r.value as object, type: r.type, description: r.description },
      create: {
        schoolId: school.id,
        key: r.key,
        type: r.type,
        value: r.value as object,
        description: r.description,
      },
    });
  }

  const fiscalYear = 2568;
  const projectSeeds: { code: string; name: string }[] = [
    { code: 'P-VOC', name: 'พัฒนาห้องเรียนวิชาชีพ' },
    { code: 'P-LIB', name: 'ปรับปรุงห้องสมุด' },
    { code: 'P-IT', name: 'พัฒนาระบบ IT โรงเรียน' },
  ];
  for (const p of projectSeeds) {
    await prisma.project.upsert({
      where: {
        schoolId_fiscalYear_code: { schoolId: school.id, fiscalYear, code: p.code },
      },
      update: { name: p.name },
      create: { schoolId: school.id, fiscalYear, code: p.code, name: p.name },
    });
  }

  const budgetSeeds: { code: string; name: string; type: string; totalAmount: number }[] = [
    { code: 'BS-01', name: 'งบอุดหนุนทั่วไป', type: 'อุดหนุน', totalAmount: 1500000 },
    { code: 'BS-02', name: 'งบรายได้สถานศึกษา', type: 'รายได้', totalAmount: 800000 },
    { code: 'BS-03', name: 'งบโครงการเฉพาะ (สพฐ.)', type: 'โครงการเฉพาะ', totalAmount: 500000 },
  ];
  for (const b of budgetSeeds) {
    await prisma.budgetSource.upsert({
      where: {
        schoolId_fiscalYear_code: { schoolId: school.id, fiscalYear, code: b.code },
      },
      update: { name: b.name, type: b.type, totalAmount: b.totalAmount },
      create: {
        schoolId: school.id,
        fiscalYear,
        code: b.code,
        name: b.name,
        type: b.type,
        totalAmount: b.totalAmount,
      },
    });
  }

  // Seed budget allocations: each project gets a slice of one budget source.
  const projects = await prisma.project.findMany({
    where: { schoolId: school.id, fiscalYear },
  });
  const sources = await prisma.budgetSource.findMany({
    where: { schoolId: school.id, fiscalYear },
  });
  const allocations: Array<{ projectCode: string; sourceCode: string; amount: number }> = [
    { projectCode: 'P-VOC', sourceCode: 'BS-01', amount: 600000 },
    { projectCode: 'P-LIB', sourceCode: 'BS-01', amount: 400000 },
    { projectCode: 'P-IT', sourceCode: 'BS-03', amount: 300000 },
  ];
  let allocCount = 0;
  for (const a of allocations) {
    const p = projects.find((x) => x.code === a.projectCode);
    const s = sources.find((x) => x.code === a.sourceCode);
    if (!p || !s) continue;
    const existing = await prisma.budget.findUnique({
      where: {
        schoolId_fiscalYear_projectId_budgetSourceId: {
          schoolId: school.id,
          fiscalYear,
          projectId: p.id,
          budgetSourceId: s.id,
        },
      },
    });
    if (!existing) {
      const created = await prisma.budget.create({
        data: {
          schoolId: school.id,
          fiscalYear,
          projectId: p.id,
          budgetSourceId: s.id,
          allocated: a.amount,
          notes: 'seeded allocation',
        },
      });
      await prisma.budgetMovement.create({
        data: {
          budgetId: created.id,
          type: 'ALLOCATE',
          amount: a.amount,
          note: 'initial allocation',
        },
      });
      allocCount++;
    }
  }

  // Phase 3: sample vendors
  const vendorSeeds: Array<{
    id: string;
    name: string;
    taxId: string | null;
    phone: string | null;
    rating: number;
  }> = [
    {
      id: 'seed-vendor-sis',
      name: 'บริษัท เอสไอเอส ดิสทริบิวชั่น จำกัด',
      taxId: '0105541081234',
      phone: '02-555-1234',
      rating: 4.7,
    },
    {
      id: 'seed-vendor-itpro',
      name: 'ห้างหุ้นส่วน ไอที โปร',
      taxId: '0993000067890',
      phone: '02-666-5678',
      rating: 4.4,
    },
    {
      id: 'seed-vendor-ccnt',
      name: 'บริษัท คอมพิวเตอร์เซ็นเตอร์ จำกัด',
      taxId: '0105533099999',
      phone: '02-777-1111',
      rating: 4.1,
    },
    {
      id: 'seed-vendor-tk',
      name: 'ร้าน ทีเค คอมพิวเตอร์',
      taxId: null,
      phone: '081-234-5678',
      rating: 3.6,
    },
  ];
  for (const v of vendorSeeds) {
    await prisma.vendor.upsert({
      where: { id: v.id },
      update: {},
      create: {
        id: v.id,
        schoolId: school.id,
        name: v.name,
        taxId: v.taxId,
        phone: v.phone,
        rating: v.rating,
      },
    });
  }

  console.log(
    `Seeded school "${school.name}" (id=${school.id}) + ${seedUsers.length} users + ${ruleSeeds.length} rules + ${projectSeeds.length} projects + ${budgetSeeds.length} budget sources + ${allocCount} budget allocations + ${vendorSeeds.length} vendors`,
  );
  console.log(`Default password for all seeded users: ${DEFAULT_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
