import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSignedSessionValue, resolveAuthSecret, sessionDurationMs, verifySignedSessionValue } from "@/lib/auth";

const sessionCookieName = "adjusterdesk_session";
const adminWorkspaceOverrideCookieName = "adjusterdesk_admin_workspace";

function sessionCookieOptions(expires: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  };
}

export async function createSessionForUser(userId: string) {
  const secret = resolveAuthSecret();
  if (!secret) {
    return false;
  }

  const cookieStore = await cookies();
  const expires = new Date(Date.now() + sessionDurationMs);
  const sessionValue = createSignedSessionValue(userId, secret);
  cookieStore.set(sessionCookieName, sessionValue, sessionCookieOptions(expires));
  return true;
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.set(sessionCookieName, "", {
    ...sessionCookieOptions(new Date(0)),
    maxAge: 0,
  });
  cookieStore.set(adminWorkspaceOverrideCookieName, "", {
    ...sessionCookieOptions(new Date(0)),
    maxAge: 0,
  });
}

export async function setAdminWorkspaceOverride(workspaceId: string) {
  const cookieStore = await cookies();
  const expires = new Date(Date.now() + sessionDurationMs);
  cookieStore.set(adminWorkspaceOverrideCookieName, workspaceId, sessionCookieOptions(expires));
}

export async function clearAdminWorkspaceOverride() {
  const cookieStore = await cookies();
  cookieStore.set(adminWorkspaceOverrideCookieName, "", {
    ...sessionCookieOptions(new Date(0)),
    maxAge: 0,
  });
}

export async function getAdminWorkspaceOverrideId() {
  const cookieStore = await cookies();
  return cookieStore.get(adminWorkspaceOverrideCookieName)?.value;
}

export async function getCurrentSessionUser() {
  const secret = resolveAuthSecret();
  if (!secret) {
    return null;
  }

  const cookieStore = await cookies();
  const sessionValue = cookieStore.get(sessionCookieName)?.value;
  const session = verifySignedSessionValue(sessionValue ?? "", secret);

  if (!session) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: session.userId,
      active: true,
    },
    select: {
      id: true,
      firmId: true,
      name: true,
      email: true,
      role: true,
      isSystemAdmin: true,
      active: true,
    },
  });
}