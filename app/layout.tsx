import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Health Tracker | 每日健康记录",
  description: "记录睡眠、体重与饮水，用清晰趋势理解每天的身体状态。",
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
