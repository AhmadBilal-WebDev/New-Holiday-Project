'use client';
import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import React from "react";
import { IoLocationSharp, IoPeopleOutline, IoShareSocialOutline, IoHeartOutline, IoHeart, IoCheckmarkCircle, IoFlagOutline } from "react-icons/io5";
import { FaStar } from "react-icons/fa";
import { FiClock, FiChevronUp, FiChevronDown } from "react-icons/fi";
import GalleryImages from "@/components/Activities/Detail/GalleryImages";
import headerStyles from "@/components/Activities/Detail/ActivityDetailHeader.module.css";
import tabStyles from "@/components/Activities/Detail/ActivityDetailTabs.module.css";
import meetingStyles from "@/components/Activities/Detail/MeetingPoint.module.css";
import "@mantine/dates/styles.css";
import WhatExpect from "@/components/Activities/Detail/WhatExpect";
import IncludedExcluded from "@/components/Activities/Detail/IncludedExcluded";
import Faqs from "@/components/Activities/Detail/Faqs";
import Selection from "@/components/Activities/Detail/Selection";
import ActivityDetailLoader from "@/components/Loader/ActivityDetailLoader";
const GetActivityDetail = () => {
  const [packageDetail, setPackageDetail] = React.useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [descExpanded, setDescExpanded] = useState(false);
  const [showViewMore, setShowViewMore] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const descriptionContentRef = useRef(null);
  const params = useParams();
  const searchParams = useSearchParams();

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      const from = searchParams.get('from');
      const to = searchParams.get('to');
      const language = searchParams.get('language');
      // const lastPart = pathname.split('/').filter(Boolean).pop();
      try {

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activities/${params.slug}?from=${from}&to=${to}&language=${language}`, {
          method: 'GET', cache: 'no-store',
        
          headers: {
            'Content-Type': 'application/json',
            // 'ngrok-skip-browser-warning': 'true'
          }
        });
        const response = await res.json();
        setIsLoading(false);
        // console.log("Activity Detail", response)
        if (response.Success) {
          setPackageDetail(response?.Content?.activity || {});
          setIsLoading(false);
          // console.log("Activity Detail", PackageDetail)

        }
      } catch (error) {
        console.log("Error fetching activity detail:", error);
        setIsLoading(false);
      }

    };
    fetchData();
  }, [params]);

  useEffect(() => {
    setDescExpanded(false);
  }, [packageDetail?.content, packageDetail?.content_text]);

  useEffect(() => {
    if (activeTab !== 'overview') return;
    const hasContent = Boolean(packageDetail?.content || packageDetail?.content_text);
    if (!hasContent) {
      setShowViewMore(false);
      return;
    }

    if (descExpanded) {
      setShowViewMore(true);
      return;
    }

    const frame = requestAnimationFrame(() => {
      const contentElement = descriptionContentRef.current;
      if (!contentElement) {
        setShowViewMore(false);
        return;
      }
      setShowViewMore(contentElement.scrollHeight > contentElement.clientHeight + 1);
    });

    return () => cancelAnimationFrame(frame);
  }, [packageDetail?.content, packageDetail?.content_text, descExpanded, activeTab]);

  const PackageDetail = packageDetail;
  if (isLoading) {
    return <ActivityDetailLoader />;
  }

  if (!PackageDetail || Object.keys(PackageDetail).length === 0) {
    return <div>
      <h2 className="text-center my-5">Activity detail not found.</h2>
    </div>;
  }
  const getYouTubeId = (url) => {
    const regExp = /(?:youtube\.com\/.*v=|youtu\.be\/)([^&]+)/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  };

  const getTextValue = (value) => {
    if (!value) return '';
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object') return value.name || value.title || value.label || value.slug || '';
    return '';
  };

  const categoryLabel = [
    getTextValue(PackageDetail?.category),
    getTextValue(PackageDetail?.type),
  ].filter(Boolean).join(' / ');

  const locationLabel = (() => {
    const city = getTextValue(PackageDetail?.city);
    const country = getTextValue(PackageDetail?.country);
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    if (country) return country;
    return getTextValue(PackageDetail?.address);
  })();

  const maxPeople =
    PackageDetail?.max_people ||
    PackageDetail?.max_guests ||
    PackageDetail?.max_pax ||
    PackageDetail?.capacity;

  const ratingValue = Number(PackageDetail?.rating_stars);
  const hasRating = Number.isFinite(ratingValue) && ratingValue > 0;
  const ratingLabel = (() => {
    if (!hasRating) return '';
    if (ratingValue >= 4.5) return 'Exceptional';
    if (ratingValue >= 4) return 'Excellent';
    if (ratingValue >= 3.5) return 'Very Good';
    if (ratingValue >= 3) return 'Good';
    return 'Rated';
  })();

  const handleShare = async () => {
    const shareData = {
      title: PackageDetail?.title || 'Activity',
      text: PackageDetail?.title || 'Check out this activity',
      url: typeof window !== 'undefined' ? window.location.href : '',
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
      }
    } catch {
      /* user cancelled share */
    }
  };

  return (
    <>
      <div className="container mt-4">
        <div className="my-3">
          <GalleryImages imageList={PackageDetail?.gallery_images || []} />
        </div>
        <div className="row">
          <div className="col-md-8">
            <div className="carousal-images">
            </div>
            <section id="overview" className="mb-5 mt-4">
              <div className={headerStyles.header}>
                <div className={headerStyles.topRow}>
                  {categoryLabel ? (
                    <span className={headerStyles.categoryBadge}>{categoryLabel}</span>
                  ) : (
                    <span />
                  )}
                  <div className={headerStyles.actions}>
                    <button
                      type="button"
                      className={headerStyles.actionBtn}
                      onClick={handleShare}
                      aria-label="Share activity"
                      title="Share"
                    >
                      <IoShareSocialOutline size={18} />
                    </button>
                    <button
                      type="button"
                      className={`${headerStyles.actionBtn} ${isFavorite ? headerStyles.actionBtnActive : ''}`}
                      onClick={() => setIsFavorite((prev) => !prev)}
                      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      title="Favorite"
                    >
                      {isFavorite ? <IoHeart size={18} /> : <IoHeartOutline size={18} />}
                    </button>
                  </div>
                </div>

                {PackageDetail?.title && (
                  <h1 className={headerStyles.title}>{PackageDetail.title}</h1>
                )}

                {locationLabel && (
                  <div className={headerStyles.locationRow}>
                    <IoLocationSharp className={headerStyles.locationIcon} />
                    <span className={headerStyles.locationText}>{locationLabel}</span>
                  </div>
                )}

                <div className={headerStyles.infoRow}>
                  {hasRating && (
                    <div className={headerStyles.ratingGroup}>
                      <span className={headerStyles.ratingBadge}>
                        <FaStar />
                        {ratingValue % 1 === 0 ? ratingValue.toFixed(0) : ratingValue.toFixed(1)}
                      </span>
                      {ratingLabel && (
                        <span className={headerStyles.ratingLabel}>{ratingLabel}</span>
                      )}
                    </div>
                  )}

                  {PackageDetail?.activity_duration && (
                    <div className={headerStyles.infoItem}>
                      <FiClock />
                      <span>{PackageDetail.activity_duration}</span>
                    </div>
                  )}

                  {maxPeople && (
                    <div className={headerStyles.infoItem}>
                      <IoPeopleOutline />
                      <span>Up to {maxPeople} people</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs Navigation */}
              <nav className={tabStyles.tabs} aria-label="Activity sections">
                <ul className={tabStyles.tabList} role="tablist">
                  <li role="presentation">
                    <button
                      type="button"
                      role="tab"
                      className={`${tabStyles.tabBtn} ${activeTab === 'overview' ? tabStyles.tabBtnActive : ''}`}
                      onClick={() => setActiveTab('overview')}
                      aria-selected={activeTab === 'overview'}
                    >
                      Overview
                    </button>
                  </li>
                  <li role="presentation">
                    <button
                      type="button"
                      role="tab"
                      className={`${tabStyles.tabBtn} ${activeTab === 'itinerary' ? tabStyles.tabBtnActive : ''}`}
                      onClick={() => setActiveTab('itinerary')}
                      aria-selected={activeTab === 'itinerary'}
                    >
                      Itinerary
                    </button>
                  </li>
                  <li role="presentation">
                    <button
                      type="button"
                      role="tab"
                      className={`${tabStyles.tabBtn} ${activeTab === 'included' ? tabStyles.tabBtnActive : ''}`}
                      onClick={() => setActiveTab('included')}
                      aria-selected={activeTab === 'included'}
                    >
                      What&apos;s Included
                    </button>
                  </li>
                </ul>
              </nav>

              {/* Tab Content */}
              <div className="tab-content mb-4">
                {activeTab === 'overview' && (
                  <div>
                    {(PackageDetail?.content || PackageDetail?.content_text) && (
                      <div className="mb-4">
                        <h3 className={tabStyles.sectionTitle}>About This Experience</h3>
                        <div
                          ref={descriptionContentRef}
                          className={`${tabStyles.aboutText} ${descExpanded ? '' : tabStyles.aboutTextCollapsed}`}
                          dangerouslySetInnerHTML={{
                            __html: PackageDetail?.content || PackageDetail?.content_text || '',
                          }}
                        />
                        {showViewMore && (
                          <button
                            type="button"
                            className={tabStyles.toggleBtn}
                            onClick={() => setDescExpanded((prev) => !prev)}
                          >
                            {descExpanded ? 'See Less' : 'See More'}
                          </button>
                        )}
                      </div>
                    )}

                    {PackageDetail?.youtube_video_link && getYouTubeId(PackageDetail?.youtube_video_link) && (
                      <div className={tabStyles.mediaWrap}>
                        <iframe
                          src={`https://www.youtube.com/embed/${getYouTubeId(PackageDetail?.youtube_video_link)}`}
                          title="Activity video"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    )}

                    {PackageDetail?.facilities?.length > 0 && (
                      <div>
                        <h3 className={tabStyles.sectionTitle}>Highlights</h3>
                        <div className={tabStyles.highlightsGrid}>
                          {PackageDetail.facilities.map((item, index) => {
                            const label =
                              typeof item === 'string'
                                ? item
                                : item?.name || item?.title || item?.label || '';
                            if (!label) return null;
                            return (
                              <div key={index} className={tabStyles.highlightPill}>
                                <IoCheckmarkCircle aria-hidden="true" />
                                <span>{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'itinerary' && (
                  <div>
                    {(PackageDetail?.what_to_expect && PackageDetail?.what_to_expect.length > 0) ? (
                      <WhatExpect
                        expectData={PackageDetail?.what_to_expect}
                        provider={PackageDetail?.provider}
                      />
                    ) : (
                      <div className={tabStyles.emptyState}>
                        <p className="mb-0">No itinerary information available.</p>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'included' && (
                  <IncludedExcluded
                    included={PackageDetail?.included_items || PackageDetail?.included || ""}
                    excluded={PackageDetail?.excluded_items || PackageDetail?.excluded || ""}
                  />
                )}
              </div>
            </section>

            {(() => {
              const meetingPoint =
                PackageDetail?.meeting_and_pickup ||
                PackageDetail?.meeting_point ||
                PackageDetail?.pickup_point ||
                '';
              const endPoint =
                PackageDetail?.end_point ||
                PackageDetail?.ending_point ||
                PackageDetail?.drop_off ||
                PackageDetail?.dropoff_point ||
                (meetingPoint ? meetingPoint : '');

              if (!meetingPoint && !endPoint) return null;

              return (
                <section className={meetingStyles.section}>
                  <div className={meetingStyles.grid}>
                    {meetingPoint && (
                      <div className={meetingStyles.block}>
                        <h3 className={meetingStyles.title}>Meeting Point</h3>
                        <div className={meetingStyles.card}>
                          <IoLocationSharp className={meetingStyles.icon} aria-hidden="true" />
                          <p className={meetingStyles.text}>{meetingPoint}</p>
                        </div>
                      </div>
                    )}

                    {endPoint && (
                      <div className={meetingStyles.block}>
                        <h3 className={meetingStyles.title}>End Point</h3>
                        <div className={meetingStyles.card}>
                          <IoFlagOutline className={meetingStyles.icon} aria-hidden="true" />
                          <p className={meetingStyles.text}>{endPoint}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              );
            })()}
            
            {packageDetail?.contract_remarks && packageDetail?.contract_remarks.length > 10 && (
              <section className="mb-5">
                <div className="border rounded-3 p-4">
                  <h5 className="mb-3">Contract Remarks</h5>
                  {packageDetail.contract_remarks.map((item, index) => {
                    const lines = String(item?.text || '').split(/\s*\/\/\s*/).map((line) => line.trim()).filter(Boolean)

                    return (
                      <div key={index} className={index > 0 ? 'mt-3' : ''}>
                        {lines.map((line, lineIndex) => (
                          <p key={lineIndex} className="mb-2" style={{ lineHeight: 1.5 }}>
                            {line}
                          </p>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* Faqs Section */}
            {(PackageDetail?.faqs && PackageDetail?.faqs.length > 0) &&
              <Faqs faqsList={PackageDetail?.faqs || []} />
            }

          </div>
          <div className="col-md-4">
            {/* Selection Section and Availability Section */}
            <Selection PackageDetail={PackageDetail} />

          </div>
        </div>
      </div>
    </>
  );
}

export default GetActivityDetail;
