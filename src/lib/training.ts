export type TrainingStep = {
  title: string;
  caption: string;
  alt: string;
  imageSrc: string;
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
    minutes: "About 4 minutes",
    startLabel: "Start desk overview",
    steps: [
      {
        title: "Open Today",
        caption:
          "After you sign in, open Today. This is the daily command center: what to follow up, what is waiting, what is due, and what is still unpaid. In Demo Office the panel says Work the office in this order. Start here has four actions: Work lead follow-ups (2 leads due for a touch), Clear overdue tasks (5 overdue tasks), Follow up on requested documents (2 document requests waiting on clients), and Work unpaid receivables ($1,500 still open). Under those are Open leads, Open claims, Open receivables, and Open reports. The counts on this screen are Overdue tasks 5, Due today 0, Upcoming deadlines 0, Lead follow-ups due 2, Waiting on client 1, and Waiting on carrier 1.",
        alt: "Today dashboard in Demo Office, with the work order, start-here actions, and summary counts",
        imageSrc: "/training/01-today.png",
      },
      {
        title: "Open a claim",
        caption:
          "Open claims, then open a file. This is the Monica Alvarez claim in Demo Office: wind damage at 52 Garden Isle Loop, Largo, FL 33770. The tabs are Overview, Tasks, Documents, Activity, Money, and Client status. Overview shows Bayline Insurance, claim number BAY-25-0410, policy not set, date of loss May 17, 2026, and deadline June 9, 2026. The next step on the file is: Confirm the final settlement check and release the fee invoice. What to work next shows Tasks 1 open, Documents 0 requested, and Money $0 due. The money snapshot shows invoice AD-DEMO-1001, calculated fee $3,800, payment received $3,800, status Paid, and amount due $0.",
        alt: "Monica Alvarez claim overview in Demo Office, with the next step and money snapshot",
        imageSrc: "/training/05-claim-overview.png",
      },
    ],
  },
  {
    slug: "lead-to-claim",
    title: "Lead to claim",
    summary: "Open the lead list, open a lead that is not a claim yet, and find Convert to claim. The claims list is where that work lives once it is a file.",
    minutes: "About 4 minutes",
    startLabel: "Start lead to claim",
    steps: [
      {
        title: "Open the lead list",
        caption:
          "From Today, use Open leads, or choose Leads. Demo Office shows 4 matching leads, 1 new, 4 follow-up due or overdue, and 2 converted. Riley Bennett is Appointment Set: water damage at 114 Cypress Bend Drive, Tampa, FL 33602, source Website, referral Search engine, follow-up May 28, 2026. The note says he is ready for a same-day follow-up. The row actions are Open lead, Log note or call, Add follow-up task, and Convert to claim. Monica Alvarez is already marked Converted.",
        alt: "Leads list in Demo Office, with Riley Bennett and a converted lead",
        imageSrc: "/training/02-leads.png",
      },
      {
        title: "Open the lead",
        caption:
          "Open lead on Riley Bennett. The page is a water damage lead from Website, follow-up May 28, 2026, status Appointment Set, assigned to Demo Owner. Lead details show the client, the property at 114 Cypress Bend Drive, date of loss May 25, 2026, and referral source Search engine. Lead actions has Convert to claim. The line under that button says: Open a new claim file once the client is ready to proceed. Add follow-up task and Log note or call sit under it. The open follow-up on this lead is Call Riley about the signed agreement, due May 28, 2026, with Complete next to it. The note below is Intro call complete.",
        alt: "Riley Bennett lead detail in Demo Office, with Convert to claim and an open follow-up",
        imageSrc: "/training/03-lead-detail.png",
      },
      {
        title: "See the claim on the claims list",
        caption:
          "Claims is where a converted lead is worked. Demo Office shows 4 matching claims, 4 active, 1 waiting on client, and 1 waiting on carrier. Monica Alvarez is Negotiating: wind damage at 52 Garden Isle Loop, Largo, FL 33770, Bayline Insurance, claim BAY-25-0410, deadline June 9, 2026. The next step on the row is: Confirm the final settlement check and release the fee invoice. She is assigned to Demo Adjuster, with 1 open task, and the row shows Receivable $0. The row actions are Open claim, Tasks (1), Documents, Log note, and Money.",
        alt: "Claims list in Demo Office, with Monica Alvarez and Tasks on the row",
        imageSrc: "/training/04-claims.png",
      },
    ],
  },
  {
    slug: "follow-ups",
    title: "Follow-ups that don't slip",
    summary: "On an active claim, Overview shows the next step and how many tasks are open. The Tasks tab is where the follow-up and its date live.",
    minutes: "About 4 minutes",
    startLabel: "Start follow-ups",
    steps: [
      {
        title: "Read the next step on the claim",
        caption:
          "Open the claim. On Monica Alvarez, Overview keeps the next step in view: Confirm the final settlement check and release the fee invoice. What to work next shows Tasks 1 open. The deadline on the file is June 9, 2026. Use the Tasks tab when you need the follow-up itself.",
        alt: "Monica Alvarez claim overview in Demo Office, with one open task and the next step",
        imageSrc: "/training/05-claim-overview.png",
      },
      {
        title: "Open Tasks",
        caption:
          "Tasks on this claim shows 2 matching tasks, 1 open, 2 overdue, and 1 done. The task on screen is Call carrier about the final settlement check, marked Done, with Reopen beside it. Task actions has Add task, and Update claim deadline / next step. The current deadline shown is June 9, 2026. The next open task shown is Review photos and update claim notes, May 28, 2026. Suggested next steps is there for a common follow-up, so you do not have to write each task from scratch.",
        alt: "Monica Alvarez claim tasks in Demo Office, with Add task, the deadline, and a done follow-up",
        imageSrc: "/training/06-claim-tasks.png",
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
