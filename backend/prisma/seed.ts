import { PrismaClient, Role, CustomerType, CustomerStatus, MovementType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Database ---');

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash('Admin@123', salt);
  const salesPasswordHash = await bcrypt.hash('Sales@123', salt);
  const warehousePasswordHash = await bcrypt.hash('Warehouse@123', salt);
  const accountsPasswordHash = await bcrypt.hash('Accounts@123', salt);

  // 1. Seed Users
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@operations.com' },
    update: { passwordHash: adminPasswordHash, role: Role.ADMIN },
    create: {
      name: 'System Administrator',
      email: 'admin@operations.com',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  const salesUser = await prisma.user.upsert({
    where: { email: 'sales@operations.com' },
    update: { passwordHash: salesPasswordHash, role: Role.SALES },
    create: {
      name: 'Sarah Sales',
      email: 'sales@operations.com',
      passwordHash: salesPasswordHash,
      role: Role.SALES,
    },
  });

  const warehouseUser = await prisma.user.upsert({
    where: { email: 'warehouse@operations.com' },
    update: { passwordHash: warehousePasswordHash, role: Role.WAREHOUSE },
    create: {
      name: 'Walter Warehouse',
      email: 'warehouse@operations.com',
      passwordHash: warehousePasswordHash,
      role: Role.WAREHOUSE,
    },
  });

  const accountsUser = await prisma.user.upsert({
    where: { email: 'accounts@operations.com' },
    update: { passwordHash: accountsPasswordHash, role: Role.ACCOUNTS },
    create: {
      name: 'Alice Accounts',
      email: 'accounts@operations.com',
      passwordHash: accountsPasswordHash,
      role: Role.ACCOUNTS,
    },
  });

  console.log('Seeded Users for all 4 roles:');
  console.log('===============================================================');
  console.log('ADMIN:     email: admin@operations.com     password: Admin@123');
  console.log('SALES:     email: sales@operations.com     password: Sales@123');
  console.log('WAREHOUSE: email: warehouse@operations.com password: Warehouse@123');
  console.log('ACCOUNTS:  email: accounts@operations.com  password: Accounts@123');
  console.log('===============================================================');

  // 2. Seed Sample Customers
  const customerA = await prisma.customer.upsert({
    where: { id: 'cust-apex-hardware' },
    update: {},
    create: {
      id: 'cust-apex-hardware',
      name: 'Apex Industrial Supplies',
      businessName: 'Apex Hardware Corp',
      email: 'contact@apexind.com',
      mobile: '+91 98765 43210',
      gstNumber: '27AAAAA0000A1Z5',
      customerType: CustomerType.WHOLESALE,
      address: 'Plot 42, Industrial Zone, Navi Mumbai, MH',
      status: CustomerStatus.ACTIVE,
      notes: 'Key wholesale customer. Requires batch challans.',
    },
  });

  const customerB = await prisma.customer.upsert({
    where: { id: 'cust-metro-build' },
    update: {},
    create: {
      id: 'cust-metro-build',
      name: 'Metro Build Enterprises',
      businessName: 'Metro Build & Co.',
      email: 'purchase@metrobuild.in',
      mobile: '+91 98111 22233',
      gstNumber: '07BBBBB1111B2Z6',
      customerType: CustomerType.DISTRIBUTOR,
      address: 'B-14 Sector 62, Noida, UP',
      status: CustomerStatus.LEAD,
      notes: 'Initial inquiry regarding heavy gauge fasteners.',
      followUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    },
  });

  const customerC = await prisma.customer.upsert({
    where: { id: 'cust-sharma-retail' },
    update: {},
    create: {
      id: 'cust-sharma-retail',
      name: 'Sharma Retail Store',
      businessName: 'Sharma Traders',
      email: 'sharmatraders@gmail.com',
      mobile: '+91 99223 34455',
      customerType: CustomerType.RETAIL,
      address: 'Shop 12, Main Bazaar, Jaipur, RJ',
      status: CustomerStatus.ACTIVE,
      notes: 'Retail partner, regular cash/challan delivery.',
    },
  });

  console.log('Seeded 3 Customers (Apex Hardware, Metro Build, Sharma Retail)');

  // 3. Seed Sample Products
  const productsData = [
    {
      id: 'prod-screw-m8',
      name: 'Heavy Duty Hex Bolt M8 x 50mm',
      sku: 'BLT-HEX-M8-50',
      category: 'Fasteners',
      unitPrice: 14.5,
      currentStock: 150,
      minStockAlert: 30,
      location: 'Rack A-01, Bin 4',
    },
    {
      id: 'prod-bearing-6204',
      name: 'Deep Groove Ball Bearing 6204-2RS',
      sku: 'BRG-6204-2RS',
      category: 'Bearings',
      unitPrice: 185.0,
      currentStock: 45,
      minStockAlert: 15,
      location: 'Rack B-03, Bin 2',
    },
    {
      id: 'prod-sealant-silicone',
      name: 'Industrial Grade Silicone Sealant 310ml',
      sku: 'SLT-SIL-310',
      category: 'Adhesives',
      unitPrice: 240.0,
      currentStock: 12, // Close to minStockAlert
      minStockAlert: 10,
      location: 'Rack C-02, Shelf 1',
    },
    {
      id: 'prod-gasket-flange',
      name: 'Compressed Fiber Flange Gasket 2 inch',
      sku: 'GSK-FLG-002',
      category: 'Gaskets',
      unitPrice: 65.0,
      currentStock: 5, // Below minStockAlert (Red warning!)
      minStockAlert: 20,
      location: 'Rack D-01, Shelf 3',
    },
    {
      id: 'prod-drill-bit-10mm',
      name: 'HSS Cobalt Jobber Drill Bit 10mm',
      sku: 'TL-DB-HSS-10',
      category: 'Tools',
      unitPrice: 320.0,
      currentStock: 60,
      minStockAlert: 10,
      location: 'Tool Crib 1',
    },
  ];

  for (const p of productsData) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        category: p.category,
        unitPrice: p.unitPrice,
        minStockAlert: p.minStockAlert,
        location: p.location,
      },
      create: {
        id: p.id,
        name: p.name,
        sku: p.sku,
        category: p.category,
        unitPrice: p.unitPrice,
        currentStock: p.currentStock,
        minStockAlert: p.minStockAlert,
        location: p.location,
      },
    });

    // Ensure initial stock log exists
    const existingLog = await prisma.stockLog.findFirst({
      where: { productId: product.id, reason: 'Initial Seed Stock' },
    });

    if (!existingLog) {
      await prisma.stockLog.create({
        data: {
          productId: product.id,
          quantityChanged: p.currentStock,
          movementType: MovementType.IN,
          reason: 'Initial Seed Stock',
          createdBy: warehouseUser.id,
        },
      });
    }
  }

  console.log('Seeded 5 Products with initial stock logs.');
  console.log('--- Seed Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
