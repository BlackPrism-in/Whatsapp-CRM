import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

// Space Grotesk — the WhatsMine/PrismChat brand typeface.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PrismChat — WhatsApp CRM, Broadcasting & Automation",
  description:
    "Multi-channel customer messaging, AI chatbots, broadcasting and automation for WhatsApp, SMS and email.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        {/* Apply the saved theme before paint to avoid a flash. `system` follows
            the OS; an explicit choice overrides it. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t==='dark'||((!t||t==='system')&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
