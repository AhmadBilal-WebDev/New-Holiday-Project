'use client'
import React, { useState } from 'react'
import { FaStar, FaStarHalfAlt, FaTag, FaCalendarCheck, FaCrown, FaArrowLeft, FaShieldAlt, FaCheck, FaClock } from 'react-icons/fa'
import { useHotelStore } from '@/components/Store/HotelStore';
import moment from 'moment';
import CheckoutForm from '@/components/Hotels/HotelCheckout/CheckoutForm';
import { FaLocationDot } from 'react-icons/fa6';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { Tooltip } from '@mantine/core';
import { MdInfoOutline } from 'react-icons/md';
import { useCurrency } from '@/util/currency';
import { ConvertPrice } from '@/components/Currency/ConvertPrice';
import Image from 'next/image';
import { Inter, Outfit } from 'next/font/google';
import { useRouter } from 'next/navigation';
import heroStyles from './CheckoutHero.module.css';
import summaryStyles from './CheckoutSummary.module.css';

export const dynamic = 'force-dynamic';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['700'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export default function Page() {
  const router = useRouter();
  const { availabilityData } = useHotelStore();
  const [modalPolicy, setModalPolicy] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const { currency, rates } = useCurrency();
  const totalNights = Math.max(
    moment(availabilityData?.check_out).diff(moment(availabilityData?.check_in), 'days') || 0,
    1
  );
  function getCancellationSummary(policyArr, Defaultcurrency) {
    if (!Array.isArray(policyArr) || policyArr.length === 0) {
      return { message: 'Non-refundable', type: 'non-refundable' };
    }

    // Sort policies by date (earliest first)
    const sortedPolicies = [...policyArr].sort((a, b) =>
      moment.utc(a.from).valueOf() - moment.utc(b.from).valueOf()
    );

    const now = moment.utc();

    // Check if all policy dates are in the future
    const allDatesInFuture = sortedPolicies.every(policy =>
      moment.utc(policy.from).isAfter(now)
    );

    // Get the nearest date (first policy)
    const nearestPolicy = sortedPolicies[0];
    const nearestDate = moment.utc(nearestPolicy.from);

    if (allDatesInFuture) {
      // All dates are in future, means free cancellation until nearest date
      return {
        message: `Free cancellation before ${nearestDate.format('DD MMMM YYYY')}`,
        type: 'free',
        policy: nearestPolicy
      };
    }

    // Find the first policy that hasn't passed yet
    const activePolicy = sortedPolicies.find(policy =>
      moment.utc(policy.from).isAfter(now)
    );

    if (!activePolicy) {
      // All policies have passed, show the last one
      const lastPolicy = sortedPolicies[sortedPolicies.length - 1];
      const ConvertedAmount = ConvertPrice(lastPolicy?.amount, Defaultcurrency, currency, rates);
      return {
        message: `Cancellation fee: ${ConvertedAmount.newcurrency} ${ConvertedAmount.newprice}`,
        type: 'fee',
        policy: lastPolicy
      };
    }

    // Currently active policy = last policy whose 'from' date has already passed
    const passedPolicies = sortedPolicies.filter(policy =>
      !moment.utc(policy.from).isAfter(now)
    );
    const currentPolicy = passedPolicies[passedPolicies.length - 1];

    const ConvertedAmount = ConvertPrice(currentPolicy?.amount, Defaultcurrency, currency, rates);
    return {
      message: `Cancellation fee: ${ConvertedAmount.newcurrency} ${ConvertedAmount.newprice}`,
      type: 'fee',
      policy: currentPolicy
    };
  }

  function handleViewPolicy(policyArr, currency) {
    setModalPolicy({ policies: policyArr, currency });
    setShowModal(true);
  }

  function CancellationModal() {
    if (!showModal || !modalPolicy) return null;

    const sortedPolicies = [...modalPolicy.policies].sort((a, b) =>
      moment.utc(a.from).valueOf() - moment.utc(b.from).valueOf()
    );

    const now = moment.utc();

    return (
      <div
        className="modal fade show"
        style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
        onClick={() => setShowModal(false)}
      >
        <div className="modal-dialog modal-dialog-centered" onClick={(e) => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header border-0">
              <h5 className="modal-title">Cancellation policy</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setShowModal(false)}
              ></button>
            </div>
            <div className="modal-body">
              {/* Policy Details */}
              <div className="mt-2">
                {/* Show free cancellation period before first policy */}
                <div className="mb-3 pb-3 border-bottom">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <strong>Before</strong>
                      <div className="text-primary">{moment.utc(sortedPolicies[0].from).format('MMM DD')}</div>
                    </div>
                    <div className="text-end">
                      <strong>Full refund</strong>
                    </div>
                  </div>
                  <p className="small mt-2 mb-0">
                    Cancel your reservation before {moment.utc(sortedPolicies[0].from).format('MMM DD [at] hh:mm A')}, and you'll get a full refund. Times are based on the property's local time.
                  </p>
                </div>

                {/* Show all fee policies */}
                {sortedPolicies.map((policy, idx) => {
                  const dateObj = moment.utc(policy.from);
                  return (
                    <div key={idx} className="mb-3 pb-3 border-bottom">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <strong>From</strong>
                          <div className="text-primary">{dateObj.format('MMM DD')}</div>
                        </div>
                      </div>
                      <p className="small mt-2 mb-0">
                        From {dateObj.format('MMM DD [at] hh:mm A')}, a cancellation fee of <PriceDisplay price={policy.amount} currency={modalPolicy.currency} /> will be charged.
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className='container my-5'>
      <CancellationModal />
      <div className={`${heroStyles.wrap} ${inter.className}`}>
        <button
          type="button"
          className={heroStyles.backLink}
          onClick={() => router.back()}
        >
          <FaArrowLeft aria-hidden="true" />
          Back to hotel details
        </button>

        <div className={heroStyles.banner}>
          <div className={heroStyles.copy}>
            <p className={heroStyles.eyebrow}>Booking type · Hotel reservation</p>
            <h1 className={`${heroStyles.title} ${outfit.className}`}>Review your booking</h1>
          </div>
          <div className={heroStyles.secureBadge}>
            <FaShieldAlt className={heroStyles.secureIcon} aria-hidden="true" />
            Secured 256-bit SSL
          </div>
        </div>
      </div>
      <div className='row'>
        <div className='col-md-8'>
          <CheckoutForm data={availabilityData} currency={currency} rates={rates} />
        </div>

        <div className='col-md-4'>
          <aside className={`${summaryStyles.wrap} ${inter.className}`}>
            <div className={summaryStyles.card}>
              <div className={summaryStyles.media}>
                {availabilityData?.main_images?.[0]?.url ? (
                  <Image
                    src={availabilityData.main_images[0].url}
                    alt={availabilityData?.hotel_name || 'Hotel'}
                    width={400}
                    height={200}
                    className={summaryStyles.mediaImg}
                  />
                ) : null}
              </div>

              <div className={summaryStyles.body}>
                <div className={summaryStyles.hotelNameRow}>
                  <h3 className={`${summaryStyles.hotelName} ${outfit.className}`}>
                    {availabilityData?.hotel_name}
                  </h3>
                  {availabilityData?.stars ? (
                    !isNaN(availabilityData.stars) ? (
                      <span className={summaryStyles.stars} aria-hidden="true">
                        {Array(Math.floor(Number(availabilityData.stars))).fill(0).map((_, i) => (
                          <FaStar key={i} />
                        ))}
                        {Number(availabilityData.stars) % 1 !== 0 && <FaStarHalfAlt />}
                      </span>
                    ) : (
                      <span className={summaryStyles.metaValue}>{availabilityData.stars}</span>
                    )
                  ) : null}
                </div>

                {availabilityData?.address && (
                  <p className={summaryStyles.address}>
                    <FaLocationDot className={summaryStyles.addressIcon} aria-hidden="true" />
                    <span>{availabilityData.address}</span>
                  </p>
                )}

                <p className={summaryStyles.sectionLabel}>Your booking details</p>
                <div className={summaryStyles.metaRow}>
                  <span className={summaryStyles.metaLabel}>Check-in</span>
                  <span className={summaryStyles.metaValue}>
                    {availabilityData?.check_in
                      ? moment(availabilityData.check_in).format('D MMMM YYYY')
                      : '—'}
                  </span>
                </div>
                <div className={summaryStyles.metaRow}>
                  <span className={summaryStyles.metaLabel}>Check-out</span>
                  <span className={summaryStyles.metaValue}>
                    {availabilityData?.check_out
                      ? moment(availabilityData.check_out).format('D MMMM YYYY')
                      : '—'}
                  </span>
                </div>
                <div className={summaryStyles.nightsBox}>
                  Total length of stay: {totalNights} Night{totalNights > 1 ? 's' : ''}
                </div>

                <hr className={summaryStyles.divider} />

                {availabilityData?.rooms?.map((item, index) => (
                  <div key={index}>
                    {item.rates?.map((rate, idx) => {
                      const cancelSummary = getCancellationSummary(
                        rate?.cancellation_policies,
                        availabilityData?.currency
                      );
                      return (
                        <div key={idx}>
                          <p className={summaryStyles.roomTitle}>
                            The Room: {item.name}
                          </p>

                          {rate?.on_request && (
                            <div className={summaryStyles.onRequest}>
                              On Request
                              <Tooltip label="This room is not instantly confirmed and requires availability confirmation from the hotel.">
                                <MdInfoOutline size={16} className="cursor-pointer" />
                              </Tooltip>
                            </div>
                          )}

                          <ul className={summaryStyles.roomList}>
                            <li className={summaryStyles.roomItem}>
                              <FaCheck className={summaryStyles.roomCheck} aria-hidden="true" />
                              <span>
                                Guest Number: {rate.adults} Adult{Number(rate.adults) === 1 ? '' : 's'}
                                {Number(rate.children) > 0
                                  ? `, ${rate.children} Child${Number(rate.children) === 1 ? '' : 'ren'}`
                                  : ''}
                              </span>
                            </li>
                            <li className={summaryStyles.roomItem}>
                              <FaCheck className={summaryStyles.roomCheck} aria-hidden="true" />
                              <span>Meal Type: {rate.board_name || 'Room Only'}</span>
                            </li>
                            <li className={summaryStyles.roomItem}>
                              <FaCheck className={summaryStyles.roomCheck} aria-hidden="true" />
                              <span>
                                {rate.rooms} Room{Number(rate.rooms) > 1 ? 's' : ''}
                              </span>
                            </li>
                            <li className={summaryStyles.roomItem}>
                              <FaCheck className={summaryStyles.roomCheck} aria-hidden="true" />
                              <span>Adults: {rate.adults}</span>
                            </li>
                            <li className={summaryStyles.roomItem}>
                              <FaCheck className={summaryStyles.roomCheck} aria-hidden="true" />
                              <span>Child: {rate.children}</span>
                            </li>
                            <li className={summaryStyles.roomItem}>
                              <FaCheck className={summaryStyles.roomCheck} aria-hidden="true" />
                              <span>
                                Per Night:{' '}
                                <PriceDisplay
                                  price={Number(rate.price) / totalNights}
                                  currency={availabilityData?.currency}
                                />
                              </span>
                            </li>
                            <li className={summaryStyles.roomItem}>
                              <FaCheck className={summaryStyles.roomCheck} aria-hidden="true" />
                              <span>
                                Room Price:{' '}
                                <PriceDisplay price={rate.price} currency={availabilityData?.currency} />
                              </span>
                            </li>
                          </ul>

                          {(cancelSummary?.message || rate?.cancellation_policies?.length > 0) && (
                            <div className={summaryStyles.cancelBox}>
                              <div className={summaryStyles.cancelHead}>
                                <FaClock className={summaryStyles.cancelIcon} aria-hidden="true" />
                                Cancellation policy
                              </div>
                              <p className={summaryStyles.cancelText}>
                                {cancelSummary.message}
                                {rate?.cancellation_policies?.length > 0 && (
                                  <MdInfoOutline
                                    size={16}
                                    className={summaryStyles.cancelInfo}
                                    onClick={() =>
                                      handleViewPolicy(
                                        rate.cancellation_policies,
                                        availabilityData?.currency
                                      )
                                    }
                                    aria-label="View cancellation policy"
                                  />
                                )}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {index < (availabilityData?.rooms?.length || 0) - 1 && (
                      <hr className={summaryStyles.divider} />
                    )}
                  </div>
                ))}

                <hr className={summaryStyles.divider} />

                <p className={summaryStyles.sectionLabel}>Your price summary</p>
                <div className={summaryStyles.priceRow}>
                  <span className={summaryStyles.priceLabel}>Rooms subtotal</span>
                  <span className={summaryStyles.priceValue}>
                    <PriceDisplay
                      price={availabilityData?.total_net}
                      currency={availabilityData?.currency}
                    />
                  </span>
                </div>
                <div className={summaryStyles.totalRow}>
                  <span className={summaryStyles.totalLabel}>Total amount</span>
                  <div className={summaryStyles.totalRight}>
                    <div className={`${summaryStyles.totalPrice} ${outfit.className}`}>
                      <PriceDisplay
                        price={availabilityData?.total_net}
                        currency={availabilityData?.currency}
                      />
                    </div>
                    <span className={summaryStyles.vatNote}>VAT &amp; Taxes Included</span>
                  </div>
                </div>
              </div>
            </div>

            <div className={summaryStyles.whyCard}>
              <h4 className={summaryStyles.whyTitle}>Why Book With Us</h4>
              {[
                {
                  icon: <FaTag size={16} />,
                  title: 'Best Price Guarantee',
                  desc: "Find it cheaper elsewhere? We'll match it and give you an extra 10% off.",
                },
                {
                  icon: <FaCalendarCheck size={16} />,
                  title: 'Flexible Dates',
                  desc: 'Change your travel dates up to 24 hours before check-in at no extra cost.',
                },
                {
                  icon: <FaCrown size={16} />,
                  title: 'VIP Perks Included',
                  desc: 'Complimentary welcome drink, late checkout & room upgrade (subject to availability).',
                },
              ].map((item, i) => (
                <div key={i} className={summaryStyles.whyItem}>
                  <span className={summaryStyles.whyIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                  <div>
                    <p className={summaryStyles.whyItemTitle}>{item.title}</p>
                    <p className={summaryStyles.whyItemDesc}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

      </div>
    </div>
  )
}
