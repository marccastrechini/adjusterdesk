export type FieldErrors = Record<string, string>;
export type FieldValues = Record<string, string | boolean>;

export type ActionFormState = {
  message?: string;
  fieldErrors?: FieldErrors;
  fieldValues?: FieldValues;
};

export const emptyActionFormState: ActionFormState = {};

export function formError(
  message: string,
  fieldErrors: FieldErrors = {},
  fieldValues: FieldValues = {},
): ActionFormState {
  return { message, fieldErrors, fieldValues };
}