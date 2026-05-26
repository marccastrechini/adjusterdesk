export type FieldErrors = Record<string, string>;

export type ActionFormState = {
  message?: string;
  fieldErrors?: FieldErrors;
};

export const emptyActionFormState: ActionFormState = {};

export function formError(message: string, fieldErrors: FieldErrors = {}): ActionFormState {
  return { message, fieldErrors };
}