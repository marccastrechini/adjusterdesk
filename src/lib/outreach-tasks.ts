import { OutreachProspectStatus, OutreachTaskStatus, OutreachTaskType } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type OutreachTaskPrismaLike = {
  outreachTask: {
    findFirst: typeof prisma.outreachTask.findFirst;
    findMany: typeof prisma.outreachTask.findMany;
    create: typeof prisma.outreachTask.create;
    updateMany: typeof prisma.outreachTask.updateMany;
  };
};

function addBusinessDays(date: Date, businessDays: number) {
  const value = new Date(date);
  let remaining = businessDays;
  while (remaining > 0) {
    value.setUTCDate(value.getUTCDate() + 1);
    const day = value.getUTCDay();
    if (day !== 0 && day !== 6) {
      remaining -= 1;
    }
  }
  return value;
}

const taskTitles: Record<OutreachTaskType, string> = {
  RESEARCH: "Research and verify prospect details",
  CALL_ATTEMPT_1: "Call attempt 1",
  SEND_EMAIL_1: "Send Email 1",
  CALL_ATTEMPT_2: "Call attempt 2",
  SEND_FOLLOW_UP: "Send follow-up email",
  REVIEW_REPLY: "Review recent reply",
  SCHEDULE_FIT_CHECK: "Schedule fit check",
  RECYCLE_REVIEW: "Recycle / no-response review",
  MANUAL: "Manual outreach task",
};

async function hasOpenTask(prismaClient: OutreachTaskPrismaLike, outreachProspectId: string, type: OutreachTaskType) {
  const existing = await prismaClient.outreachTask.findFirst({
    where: {
      outreachProspectId,
      type,
      status: OutreachTaskStatus.OPEN,
    },
    select: { id: true },
  });

  return Boolean(existing);
}

export async function ensureOpenOutreachTask({
  outreachProspectId,
  type,
  dueDate,
  notes,
  assignedToUserId,
  createdByRule = true,
  prismaClient = prisma as OutreachTaskPrismaLike,
}: {
  outreachProspectId: string;
  type: OutreachTaskType;
  dueDate?: Date;
  notes?: string;
  assignedToUserId?: string;
  createdByRule?: boolean;
  prismaClient?: OutreachTaskPrismaLike;
}) {
  const alreadyOpen = await hasOpenTask(prismaClient, outreachProspectId, type);
  if (alreadyOpen) {
    return false;
  }

  await prismaClient.outreachTask.create({
    data: {
      outreachProspectId,
      assignedToUserId,
      type,
      status: OutreachTaskStatus.OPEN,
      title: taskTitles[type],
      dueDate,
      notes,
      createdByRule,
    },
  });

  return true;
}

export async function markOpenOutreachTaskDone({
  outreachProspectId,
  type,
  now,
  prismaClient = prisma as OutreachTaskPrismaLike,
}: {
  outreachProspectId: string;
  type: OutreachTaskType;
  now: Date;
  prismaClient?: OutreachTaskPrismaLike;
}) {
  await prismaClient.outreachTask.updateMany({
    where: {
      outreachProspectId,
      type,
      status: OutreachTaskStatus.OPEN,
    },
    data: {
      status: OutreachTaskStatus.DONE,
      completedAt: now,
      skippedAt: null,
    },
  });
}

export async function cancelOpenOutreachTasks({
  outreachProspectId,
  types,
  now,
  prismaClient = prisma as OutreachTaskPrismaLike,
}: {
  outreachProspectId: string;
  types?: OutreachTaskType[];
  now: Date;
  prismaClient?: OutreachTaskPrismaLike;
}) {
  await prismaClient.outreachTask.updateMany({
    where: {
      outreachProspectId,
      status: OutreachTaskStatus.OPEN,
      ...(types ? { type: { in: types } } : {}),
    },
    data: {
      status: OutreachTaskStatus.CANCELLED,
      skippedAt: now,
      completedAt: null,
    },
  });
}

export async function applyOutreachStatusTaskRules({
  outreachProspectId,
  nextStatus,
  assignedToUserId,
  now = new Date(),
  prismaClient = prisma as OutreachTaskPrismaLike,
}: {
  outreachProspectId: string;
  nextStatus: OutreachProspectStatus;
  assignedToUserId?: string;
  now?: Date;
  prismaClient?: OutreachTaskPrismaLike;
}) {
  if (nextStatus === OutreachProspectStatus.READY_FOR_OUTREACH) {
    await ensureOpenOutreachTask({
      outreachProspectId,
      type: OutreachTaskType.SEND_EMAIL_1,
      dueDate: now,
      assignedToUserId,
      createdByRule: true,
      prismaClient,
    });
    return;
  }

  if (nextStatus === OutreachProspectStatus.REPLIED_INTERESTED) {
    await cancelOpenOutreachTasks({
      outreachProspectId,
      types: [OutreachTaskType.SEND_FOLLOW_UP, OutreachTaskType.RECYCLE_REVIEW],
      now,
      prismaClient,
    });

    await ensureOpenOutreachTask({
      outreachProspectId,
      type: OutreachTaskType.SCHEDULE_FIT_CHECK,
      dueDate: now,
      assignedToUserId,
      createdByRule: true,
      prismaClient,
    });
    return;
  }

  if (
    nextStatus === OutreachProspectStatus.TRIAL_CREATED ||
    nextStatus === OutreachProspectStatus.BAD_FIT ||
    nextStatus === OutreachProspectStatus.REPLIED_NOT_NOW
  ) {
    await cancelOpenOutreachTasks({
      outreachProspectId,
      now,
      prismaClient,
    });
  }
}

export async function applyOutreachEmailTaskRules({
  outreachProspectId,
  templateKey,
  now = new Date(),
  assignedToUserId,
  prismaClient = prisma as OutreachTaskPrismaLike,
}: {
  outreachProspectId: string;
  templateKey: "outreach_first_email" | "outreach_follow_up";
  now?: Date;
  assignedToUserId?: string;
  prismaClient?: OutreachTaskPrismaLike;
}) {
  if (templateKey === "outreach_first_email") {
    await markOpenOutreachTaskDone({
      outreachProspectId,
      type: OutreachTaskType.SEND_EMAIL_1,
      now,
      prismaClient,
    });

    await ensureOpenOutreachTask({
      outreachProspectId,
      type: OutreachTaskType.SEND_FOLLOW_UP,
      dueDate: addBusinessDays(now, 4),
      assignedToUserId,
      createdByRule: true,
      prismaClient,
    });
    return;
  }

  await markOpenOutreachTaskDone({
    outreachProspectId,
    type: OutreachTaskType.SEND_FOLLOW_UP,
    now,
    prismaClient,
  });

  await ensureOpenOutreachTask({
    outreachProspectId,
    type: OutreachTaskType.RECYCLE_REVIEW,
    dueDate: addBusinessDays(now, 5),
    assignedToUserId,
    createdByRule: true,
    prismaClient,
  });
}
