import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "胖东来文化数字馆｜从理解人开始",
  description:
    "从网络标签走向真实的人、制度与选择：一个关于胖东来企业文化的非官方数字观察项目。",
  keywords: ["胖东来", "企业文化", "数字文化馆", "零售", "AI 文化问答"],
  openGraph: {
    title: "胖东来文化数字馆｜从理解人开始",
    description: "不要只停留在表面——从网络标签走向真实的人、制度与选择。",
    type: "website",
    locale: "zh_CN",
    images: [
      {
        url: "/og.png",
        width: 1734,
        height: 909,
        alt: "不要只停留在表面——理解胖东来，从理解人开始。",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "胖东来文化数字馆｜从理解人开始",
    description: "一个非官方的胖东来文化观察项目。",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
