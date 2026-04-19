import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ChainLogic AI | Decision Intelligence",
  description: "Decision Intelligence for Automotive SMEs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
