import React from "react";
import Detail from "./components/Detail";
import Form from "./components/Form";
import ContactHero from "./components/ContactHero";
import ContactConsult from "./components/ContactConsult";
import contactStyles from "./ContactUs.module.css";
export const metadata = {
  title: "Contact Al Hijaz Tours UK | Book Your Hajj & Umrah Package Today",
  description:
    "Contact Al Hijaz Tours for Hajj and Umrah packages from the UK. Speak to our travel experts for booking, visa guidance and travel assistance.",
  keywords: [
    "Contact Al Hijaz Tours",
    "Umrah Travel Agency Contact",
    "Hajj Package UK Contact",
    "Islamic Travel UK",
  ],
   alternates: {
    canonical: "https://alhijaztours.net/contact-us",
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
            "Al Hijaz Tours Contact",
            "Customer Support",
            "Travel Booking Assistance",
            "Hajj & Umrah Inquiries",
            "Contact Phone",
            "Email Address",
            "Travel Office Address",
            "Support Team",
            "Personalized Travel Help",
            "24/7 Support",
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
      <ContactHero />
      <section className={contactStyles.contactSection}>
        <div className={`container ${contactStyles.contactLayout}`}>
          <Form />
          <Detail />
        </div>
      </section>
      <ContactConsult />
    </div>
  );
}
