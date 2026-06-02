"use server";

export async function createUser(formData: FormData) {
  const actions = await import("@/lib/actions");
  return actions.createUser(formData);
}

export async function resendUserInvite(userId: string) {
  const actions = await import("@/lib/actions");
  return actions.resendUserInvite(userId);
}

export async function setUserActive(userId: string, nextActive: boolean) {
  const actions = await import("@/lib/actions");
  return actions.setUserActive(userId, nextActive);
}
