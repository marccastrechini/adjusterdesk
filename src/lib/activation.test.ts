import assert from "node:assert/strict";
import test from "node:test";
import { activationProgress, buildActivationChecklist, type ActivationCounts } from "@/lib/activation";

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

  assert.equal(progress.completed, 0);
  assert.equal(progress.total, 6);
  assert.equal(items[0].href, "/start/import");
  assert.equal(items[0].action, "Import lead list");
  assert.equal(items[1].href, "/claims/new");
  assert.equal(items[5].href, "/settings/users");
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

  assert.equal(progress.completed, 6);
  assert.equal(progress.total, 6);
  assert.equal(items[0].href, "/leads");
  assert.equal(items[1].href, "/claims");
  assert.equal(items[4].action, "Review templates");
});