import type { Metadata } from "next";
import { Inter, Jura, Aldrich } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jura = Jura({
  subsets: ["latin"],
  variable: "--font-jura",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const aldrich = Aldrich({
  subsets: ["latin"],
  variable: "--font-aldrich",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "OTTera Data Room",
  description: "Secure document sharing for deals and due diligence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jura.variable} ${aldrich.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
