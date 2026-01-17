import { Inter, Bebas_Neue } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieConsent";
import ErrorBoundary from "@/components/ErrorBoundary/ErrorBoundary";
import Providers from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const bebasNeue = Bebas_Neue({
  variable: "--font-bebas-neue",
  subsets: ["latin"],
  weight: "400",
});

export const metadata = {
  title: "Friesian Ranchwear",
  description: "Western meets streetwear. Rugged but modern, country but cool.",
  icons: {
    icon: '/logo-white.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${bebasNeue.variable}`}>
        <Providers>
          <GoogleAnalytics />
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
          <CookieConsent />
        </Providers>
      </body>
    </html>
  );
}
