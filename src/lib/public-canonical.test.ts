import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { NextRequest } from "next/server";
import robots from "@/app/robots";
import { canonicalRedirectStatus, canonicalRedirectTarget } from "@/lib/public-canonical";
import { buildPublicSitemapXml, publicSitemapPaths } from "@/lib/public-sitemap";
import { proxy } from "@/proxy";

test("checked-in sitemap matches the public marketing paths", () => {
  const xml = readFileSync(new URL("../../public/sitemap.xml", import.meta.url), "utf8");
  assert.equal(xml, buildPublicSitemapXml());
  assert.ok(publicSitemapPaths.includes("/training/desk-overview"));
  assert.ok(publicSitemapPaths.includes("/training/lead-to-claim"));
  assert.ok(publicSitemapPaths.includes("/training/follow-ups"));
  assert.ok(publicSitemapPaths.includes("/founding-public-adjuster-offices"));
  assert.equal(xml.includes("/login"), false);
  assert.equal(xml.includes("/claims"), false);
  assert.equal(xml.includes("google-sitemap"), false);
});

test("favicon.ico is a real icon file", () => {
  const bytes = readFileSync(new URL("../../public/favicon.ico", import.meta.url));
  assert.ok(bytes.length > 100);
  assert.equal(bytes[0], 0);
  assert.equal(bytes[1], 0);
  assert.equal(bytes[2], 1);
  assert.equal(bytes[3], 0);
  assert.ok(bytes.includes(Buffer.from("PNG")));
});

test("robots advertises only the canonical sitemap and still blocks app paths", () => {
  const body = robots();
  assert.equal(typeof body.sitemap, "string");
  const sitemap = String(body.sitemap);
  assert.equal(new URL(sitemap).pathname, "/sitemap.xml");
  assert.equal(sitemap.includes("google-sitemap"), false);

  const rules = Array.isArray(body.rules) ? body.rules : [body.rules];
  const disallow = rules.flatMap((rule) => {
    const value = rule.disallow ?? [];
    return Array.isArray(value) ? value : [value];
  });
  assert.ok(disallow.includes("/login"));
  assert.ok(disallow.includes("/claims/"));
  assert.ok(disallow.includes("/api/"));
});

test("public host redirects preserve path and query", () => {
  assert.equal(
    canonicalRedirectTarget({
      host: "adjusterdesk.xyz",
      forwardedHost: null,
      forwardedProto: "http",
      cfVisitor: '{"scheme":"http"}',
      pathname: "/how-it-works",
      search: "",
    }),
    "https://adjusterdesk.xyz/how-it-works",
  );
  assert.equal(
    canonicalRedirectTarget({
      host: "www.adjusterdesk.xyz",
      forwardedHost: null,
      forwardedProto: "https",
      cfVisitor: '{"scheme":"https"}',
      pathname: "/cookies",
      search: "?ref=1",
    }),
    "https://adjusterdesk.xyz/cookies?ref=1",
  );
  assert.equal(
    canonicalRedirectTarget({
      host: "www.adjusterdesk.xyz:80",
      forwardedHost: null,
      forwardedProto: "http",
      cfVisitor: null,
      pathname: "/",
      search: "",
    }),
    "https://adjusterdesk.xyz/",
  );
  assert.equal(
    canonicalRedirectTarget({
      host: "adjusterdesk.xyz",
      forwardedHost: null,
      forwardedProto: "https",
      cfVisitor: '{"scheme":"https"}',
      pathname: "/signup",
      search: "",
    }),
    null,
  );
});

test("unknown or local hosts and missing scheme are not protocol-redirected", () => {
  assert.equal(
    canonicalRedirectTarget({
      host: "localhost:3000",
      forwardedHost: null,
      forwardedProto: "http",
      cfVisitor: null,
      pathname: "/pricing",
      search: "",
    }),
    null,
  );
  assert.equal(
    canonicalRedirectTarget({
      host: "adjusterdesk.xyz",
      forwardedHost: null,
      forwardedProto: null,
      cfVisitor: null,
      pathname: "/pricing",
      search: "",
    }),
    null,
  );
  assert.equal(
    canonicalRedirectTarget({
      host: "preview.example",
      forwardedHost: null,
      forwardedProto: "http",
      cfVisitor: null,
      pathname: "/",
      search: "",
    }),
    null,
  );
});

test("forwarded proto uses the first token and cf-visitor wins", () => {
  assert.equal(
    canonicalRedirectTarget({
      host: "adjusterdesk.xyz",
      forwardedHost: null,
      forwardedProto: "https,http",
      cfVisitor: null,
      pathname: "/signup",
      search: "",
    }),
    null,
  );
  assert.equal(
    canonicalRedirectTarget({
      host: "adjusterdesk.xyz",
      forwardedHost: null,
      forwardedProto: "http,http",
      cfVisitor: null,
      pathname: "/signup",
      search: "",
    }),
    "https://adjusterdesk.xyz/signup",
  );
  assert.equal(
    canonicalRedirectTarget({
      host: "adjusterdesk.xyz",
      forwardedHost: null,
      forwardedProto: "http",
      cfVisitor: '{"scheme":"https"}',
      pathname: "/signup",
      search: "",
    }),
    null,
  );
  assert.equal(
    canonicalRedirectTarget({
      host: "origin.internal",
      forwardedHost: "www.adjusterdesk.xyz",
      forwardedProto: "https",
      cfVisitor: null,
      pathname: "/help",
      search: "",
    }),
    "https://adjusterdesk.xyz/help",
  );
});

test("unsafe paths are not turned into redirects", () => {
  assert.equal(
    canonicalRedirectTarget({
      host: "www.adjusterdesk.xyz",
      forwardedHost: null,
      forwardedProto: "https",
      cfVisitor: null,
      pathname: "//evil.example",
      search: "",
    }),
    null,
  );
});

test("proxy redirects public duplicates and leaves localhost alone", () => {
  const httpWww = new NextRequest("http://www.adjusterdesk.xyz/cookies?x=1", {
    headers: {
      host: "www.adjusterdesk.xyz",
      "x-forwarded-proto": "http",
      "cf-visitor": '{"scheme":"http"}',
    },
  });
  const redirected = proxy(httpWww);
  assert.equal(redirected.status, canonicalRedirectStatus);
  assert.equal(redirected.headers.get("location"), "https://adjusterdesk.xyz/cookies?x=1");

  const local = new NextRequest("http://localhost:3000/pricing", {
    headers: { host: "localhost:3000" },
  });
  const passed = proxy(local);
  assert.equal(passed.status, 200);
  assert.equal(passed.headers.get("location"), null);
});
