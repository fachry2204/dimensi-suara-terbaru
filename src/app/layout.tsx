import type { Metadata } from "next";
import { DM_Sans } from 'next/font/google';
import { GlobalStateProvider } from '@/context/GolobalStateProvider';
import { ThemeProvider } from '@/layout/theme-provider/theme-provider';
import { BrandingProvider } from "@/contexts/BrandingContext";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-perfect-scrollbar/dist/css/styles.css';
import '@/styles/scss/style.scss';
import "./globals.css";

const dm_sans = DM_Sans({
  weight: ["400", "500", "700"],
  display: "swap",
  subsets: ["latin"],
  variable: '--font-jampack'
});

export const metadata: Metadata = {
  title: "Dimensi Suara CMS",
  description: "Dimensi Suara CMS Dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dm_sans.variable}`} data-bs-theme="light">
      <body className="antialiased">
        <ThemeProvider>
          <GlobalStateProvider>
            <BrandingProvider>
              {children}
            </BrandingProvider>
          </GlobalStateProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
