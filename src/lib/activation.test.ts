import assert from "node:assert/strict";
import test from "node:test";
import { activationProgress, buildActivationChecklist, buildOnboardingQuickActions, type ActivationCounts } from "@/lib/activation";

const emptyCounts: ActivationCounts = {
  leads: 0,
  claims: 0,
  openTasks: 0,
  documents: 0,
  templates: 0,
  users: 1,
  feedback: 0,
};

test("activation checklist points new offices to first actions", () => {
  const items = buildActivationChecklist(emptyCounts);
  const progress = activationProgress(items);

  assert.equal(progress.completed, 1);
  assert.equal(progress.total, 8);
  assert.equal(items[0].href, "/start/import");
  assert.equal(items[0].action, "Import lead list");
  assert.equal(items[1].href, "/claims/new");
  assert.equal(items[5].href, "/settings/users");
  assert.equal(items[6].href, "/claims");
  assert.equal(items[7].href, "/settings/billing");
});

test("activation checklist marks seeded demo work as complete", () => {
  const items = buildActivationChecklist({
    leads: 4,
    claims: 3,
    openTasks: 7,
    documents: 9,
    templates: 3,
    users: 3,
    feedback: 1,
  });
  const progress = activationProgress(items);

  assert.equal(progress.completed, 8);
  assert.equal(progress.total, 8);
  assert.equal(items[0].href, "/leads");
  assert.equal(items[1].href, "/claims");
  assert.equal(items[4].action, "Review templates");
  assert.equal(items[7].action, "Open billing");
});

test("onboarding quick actions keep first-run guidance small and practical", () => {
  const actions = buildOnboardingQuickActions(emptyCounts);
  const progress = activationProgress(actions);

  assert.equal(progress.completed, 0);
  assert.equal(progress.total, 5);
  assert.equal(actions[0].href, "/claims/new");
  assert.equal(actions[0].secondaryHref, "/leads/new");
  assert.equal(actions[1].href, "/claims/new");
  assert.equal(actions[2].href, "/claims/new");
  assert.equal(actions[3].href, "/today");
  assert.equal(actions[4].href, "/money");
});

test("onboarding quick actions reflect work already started", () => {
  const actions = buildOnboardingQuickActions({
    leads: 2,
    claims: 1,
    openTasks: 3,
    documents: 4,
    templates: 1,
    users: 2,
    feedback: 0,
  });

  assert.equal(actions[0].completed, true);
  assert.equal(actions[0].href, "/claims");
  assert.equal(actions[0].secondaryHref, "/leads");
  assert.equal(actions[1].href, "/today");
  assert.equal(actions[2].action, "Review claim files");
  assert.equal(actions[4].completed, true);
});