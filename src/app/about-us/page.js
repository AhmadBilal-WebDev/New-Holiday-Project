import React from "react";
import AboutHero from "@/components/AboutUs/AboutHero";
import SectionOne from "@/components/AboutUs/SectionOne";
import SectionTwo from "@/components/AboutUs/SectionTwo";
import SectionThree from "@/components/AboutUs/SectionThree";
import SectionStudio from "@/components/AboutUs/SectionStudio";
import SectionPress from "@/components/AboutUs/SectionPress";
import styles from "./aboutPage.module.css";

export const metadata = {
  title: "About Al Hijaz Tours | Trusted Hajj & Umrah Travel Agency UK",
  description:
    "Al Hijaz Tours is a UK based trusted Hajj and Umrah travel agency offering ATOL protected pilgrimage packages with expert guidance and reliable services.",
  keywords: [
    "Al Hijaz Tours",
    "About Us",
    "Hajj and Umrah Travel Agency UK",
    "ATOL Protected Travel",
    "Islamic Travel UK",
  ],
   alternates: {
    canonical: "https://alhijaztours.net/about-us",
  },
};
export default function page() {
  return (
    <div>
      <script type="application/ld+json" id="organization-schema">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TravelAgency",
          name: "Al Hijaz Tours",
          url: "https://alhijaztours.net",
          keywords: [
            "Al Hijaz Tours",
            "Hajj & Umrah Travel Packages",
            "Pilgrimage Tour Operator",
            "UK Travel Agency",
            "Hotel Booking Services",
            "Flight Arrangements",
            "Airport Transfers",
            "Customer Support",
            "Customized Tours",
            "Spiritual Travel Services",
          ],
        })}
      </script>
      <script type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org/",
            "@type": "Product",
            "name": "Alhijaz tours",
            "image": "https://alhijaztours.net/_next/image?url=%2Fimages%2Flogo.png&w=256&q=75",
            "description": "Book trusted Hajj & Umrah Packages from the UK with ATOL protection. Affordable Umrah & Hajj packages with expert Islamic travel support.",
            "brand": {
              "@type": "Brand",
              "name": "Alhijaz tours"
            },
            "offers": {
              "@type": "AggregateOffer",
              "url": "https://alhijaztours.net/",
              "priceCurrency": "GBP",
              "lowPrice": "1000",
              "highPrice": "2500",
              "offerCount": "2"
            },
            "aggregateRating": {
              "@type": "AggregateRating",
              "ratingValue": "5",
              "bestRating": "5",
              "worstRating": "0",
              "ratingCount": "1",
              "reviewCount": "1"
            },
            "review": {
              "@type": "Review",
              "name": "Tayyeba Ali",
              "reviewBody": "I went with Alhijaz Tours in August 2025, and my experience was good, smooth, and memorable. The trip was well-organized, and everything went perfectly from start to finish. The team was professional and attentive, ensuring that all our needs were met throughout the journey.",
              "reviewRating": {
                "@type": "Rating",
                "ratingValue": "5",
                "bestRating": "5",
                "worstRating": "0"
              },
              "datePublished": "2025-12-01",
              "author": { "@type": "Person", "name": "Muhammad Waqas" }
            }

          }),
        }}
      />
      <div className={styles.topFlow}>
        <div aria-hidden="true" />
        <AboutHero />
        <SectionThree />
      </div>
      <SectionTwo />
      <SectionOne />
      <SectionStudio />
      <SectionPress />
    </div>
  );
}
