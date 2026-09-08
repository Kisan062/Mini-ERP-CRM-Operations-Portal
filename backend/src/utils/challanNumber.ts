import { Prisma, PrismaClient } from '@prisma/client';

export async function generateChallanNumber(
  tx: Prisma.TransactionClient | PrismaClient
): Promise<string> {
  const currentYear = new Date().getFullYear();
  const prefix = `CH-${currentYear}-`;

  // Fetch the latest challan created in the current year
  const latestChallan = await tx.challan.findFirst({
    where: {
      challanNumber: {
        startsWith: prefix,
      },
    },
    orderBy: {
      challanNumber: 'desc',
    },
    select: {
      challanNumber: true,
    },
  });

  let nextSequence = 1;

  if (latestChallan && latestChallan.challanNumber) {
    const parts = latestChallan.challanNumber.split('-');
    if (parts.length === 3) {
      const seq = parseInt(parts[2], 10);
      if (!isNaN(seq)) {
        nextSequence = seq + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(5, '0');
  return `${prefix}${paddedSequence}`;
}
