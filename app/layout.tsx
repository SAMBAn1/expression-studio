import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "collections-expression-builder-poc.galactic-sipu.chatgpt.site";
  const protocol = host.includes("localhost") ? "http" : "https";
  const imageUrl = `${protocol}://${host}/og.png`;
  return {
    title: "Collections Expression Studio",
    description: "Build Excel-like customer and invoice calculations that compile into governed SQL.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "Collections Expression Studio",
      description: "Excel-like answers. Native SQL.",
      images: [{ url: imageUrl, width: 1680, height: 945, alt: "Collections Expression Studio" }],
    },
    twitter: { card: "summary_large_image", title: "Collections Expression Studio", description: "Excel-like answers. Native SQL.", images: [imageUrl] },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
