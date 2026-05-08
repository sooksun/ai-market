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

  console.log(`Seeded school "${school.name}" (id=${school.id}) + ${seedUsers.length} users + ${ruleSeeds.length} rules`);
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
