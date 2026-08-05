import type { Metadata } from "next";
import { Prompt, Geist } from "next/font/google";
import "./globals.css";

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "Srichai Property - ค้นหาบ้านและอสังหาริมทรัพย์",
  description: "ศูนย์รวมอสังหาริมทรัพย์คุณภาพ พร้อมระบบจองนัดหมายเข้าชมและแชทกับนายหน้าโดยตรง",
};

import { Providers } from "@/app/providers";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="th"
      className={cn("h-full", "antialiased", prompt.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-800">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
