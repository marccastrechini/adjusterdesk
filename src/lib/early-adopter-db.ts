import { Prisma, UserRole } from "@/generated/prisma/client";
import {
  canConvertWorkspaceToEarlyAdopter,
  createEarlyAdopterToken,
  describeEarlyAccess,
  earlyAdopterExpiryDate,
  earlyAdopterFirmFields,
  earlyAdopterInviteStatus,
  hashEarlyAdopterToken,
  type EarlyAdopterInviteSnapshot,
  type EarlyAdopterWorkspace,
} from "@/lib/early-adopter";
import { prisma } from "@/lib/prisma";

function isUniqueConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function snapshot(invite: {
  id: string;
  email: string;
  name: string | null;
  note: string | null;
  tokenHash: string;
  expiresInDays: number;
  expiresAt: Date;
  revokedAt: Date | null;
  redeemedAt: Date | null;
  firmId: string | null;
  redeemedByUserId: string | null;
}): EarlyAdopterInviteSnapshot {
  return invite;
}

export async function listEarlyAdopterInvites() {
  const invites = await prisma.earlyAdopterInvite.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      redeemedBy: { select: { name: true, email: true } },
      firm: { select: { id: true, name: true } },
    },
  });
  return invites;
}

export async function issueEarlyAdopterInvite(input: {
  actorUserId: string;
  email: string;
  name: string | null;
  note: string | null;
  expiresInDays: number;
  now: Date;
}) {
  const openInvite = await prisma.earlyAdopterInvite.findFirst({
    where: { email: input.email, redeemedAt: null, revokedAt: null },
    select: { id: true },
  });
  if (openInvite) {
    return { ok: false as const, code: "already-open" as const };
  }

  const token = createEarlyAdopterToken();
  const invite = await prisma.earlyAdopterInvite.create({
    data: {
      email: input.email,
      name: input.name,
      note: input.note,
      tokenHash: hashEarlyAdopterToken(token),
      expiresInDays: input.expiresInDays,
      expiresAt: earlyAdopterExpiryDate(input.now, input.expiresInDays),
      createdByUserId: input.actorUserId,
    },
    select: { id: true, email: true, name: true, expiresAt: true },
  });

  return { ok: true as const, token, invite };
}

export async function rotateEarlyAdopterInvite(input: { inviteId: string; now: Date }) {
  const invite = await prisma.earlyAdopterInvite.findUnique({ where: { id: input.inviteId } });
  if (!invite) {
    return { ok: false as const, code: "missing" as const };
  }
  const status = earlyAdopterInviteStatus(invite, input.now);
  if (status === "redeemed" || status === "revoked") {
    return { ok: false as const, code: status };
  }

  const token = createEarlyAdopterToken();
  const updated = await prisma.earlyAdopterInvite.update({
    where: { id: invite.id },
    data: {
      tokenHash: hashEarlyAdopterToken(token),
      expiresAt: earlyAdopterExpiryDate(input.now, invite.expiresInDays),
    },
    select: { id: true, email: true, name: true, expiresAt: true },
  });
  return { ok: true as const, token, invite: updated };
}

export async function revokeEarlyAdopterInvite(input: { inviteId: string; now: Date }) {
  const invite = await prisma.earlyAdopterInvite.findUnique({ where: { id: input.inviteId } });
  if (!invite) {
    return { ok: false as const, code: "missing" as const };
  }
  if (invite.redeemedAt) {
    return { ok: false as const, code: "redeemed" as const };
  }
  if (invite.revokedAt) {
    return { ok: true as const };
  }
  await prisma.earlyAdopterInvite.update({
    where: { id: invite.id },
    data: { revokedAt: input.now },
  });
  return { ok: true as const };
}

export async function markEarlyAdopterInviteSent(inviteId: string, now: Date) {
  await prisma.earlyAdopterInvite.update({
    where: { id: inviteId },
    data: { lastSentAt: now },
  });
}

async function workspaceForEmail(email: string): Promise<EarlyAdopterWorkspace | null> {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      active: true,
      isSystemAdmin: true,
      firm: {
        select: {
          id: true,
          name: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          billingSubscriptionId: true,
        },
      },
    },
  });
  if (!user) {
    return null;
  }
  return {
    userId: user.id,
    userName: user.name,
    firmId: user.firm.id,
    firmName: user.firm.name,
    active: user.active,
    isSystemAdmin: user.isSystemAdmin,
    subscriptionPlan: user.firm.subscriptionPlan,
    subscriptionStatus: user.firm.subscriptionStatus,
    billingSubscriptionId: user.firm.billingSubscriptionId,
  };
}

export async function loadEarlyAccess(input: { token: string; now: Date; signedInEmail: string | null; rateLimited: boolean }) {
  const tokenPresent = input.token.trim().length > 0;
  if (!tokenPresent || input.rateLimited) {
    return describeEarlyAccess({
      tokenPresent,
      rateLimited: input.rateLimited,
      invite: null,
      now: input.now,
      signedInEmail: input.signedInEmail,
      existingWorkspace: null,
    });
  }

  const invite = await prisma.earlyAdopterInvite.findUnique({
    where: { tokenHash: hashEarlyAdopterToken(input.token) },
  });
  const existingWorkspace = invite ? await workspaceForEmail(invite.email) : null;
  return describeEarlyAccess({
    tokenPresent: true,
    rateLimited: false,
    invite: invite ? snapshot(invite) : null,
    now: input.now,
    signedInEmail: input.signedInEmail,
    existingWorkspace,
  });
}

export async function redeemEarlyAdopterInvite(input: {
  token: string;
  now: Date;
  signedInEmail: string | null;
  officeName?: string;
  ownerName?: string;
  passwordHash?: string;
}) {
  const invite = await prisma.earlyAdopterInvite.findUnique({
    where: { tokenHash: hashEarlyAdopterToken(input.token) },
  });
  const existingWorkspace = invite ? await workspaceForEmail(invite.email) : null;
  const view = describeEarlyAccess({
    tokenPresent: true,
    rateLimited: false,
    invite: invite ? snapshot(invite) : null,
    now: input.now,
    signedInEmail: input.signedInEmail,
    existingWorkspace,
  });

  if (view.kind === "register") {
    const officeName = input.officeName?.trim() ?? "";
    const ownerName = input.ownerName?.trim() || invite?.name?.trim() || "";
    if (!invite || officeName.length < 2 || officeName.length > 120 || ownerName.length < 2 || ownerName.length > 120 || !input.passwordHash) {
      return { ok: false as const, code: "invalid-form" as const, view };
    }

    let created: string | null;
    try {
      created = await prisma.$transaction(async (tx) => {
        const claimed = await tx.earlyAdopterInvite.updateMany({
          where: { id: invite.id, redeemedAt: null, revokedAt: null, expiresAt: { gt: input.now } },
          data: { redeemedAt: input.now },
        });
        if (claimed.count !== 1) {
          return null;
        }
        const firm = await tx.firm.create({
          data: {
            name: officeName,
            email: invite.email,
            ...earlyAdopterFirmFields(),
          },
        });
        const user = await tx.user.create({
          data: {
            firmId: firm.id,
            name: ownerName,
            email: invite.email,
            passwordHash: input.passwordHash!,
            role: UserRole.OWNER,
            active: true,
          },
        });
        await tx.earlyAdopterInvite.update({
          where: { id: invite.id },
          data: { firmId: firm.id, redeemedByUserId: user.id },
        });
        return user.id;
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        return { ok: false as const, code: "taken" as const, view };
      }
      throw error;
    }

    if (!created) {
      return { ok: false as const, code: "taken" as const, view };
    }
    return { ok: true as const, userId: created };
  }

  if (view.kind === "activate") {
    if (!invite || !existingWorkspace || !canConvertWorkspaceToEarlyAdopter(existingWorkspace)) {
      return { ok: false as const, code: "unavailable" as const, view };
    }
    const fields = earlyAdopterFirmFields();
    const converted = await prisma.$transaction(async (tx) => {
      const claimed = await tx.earlyAdopterInvite.updateMany({
        where: { id: invite.id, redeemedAt: null, revokedAt: null, expiresAt: { gt: input.now } },
        data: { redeemedAt: input.now, firmId: existingWorkspace.firmId, redeemedByUserId: existingWorkspace.userId },
      });
      if (claimed.count !== 1) {
        return false;
      }
      await tx.firm.update({
        where: { id: existingWorkspace.firmId },
        data: fields,
      });
      return true;
    });
    if (!converted) {
      return { ok: false as const, code: "taken" as const, view };
    }
    return { ok: true as const, userId: existingWorkspace.userId };
  }

  return { ok: false as const, code: view.kind, view };
}
