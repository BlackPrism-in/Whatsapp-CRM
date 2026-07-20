// Plain (non-"use server") module: a "use server" file may only export async
// functions, so shared constants live here.
export const REMINDER_TYPES = [
  { value: "follow_up", label: "Follow-up" },
  { value: "birthday", label: "Birthday" },
  { value: "class_reminder", label: "Class" },
  { value: "order", label: "Order" },
  { value: "renewal", label: "Renewal" },
  { value: "custom", label: "Custom" },
] as const;

export type ReminderTypeValue = (typeof REMINDER_TYPES)[number]["value"];
