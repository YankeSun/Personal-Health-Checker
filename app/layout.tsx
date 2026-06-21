import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Health Checker | 看清日常变化",
  description: "记录睡眠、体重与饮水，让每天的变化更清楚。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
      </body>
    </html>
  );
}
