import type { Metadata } from "next";
import "./globals.css";

const SITE_URL = "https://semitic-search.andy-barr.com";
const TITLE = "Semitic Search";
const DESCRIPTION =
  "Identify Semitic roots and find cross-language cognates across 17 varieties — Arabic, Hebrew, Syriac, Amharic, Tigrinya, Ge'ez, Akkadian, Ugaritic, Aramaic, Phoenician, and more.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: TITLE,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
