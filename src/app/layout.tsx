import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { publicSiteUrl } from "@/lib/public-metadata";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: publicSiteUrl,
  applicationName: "AdjusterDesk",
  title: {
    default: "AdjusterDesk",
    template: "%s",
  },
  description: "A simple workspace for small public adjusting offices.",
  icons: {
    icon: "/favicon.ico",
  },
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-slate-50">{children}</body>
    </html>
  );
}
