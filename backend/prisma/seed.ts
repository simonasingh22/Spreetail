import { PrismaClient, SplitMethod, GroupRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing database data...');
  // Delete in reverse dependency order
  await prisma.chatMessage.deleteMany();
  await prisma.expenseParticipant.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.settlement.deleteMany();
  await prisma.groupMember.deleteMany();
  await prisma.group.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding users...');
  const saltRounds = 12;
  const defaultPasswordHash = await bcrypt.hash('Test1234!', saltRounds);

  const alice = await prisma.user.create({
    data: {
      name: 'Alice Chen',
      email: 'alice@test.com',
      passwordHash: defaultPasswordHash
    }
  });

  const bob = await prisma.user.create({
    data: {
      name: 'Bob Kumar',
      email: 'bob@test.com',
      passwordHash: defaultPasswordHash
    }
  });

  const carol = await prisma.user.create({
    data: {
      name: 'Carol Smith',
      email: 'carol@test.com',
      passwordHash: defaultPasswordHash
    }
  });

  const dave = await prisma.user.create({
    data: {
      name: 'Dave Wilson',
      email: 'dave@test.com',
      passwordHash: defaultPasswordHash
    }
  });

  console.log('Seeding Group 1: Goa Trip 2024...');
  const goaTrip = await prisma.group.create({
    data: {
      name: 'Goa Trip 2024'
    }
  });

  // Add members (Alice is ADMIN)
  await prisma.groupMember.createMany({
    data: [
      { groupId: goaTrip.id, userId: alice.id, role: GroupRole.ADMIN, isActive: true },
      { groupId: goaTrip.id, userId: bob.id, role: GroupRole.MEMBER, isActive: true },
      { groupId: goaTrip.id, userId: carol.id, role: GroupRole.MEMBER, isActive: true },
      { groupId: goaTrip.id, userId: dave.id, role: GroupRole.MEMBER, isActive: true }
    ]
  });

  // Expense 1: "Hotel booking" $300, paid by Alice, split EQUAL (4 ways = $75 each)
  const hotelExpense = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      description: 'Hotel booking',
      amount: 300.00,
      date: new Date('2024-05-10T12:00:00Z'),
      paidById: alice.id,
      createdById: alice.id,
      splitMethod: SplitMethod.EQUAL
    }
  });

  await prisma.expenseParticipant.createMany({
    data: [
      { expenseId: hotelExpense.id, userId: alice.id, amountOwed: 75.00 },
      { expenseId: hotelExpense.id, userId: bob.id, amountOwed: 75.00 },
      { expenseId: hotelExpense.id, userId: carol.id, amountOwed: 75.00 },
      { expenseId: hotelExpense.id, userId: dave.id, amountOwed: 75.00 }
    ]
  });

  // Expense 2: "Scuba diving" $200, paid by Bob, split PERCENTAGE (Alice 40%, Bob 30%, Carol 30%)
  const scubaExpense = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      description: 'Scuba diving',
      amount: 200.00,
      date: new Date('2024-05-11T12:00:00Z'),
      paidById: bob.id,
      createdById: bob.id,
      splitMethod: SplitMethod.PERCENTAGE
    }
  });

  await prisma.expenseParticipant.createMany({
    data: [
      { expenseId: scubaExpense.id, userId: alice.id, amountOwed: 80.00, shareValue: 40 },
      { expenseId: scubaExpense.id, userId: bob.id, amountOwed: 60.00, shareValue: 30 },
      { expenseId: scubaExpense.id, userId: carol.id, amountOwed: 60.00, shareValue: 30 }
    ]
  });

  // Expense 3: "Dinner at Titos" $120, paid by Carol, split UNEQUAL (Alice $50, Bob $40, Carol $30)
  const dinnerExpense = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      description: 'Dinner at Titos',
      amount: 120.00,
      date: new Date('2024-05-12T12:00:00Z'),
      paidById: carol.id,
      createdById: carol.id,
      splitMethod: SplitMethod.UNEQUAL
    }
  });

  await prisma.expenseParticipant.createMany({
    data: [
      { expenseId: dinnerExpense.id, userId: alice.id, amountOwed: 50.00, shareValue: 50.00 },
      { expenseId: dinnerExpense.id, userId: bob.id, amountOwed: 40.00, shareValue: 40.00 },
      { expenseId: dinnerExpense.id, userId: carol.id, amountOwed: 30.00, shareValue: 30.00 }
    ]
  });

  // Expense 4: "Taxi to airport" $80, paid by Dave, split SHARE (Alice 2, Bob 2, Carol 1, Dave 1)
  // Total shares = 6. 80 / 6 = 13.33333333333.
  // Alice share (2): 26.6666 -> 26.66
  // Bob share (2): 26.6666 -> 26.66
  // Carol share (1): 13.3333 -> 13.33
  // Dave share (1): 13.3333 -> 13.33
  // Sum = 26.66 + 26.66 + 13.33 + 13.33 = 79.98. Remainder = 0.02.
  // Payer (Dave) absorbs remainder -> Dave share becomes 13.33 + 0.02 = 13.35.
  const taxiExpense = await prisma.expense.create({
    data: {
      groupId: goaTrip.id,
      description: 'Taxi to airport',
      amount: 80.00,
      date: new Date('2024-05-13T12:00:00Z'),
      paidById: dave.id,
      createdById: dave.id,
      splitMethod: SplitMethod.SHARE
    }
  });

  await prisma.expenseParticipant.createMany({
    data: [
      { expenseId: taxiExpense.id, userId: alice.id, amountOwed: 26.66, shareValue: 2 },
      { expenseId: taxiExpense.id, userId: bob.id, amountOwed: 26.66, shareValue: 2 },
      { expenseId: taxiExpense.id, userId: carol.id, amountOwed: 13.33, shareValue: 1 },
      { expenseId: taxiExpense.id, userId: dave.id, amountOwed: 13.35, shareValue: 1 } // Dave absorbs 2 remainder cents
    ]
  });

  // Settlement: Dave paid Alice $40 (partial settlement)
  await prisma.settlement.create({
    data: {
      groupId: goaTrip.id,
      payerId: dave.id,
      payeeId: alice.id,
      amount: 40.00,
      note: 'Partial payback for hotel'
    }
  });

  console.log('Seeding Group 2: Flat 4B Expenses...');
  const flatExpenses = await prisma.group.create({
    data: {
      name: 'Flat 4B Expenses'
    }
  });

  // Add members (Alice is ADMIN)
  await prisma.groupMember.createMany({
    data: [
      { groupId: flatExpenses.id, userId: alice.id, role: GroupRole.ADMIN, isActive: true },
      { groupId: flatExpenses.id, userId: bob.id, role: GroupRole.MEMBER, isActive: true },
      { groupId: flatExpenses.id, userId: carol.id, role: GroupRole.MEMBER, isActive: true }
    ]
  });

  // Expense 1: "Monthly rent" $1500, paid by Alice, split EQUAL (3 ways = $500 each)
  const rentExpense = await prisma.expense.create({
    data: {
      groupId: flatExpenses.id,
      description: 'Monthly rent',
      amount: 1500.00,
      date: new Date('2024-05-01T12:00:00Z'),
      paidById: alice.id,
      createdById: alice.id,
      splitMethod: SplitMethod.EQUAL
    }
  });

  await prisma.expenseParticipant.createMany({
    data: [
      { expenseId: rentExpense.id, userId: alice.id, amountOwed: 500.00 },
      { expenseId: rentExpense.id, userId: bob.id, amountOwed: 500.00 },
      { expenseId: rentExpense.id, userId: carol.id, amountOwed: 500.00 }
    ]
  });

  // Expense 2: "Electricity bill" $90, paid by Bob, split EQUAL (3 ways = $30 each)
  const electricExpense = await prisma.expense.create({
    data: {
      groupId: flatExpenses.id,
      description: 'Electricity bill',
      amount: 90.00,
      date: new Date('2024-05-05T12:00:00Z'),
      paidById: bob.id,
      createdById: bob.id,
      splitMethod: SplitMethod.EQUAL
    }
  });

  await prisma.expenseParticipant.createMany({
    data: [
      { expenseId: electricExpense.id, userId: alice.id, amountOwed: 30.00 },
      { expenseId: electricExpense.id, userId: bob.id, amountOwed: 30.00 },
      { expenseId: electricExpense.id, userId: carol.id, amountOwed: 30.00 }
    ]
  });

  console.log('Seeding complete successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
