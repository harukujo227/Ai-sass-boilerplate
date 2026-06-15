import { Inter } from "next/font/google";
import { Providers } from "./providers";
import config from "@/lib/config";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const appName = config?.appName || "AI SaaS";

export const metadata = {
  title: `${appName} — Build & Ship Credit-Based AI Apps`,
  description: `${appName} is a platform to launch, brand, and ship credit-based AI apps — image, video, chat, and audio — in minutes.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className={`${inter.className} h-full antialiased bg-bg-page text-primary-text`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
