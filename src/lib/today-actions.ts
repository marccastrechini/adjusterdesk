"use server";

export async function toggleTask(taskId: string, returnPath: string) {
  const actions = await import("@/lib/actions");
  return actions.toggleTask(taskId, returnPath);
}
