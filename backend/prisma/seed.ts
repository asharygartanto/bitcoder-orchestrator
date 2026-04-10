import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgSlug = process.env.ORGANIZATION_SLUG || 'bitcoder-default';
  const orgName = process.env.ORGANIZATION_NAME || 'Bitcoder Default Org';
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@bitcoder.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
  const adminName = process.env.ADMIN_NAME || 'Admin';

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: {},
    create: {
      name: orgName,
      slug: orgSlug,
    },
  });

  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: 'SUPER_ADMIN',
      organizationId: org.id,
    },
  });

  console.log('Seed completed:');
  console.log(`  Organization: ${org.name} (${org.slug})`);
  console.log(`  Admin: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
