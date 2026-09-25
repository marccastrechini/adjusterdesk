import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProductOverviewVideo,
  productOverviewBlurb,
  productOverviewChapters,
  productOverviewPosterSrc,
  productOverviewVideoSrc,
} from "@/components/product-overview-video";

test("product overview video is a self-hosted responsive player", () => {
  const html = renderToStaticMarkup(<ProductOverviewVideo />);

  assert.match(html, /<video[^>]*controls/);
  assert.match(html, /playsinline/i);
  assert.match(html, /preload="metadata"/);
  assert.match(html, /class="[^"]*max-w-full/);
  assert.match(html, new RegExp(`poster="${productOverviewPosterSrc}"`));
  assert.match(html, new RegExp(`src="${productOverviewVideoSrc}"`));
  assert.match(html, /type="video\/mp4"/);
  assert.match(html, new RegExp(productOverviewBlurb.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  for (const chapter of productOverviewChapters) {
    assert.match(html, new RegExp(chapter));
  }
  assert.doesNotMatch(html, /youtube|vimeo|supademo/i);
});
