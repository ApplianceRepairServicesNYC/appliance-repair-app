import { PrismaClient, Role, TechnicianStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'System Admin';

  const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: hashedAdminPassword,
      name: adminName,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  console.log(`Admin user created: ${admin.email}`);

  // Create demo technician
  const techEmail = 'tech@company.com';
  const techPassword = await bcrypt.hash('tech123', 10);

  const techUser = await prisma.user.upsert({
    where: { email: techEmail },
    update: {},
    create: {
      email: techEmail,
      password: techPassword,
      name: 'John Technician',
      role: Role.TECHNICIAN,
      isActive: true,
    },
  });

  const technician = await prisma.technician.upsert({
    where: { userId: techUser.id },
    update: {},
    create: {
      userId: techUser.id,
      phone: '+1234567890',
      status: TechnicianStatus.ACTIVE,
      weeklyQuota: 25,
      currentWeekCompleted: 0,
    },
  });

  console.log(`Demo technician created: ${techUser.email}`);

  // Create default schedule for technician (Mon-Fri 9am-5pm)
  for (let day = 1; day <= 5; day++) {
    await prisma.schedule.upsert({
      where: {
        technicianId_dayOfWeek: {
          technicianId: technician.id,
          dayOfWeek: day,
        },
      },
      update: {},
      create: {
        technicianId: technician.id,
        dayOfWeek: day,
        startTime: '09:00',
        endTime: '17:00',
        isAvailable: true,
      },
    });
  }

  console.log('Default schedule created for technician');

  // Create system config defaults
  const configs = [
    { key: 'default_weekly_quota', value: '25', description: 'Default weekly quota for technicians' },
    { key: 'quota_reset_day', value: '1', description: 'Day of week for quota reset (0=Sun, 1=Mon, etc.)' },
    { key: 'quota_reset_hour', value: '0', description: 'Hour of day for quota reset (0-23)' },
    { key: 'auto_lock_enabled', value: 'true', description: 'Auto-lock technicians who miss quota' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('System config defaults created');

  // Create initial audit log
  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'CREATE',
      entityType: 'SYSTEM',
      entityId: null,
      details: { message: 'System initialized via seed' },
    },
  });

  console.log('Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
