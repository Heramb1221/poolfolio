import { PrismaClient, GroupRole, InvestmentType, InvestmentStatus, TransactionType, DocumentType, DocumentStatus, ExtractionStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding development database...');

  // Clean existing data in reverse dependency order
  await prisma.aIExtraction.deleteMany();
  await prisma.document.deleteMany();
  await prisma.brokerConnection.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.contribution.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.user.deleteMany();

  // 1. Seed Users (synthetic test data)
  const alice = await prisma.user.create({
    data: {
      name: 'Alice Johnson',
      email: 'alice.dev@example.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dev_mock_hash_alice',
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Smith',
      email: 'bob.dev@example.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dev_mock_hash_bob',
    },
  });

  const charlie = await prisma.user.create({
    data: {
      name: 'Charlie Davis',
      email: 'charlie.dev@example.com',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dev_mock_hash_charlie',
    },
  });

  console.log(`Created 3 seed users: ${alice.name}, ${bob.name}, ${charlie.name}`);

  // 2. Seed Group
  const group = await prisma.group.create({
    data: {
      name: 'Alpha Wealth Syndicate',
      createdById: alice.id,
    },
  });

  console.log(`Created seed group: ${group.name}`);

  // 3. Seed Group Members
  await prisma.groupMember.createMany({
    data: [
      { groupId: group.id, userId: alice.id, role: GroupRole.LEADER },
      { groupId: group.id, userId: bob.id, role: GroupRole.CO_LEADER },
      { groupId: group.id, userId: charlie.id, role: GroupRole.MEMBER },
    ],
  });

  console.log('Assigned group roles (LEADER, CO_LEADER, MEMBER)');

  // 4. Seed Investments
  // Investment 1: Tata Technologies IPO (Active, Locked)
  const tataIpo = await prisma.investment.create({
    data: {
      groupId: group.id,
      name: 'Tata Technologies IPO',
      symbol: 'TATATECH',
      type: InvestmentType.IPO,
      exchange: 'NSE',
      broker: 'Groww',
      status: InvestmentStatus.ACTIVE,
      startDate: new Date('2026-01-10T10:00:00Z'),
      lockDate: new Date('2026-01-15T17:00:00Z'),
    },
  });

  // Investment 2: Reliance Industries (Draft)
  const relianceStock = await prisma.investment.create({
    data: {
      groupId: group.id,
      name: 'Reliance Industries Accumulation',
      symbol: 'RELIANCE',
      type: InvestmentType.STOCK,
      exchange: 'NSE',
      status: InvestmentStatus.DRAFT,
      startDate: new Date('2026-02-01T09:15:00Z'),
    },
  });

  // 5. Seed Contributions for Tata IPO
  await prisma.contribution.createMany({
    data: [
      {
        investmentId: tataIpo.id,
        userId: alice.id,
        amount: new Prisma.Decimal('15000.0000'),
        notes: 'Initial commitment - UPI transfer',
      },
      {
        investmentId: tataIpo.id,
        userId: bob.id,
        amount: new Prisma.Decimal('10000.0000'),
        notes: 'Initial commitment - IMPS',
      },
      {
        investmentId: tataIpo.id,
        userId: charlie.id,
        amount: new Prisma.Decimal('5000.0000'),
        notes: 'Initial commitment',
      },
    ],
  });

  // 6. Seed Transactions (Application, Allotment, Refund)
  await prisma.transaction.createMany({
    data: [
      {
        investmentId: tataIpo.id,
        userId: alice.id,
        type: TransactionType.CONTRIBUTION,
        amount: new Prisma.Decimal('15000.0000'),
        reference: 'CONTRIB-ALICE-001',
        notes: 'Member pooled funds received',
      },
      {
        investmentId: tataIpo.id,
        userId: bob.id,
        type: TransactionType.CONTRIBUTION,
        amount: new Prisma.Decimal('10000.0000'),
        reference: 'CONTRIB-BOB-001',
        notes: 'Member pooled funds received',
      },
      {
        investmentId: tataIpo.id,
        userId: charlie.id,
        type: TransactionType.CONTRIBUTION,
        amount: new Prisma.Decimal('5000.0000'),
        reference: 'CONTRIB-CHARLIE-001',
        notes: 'Member pooled funds received',
      },
      {
        investmentId: tataIpo.id,
        type: TransactionType.BUY,
        quantity: new Prisma.Decimal('30.0000'),
        price: new Prisma.Decimal('500.0000'),
        amount: new Prisma.Decimal('15000.0000'),
        reference: 'BID-TATATECH-30SH',
        notes: 'IPO application submitted for 30 shares',
      },
      {
        investmentId: tataIpo.id,
        type: TransactionType.ALLOTMENT,
        quantity: new Prisma.Decimal('20.0000'),
        price: new Prisma.Decimal('500.0000'),
        amount: new Prisma.Decimal('10000.0000'),
        reference: 'ALLOT-TATATECH-20SH',
        notes: 'Partial allotment of 20 shares confirmed',
      },
      {
        investmentId: tataIpo.id,
        type: TransactionType.REFUND,
        amount: new Prisma.Decimal('5000.0000'),
        reference: 'REFUND-TATATECH-UNALLOTTED',
        notes: 'Unallotted share refund from broker',
      },
    ],
  });

  // 7. Seed Document & AI Extraction sample
  const doc = await prisma.document.create({
    data: {
      investmentId: tataIpo.id,
      uploadedById: alice.id,
      fileName: 'tatatech_allotment_advice.pdf',
      fileUrl: '/uploads/documents/tatatech_allotment_advice.pdf',
      documentType: DocumentType.IPO_ALLOTMENT,
      status: DocumentStatus.PROCESSED,
    },
  });

  await prisma.aIExtraction.create({
    data: {
      documentId: doc.id,
      model: 'gemma-2-9b-it',
      extractedData: {
        company: 'Tata Technologies Limited',
        bidQuantity: 30,
        allottedQuantity: 20,
        issuePrice: 500.0,
        refundAmount: 5000.0,
        applicationNumber: 'IPO-2026-TT-99812',
      },
      confidence: new Prisma.Decimal('0.9850'),
      status: ExtractionStatus.CONFIRMED,
      confirmedById: alice.id,
      confirmedAt: new Date(),
    },
  });

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
