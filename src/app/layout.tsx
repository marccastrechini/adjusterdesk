import type { Metadata } from "next";
import Script from "next/script";
import { Geist } from "next/font/google";
import { publicSiteUrl } from "@/lib/public-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

function buildMetadata(): Metadata {
  const metadata: Metadata = {
    metadataBase: publicSiteUrl,
    applicationName: "AdjusterDesk",
    title: {
      default: "AdjusterDesk",
      template: "%s",
    },
    description: "A simple workspace for small public adjusting offices.",
    openGraph: {
      title: "AdjusterDesk",
      description: "A simple workspace for small public adjusting offices.",
      url: "/",
      siteName: "AdjusterDesk",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "AdjusterDesk",
      description: "A simple workspace for small public adjusting offices.",
    },
    robots: {
      index: true,
      follow: true,
    },
  };

  // Add Google Search Console verification if configured
  if (process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION) {
    metadata.verification = {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    };
  }

  return metadata;
}

export const metadata = buildMetadata();

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gaId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <head>
        {/* Google Analytics */}
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script
              id="ga-init"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${gaId}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="min-h-full bg-slate-50">{children}</body>
    </html>
  );
}
