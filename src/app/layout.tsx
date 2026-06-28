import type { Metadata } from "next";
import "./globals.css";
import { PageTitleProvider } from "@/components/page-title-provider";
import { fontSans, fontVariables } from "@/lib/fonts";

export const metadata: Metadata = {
  title: {
    template: "RPG Hub | %s",
    default: "RPG Hub",
  },
  description: "RPG Hub ERP System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${fontVariables}`}>
      <body className={`${fontSans.className} min-h-full flex flex-col`}>
        <PageTitleProvider>{children}</PageTitleProvider>
      </body>
    </html>
  );
}
