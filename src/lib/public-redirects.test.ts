import assert from "node:assert/strict";
import { test } from "node:test";
import nextConfig from "../../next.config";

test("short public paths permanently redirect to the canonical pages", async () => {
  if (!nextConfig.redirects) {
    assert.fail("next.config redirects() is missing");
  }
  const redirects = await nextConfig.redirects();
  const bySource = new Map(redirects.map((redirect) => [redirect.source, redirect]));

  assert.deepEqual(bySource.get("/founding"), {
    source: "/founding",
    destination: "/founding-public-adjuster-offices",
    permanent: true,
  });
  assert.deepEqual(bySource.get("/register"), {
    source: "/register",
    destination: "/signup",
    permanent: true,
  });
});
