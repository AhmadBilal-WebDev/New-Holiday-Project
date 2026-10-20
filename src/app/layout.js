import "bootstrap/dist/css/bootstrap.min.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "yet-another-react-lightbox/styles.css";
import BootstrapClient from "@/components/BootstrapClient";
import ScrollTop from "@/components/ScrollTop/ScrollTop";
import "./globals.css";
import "./mediaquery.css";
import "swiper/css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import LayoutVisibility from "@/components/LayoutVisibility";
import SessionProvider from "@/components/Auth/SessionProvider";
import { MantineProvider } from "@mantine/core";
import { CurrencyProvider } from "@/util/currency";
import { PackageCategoriesProvider } from "@/contexts/PackageCategoriesContext";
import { Notifications } from "@mantine/notifications";
import NextTopLoader from "nextjs-toploader";
import Script from "next/script";
import VipCookieConsent from "@/components/CookieConsent";

export const metadata = {
  metadataBase: new URL("https://alhijaztours.net"),
  title: "Umrah Packages 2026 UK | ATOL Protected Hajj & Umrah | Al Hijaz Tours",
  description:
    "Book ATOL-protected Umrah Packages 2026 from the UK with flights, 5★–3★ hotels & transport included. Trusted Hajj & Umrah travel experts.",
  keywords: [
    "Pilgrimage to Makkah",
    "Umrah visa process UK",
    "Flights to Jeddah",
    "Hotels near Haram",
    "Islamic Travel Agency UK",
    "Affordable Umrah packages from UK",
    "Luxury Umrah packages UK",
    "Islamic travel services",
    "Umrah packages with hotels",
    "Family Umrah packages UK",
    "Group Hajj packages UK ",
    "Trusted Hajj Umrah agents UK ",
    "Islamic pilgrimage travel UK",
    "Religious journey to Madinah",
  ],
  icons: {
    icon: "/favicon.png",
  },
   alternates: {
    canonical: "https://alhijaztours.net",
  },
  // verification: {
  //   google: "google77d305b7f6f43da9",
  // },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        <meta name="google-site-verification" content="LrPi-9aOkjsL7aVkJs-j4E9ChWyOya5A_bFRMlXZZeU" />
        <meta name="author" content="Al Hijaz Tours" />
        <meta name="msvalidate.01" content="F4A28D2964A77BC59283597A374690FD" />
        
        {/* Google Ads gtag */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=AW-18370525514"
          strategy="lazyOnload"
        />

        <Script id="google-ads-gtag" strategy="lazyOnload">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'AW-18370525514');
          `}
        </Script>
      </head>
      <body id="scrool">
        <SpeedInsights />
        <Analytics />
        <VipCookieConsent/>
        <CurrencyProvider>
          <PackageCategoriesProvider>
          <BootstrapClient />
          <MantineProvider>
            <NextTopLoader height={3} crawl={true} showSpinner={false} />
            <Notifications position="top-right" />
            <SessionProvider>
              <LayoutVisibility>{children}</LayoutVisibility>
            </SessionProvider>
          </MantineProvider>
          </PackageCategoriesProvider>
        </CurrencyProvider>
        <ScrollTop />
      </body>
    </html>
  );
}
