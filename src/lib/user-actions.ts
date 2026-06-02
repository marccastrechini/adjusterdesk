"use server";

export async function createUser(formData: FormData) {
  const actions = await import("@/lib/actions");
  return actions.createUser(formData);
}

function requiredText(value: FormDataEntryValue | null, field: string) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) {
    throw new Error(`Missing ${field}.`);
  }
  return text;
}

function parseBoolean(value: FormDataEntryValue | null, field: string) {
  const text = requiredText(value, field);
  if (text === "true") return true;
  if (text === "false") return false;
  throw new Error(`Invalid ${field}.`);
}

export async function resendUserInviteFromForm(formData: FormData) {
  const userId = requiredText(formData.get("userId"), "userId");
  const actions = await import("@/lib/actions");
  return actions.resendUserInvite(userId);
}

export async function setUserActiveFromForm(formData: FormData) {
  const userId = requiredText(formData.get("userId"), "userId");
  const nextActive = parseBoolean(formData.get("nextActive"), "nextActive");
  const actions = await import("@/lib/actions");
  return actions.setUserActive(userId, nextActive);
}
