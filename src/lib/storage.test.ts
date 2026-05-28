import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cleanFileName, maxUploadSizeBytes, resolveStoredUploadPath, validateUploadFile } from "./storage";

describe("storage helpers", () => {
  it("cleans unsafe filename characters", () => {
    assert.equal(cleanFileName("estimate #1 (final).pdf"), "estimate-1-final-.pdf");
    assert.equal(cleanFileName("../../policy.pdf"), "..-..-policy.pdf");
  });

  it("validates upload size limits", () => {
    const tooLarge = new File([new Uint8Array(maxUploadSizeBytes + 1)], "large.pdf", { type: "application/pdf" });
    assert.equal(validateUploadFile(tooLarge), "File is too large. Use a file up to 25 MB.");

    const allowed = new File(["ok"], "small.pdf", { type: "application/pdf" });
    assert.equal(validateUploadFile(allowed), undefined);
  });

  it("blocks executable-like file extensions", () => {
    const blocked = new File(["x"], "installer.exe", { type: "application/octet-stream" });
    assert.equal(validateUploadFile(blocked), "That file type is not allowed for upload.");
  });

  it("only resolves paths inside storage uploads", () => {
    const goodPath = resolveStoredUploadPath("storage/uploads-development/123-proof.pdf");
    assert.ok(goodPath);

    assert.equal(resolveStoredUploadPath("storage/../.env"), undefined);
    assert.equal(resolveStoredUploadPath("other/place/file.pdf"), undefined);
  });

  it("resolves paths inside a configured uploads directory", () => {
    process.env.UPLOADS_DIR = "storage/uploads-production";

    const goodPath = resolveStoredUploadPath("storage/uploads-production/123-proof.pdf");
    assert.ok(goodPath);

    assert.equal(resolveStoredUploadPath("storage/uploads-development/123-proof.pdf"), undefined);
    delete process.env.UPLOADS_DIR;
  });
});
