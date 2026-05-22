export const leadStatusOptions = [
  ["NEW", "New"],
  ["CONTACTED", "Contacted"],
  ["APPOINTMENT_SET", "Appointment set"],
  ["CONVERTED", "Converted"],
  ["CLOSED", "Closed"],
] as const;

export const claimStatusOptions = [
  ["NEW", "New"],
  ["IN_REVIEW", "In review"],
  ["WAITING_ON_CLIENT", "Waiting on client"],
  ["WAITING_ON_CARRIER", "Waiting on carrier"],
  ["ESTIMATE_SENT", "Estimate sent"],
  ["NEGOTIATING", "Negotiating"],
  ["SETTLED", "Settled"],
  ["CLOSED", "Closed"],
] as const;

export const taskPriorityOptions = [
  ["LOW", "Low"],
  ["NORMAL", "Normal"],
  ["HIGH", "High"],
] as const;

export const documentCategoryOptions = [
  ["POLICY", "Policy"],
  ["CONTRACT", "Contract"],
  ["ESTIMATE", "Estimate"],
  ["PHOTOS", "Photos"],
  ["CARRIER_CORRESPONDENCE", "Carrier correspondence"],
  ["SETTLEMENT_DOCUMENTS", "Settlement documents"],
  ["INVOICE", "Invoice"],
  ["OTHER", "Other"],
] as const;

export const activityTypeOptions = [
  ["NOTE", "Manual note"],
  ["CALL", "Call note"],
  ["EMAIL", "Email note"],
  ["TEXT", "Text note"],
  ["MEETING", "Meeting"],
  ["INSPECTION", "Inspection"],
] as const;

export const invoiceStatusOptions = [
  ["DRAFT", "Draft"],
  ["SENT", "Sent"],
  ["PARTIALLY_PAID", "Partially paid"],
  ["PAID", "Paid"],
  ["OVERDUE", "Overdue"],
  ["WRITTEN_OFF", "Written off"],
] as const;

export const templateTypeOptions = [
  ["EMAIL", "Email"],
  ["TEXT", "Text"],
  ["LETTER", "Letter"],
  ["CHECKLIST", "Checklist"],
] as const;

export const userRoleOptions = [
  ["OWNER", "Owner"],
  ["ADJUSTER", "Adjuster"],
  ["ASSISTANT", "Assistant"],
] as const;
