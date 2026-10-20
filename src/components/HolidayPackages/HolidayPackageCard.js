'use client'
import PriceDisplay from '@/components/Currency/PriceDisplay';
import FlightDetail from '@/components/Flights/FlightDetail';
import VehicleDetail from '@/components/Transfer/Listing/VehicleDetail';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState, useEffect, useRef } from 'react'
import { FaStar, FaPlane, FaBus } from 'react-icons/fa6';
import { IoLocationSharp } from 'react-icons/io5';
import { LiaAngleRightSolid } from "react-icons/lia";
import { FaMoon, FaStarHalfAlt } from 'react-icons/fa';
import { notifications } from '@mantine/notifications';
import { usePackageList } from './PackageListingContext';
import { usePackageMode } from '../Store/PackageModeHelper';
import { useHolidayPackageStore } from '../Store/HolidayPackageStore';
export default function HolidayPackageCard({ isLoading, progress = 0 }) {
  const router = useRouter();
  const [imgFallbacks, setImgFallbacks] = useState({});
  const [hotelDetails, setHotelDetails] = useState({});
  const [loadingPackageId, setLoadingPackageId] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const fetchedRef = useRef(new Set());
  const { packages, totalPackages } = usePackageList();
  const {
    handlePackageData,
    handleHotelSelection,
    handleFlightSelection,
    handleTransferSelection,
    addSelectedPackageToCart,
    isServiceSelected,
  } = usePackageMode();
  const { packageConfig } = useHolidayPackageStore();
  const hotelDates = packageConfig?.searchData?.hotel?.dates;
  const checkIn = hotelDates?.checkIn || hotelDates?.check_in || packageConfig?.searchData?.dates?.checkIn;
  const checkOut = hotelDates?.checkOut || hotelDates?.check_out || packageConfig?.searchData?.dates?.checkOut;
  const selectedServices = packageConfig?.selectedServices || {};
  const servicesLabel = [
    selectedServices.hotel && 'Stay',
    selectedServices.flight && 'Flight',
    selectedServices.transfer && 'Transfer',
  ].filter(Boolean).join(' + ');
  useEffect(() => {
    if (!packages || packages.length === 0) return;

    packages.forEach((pkg) => {
      const hotel = pkg.hotel;
      if (!hotel?.id || !hotel?.provider) return;
      if (fetchedRef.current.has(hotel.id)) return;

      fetchedRef.current.add(hotel.id);

      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/basic/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: hotel.provider,
          hotelId: hotel.id,
          checkIn,
          checkOut,
        }),
      })
        .then((res) => res.json())
        .then((res) => {
          setHotelDetails((prev) => ({
            ...prev,
            [hotel.id]: {
              image:
                Array.isArray(res.data?.main_images) && res.data.main_images.length > 0
                  ? res.data.main_images[0].url || ''
                  : '',
              address: res.data?.address || '',
              facilities: res.data?.facilities || [],
            },
          }));
        })
        .catch((err) => console.error('Error fetching hotel details:', err));
    });
  }, [packages]);
  const normalizeImageSrc = (raw) => {
    if (!raw) return '/images/hotelloadimg.jpg';
    if (raw.startsWith('data:') || raw.startsWith('/')) return raw;
    // CSP img-src allows https only — upgrade http:// and protocol-relative URLs
    if (/^https?:\/\//i.test(raw)) return raw.replace(/^http:\/\//i, 'https://');
    if (raw.startsWith('//')) return 'https:' + raw;
    return 'https://' + raw.replace(/^\/+/, '');
  };

  const handleImageError = (packageId) => {
    setImgFallbacks(prev => ({ ...prev, [packageId]: true }));
  };

  const makingSlug = (name) => {
    return name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
  };
  const ProviderShortNames = (encodedProvider) => {
    if (!encodedProvider) return '';
    const provider = encodeProvider(encodedProvider).toLowerCase();
    return provider;
  };
  const encodeProvider = (str) => {
    return [...str].map(c => (c.charCodeAt(0) + 3).toString(36)).join('');
  };
  const displayStars = (stars) => {
    if (!stars) {
      return <span className="htc-card__rating-label htc-card__rating-label--muted">No Rating</span>;
    }

    // Check if value is purely numeric (including decimals)
    const isPureNumber = /^\d+(\.\d+)?$/.test(stars);

    if (isPureNumber) {
      const numStars = parseFloat(stars);

      return (
        <>
          {Array(Math.floor(numStars))
            .fill(0)
            .map((_, i) => (
              <FaStar key={i} className="htc-card__star" />
            ))}

          {numStars % 1 >= 0.5 && (
            <FaStarHalfAlt className="htc-card__star" />
          )}
        </>
      );
    }

    // If not numeric (like '4LUX'), show as it is
    return <span className="htc-card__rating-label">{stars}</span>;
  };
  const SetPackageData = async (pkg, e) => {
    e.preventDefault();
    if (loadingPackageId === pkg.package_id) return;

    const hotel = pkg.hotel;
    if (!hotel?.id && !hotel?.hotel_code) return;

    const detailHref = `/hotels/${makingSlug(hotel?.name)}?packageId=${pkg.package_id}&id=${hotel?.id}&code=${ProviderShortNames(hotel.provider)}&packageMode=true`;

    setLoadingPackageId(pkg.package_id);
    try {
      handlePackageData(pkg, false);
      await handleHotelSelection(pkg.hotel, pkg.hotel.rooms, false);
      if (isServiceSelected('flight') && pkg.flight) {
        await handleFlightSelection(pkg.flight, false);
      }
      if (isServiceSelected('transfer') && pkg.transfer) {
        await handleTransferSelection(pkg.transfer, false);
      }
      await addSelectedPackageToCart();
      router.push(detailHref);
    } catch (err) {
      console.error('Package cart error:', err);
      notifications.show({
        title: 'Cart Error',
        message: err?.message || 'Failed to add package to cart. Please try again.',
        color: 'red',
      });
      setLoadingPackageId(null);
    }
  };
  if (totalPackages === 0 && !isLoading) {
    return (
      <div className="alert alert-warning text-center" role="alert">
        <strong>No packages</strong> found for the selected criteria. Please try adjusting your search.<br />
        <Link href='/'>
          <button className='btn btn-success mt-2'> Go to Home</button>
        </Link>
      </div>
    );
  };

  return (
    <div className="container hotel-card">
      {packages.length > 0 && (
        <p className="htc-card__results">
          {totalPackages} {totalPackages > 1 ? 'packages' : 'package'} found
        </p>
      )}

      {isLoading && (
        <div className="hotel-search-loader mb-3" role="status" aria-live="polite">
          <div className="hotel-search-loader__header">
            <div className="hotel-search-loader__spinner" aria-hidden="true" />
            <div className="hotel-search-loader__text">
              <p className="hotel-search-loader__title">Finding more packages for you</p>
              <p className="hotel-search-loader__subtitle">
                Looking for the best matches…
              </p>
            </div>
            <span className="hotel-search-loader__percent">{progress}%</span>
          </div>
          <div className="hotel-search-loader__track">
            <div
              className="hotel-search-loader__bar"
              role="progressbar"
              aria-valuenow={progress}
              aria-valuemin="0"
              aria-valuemax="100"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="row" id='top_package'>
        {packages.map((pkg, index) => {
          const hotel = pkg.hotel;
          const flight = pkg.flight;
          const transfer = pkg.transfer;
          const detail = hotelDetails[hotel?.id];
          const mainImage = detail?.image || hotel?.images?.[0] || '/images/hotelloadimg.jpg';
          const displayFacilities = detail?.facilities?.length > 0 ? detail.facilities : hotel?.facilities;
          const displayAddress = detail?.address || '';
          const totalNights = pkg.total_nights || 1;
          const isCustomProvider = hotel?.provider === 'custom';

          return (
            <div key={pkg.package_id || index} className="col-12 mb-3 px-0">
              <article className="htc-card">
                <div className="htc-card__layout">
                  <div className="htc-card__media">
                    <Image
                      src={
                        imgFallbacks[pkg.package_id]
                          ? '/images/hotelloadimg.jpg'
                          : normalizeImageSrc(mainImage)
                      }
                      width={420}
                      height={280}
                      className="htc-card__img"
                      alt={hotel?.name || 'Hotel'}
                      quality={100}
                      placeholder="blur"
                      blurDataURL="/images/hotelloadimg.jpg"
                      onError={() => handleImageError(pkg.package_id)}
                      unoptimized={true}
                    />
                    <div className="htc-card__media-badges">
                      {isCustomProvider && (
                        <span className="htc-card__badge htc-card__badge--best">Best</span>
                      )}
                      <span className="htc-card__badge htc-card__badge--rooms">
                        <FaMoon className="me-1" aria-hidden="true" />
                        {totalNights} {totalNights > 1 ? 'Nights' : 'Night'}
                      </span>
                    </div>
                  </div>

                  <div className="htc-card__content">
                    <div className="htc-card__meta">
                      <div className="htc-card__rating">
                        {displayStars(hotel?.metadata?.stars)}
                      </div>
                    </div>

                    <h3 className="htc-card__title">{hotel?.name}</h3>

                    {(flight || transfer) && (
                      <div className="htc-card__inclusions">
                        {flight && (
                          <button
                            type="button"
                            className="htc-card__inclusion htc-card__inclusion--clickable"
                            onClick={() => setSelectedFlight(flight)}
                            aria-label="View flight details"
                          >
                            <FaPlane aria-hidden="true" /> Flight Included
                          </button>
                        )}
                        {transfer && (
                          <button
                            type="button"
                            className="htc-card__inclusion htc-card__inclusion--clickable"
                            onClick={() => setSelectedTransfer(transfer)}
                            aria-label="View transfer details"
                          >
                            <FaBus aria-hidden="true" /> Transfer Included
                          </button>
                        )}
                      </div>
                    )}

                    {displayAddress ? (
                      <p className="htc-card__location">
                        <IoLocationSharp aria-hidden="true" />
                        <span>{displayAddress}</span>
                      </p>
                    ) : (
                      <p className="htc-card__location placeholder-glow">
                        <IoLocationSharp aria-hidden="true" />
                        <span className="placeholder rounded col-6"></span>
                      </p>
                    )}

                    {displayFacilities && displayFacilities.length > 0 ? (
                      <ul className="htc-card__amenities">
                        {displayFacilities.slice(0, 5).map((facility, i) => (
                          <li key={i}>{facility}</li>
                        ))}
                      </ul>
                    ) : (
                      <ul className="htc-card__amenities placeholder-glow">
                        <li className="placeholder rounded col-3"></li>
                        <li className="placeholder rounded col-4"></li>
                        <li className="placeholder rounded col-2"></li>
                      </ul>
                    )}

                    <div className="htc-card__footer">
                      <div className="htc-card__pricing">
                        <p className="htc-card__price-note mb-0">
                        <PriceDisplay price={pkg.price_per_person} currency={pkg.currency} /> / person
                        </p>
                        <div className="htc-card__price-main">
                        Total <PriceDisplay price={pkg.total_price} currency={pkg.currency} />
                        </div>
                        <p className="htc-card__price-note">VAT and Taxes included</p>
                      </div>

                      <div className="htc-card__cta-wrap">
                        {servicesLabel && (
                          <p className="htc-card__services">{servicesLabel}</p>
                        )}
                        <Link
                          href={`/hotels/${makingSlug(hotel?.name)}?packageId=${pkg.package_id}&id=${hotel?.id}&code=${ProviderShortNames(hotel.provider)}&packageMode=true`}
                          onClick={(e) => SetPackageData(pkg, e)}
                          className={`htc-card__cta${loadingPackageId === pkg.package_id ? ' htc-card__cta--loading' : ''}`}
                          aria-busy={loadingPackageId === pkg.package_id}
                          aria-disabled={loadingPackageId === pkg.package_id}
                        >
                          {loadingPackageId === pkg.package_id ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                              Loading...
                            </>
                          ) : (
                            <>
                              View Detail <LiaAngleRightSolid />
                            </>
                          )}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          );
        })}
      </div>

      <FlightDetail
        flightdata={selectedFlight}
        hideTrigger
        showFlights={!!selectedFlight}
        onClose={() => setSelectedFlight(null)}
      />

      <VehicleDetail
        showModal={!!selectedTransfer}
        handleCloseModal={() => setSelectedTransfer(null)}
        selectedTransferDetail={selectedTransfer}
        type="checkout"
      />
    </div>
  )
}
