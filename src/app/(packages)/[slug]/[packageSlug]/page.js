'use client';
import Link from "next/link";
import React, { useState, useEffect, use } from "react";
import { BiPhone } from "react-icons/bi";
import PackageGalleryImages from "@/components/Package/Detail/PackageGalleryImages";
import PackageAboutDescription from "@/components/Package/Detail/PackageAboutDescription";
import PackageInclExcl from "@/components/Package/Detail/PackageInclExcl";
import { BsHeadset, BsWhatsapp } from "react-icons/bs";
import {
    FaCalendarAlt,
    FaCalendarCheck,
    FaCheckCircle,
    FaClock,
    FaHeart,
    FaHotel,
    FaMapMarkerAlt,
    FaMoon,
    FaPlane,
    FaRegHeart,
    FaShareAlt,
    FaStar,
    FaTimes,
    FaTrain,
    FaWhatsapp,
} from "react-icons/fa";
import moment from "moment";
import PackageDetailFaqs from "@/components/Package/Detail/PackageDetailFaqs";
import PackageDetailIteniry from "@/components/Package/Detail/PackageDetailIteniry";
import PriceDisplay from "@/components/Currency/PriceDisplay";
import BookNowButton from "@/components/Package/Detail/BookNowButton";
import PackageHotelDetail from "@/components/Package/Detail/PackageHotelDetail";
import PackageFlightDetail from "@/components/Package/Detail/PackageFlightDetail";
import PackageTransferDetail from "@/components/Package/Detail/PackageTransferDetail";
import PackageVisaDetail from "@/components/Package/Detail/PackageVisaDetail";
import PackageDetailLoader from "@/components/Loader/PackageDetailLoader";
import { GiPassport } from "react-icons/gi";
import { notifications } from "@mantine/notifications";
import { Inter, Outfit } from "next/font/google";
import styles from "./PackageDetail.module.css";

const outfit = Outfit({
    subsets: ["latin"],
    weight: ["600", "700"],
    display: "swap",
});

const inter = Inter({
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
    display: "swap",
});

const getRatingLabel = (rating) => {
    const value = Number(rating) || 0;
    if (value >= 4.5) return 'Exceptional';
    if (value >= 4) return 'Excellent';
    if (value >= 3.5) return 'Very Good';
    if (value >= 3) return 'Good';
    if (value > 0) return 'Fair';
    return '';
};

const getLocationLabel = (pkg) => {
    if (pkg?.city) return pkg.city;
    if (pkg?.destination) return pkg.destination;
    if (pkg?.location) return pkg.location;
    const categoryName = pkg?.category?.name || '';
    return categoryName.replace(/\s*packages?\s*/i, '').trim() || categoryName;
};

export default function page({ params }) {
    const { packageSlug: slug } = use(params);
    const [PackageDetail, setPackageDetail] = useState({});
    const [PriceDetail, setPriceDetail] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentURL, setCurrentURL] = useState("");
    const [isWishlisted, setIsWishlisted] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setCurrentURL(window.location.href);
        }
    }, []);

    useEffect(() => {
        if (!slug || typeof window === "undefined") return;
        try {
            const raw = localStorage.getItem("packageWishlist");
            const list = raw ? JSON.parse(raw) : [];
            setIsWishlisted(Array.isArray(list) && list.includes(slug));
        } catch {
            setIsWishlisted(false);
        }
    }, [slug]);

    useEffect(() => {
        const fetchPackageData = async () => {
            try {
                setLoading(true);
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/packages/${slug}`, {
                    cache: 'no-store',
                    headers: {
                        'Content-Type': 'application/json',
                        // 'ngrok-skip-browser-warning': 'true'
                    }
                });
                const response = await res.json();
                if (response.Success) {
                    setPackageDetail(response?.Content?.package);
                    setPriceDetail(response?.Content?.package?.price_Details ? response?.Content?.package?.price_Details : []);
                }
            } catch (error) {
                console.error('Error fetching package:', error);
            } finally {
                setLoading(false);
            }
        };

        if (slug) {
            fetchPackageData();
        }
    }, [slug]);

    if (loading) {
        return <PackageDetailLoader />;
    }

    if (!PackageDetail || Object.keys(PackageDetail).length === 0) {
        return null;
    }

    const waMsg = encodeURIComponent(`Hello! I want to inquire about this package: ${currentURL}`);
    const waLink = `https://wa.me/+447309803307?text=${waMsg}`;

    const nights = PackageDetail?.start_date && PackageDetail?.end_date
        ? Math.max(0, moment(PackageDetail.end_date).diff(moment(PackageDetail.start_date), 'days'))
        : 0;
    const days = nights > 0 ? nights + 1 : 0;
    const locationLabel = getLocationLabel(PackageDetail);
    const ratingValue = Number(PackageDetail?.star_rating) || 0;
    const ratingLabel = getRatingLabel(ratingValue);
    const priceOptions = (PriceDetail || []).filter((p) => p.type !== 'without_beds');
    const formatRoomType = (type) => {
        if (!type) return 'Room';
        if (type === 'without_beds') return 'Without Bed';
        return String(type)
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };
    const totalPackagePrice = (PriceDetail || []).reduce((min, item) => {
        const value = Number(item?.sale_per_person);
        if (!Number.isFinite(value)) return min;
        return min === null ? value : Math.min(min, value);
    }, null);

    const handleShare = async () => {
        const shareData = {
            title: PackageDetail?.title || 'Package',
            text: PackageDetail?.title || 'Check out this package',
            url: currentURL || (typeof window !== 'undefined' ? window.location.href : ''),
        };
        try {
            if (typeof navigator !== 'undefined' && navigator.share) {
                await navigator.share(shareData);
                return;
            }
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(shareData.url);
                notifications.show({
                    title: 'Link copied',
                    message: 'Package link copied to clipboard',
                    color: 'pink',
                    autoClose: 2000,
                });
            }
        } catch {
            // user cancelled share — ignore
        }
    };

    const handleWishlist = () => {
        if (typeof window === 'undefined' || !slug) return;
        try {
            const raw = localStorage.getItem('packageWishlist');
            const list = raw ? JSON.parse(raw) : [];
            const next = Array.isArray(list) ? [...list] : [];
            const exists = next.includes(slug);
            const updated = exists ? next.filter((id) => id !== slug) : [...next, slug];
            localStorage.setItem('packageWishlist', JSON.stringify(updated));
            setIsWishlisted(!exists);
            notifications.show({
                title: exists ? 'Removed' : 'Saved',
                message: exists ? 'Removed from wishlist' : 'Added to wishlist',
                color: 'pink',
                autoClose: 1800,
            });
        } catch {
            // ignore storage errors
        }
    };

    return (
        <div className={`package-Detail ${styles.pageWrapper}`}>

            {/* ── TOP: Package gallery banner ── */}
            <div className={styles.heroRight}>
                <PackageGalleryImages imageList={PackageDetail?.gallery_images || []} />
            </div>

            {/* ══ HERO SUMMARY ══ */}

            {/* BOOKING BAR */}
            {/* <div className={styles.bookingBar}>
                <div className="container">
                    <div className={styles.bookingBarInner}>
                        <h4 className={styles.bookingBarTitle}>{PackageDetail?.title}</h4>
                        <div className={styles.bookingBarActions}>
                            <Link href="tel:0121 777 2522" className={styles.btnCall}>
                                <BiPhone /> Call Now
                            </Link>
                            <Link target="_blank" href={waLink} className={styles.btnWhatsapp}>
                                <BsWhatsapp /> Whatsapp
                            </Link>
                        </div>
                    </div>
                </div>
            </div> */}

            {/* MAIN CONTENT */}
            <div className="container mt-4">

                {/* Gallery */}
                {/* <div className={styles.galleryWrapper}>
                    <PackageGalleryImages imageList={PackageDetail?.gallery_images || []} />
                </div> */}

                {/* Service Feature Boxes */}
                {/* <div className={styles.servicesGrid}>
                    <div className={styles.serviceCard}>
                        <span className={styles.serviceCardIcon}><GiPassport size={36} /></span>
                        <div className={styles.serviceCardText}>Visa Included</div>
                    </div>
                    <div className={styles.serviceCard}>
                        <span className={styles.serviceCardIcon}><FaTrain size={36} /></span>
                        <div className={styles.serviceCardText}>Transport Included</div>
                    </div>
                    <div className={styles.serviceCard}>
                        <span className={styles.serviceCardIcon}><FaPlane size={36} /></span>
                        <div className={styles.serviceCardText}>Flight Included</div>
                    </div>
                    <div className={styles.serviceCard}>
                        <span className={styles.serviceCardIcon}><FaHotel size={36} /></span>
                        <div className={styles.serviceCardText}>Hotel Included</div>
                    </div>
                    <div className={styles.serviceCard}>
                        <span className={styles.serviceCardIcon}><BsHeadset size={36} /></span>
                        <div className={styles.serviceCardText}>24/7 Support</div>
                    </div>
                </div> */}



                {/* TWO-COLUMN LAYOUT */}
                <div className="row g-4">
                    <div className="col-md-8 col-12">
                        <section className={styles.heroSection}>
                            <div className={styles.heroInner}>
                                <div className={styles.heroCatTag}>
                                    {PackageDetail?.category?.name || 'Packages'}
                                </div>

                                <div className={styles.heroTitleRow}>
                                    <h1 className={styles.heroTitle}>{PackageDetail?.title}</h1>
                                    <div className={styles.heroIconActions}>
                                        <button
                                            type="button"
                                            className={styles.heroIconBtn}
                                            onClick={handleShare}
                                            aria-label="Share package"
                                            title="Share"
                                        >
                                            <FaShareAlt size={15} />
                                        </button>
                                        <button
                                            type="button"
                                            className={`${styles.heroIconBtn}${isWishlisted ? ` ${styles.heroIconBtnActive}` : ''}`}
                                            onClick={handleWishlist}
                                            aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                                            title="Wishlist"
                                        >
                                            {isWishlisted ? <FaHeart size={15} /> : <FaRegHeart size={15} />}
                                        </button>
                                    </div>
                                </div>

                                {locationLabel ? (
                                    <div className={styles.heroLocation}>
                                        <FaMapMarkerAlt size={14} className={styles.heroMetaIcon} aria-hidden="true" />
                                        <span>{locationLabel}</span>
                                    </div>
                                ) : null}

                                <div className={styles.heroMetaRow}>
                                    {ratingValue > 0 ? (
                                        <div className={styles.heroRatingGroup}>
                                            <span className={styles.heroRatingBadge}>
                                                <FaStar size={11} aria-hidden="true" />
                                                {ratingValue.toFixed(1)}
                                            </span>
                                            {ratingLabel ? (
                                                <span className={styles.heroRatingText}>{ratingLabel}</span>
                                            ) : null}
                                        </div>
                                    ) : null}

                                    {days > 0 ? (
                                        <div className={styles.heroDuration}>
                                            <FaClock size={14} className={styles.heroMetaIcon} aria-hidden="true" />
                                            <span>
                                                {days} Day{days !== 1 ? 's' : ''} / {nights} Night{nights !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                    ) : null}
                                </div>

                                {priceOptions.length > 0 ? (
                                    <div className={styles.heroPriceList}>
                                        {priceOptions.map((item, i) => (
                                            <div key={`${item?.type}-${i}`} className={styles.heroPriceBar}>
                                                <div className={styles.heroPriceLeft}>
                                                    <span className={styles.heroPriceType}>{item?.type}</span>
                                                    <span className={styles.heroPriceAmount}>
                                                        <PriceDisplay
                                                            price={item?.sale_per_person}
                                                            currency={PackageDetail?.currency_code}
                                                        />
                                                    </span>
                                                </div>
                                                <span className={styles.heroPricePp}>PP</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </section>

                        {/* Description */}
                        <PackageAboutDescription html={PackageDetail?.description || ''} />

                        {/* Package Summary */}
                        <div className={styles.summarySection}>
                            <h2 className={`${styles.summaryHeading} ${outfit.className}`}>Package Summary</h2>
                            <div className={`${styles.summaryGrid} ${inter.className}`}>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryLabel}>Departure</div>
                                    <div className={styles.summaryValue}>
                                        {moment(PackageDetail?.start_date).format('DD MMM YYYY')}
                                    </div>
                                </div>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryLabel}>Return</div>
                                    <div className={styles.summaryValue}>
                                        {moment(PackageDetail?.end_date).format('DD MMM YYYY')}
                                    </div>
                                </div>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryLabel}>Duration</div>
                                    <div className={styles.summaryValue}>
                                        {moment(PackageDetail?.end_date).diff(moment(PackageDetail?.start_date), 'days')} Nights
                                    </div>
                                </div>
                                <div className={styles.summaryItem}>
                                    <div className={styles.summaryLabel}>Rating</div>
                                    <div className={styles.starsWrap} aria-label={`${PackageDetail?.star_rating || 0} star rating`}>
                                        {Array.from({ length: Math.max(0, Math.floor(Number(PackageDetail?.star_rating) || 0)) }).map((_, index) => (
                                            <FaStar key={index} size={14} className={styles.summaryStar} />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Itinerary */}
                        {!!PackageDetail?.itineraries?.length &&
                            <PackageDetailIteniry itinrList={PackageDetail?.itineraries || []} />
                        }

                        {/* Included / Excluded */}
                        <PackageInclExcl
                            includedHtml={PackageDetail?.included_items || ''}
                            excludedHtml={PackageDetail?.excluded_items || ''}
                        />

                        {/* Hotels */}
                        {!!PackageDetail?.hotels?.length &&
                            <PackageHotelDetail PackageDetail={PackageDetail} />
                        }

                        {/* Flights */}
                        {!!PackageDetail?.flights?.length &&
                            <PackageFlightDetail PackageDetail={PackageDetail} />
                        }

                        {/* Transfers */}
                        {!!PackageDetail?.transfers?.length &&
                            <PackageTransferDetail PackageDetail={PackageDetail} />
                        }

                        {/* Visas */}
                        {!!PackageDetail?.visas?.length &&
                            <PackageVisaDetail PackageDetail={PackageDetail} />
                        }
                    </div>

                    {/* SIDEBAR */}
                    <div className="col-md-4 col-12">
                        {/* Contact Card */}
                        {/* <div className={styles.contactCard}>
                            <div className={styles.contactOverlay}></div>
                            <div className={styles.contactContent}>
                                <h4 className={styles.contactTitle}>Got a Question?</h4>
                                <p className={styles.contactSubtitle}>
                                    If you have any questions about your booking or our packages, feel free to ask.
                                    Our team will get back to you as soon as possible.
                                </p>
                                <div className={styles.contactActions}>
                                    <a target="_blank" href={waLink}>
                                        <button className={styles.contactBtnWa}>
                                            <FaWhatsapp size={15} /> Whatsapp
                                        </button>
                                    </a>
                                    <a href="tel:0121 777 2522">
                                        <button className={styles.contactBtnCall}>
                                            <BiPhone size={15} /> Call Us
                                        </button>
                                    </a>
                                </div>
                            </div>
                        </div> */}
                        <div className={styles.sidebar}>
                            {/* Booking Price Card */}
                            <div className={`${styles.bookingCard} ${inter.className}`}>
                                <h3 className={`${styles.bookingCardTitle} ${outfit.className}`}>
                                    Book This Package
                                </h3>

                                <div className={styles.priceList}>
                                    {PriceDetail.map((item, index) => (
                                        <div key={index} className={styles.priceRow}>
                                            <span className={styles.priceType}>
                                                {formatRoomType(item?.type)}
                                            </span>
                                            <span className={`${styles.priceAmount} ${outfit.className}`}>
                                                <PriceDisplay
                                                    price={item?.sale_per_person}
                                                    currency={PackageDetail?.currency_code}
                                                />
                                                <span className={styles.pricePp}>(PP)</span>
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <p className={styles.priceShareNote}>
                                    Prices are subject to room share
                                </p>

                                <div className={styles.bookingDivider} />

                                <div className={styles.totalRow}>
                                    <span className={`${styles.totalLabel} ${outfit.className}`}>Total</span>
                                    <div className={styles.totalRight}>
                                        {totalPackagePrice !== null && (
                                            <span className={`${styles.totalAmount} ${outfit.className}`}>
                                                <PriceDisplay
                                                    price={totalPackagePrice}
                                                    currency={PackageDetail?.currency_code}
                                                />
                                            </span>
                                        )}
                                        <span className={styles.priceTaxNote}>
                                            VAT and Taxes included
                                        </span>
                                    </div>
                                </div>

                                <BookNowButton
                                    PackageDetail={PackageDetail}
                                    wrapperClassName={styles.bookNowWrapper}
                                    className={`${styles.bookNowBtn} ${outfit.className}`}
                                />
                            </div>

                            {/* Cancellation Policy */}
                            {PackageDetail?.cancellation_policy && (
                                <div
                                    className={`${styles.cancellationCard} ${inter.className} ${
                                        PackageDetail.cancellation_policy.cancel_policy === 'refundable'
                                            ? styles.cancellationRefundable
                                            : styles.cancellationNonRefundable
                                    }`}
                                >
                                    <div className={`${styles.cancellationTitle} ${outfit.className}`}>
                                        {PackageDetail.cancellation_policy.cancel_policy === 'refundable'
                                            ? <FaCheckCircle size={15} />
                                            : <FaTimes size={14} />
                                        }
                                        Cancellation Policy
                                    </div>
                                    {PackageDetail.cancellation_policy.cancel_policy === 'refundable' &&
                                        !!PackageDetail.cancellation_policy.cancellation_policies?.length && (
                                            <div className={styles.cancellationPolicyList}>
                                                {PackageDetail.cancellation_policy.cancellation_policies.map((policy, i) => (
                                                    <div key={i} className={styles.cancellationPolicyItem}>
                                                        <span className={styles.cancellationPolicyDot} />
                                                        <span>
                                                            If cancelled <strong>{policy.time_duration} hours</strong> before departure, a{' '}
                                                            {policy.type === 'percentage'
                                                                ? <><strong>{policy.value}%</strong> cancellation charge</>
                                                                : <>fixed cancellation charge of <strong><PriceDisplay price={policy.value} currency={PackageDetail?.currency_code} /></strong></>
                                                            }{' '}will apply.
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    {PackageDetail.cancellation_policy.cancel_policy !== 'refundable' && (
                                        <p className={styles.cancellationText}>
                                            This booking is non-refundable. No refund will be issued for cancellations.
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* FAQs */}
                {!!PackageDetail?.faqs?.length &&
                    <PackageDetailFaqs faqsList={PackageDetail?.faqs || []} />
                }
            </div>
        </div>
    );
}
