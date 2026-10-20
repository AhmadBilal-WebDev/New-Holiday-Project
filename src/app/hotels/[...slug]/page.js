'use client';
import React, { useState, useEffect, useMemo } from "react";
import GalleryImages from "@/components/Hotels/HotelDetail/GalleryImages";
import { FaLocationDot } from "react-icons/fa6";
import { Modal } from '@mantine/core';
import { FaStar } from "react-icons/fa";
import RoomList from "@/components/Hotels/HotelDetail/RoomSelection/RoomList";
import { useSearchParams } from "next/navigation";
import HotelDetailLoader from "@/components/Loader/HotelDetailLoader";
import { usePackageMode } from "@/components/Store/PackageModeHelper";
import { useHolidayPackageStore } from "@/components/Store/HolidayPackageStore";
import { useHolidayPackageRevision, getReviseHotelCandidate } from "@/components/HolidayPackages/Revision";
import getFacilityIcon from "@/components/Hotels/HotelDetail/getFacilityIcon";
import propStyles from "@/components/Hotels/HotelDetail/HotelPropertyInfo.module.css";
import TopContact from "@/components/Home/TopContact/TopContact";

export default function Page() {
  const searchParams = useSearchParams();
  const HotelCode = searchParams.get("id");
  const ProviderCode = searchParams.get("code");
  const { selectedData, packageConfig } = useHolidayPackageStore();
  const { isPackageMode, isEditMode } = usePackageMode();
  const {
    isReviseMode,
    isChangeHotel,
    checkIn: reviseCheckIn,
    checkOut: reviseCheckOut,
    hotelCandidate,
  } = useHolidayPackageRevision();
  const [searchData, setSearchData] = useState({});
  const [hotelDetails, setHotelDetails] = useState({});
  const [isFetching, setIsFetching] = useState(true);
  const [descExpanded, setDescExpanded] = useState(false);
  const [facilitiesModalOpen, setFacilitiesModalOpen] = useState(false);
  const allFacilitiesRef = React.useRef(null);

  const description = hotelDetails?.description || "";
  const starCount = useMemo(() => {
    const raw = hotelDetails?.star_rating ?? hotelDetails?.stars ?? hotelDetails?.metadata?.stars;
    const n = Number(raw);
    if (!raw || Number.isNaN(n) || n <= 0) return 0;
    return Math.min(5, Math.round(n));
  }, [hotelDetails]);
  const nearLabel = useMemo(() => {
    const landmark =
      hotelDetails?.landmark ||
      hotelDetails?.nearby_landmark ||
      hotelDetails?.nearby ||
      hotelDetails?.area ||
      hotelDetails?.city ||
      searchData?.location ||
      searchData?.city ||
      "";
    if (!landmark) return "";
    const text = String(landmark).trim();
    if (!text) return "";
    return text.toLowerCase().startsWith("near ") ? text : `Near ${text}`;
  }, [hotelDetails, searchData]);
  const isHtmlDescription = useMemo(() => {
    if (!description || typeof description !== "string") return false;
    return /<\/?[a-z][\s\S]*>/i.test(description);
  }, [description]);
  const plainDescription = useMemo(() => {
    if (!description) return "";
    if (isHtmlDescription) {
      return description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    }
    return description;
  }, [description, isHtmlDescription]);
  const normalizedHtmlDescription = useMemo(() => {
    if (!isHtmlDescription) return "";
    return description
      .replace(/<\s*h[1-6](\s[^>]*)?>/gi, "<h5$1>")
      .replace(/<\s*\/\s*h[1-6]\s*>/gi, "</h5>");
  }, [description, isHtmlDescription]);

  const ABOUT_COLLAPSE_LEN = 210;
  const needsReadMore = plainDescription.length > ABOUT_COLLAPSE_LEN;
  const collapsedAboutText = useMemo(() => {
    if (!needsReadMore) return plainDescription;
    const cut = plainDescription.slice(0, ABOUT_COLLAPSE_LEN);
    const tidy = cut.replace(/\s+\S*$/, "").trimEnd();
    return `${tidy || cut.trimEnd()}...`;
  }, [plainDescription, needsReadMore]);

  useEffect(() => {
    setDescExpanded(false);
  }, [hotelDetails?.hotel_name, hotelDetails?.description]);
  // ✅ Load search data / package-revise details
  useEffect(() => {
    if (isPackageMode || isEditMode || isReviseMode) {
      fetchDetails({});
      return;
    }
    const storedData = localStorage.getItem('HotelSearchData');
    if (storedData) {
      setSearchData(JSON.parse(storedData));
      fetchDetails(JSON.parse(storedData));
    }
  }, [searchParams, isPackageMode, isEditMode, isReviseMode]);

  const decodeProvider = (encoded) => {
    let result = '';
    let buffer = '';

    for (const ch of encoded) {
      buffer += ch;
      const code = parseInt(buffer, 36);

      if (code >= 65 && code <= 130) { // valid char range
        result += String.fromCharCode(code - 3);
        buffer = '';
      }
    }
    return result;
  };

  const fetchDetails = async (searchNew) => {
    let storedRoomList = [];
    var roomDetails = [];
    if (isPackageMode || isEditMode || isReviseMode) {
      const candidate = hotelCandidate || getReviseHotelCandidate();
      storedRoomList = isChangeHotel && candidate?.rooms?.length
        ? candidate.rooms
        : (selectedData?.hotel?.hotelData?.rooms || candidate?.rooms || []);
      searchNew = {
        check_in: reviseCheckIn
          || packageConfig?.searchData?.hotel?.dates?.checkIn
          || packageConfig?.searchData?.hotel?.dates?.check_in
          || packageConfig?.searchData?.dates?.checkIn,
        check_out: reviseCheckOut
          || packageConfig?.searchData?.hotel?.dates?.checkOut
          || packageConfig?.searchData?.hotel?.dates?.check_out
          || packageConfig?.searchData?.dates?.checkOut,
      };
    } else {
      roomDetails = localStorage.getItem('roomSelection');
      if (roomDetails) {
        storedRoomList = JSON.parse(roomDetails);
      }
    }


    const hotelProviderName = decodeProvider(ProviderCode || '').toLowerCase();

    try {
      setIsFetching(true);
      const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/full/details`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({
          provider: hotelProviderName,
          hotelId: HotelCode,
          checkIn: searchNew?.check_in,
          checkOut: searchNew?.check_out,
          roomList: storedRoomList,
        }),
      });
      const res = await responses.json();
      setIsFetching(false);
      if (res.success) {
        res.data.provider = res.provider;
        if (searchNew?.check_in && !res.data.checkIn) {
          res.data.checkIn = searchNew.check_in;
        }
        if (searchNew?.check_out && !res.data.checkOut) {
          res.data.checkOut = searchNew.check_out;
        }
        setHotelDetails(res.data);
        // return res.data;
      }
      // return {};
    } catch (err) {
      console.error("Error fetching hotel details:", err);
      // return {};
      setIsFetching(false);
      setHotelDetails({});
    }
  };

  return (
    <div className="container my-5">
      {isFetching ? (
        <HotelDetailLoader />
      ) : (
        <div>
          <GalleryImages imageList={hotelDetails?.all_images || []} />

          <section className={propStyles.card}>
            <header className={`${propStyles.header}`}>
              <div className={propStyles.titleRow}>
                <h1 className={propStyles.name}>{hotelDetails?.hotel_name}</h1>
                {starCount > 0 && (
                  <span className={propStyles.stars} aria-label={`${starCount} star hotel`}>
                    {Array.from({ length: starCount }).map((_, i) => (
                      <FaStar key={i} />
                    ))}
                  </span>
                )}
                {nearLabel && <span className={propStyles.nearBadge}>{nearLabel}</span>}
              </div>
              {hotelDetails?.address && (
                <p className={propStyles.address}>
                  <FaLocationDot className={propStyles.addressIcon} aria-hidden="true" />
                  <span>{hotelDetails.address}</span>
                </p>
              )}
            </header>

            {plainDescription && (
              <div className={propStyles.about}>
                <h2 className={propStyles.aboutTitle}>About property</h2>
                {descExpanded && isHtmlDescription ? (
                  <div className={propStyles.aboutHtml}>
                    <div dangerouslySetInnerHTML={{ __html: normalizedHtmlDescription }} />
                    {needsReadMore && (
                      <button
                        type="button"
                        className={propStyles.readMore}
                        onClick={() => setDescExpanded(false)}
                      >
                        {" "}Read less
                      </button>
                    )}
                  </div>
                ) : (
                  <p className={propStyles.aboutText}>
                    {descExpanded ? plainDescription : collapsedAboutText}
                    {needsReadMore && (
                      <button
                        type="button"
                        className={propStyles.readMore}
                        onClick={() => setDescExpanded((prev) => !prev)}
                      >
                        {descExpanded ? " Read less" : " Read more"}
                      </button>
                    )}
                  </p>
                )}
              </div>
            )}

            {hotelDetails?.facilities?.length > 0 && (
              <div className={propStyles.facilities}>
                <h2 className={propStyles.facilitiesTitle}>Popular facilities</h2>
                <div className={propStyles.facilitiesGrid}>
                  {hotelDetails.facilities.slice(0, 8).map((item, index) => {
                    const Icon = getFacilityIcon(item);
                    return (
                      <div key={index} className={propStyles.facilityPill}>
                        <span className={propStyles.facilityIconWrap} aria-hidden="true">
                          <Icon />
                        </span>
                        <span className={propStyles.facilityLabel}>{item}</span>
                      </div>
                    );
                  })}
                </div>
                {hotelDetails.facilities.length > 8 && (
                  <div className={propStyles.viewMoreWrap}>
                    <button
                      type="button"
                      className={propStyles.viewMoreBtn}
                      onClick={() => {
                        if (typeof window !== "undefined" && window.innerWidth < 768) {
                          setFacilitiesModalOpen(true);
                        } else {
                          setTimeout(() => allFacilitiesRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
                        }
                      }}
                    >
                      View More
                    </button>
                  </div>
                )}
              </div>
            )}
          </section>

          <RoomList
            hotelDetail={hotelDetails}
            isPackageMode={isPackageMode || (isReviseMode && isChangeHotel)}
            isEditMode={isEditMode && !(isReviseMode && isChangeHotel)}
            isReviseMode={isReviseMode}
          />
          {hotelDetails?.facilities?.length > 0 && (
            <div className={`${propStyles.facilitiesFull} d-none d-md-block`} ref={allFacilitiesRef}>
              <h2 className={propStyles.facilitiesTitle}>Popular facilities</h2>
              <div className={propStyles.facilitiesGrid}>
                {hotelDetails.facilities.map((item, index) => {
                  const Icon = getFacilityIcon(item);
                  return (
                    <div key={index} className={propStyles.facilityPill}>
                      <span className={propStyles.facilityIconWrap} aria-hidden="true">
                        <Icon />
                      </span>
                      <span className={propStyles.facilityLabel}>{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <Modal
            opened={facilitiesModalOpen}
            onClose={() => setFacilitiesModalOpen(false)}
            title="All facilities"
            centered
            lockScroll
            trapFocus
            size="lg"
            overlayProps={{ backgroundOpacity: 0.55, blur: 3 }}
            classNames={{ body: "pb-4" }}
          >
            <div className={propStyles.modalGrid}>
              {hotelDetails?.facilities?.map((item, index) => {
                const Icon = getFacilityIcon(item);
                return (
                  <div key={index} className={propStyles.facilityPill}>
                    <span className={propStyles.facilityIconWrap} aria-hidden="true">
                      <Icon />
                    </span>
                    <span className={propStyles.facilityLabel}>{item}</span>
                  </div>
                );
              })}
            </div>
          </Modal>
          <TopContact />
          <div className="mt-4">
            <iframe
              width="100%"
              height="400"
              frameBorder="0"
              scrolling="no"
              marginHeight="0"
              marginWidth="0"
              src={`https://maps.google.com/maps?q=${hotelDetails?.coordinates?.latitude},${hotelDetails?.coordinates?.longitude}&t=&z=12&ie=UTF8&iwloc=&output=embed`}
              style={{ border: "0", borderRadius: "8px" }}
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
}
