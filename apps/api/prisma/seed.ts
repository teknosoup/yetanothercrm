import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const permissionKeys = [
    'lead.create',
    'lead.read',
    'lead.update',
    'lead.assign',
    'lead.merge',
    'lead.delete',
    'lead.convert',
    'account.create',
    'account.read',
    'account.update',
    'account.delete',
    'contact.create',
    'contact.read',
    'contact.update',
    'contact.delete',
    'opportunity.create',
    'opportunity.read',
    'opportunity.update',
    'opportunity.delete',
    'task.create',
    'task.read',
    'task.update',
    'task.delete',
    'activity.create',
    'activity.read',
    'activity.update',
    'activity.delete',
    'note.create',
    'note.read',
    'note.update',
    'note.delete',
    'dashboard.read',
    'audit.read',
    'search.read',
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

  const [
    adminRole,
    salesRole,
    marketingRole,
    customerServiceRole,
    supervisorRole,
    managementRole,
  ] = await Promise.all([
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
    prisma.role.upsert({
      where: { name: 'Customer Service' },
      update: {},
      create: { name: 'Customer Service', description: 'Support user' },
    }),
    prisma.role.upsert({
      where: { name: 'Supervisor' },
      update: {},
      create: { name: 'Supervisor', description: 'Team lead / supervisor' },
    }),
    prisma.role.upsert({
      where: { name: 'Management' },
      update: {},
      create: { name: 'Management', description: 'Management / executive view' },
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
    'account.create',
    'account.read',
    'account.update',
    'contact.create',
    'contact.read',
    'contact.update',
    'opportunity.create',
    'opportunity.read',
    'opportunity.update',
    'search.read',
  ]
    .map((k) => permissionByKey.get(k)?.id)
    .filter((id): id is string => Boolean(id));

  const marketingPermissionIds = [
    'lead.create',
    'lead.read',
    'dashboard.read',
    'search.read',
  ]
    .map((k) => permissionByKey.get(k)?.id)
    .filter((id): id is string => Boolean(id));

  const customerServicePermissionIds = [
    'lead.read',
    'account.read',
    'contact.read',
    'contact.update',
    'task.create',
    'task.read',
    'task.update',
    'activity.create',
    'activity.read',
    'activity.update',
    'search.read',
  ]
    .map((k) => permissionByKey.get(k)?.id)
    .filter((id): id is string => Boolean(id));

  const supervisorPermissionIds = [
    'lead.read',
    'lead.assign',
    'lead.merge',
    'account.read',
    'contact.read',
    'opportunity.read',
    'task.read',
    'activity.read',
    'note.read',
    'dashboard.read',
    'audit.read',
    'search.read',
    'user.read',
  ]
    .map((k) => permissionByKey.get(k)?.id)
    .filter((id): id is string => Boolean(id));

  const managementPermissionIds = [
    'lead.read',
    'account.read',
    'contact.read',
    'opportunity.read',
    'dashboard.read',
    'audit.read',
    'search.read',
    'user.read',
  ]
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

  await prisma.rolePermission.createMany({
    data: customerServicePermissionIds.map((permissionId) => ({
      roleId: customerServiceRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });

  await prisma.rolePermission.createMany({
    data: supervisorPermissionIds.map((permissionId) => ({
      roleId: supervisorRole.id,
      permissionId,
    })),
    skipDuplicates: true,
  });

  await prisma.rolePermission.createMany({
    data: managementPermissionIds.map((permissionId) => ({
      roleId: managementRole.id,
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
