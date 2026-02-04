import { Inter, Bebas_Neue, Ubuntu, Shadows_Into_Light, Eagle_Lake, Roboto_Slab, Tinos } from "next/font/google";
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

const ubuntu = Ubuntu({
  variable: "--font-ubuntu",
  subsets: ["latin"],
  weight: "400",
});

const shadowsIntoLight = Shadows_Into_Light({
  variable: "--font-shadows",
  subsets: ["latin"],
  weight: "400",
});

const eagleLake = Eagle_Lake({
  variable: "--font-eagle-lake",
  subsets: ["latin"],
  weight: "400",
});

const robotoSlab = Roboto_Slab({
  variable: "--font-roboto-slab",
  subsets: ["latin"],
  weight: "300",
});

const tinos = Tinos({
  variable: "--font-tinos",
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
      <body className={`${inter.variable} ${bebasNeue.variable} ${ubuntu.variable} ${shadowsIntoLight.variable} ${eagleLake.variable} ${robotoSlab.variable} ${tinos.variable}`}>
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
