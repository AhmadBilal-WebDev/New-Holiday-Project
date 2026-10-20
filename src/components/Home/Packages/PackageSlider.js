"use client";
import React, { useEffect } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css/pagination";
import Image from "next/image";
import Link from "next/link";
import moment from "moment";
import { Inter, Outfit } from "next/font/google";
import { FaArrowLeft, FaArrowRight, FaStar, FaMapMarkerAlt, FaCalendarAlt, FaUsers } from "react-icons/fa";
import PriceDisplay from "@/components/Currency/PriceDisplay";
import s from "./PackageSlider.module.css";

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600"],
});

const outfit = Outfit({
    subsets: ["latin"],
    weight: ["600", "700"],
});

export default function PackageSlider({ packages, hideControls = false }) {
    const [packagesList, setPackagesList] = React.useState(packages);

    useEffect(() => {
        setPackagesList(packages);
    }, [packages]);

    const getLowestPrice = (priceDetails) => {
        if (!priceDetails || priceDetails.length === 0) return null;
        const filteredPrices = priceDetails.filter((p) => p.type?.toLowerCase() !== "without_beds");
        if (filteredPrices.length === 0) return null;
        const sortedPrices = filteredPrices.sort(
            (a, b) => Number(a.sale_per_person) - Number(b.sale_per_person)
        );
        return sortedPrices[0].sale_per_person;
    };

    const getLocation = (item) => {
        const city = item?.hotels?.[0]?.hotel?.city;
        if (city) return city;
        if (item?.category?.name) return item.category.name;
        return "Makkah";
    };

    const formatRating = (rating) => {
        const r = Number(rating);
        if (!r || Number.isNaN(r)) return "5.0";
        return r % 1 === 0 ? `${r}.0` : r.toFixed(1);
    };

    return (
        <div className={`${s.sliderWrap} ${inter.className}`}>
            {!hideControls && (
                <div className={s.controls}>
                    <button className={`${s.navBtn} custom-prevh`} aria-label="Previous">
                        <FaArrowLeft />
                    </button>
                    <button className={`${s.navBtn} custom-nexth`} aria-label="Next">
                        <FaArrowRight />
                    </button>
                </div>
            )}

            <Swiper
                className={s.packageSwiper}
                modules={[Pagination, Navigation]}
                spaceBetween={24}
                slidesPerView={1}
                slidesPerGroup={1}
                loop={packagesList.length > 3}
                watchOverflow
                navigation={{ nextEl: ".custom-nexth", prevEl: ".custom-prevh" }}
                pagination={{ clickable: true }}
                breakpoints={{
                    320: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 16 },
                    576: { slidesPerView: 1, slidesPerGroup: 1, spaceBetween: 20 },
                    768: { slidesPerView: 2, slidesPerGroup: 1, spaceBetween: 20 },
                    992: { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 24 },
                    1200: { slidesPerView: 3, slidesPerGroup: 1, spaceBetween: 24 },
                }}
            >
                {packagesList.map((item, index) => {
                    const nights = moment(item.end_date).diff(moment(item.start_date), "days");
                    const days = nights > 0 ? nights + 1 : 1;
                    const lowestPrice = getLowestPrice(item?.price_Details);
                    const location = getLocation(item);
                    const travelers = item?.max_pax || null;
                    const packageHref = `/${item?.category?.slug}/${item.slug}`;

                    return (
                        <SwiperSlide key={item.id || item.slug || index}>
                            <article className={s.card}>
                                {/* Image + rating */}
                                <div className={s.imgWrap}>
                                    <Image
                                        fill
                                        src={item.featured_image}
                                        alt={item.title}
                                        className={s.cardImg}
                                        quality={75}
                                        sizes="(max-width: 575px) 100vw, (max-width: 991px) 50vw, 33vw"
                                    />
                                    <div className={s.ratingBadge}>
                                        <FaStar className={s.ratingStar} aria-hidden="true" />
                                        <span>{formatRating(item?.star_rating)}</span>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className={s.body}>
                                    <h5 className={`${s.title} ${outfit.className}`}>{item.title}</h5>

                                    <div className={s.locationRow}>
                                        <FaMapMarkerAlt className={s.metaIcon} aria-hidden="true" />
                                        <span>{item?.user_details?.address}</span>
                                    </div>

                                    <div className={s.metaRow}>
                                        <span className={s.metaItem}>
                                            <FaCalendarAlt className={s.metaIcon} aria-hidden="true" />
                                            {days} Days / {nights} Night{nights !== 1 ? "s" : ""}
                                        </span>
                                        {travelers && (
                                            <>
                                                <span className={s.metaDot} aria-hidden="true" />
                                                <span className={s.metaItem}>
                                                    <FaUsers className={s.metaIcon} aria-hidden="true" />
                                                    {item.max_pax} Travellers
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    <div className={s.metaRow}>
                                        <span className={s.metaItem}>
                                            <FaCalendarAlt className={s.metaIcon} aria-hidden="true" />
                                            <span className={s.metaItemText}>Start From:</span>  {`${item?.start_date}`}
                                        </span>
                                    </div>

                                    <div className={s.amenityTags}>
                                        <span className={s.amenityTag}>Flights</span>
                                        <span className={s.amenityTag}>Hotel</span>
                                        <span className={s.amenityTag}>Transfers</span>
                                        <span className={s.amenityTag}>Visa</span>
                                    </div>

                                    <hr className={s.divider} />

                                    <div className={s.footer}>
                                        <div className={s.priceBlock}>
                                            {lowestPrice != null && (
                                                <div className={s.priceRow}>
                                                    <span className={`${s.priceValue} ${outfit.className}`}>
                                                        <PriceDisplay
                                                            price={lowestPrice}
                                                            currency={item?.currency_code}
                                                        />
                                                    </span>
                                                    <span className={s.pricePer}>/person</span>
                                                </div>
                                            )}
                                            <span className={s.priceNote}>Vat & Taxes Included</span>
                                        </div>
                                        <Link href={packageHref} className={s.btnBook}>
                                            Book Now
                                        </Link>
                                    </div>
                                </div>
                            </article>
                        </SwiperSlide>
                    );
                })}
            </Swiper>
        </div>
    );
}
