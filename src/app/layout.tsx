import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import { Geist } from "next/font/google";
import { JsonLd } from "@/components/json-ld";
import { analyticsBootstrapScript, gaMeasurementId } from "@/lib/analytics";
import { brandName, brandNameTM } from "@/lib/brand";
import { publicSiteUrl, socialImageAlt, socialImagePath } from "@/lib/public-metadata";
import { isProductionAnalyticsHost, isSandboxHost, NOINDEX_ROBOTS, requestHostname } from "@/lib/site-host";
import { organizationJsonLd } from "@/lib/structured-data";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const socialDescription = "Public adjuster CRM and claims management software for small offices. Track claims, follow-ups, settlements, and fee invoices.";

export async function generateMetadata(): Promise<Metadata> {
  const headerList = await headers();
  const hostname = requestHostname(headerList.get("host"), headerList.get("x-forwarded-host"));
  const metadata: Metadata = {
    metadataBase: publicSiteUrl,
    applicationName: brandName,
    title: {
      default: brandNameTM,
      template: "%s",
    },
    description: socialDescription,
    openGraph: {
      title: brandName,
      description: socialDescription,
      url: "/",
      siteName: brandName,
      type: "website",
      images: [{ url: socialImagePath, width: 1200, height: 630, alt: socialImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: brandName,
      description: socialDescription,
      images: [socialImagePath],
    },
    robots: isSandboxHost(hostname) ? NOINDEX_ROBOTS : { index: true, follow: true },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };

  if (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) {
    metadata.verification = {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    };
  }

  return metadata;
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headerList = await headers();
  const hostname = requestHostname(headerList.get("host"), headerList.get("x-forwarded-host"));
  const gaId = gaMeasurementId();
  const loadAnalytics = Boolean(gaId) && isProductionAnalyticsHost(hostname);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <head>
        {loadAnalytics && gaId ? (
          <>
            <script dangerouslySetInnerHTML={{ __html: analyticsBootstrapScript(gaId) }} />
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
          </>
        ) : null}
      </head>
      <body className="min-h-full bg-slate-50">
        <JsonLd data={organizationJsonLd()} />
        {children}
      </body>
    </html>
  );
}
