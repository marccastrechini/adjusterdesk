export type TrainingStep = {
  title: string;
  caption: string;
  /** What the Demo Office screenshot will show once it replaces the placeholder frame. */
  alt: string;
  /** Optional public path such as `/training/desk-overview-today.webp`. */
  imageSrc?: string;
};

export type TrainingModule = {
  slug: string;
  title: string;
  summary: string;
  minutes: string;
  startLabel: string;
  steps: TrainingStep[];
};

export type TrainingStub = {
  title: string;
  summary: string;
};

export const trainingIndexPath = "/training";

export function trainingModulePath(slug: string) {
  return `${trainingIndexPath}/${slug}`;
}

export const trainingModules: TrainingModule[] = [
  {
    slug: "desk-overview",
    title: "Desk overview",
    summary: "Today is the morning list: overdue work, what is due, which follow-ups need a touch, and what is still unpaid.",
    minutes: "About 5 minutes",
    startLabel: "Start desk overview",
    steps: [
      {
        title: "Open Today",
        caption:
          "After you sign in, open Today in the left navigation. This is the daily command center for the office: what to follow up, what is waiting, what is due, and what is still unpaid. The line under the title calls it a worklist for leads, claims, deadlines, missing documents, carrier follow-ups, and receivables. Start the morning here instead of in the inbox.",
        alt: "Today dashboard in Demo Office",
      },
      {
        title: "Read the counts before you open a file",
        caption:
          "The cards across the top are the morning order. Overdue tasks is work past its date. Due today is work that should be touched before the day ends. Lead follow-ups due are open leads that need a call or a note. Waiting on client and Waiting on carrier are files that are stuck on someone else. Unpaid receivables is fee money still open. If a count is zero, skip that card and move to the next one.",
        alt: "Today summary cards in Demo Office for overdue, due today, follow-ups, and unpaid receivables",
      },
      {
        title: "Use the work order",
        caption:
          "Under the cards, the panel says Work the office in this order. Start here points at the first thing that is actually due: lead follow-ups, overdue tasks, requested documents, or unpaid receivables. Use that button. The links under it open Leads, Claims, receivables, and reports when you need the full list.",
        alt: "Work the office in this order panel on Today in Demo Office",
      },
      {
        title: "Clear overdue, then due today",
        caption:
          "Overdue tasks lists open work already past the due date. Due today lists open work due before the day ends. Each row shows the task, the client, the due date, and who it is assigned to. Open goes to that lead, or to Tasks on the claim. Complete takes the row off Today once the touch is done. Leave Complete alone if you only wanted to look.",
        alt: "Overdue and due today task lists on Today in Demo Office",
      },
      {
        title: "Check what is waiting and what is still unpaid",
        caption:
          "Lead follow-ups due lists open leads whose follow-up date is due or coming up in the next few days. Waiting on carrier lists claims marked that way, with the next step on the row. Outstanding receivables lists fee invoices that still have a balance, with the amount still open. That is the unpaid part of the morning. When those lists are empty, the office is caught up for the day.",
        alt: "Lead follow-ups, waiting on carrier, and outstanding receivables on Today in Demo Office",
      },
    ],
  },
  {
    slug: "lead-to-claim",
    title: "Lead to claim",
    summary: "Open a lead, see the next follow-up, and look at Convert to claim. The form is the path. Submit it only when you mean to open the file.",
    minutes: "About 5 minutes",
    startLabel: "Start lead to claim",
    steps: [
      {
        title: "Open the lead list",
        caption:
          "From Today, use Open leads, or choose Leads in the left navigation. Each row is a name, a loss type, a property, a source, and a follow-up date. The counts above the list show how many leads are due or overdue, and how many are already converted into claims.",
        alt: "Lead list in Demo Office",
      },
      {
        title: "Open a lead that is not a claim yet",
        caption:
          "Choose Open lead on a row that does not say Converted. The lead page keeps the contact, the property, the loss, and the follow-up date together. Notes and calls sit under that. You do not need a claim file yet to see the next touch.",
        alt: "Open lead detail in Demo Office",
      },
      {
        title: "Stay on Lead actions until you mean to convert",
        caption:
          "The side panel is Lead actions. Convert to claim is the primary button when this lead is not a claim yet. Add follow-up task schedules the next call so it shows on Today when it is due. Log note or call records what was said. On the lead list, the same actions sit on the row: Open lead, Log note or call, Add follow-up task, and Convert to claim.",
        alt: "Lead actions panel with Convert to claim in Demo Office",
      },
      {
        title: "Open Convert to claim and stop before you submit",
        caption:
          "Convert to claim opens a short form on the same page. Carrier, policy number, and carrier claim number are optional if you do not have them yet. Next step is one clear action for the new file, such as request the policy or schedule the inspection. First follow-up task and First follow-up date become the first open task, so the new claim shows on Today. The submit button says Convert to claim and open overview. This walkthrough stops there. Submit only when you mean to create the claim.",
        alt: "Convert to claim form on a lead in Demo Office",
      },
      {
        title: "See what a converted lead looks like",
        caption:
          "A lead that is already a claim shows Open converted claim instead of Convert to claim, on the list and in Lead actions. That is the handoff. The claim overview is the file from here. You do not convert the same lead twice.",
        alt: "Converted lead showing Open converted claim in Demo Office",
      },
    ],
  },
  {
    slug: "follow-ups",
    title: "Follow-ups that don't slip",
    summary: "On an active claim, a follow-up is a task with a date. When that date hits, it shows up on Today.",
    minutes: "About 5 minutes",
    startLabel: "Start follow-ups",
    steps: [
      {
        title: "Open an active claim from Today",
        caption:
          "On Today, pick a task that is overdue or due today and choose Open. If that task belongs to a claim, you land on Tasks for that claim. You can also open Claims, pick an active file, and choose the Tasks tab. The next touch should be a task with a date, not a note you have to remember.",
        alt: "Today task row with Open on an active claim in Demo Office",
      },
      {
        title: "Read the tasks on the claim",
        caption:
          "Each task shows a title, whether it is open or done, a priority, a due date, and who it is assigned to. The counts above the list show how many match, how many are still open, how many are overdue, and how many are done. If the list is long, filter Due to Overdue or Due today.",
        alt: "Claim tasks on an active claim in Demo Office",
      },
      {
        title: "Add the next follow-up before you leave the file",
        caption:
          "In Task actions, choose Add task. Start from a common task, such as Follow up with carrier, or write your own, such as Call carrier for estimate status. Due date default is Today, Tomorrow, In 3 days, In 1 week, or a custom date. Assign it to someone in the office, then save. When that date arrives, the task shows on Today under Overdue or Due today.",
        alt: "Add task form on an active claim in Demo Office",
      },
      {
        title: "Keep the deadline and the next step current",
        caption:
          "Update claim deadline / next step is separate from the task list. Use it when the claim has a real deadline, or when the short next-step note changed. Today reads that date in Upcoming deadlines. The task is the action. The next step is the one-line reminder on the file.",
        alt: "Claim deadline and next step form in Demo Office",
      },
      {
        title: "Complete the touch when it is done",
        caption:
          "Complete marks the task done so it leaves the morning list. Reopen puts it back if that was a mistake. Edit task changes the title, the due date, the assignee, or the note. The habit that keeps follow-ups from slipping is one open task, one date, and a morning look at Today.",
        alt: "Complete and edit actions on a claim task in Demo Office",
      },
    ],
  },
];

export const trainingComingSoon: TrainingStub[] = [
  {
    title: "Documents",
    summary: "Requested and received documents on the claim, so the file is not still sitting in email.",
  },
  {
    title: "Money",
    summary: "Settlement, the fee invoice, and the balance that is still unpaid.",
  },
];

export const trainingPublicPaths = [trainingIndexPath, ...trainingModules.map((module) => trainingModulePath(module.slug))];

export function getTrainingModule(slug: string) {
  return trainingModules.find((module) => module.slug === slug);
}

export function getAdjacentTrainingModules(slug: string) {
  const index = trainingModules.findIndex((module) => module.slug === slug);
  if (index < 0) {
    return { previous: undefined, next: undefined };
  }

  return {
    previous: trainingModules[index - 1],
    next: trainingModules[index + 1],
  };
}
