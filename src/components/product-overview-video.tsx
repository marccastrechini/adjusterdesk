import { brandName } from "@/lib/brand";
// Kept for a future re-record. Marketing pages do not embed this file while it still shows the previous brand.
export const productOverviewVideoSrc = "/marketing/product-overview.mp4";
export const productOverviewPosterSrc = "/marketing/product-overview-poster.jpg";

export const productOverviewChapters = [
  "Your desk for today",
  "Capture every lead",
  "Qualify and convert",
  "Open claims in one place",
  "Track the claim end to end",
  "Never miss a follow-up",
] as const;

export const productOverviewBlurb =
  "In about a minute, Demo Office shows the desk for today, a new lead, the claim file, and the follow-up that should not slip.";

export function ProductOverviewVideo() {
  return (
    <figure className="max-w-3xl">
      <video
        className="aspect-video h-auto w-full max-w-full rounded-lg border border-slate-200 bg-slate-950 shadow-sm"
        controls
        playsInline
        preload="metadata"
        poster={productOverviewPosterSrc}
        width={1280}
        height={720}
        aria-label={`${brandName} overview, about 60 seconds`}
      >
        <source src={productOverviewVideoSrc} type="video/mp4" />
      </video>
      <figcaption className="mt-3 text-sm leading-6 text-slate-600">
        <p>{productOverviewBlurb}</p>
        <p className="mt-2">Chapters: {productOverviewChapters.join(", ")}.</p>
      </figcaption>
    </figure>
  );
}
