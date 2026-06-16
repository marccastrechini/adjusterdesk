import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { clearAdminWorkspaceOverride, getAdminWorkspaceOverrideId, getCurrentSessionUser } from "@/lib/session";

export async function getAuthenticatedAppContext() {
  const sessionUser = await getCurrentSessionUser();
  if (!sessionUser) {
    return null;
  }

  const requestedOverrideFirmId = sessionUser.isSystemAdmin ? await getAdminWorkspaceOverrideId() : undefined;
  const targetFirmId = requestedOverrideFirmId || sessionUser.firmId;

  const firm = await prisma.firm.findUnique({
    where: { id: targetFirmId },
    include: {
      users: {
        where: { active: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!firm) {
    if (requestedOverrideFirmId) {
      await clearAdminWorkspaceOverride();
    }
    return null;
  }

  const userInWorkspace = firm.users.find((candidate) => candidate.id === sessionUser.id);
  const actingUser =
    userInWorkspace ??
    (sessionUser.isSystemAdmin && requestedOverrideFirmId
      ? (firm.users.find((candidate) => candidate.role === "OWNER") ?? firm.users[0])
      : undefined);

  const workspaceOverrideActive = Boolean(
    sessionUser.isSystemAdmin && requestedOverrideFirmId && requestedOverrideFirmId !== sessionUser.firmId,
  );

  const user = actingUser;
  if (!user) {
    if (requestedOverrideFirmId) {
      await clearAdminWorkspaceOverride();
    }
    return null;
  }

  return {
    firm,
    user,
    users: firm.users,
    sessionUser,
    workspaceOverride: workspaceOverrideActive
      ? {
          firmId: firm.id,
          firmName: firm.name,
        }
      : null,
  };
}

export async function requireAuthenticatedAppContext() {
  const context = await getAuthenticatedAppContext();

  if (!context) {
    redirect("/login");
  }

  return context;
}

export async function getDemoContext() {
  const context = await requireAuthenticatedAppContext();

  if (context.sessionUser.isOutreachOperator && !context.sessionUser.isSystemAdmin) {
    redirect("/system/outreach");
  }

  return context;
}

export async function requireSystemAdminContext() {
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser) {
    redirect("/today");
  }

  if (!sessionUser.isSystemAdmin) {
    if (sessionUser.isOutreachOperator) {
      redirect("/system/outreach");
    }
    redirect("/today");
  }

  return sessionUser;
}

export async function requireSystemOutreachContext() {
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser) {
    redirect("/today");
  }

  if (!sessionUser.isSystemAdmin && !sessionUser.isOutreachOperator) {
    redirect("/today");
  }

  return sessionUser;
}
