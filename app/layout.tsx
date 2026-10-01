import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Winter Arc | Daily Practice",
  description: "A calm, local-first companion for your 151-day Winter Arc.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
