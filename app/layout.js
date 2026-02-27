import { Barlow, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieConsent";
import ErrorBoundary from "@/components/ErrorBoundary/ErrorBoundary";
import Providers from "@/components/Providers";

const barlow = Barlow({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-barlow-condensed",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata = {
  title: "Friesian Ranchwear",
  description: "Nothing you wear is an accident.",
  icons: {
    icon: '/logo-white.png',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${barlow.variable} ${barlowCondensed.variable}`}>
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
