import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Personal Health Checker | 把日常记成线索",
  description: "记录睡眠、体重与饮水，让每天的变化慢慢显影。",
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
