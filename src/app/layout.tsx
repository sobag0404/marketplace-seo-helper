import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEO-генератор хештегов для маркетплейсов",
  description: "Бесплатный сервис для генерации хештегов для товаров на Ozon, Wildberries и других маркетплейсах. Обработка файлов происходит локально в браузере.",
  keywords: ["SEO", "хештеги", "маркетплейс", "Ozon", "Wildberries", "генератор", "пледы", "принт"],
  authors: [{ name: "Marketplace SEO Helper" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "SEO-генератор хештегов для маркетплейсов",
    description: "Генерация хештегов для товаров маркетплейсов. Без API, без сервера — всё в браузере.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
