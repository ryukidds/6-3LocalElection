import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "6·3 대학 시국선언 아카이브",
  description: "6·3 투표용지 부족 사태 전국구 대학 시국선언 아카이브",
  keywords: ["시국선언", "대학 시국선언", "6.3 지방선거", "투표용지 부족 사태", "아카이브", "대학생 시국선언"],
  openGraph: {
    title: "6·3 대학 시국선언 아카이브",
    description: "6·3 투표용지 부족 사태 전국구 대학 시국선언 아카이브",
    type: "website",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>{children}</body>
    </html>
  );
}
