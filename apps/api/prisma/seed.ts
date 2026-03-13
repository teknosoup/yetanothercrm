import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permissionKeys = [
    'lead.create',
    'lead.read',
    'lead.update',
    'lead.delete',
    'lead.convert',
    'user.read',
    'user.manage',
    'role.manage',
  ];

  await prisma.permission.createMany({
    data: permissionKeys.map((key) => {
      const [module, action] = key.split('.');
      return {
        key,
        module,
        action,
      };
    }),
    skipDuplicates: true,
  });

  const [adminRole, salesRole, marketingRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'Admin' },
      update: {},
      create: { name: 'Admin', description: 'Full access' },
    }),
    prisma.role.upsert({
      where: { name: 'Sales' },
      update: {},
      create: { name: 'Sales', description: 'Sales user' },
    }),
    prisma.role.upsert({
      where: { name: 'Marketing' },
      update: {},
      create: { name: 'Marketing', description: 'Marketing user' },
    }),
  ]);

  const permissions = await prisma.permission.findMany({
    where: { key: { in: permissionKeys } },
  });

  const permissionByKey = new Map(permissions.map((p) => [p.key, p]));

  const adminPermissionIds = permissionKeys
    .map((k) => permissionByKey.get(k)?.id)
    .filter((id): id is string => Boolean(id));

  const salesPermissionIds = [
    'lead.create',
    'lead.read',
    'lead.update',
    'lead.convert',
  ]
    .map((k) => permissionByKey.get(k)?.id)
    .filter((id): id is string => Boolean(id));

  const marketingPermissionIds = ['lead.create', 'lead.read']
    .map((k) => permissionByKey.get(k)?.id)
    .filter((id): id is string => Boolean(id));

  await prisma.rolePermission.createMany({
    data: adminPermissionIds.map((permissionId) => ({
      roleId: adminRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });

  await prisma.rolePermission.createMany({
    data: salesPermissionIds.map((permissionId) => ({
      roleId: salesRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });

  await prisma.rolePermission.createMany({
    data: marketingPermissionIds.map((permissionId) => ({
      roleId: marketingRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });

  const adminEmail = 'admin@example.com';
  const passwordHash = await bcrypt.hash('Admin123!', 12);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: { roleId: adminRole.id },
    create: {
      email: adminEmail,
      fullName: 'Admin',
      passwordHash,
      roleId: adminRole.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    await prisma.$disconnect();
    throw error;
  });

