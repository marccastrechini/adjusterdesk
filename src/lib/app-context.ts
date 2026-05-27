import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionUser } from "@/lib/session";

export async function getAuthenticatedAppContext() {
  const sessionUser = await getCurrentSessionUser();
  if (!sessionUser) {
    return null;
  }

  const firm = await prisma.firm.findUnique({
    where: { id: sessionUser.firmId },
    include: {
      users: {
        where: { active: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!firm) {
    return null;
  }

  const user = firm.users.find((candidate) => candidate.id === sessionUser.id);
  if (!user) {
    return null;
  }

  return { firm, user, users: firm.users };
}

export async function requireAuthenticatedAppContext() {
  const context = await getAuthenticatedAppContext();

  if (!context) {
    redirect("/login");
  }

  return context;
}

export async function getDemoContext() {
  return requireAuthenticatedAppContext();
}

export async function requireSystemAdminContext() {
  const sessionUser = await getCurrentSessionUser();

  if (!sessionUser || !sessionUser.isSystemAdmin) {
    redirect("/today");
  }

  return sessionUser;
}
