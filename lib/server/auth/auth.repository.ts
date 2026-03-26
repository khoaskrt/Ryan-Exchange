import { AccountStatus, AppUserStatus, type Prisma, type User } from "@prisma/client";

import { prisma } from "@/lib/server/prisma";

export type SignupUserCreateInput = {
  fullName: string;
  email: string;
  passwordHash: string;
  country: string;
  referralCode?: string;
};

export type LoginUserRecord = Pick<User, "id" | "name" | "email" | "passwordHash" | "accountStatus">;

export type PublicAuthUser = Pick<User, "id" | "name" | "email" | "country">;
export type FirebaseMappedUser = Pick<
  User,
  "id" | "name" | "email" | "country" | "referralCode" | "firebaseUid" | "appStatus" | "accountStatus"
>;

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserForLogin(email: string): Promise<LoginUserRecord | null> {
  return prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      accountStatus: true,
    },
  });
}

export async function createUserWithWallet(
  input: SignupUserCreateInput,
  seedWalletFn: (tx: Prisma.TransactionClient, userId: string) => Promise<void>,
): Promise<PublicAuthUser> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: input.fullName,
        email: input.email,
        passwordHash: input.passwordHash,
        country: input.country,
        referralCode: input.referralCode,
      },
      select: {
        id: true,
        name: true,
        email: true,
        country: true,
      },
    });

    await seedWalletFn(tx, user.id);

    return user;
  });
}

export async function updateLastLoginAt(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { lastLoginAt: new Date() },
  });
}

type RegisterAppProfileInput = {
  firebaseUid: string;
  email: string;
  fullName: string;
  country: string;
  referralCode?: string;
};

export async function registerAppProfile(input: RegisterAppProfileInput): Promise<FirebaseMappedUser> {
  return prisma.user.upsert({
    where: { email: input.email },
    create: {
      name: input.fullName,
      email: input.email,
      firebaseUid: input.firebaseUid,
      country: input.country,
      referralCode: input.referralCode,
      passwordHash: "",
      appStatus: AppUserStatus.PENDING_EMAIL_VERIFICATION,
      accountStatus: AccountStatus.ACTIVE,
    },
    update: {
      name: input.fullName,
      firebaseUid: input.firebaseUid,
      country: input.country,
      referralCode: input.referralCode,
      appStatus: AppUserStatus.PENDING_EMAIL_VERIFICATION,
    },
    select: {
      id: true,
      name: true,
      email: true,
      country: true,
      referralCode: true,
      firebaseUid: true,
      appStatus: true,
      accountStatus: true,
    },
  });
}

export async function findUserByFirebaseUid(firebaseUid: string): Promise<FirebaseMappedUser | null> {
  return prisma.user.findUnique({
    where: { firebaseUid },
    select: {
      id: true,
      name: true,
      email: true,
      country: true,
      referralCode: true,
      firebaseUid: true,
      appStatus: true,
      accountStatus: true,
    },
  });
}

export async function activateUserAppStatus(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { appStatus: AppUserStatus.ACTIVE },
    select: {
      id: true,
      name: true,
      email: true,
      country: true,
      referralCode: true,
      firebaseUid: true,
      appStatus: true,
      accountStatus: true,
    },
  });
}
