import type { Metadata, Viewport } from "next";
import { Fraunces, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const TITLE = "Tripsplit - plan the trip, split the bill";
const DESCRIPTION =
  "Plan the trip. Split the bill. Stay friends. A shareable itinerary and fair cost splitter for friend groups, built for WhatsApp.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: TITLE, template: "%s | Tripsplit" },
  description: DESCRIPTION,
  applicationName: "Tripsplit",
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Tripsplit",
    type: "website",
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0f766e" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1a19" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-IN" className={`${jakarta.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
