import { prisma } from "@/lib/prisma";

export async function getDemoContext() {
  const firm = await prisma.firm.findFirst({
    orderBy: { createdAt: "asc" },
    include: {
      users: {
        where: { active: true },
        orderBy: [{ role: "asc" }, { name: "asc" }],
      },
    },
  });

  if (!firm) {
    throw new Error("No demo firm found. Run `npm run db:push` and `npm run db:seed`.");
  }

  const user = firm.users.find((candidate) => candidate.role === "OWNER") ?? firm.users[0];

  if (!user) {
    throw new Error("No demo user found. Run `npm run db:seed`.");
  }

  return { firm, user, users: firm.users };
}
