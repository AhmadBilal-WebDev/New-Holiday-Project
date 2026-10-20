import React, { Suspense } from "react";
import PackageList from "@/components/Package/PackageList";
import PackageModify from "@/components/Home/Search/ModifySearch/PackageModify";

export const metadata = {
  title: "Hajj & Umrah Packages UK, Cheap & Affordable Deals | Al Hijaz Tours ",
  description:
    "Browse Hajj & Umrah packages UK with Al Hijaz Tours. We offer cheap and affordable pilgrimage packages including flights, visa processing, hand-picked hotels near the Haram, guided Ziyarat tours, and 24/7 support — all tailored for UK pilgrims.",
  keywords: [
    "Hajj & Umrah Packages UK",
    "Hajj packages UK",
    "Umrah packages UK ",
    "Cheap Umrah packages ",
    "Affordable Hajj packages ",
    "Islamic travel packages ",
    "Pilgrimage travel deals ",
    "Makkah Madinah packages ",
    "Best Hajj Umrah deals UK",
  ],
};

async function Activities() {
  return (
    <>
      <script type="application/ld+json" id="organization-schema">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "TravelAgency",
          name: "Al Hijaz Tours",
          url: "https://alhijaztours.net",
          keywords: [
            "Hajj",
            "Umrah",
            "Makkah",
            "Madinah",
            "Masjid al-Haram",
            "Masjid an-Nabawi",
            "Saudi Arabia ",
            "Flight & Visa Services",
            "Hotel Accommodation",
            "Islamic Travel Agency",
            "UK Pilgrimage Services",
          ],
        })}
      </script>

      <section>
        <Suspense fallback={null}>
          <PackageModify />
        </Suspense>
      </section>

      <PackageList />
    </>
  );
}

export default Activities;
