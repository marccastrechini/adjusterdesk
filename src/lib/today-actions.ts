"use server";

function requiredText(value: FormDataEntryValue | null, field: string) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new Error(`Missing ${field}.`);
  }
  return text;
}

export async function toggleTaskFromToday(formData: FormData) {
  const taskId = requiredText(formData.get("taskId"), "taskId");
  const actions = await import("@/lib/actions");
  return actions.toggleTask(taskId, "/today");
}
