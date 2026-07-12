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
  title: {
    default: "Dimensi Suara",
    template: "%s | Dimensi Suara",
  },
  description: "Dimensi Suara adalah platform aggregator musik, publishing digital, distribusi lagu, metadata rilis, dan laporan royalti musik.",
  applicationName: "Dimensi Suara",
  authors: [{ name: "Dimensi Suara" }],
  creator: "Dimensi Suara",
  publisher: "Dimensi Suara",
  category: "Music Distribution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${dm_sans.variable}`} data-bs-theme="light" suppressHydrationWarning>
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
