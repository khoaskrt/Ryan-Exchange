import type { AuthEventStatus, AuthEventType } from "@prisma/client";

import { prisma } from "@/lib/server/prisma";

type AuthAuditInput = {
  eventType: AuthEventType;
  status: AuthEventStatus;
  email?: string;
  userId?: string;
  country?: string;
  providerLabel?: string;
  errorCode?: string;
};

export async function recordAuthAudit(input: AuthAuditInput) {
  try {
    await prisma.authAuditLog.create({
      data: {
        eventType: input.eventType,
        status: input.status,
        email: input.email,
        userId: input.userId,
        country: input.country,
        providerLabel: input.providerLabel,
        errorCode: input.errorCode,
      },
    });
  } catch (error) {
    // Audit failures should not block auth flows.
    console.error("Failed to persist auth audit log", error);
  }
}
