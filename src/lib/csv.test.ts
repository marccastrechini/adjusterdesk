import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { csvEscape, toCsv } from "./csv";

describe("csv helpers", () => {
  it("escapes commas, quotes, and new lines", () => {
    assert.equal(csvEscape("Alpha, Beta"), '"Alpha, Beta"');
    assert.equal(csvEscape('He said "hello"'), '"He said ""hello"""');
    assert.equal(csvEscape("Row 1\nRow 2"), '"Row 1\nRow 2"');
  });

  it("creates a csv string with headers and rows", () => {
    const csv = toCsv(
      ["Client", "Status"],
      [
        ["Nina Campbell", "NEW"],
        ["Elena Martinez", "WAITING_ON_CARRIER"],
      ],
    );

    assert.equal(csv, "Client,Status\nNina Campbell,NEW\nElena Martinez,WAITING_ON_CARRIER");
  });
});
