import { Prisma } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

import { prisma } from "@/lib/server/prisma";

const DEFAULT_INVITE_CODES = ["KV-BETA-2026", "KV-TRADER-ACCESS", "KV-EARLY-VN"];

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function isInviteUsable(invite: { isActive: boolean; usedCount: number; maxUses: number; expiresAt: Date | null }) {
  if (!invite.isActive) return false;
  if (invite.usedCount >= invite.maxUses) return false;
  if (invite.expiresAt && invite.expiresAt.getTime() < Date.now()) return false;
  return true;
}

export async function validateInviteCode(code: string) {
  const normalizedCode = normalizeCode(code);
  await ensureDefaultInviteCodes();

  const invite = await prisma.inviteCode.findUnique({
    where: { code: normalizedCode },
    select: { isActive: true, usedCount: true, maxUses: true, expiresAt: true },
  });

  if (!invite) {
    return false;
  }

  return isInviteUsable(invite);
}

export async function ensureDefaultInviteCodes() {
  const existing = await prisma.inviteCode.findMany({
    where: { code: { in: DEFAULT_INVITE_CODES } },
    select: { code: true },
  });
  const existingCodes = new Set(existing.map((item) => item.code));

  const pending = DEFAULT_INVITE_CODES.filter((code) => !existingCodes.has(code));
  if (pending.length === 0) return;

  await prisma.inviteCode.createMany({
    data: pending.map((code) => ({
      code,
      maxUses: 200,
      isActive: true,
    })),
  });
}

export async function redeemInviteForEmail(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = normalizeCode(code);

  await ensureDefaultInviteCodes();

  return prisma.$transaction(async (tx) => {
    const now = new Date();
    const invite = await tx.inviteCode.findUnique({
      where: { code: normalizedCode },
      select: { id: true, code: true, isActive: true, usedCount: true, maxUses: true, expiresAt: true },
    });

    if (!invite || !isInviteUsable(invite)) {
      throw new Error("INVALID_INVITE");
    }

    const existing = await tx.inviteRedemption.findUnique({
      where: {
        inviteCodeId_email: {
          inviteCodeId: invite.id,
          email: normalizedEmail,
        },
      },
      select: { id: true },
    });

    if (existing) {
      return { inviteCode: invite.code, alreadyRedeemed: true };
    }

    const reserveResult = await tx.inviteCode.updateMany({
      where: {
        id: invite.id,
        isActive: true,
        usedCount: { lt: invite.maxUses },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: { usedCount: { increment: 1 } },
    });

    if (reserveResult.count === 0) {
      throw new Error("INVALID_INVITE");
    }

    try {
      await tx.inviteRedemption.create({
        data: {
          inviteCodeId: invite.id,
          email: normalizedEmail,
        },
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        await tx.inviteCode.updateMany({
          where: { id: invite.id, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
        return { inviteCode: invite.code, alreadyRedeemed: true };
      }
      throw error;
    }

    return { inviteCode: invite.code, alreadyRedeemed: false };
  });
}

export async function consumeInviteForSignup(
  tx: Prisma.TransactionClient,
  args: { email: string; inviteCode: string; userId: string },
) {
  const normalizedEmail = normalizeEmail(args.email);
  const normalizedCode = normalizeCode(args.inviteCode);
  const now = new Date();

  const invite = await tx.inviteCode.findUnique({
    where: { code: normalizedCode },
    select: { id: true, isActive: true, usedCount: true, maxUses: true, expiresAt: true },
  });

  if (!invite || !isInviteUsable(invite)) {
    throw new Error("INVALID_INVITE");
  }

  let existing = await tx.inviteRedemption.findUnique({
    where: {
      inviteCodeId_email: {
        inviteCodeId: invite.id,
        email: normalizedEmail,
      },
    },
    select: { id: true, userId: true },
  });

  if (!existing) {
    const reserveResult = await tx.inviteCode.updateMany({
      where: {
        id: invite.id,
        isActive: true,
        usedCount: { lt: invite.maxUses },
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      data: { usedCount: { increment: 1 } },
    });

    if (reserveResult.count === 0) {
      throw new Error("INVALID_INVITE");
    }

    try {
      await tx.inviteRedemption.create({
        data: {
          inviteCodeId: invite.id,
          email: normalizedEmail,
          userId: args.userId,
        },
      });
      return;
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === "P2002") {
        await tx.inviteCode.updateMany({
          where: { id: invite.id, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        });
        existing = await tx.inviteRedemption.findUnique({
          where: {
            inviteCodeId_email: {
              inviteCodeId: invite.id,
              email: normalizedEmail,
            },
          },
          select: { id: true, userId: true },
        });
      } else {
        throw error;
      }
    }
  }

  if (!existing) return;

  if (!existing.userId) {
    await tx.inviteRedemption.update({
      where: { id: existing.id },
      data: { userId: args.userId },
    });
  }
}
