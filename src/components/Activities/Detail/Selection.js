'use client'
import React, { useState, useMemo, useEffect } from 'react'
import { BiCalendar } from "react-icons/bi";
import { MdVerifiedUser } from "react-icons/md";
import { IoCheckmarkCircle, IoCloseCircle, IoTimeOutline } from "react-icons/io5";
import { Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import moment from 'moment';
import AdditionalServices from './AdditionalServices';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { useActivityStore } from '@/components/Store/ActivityStore';
import { useRouter, useSearchParams } from 'next/navigation';
import Availability from './Availability';
import ModalityOptions from './ModalityOptions';
import styles from './Selection.module.css';

export default function Selection({ PackageDetail }) {
  const { setSelectedActivity } = useActivityStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [opened, { open, close }] = useDisclosure(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [servicesTotal, setServicesTotal] = useState(0);
  const [selectedServices, setSelectedServices] = useState([]);
  const [adultCount, setAdultCount] = useState(0);
  const [childCount, setChildCount] = useState(0);

  const modalities = PackageDetail?.modalities || [];
  const hasModalities = Array.isArray(modalities) && modalities.length > 0;

  // Pre-select the searched `from` date from URL
  useEffect(() => {
    const from = searchParams.get('from')
    if (!from) return

    const date = moment(from, 'YYYY-MM-DD')
    if (!date.isValid()) return

    setSelectedDate(date.clone())
  }, [searchParams, PackageDetail?.id])

  // Calculate total people
  const totalPeople = adultCount + childCount;

  // Handle adult count change
  const handleAdultChange = (changeType) => {
    if (changeType === 'plus') {
      if (totalPeople < (PackageDetail?.max_people || 10)) {
        setAdultCount(adultCount + 1);
      }
    } else if (changeType === 'minus' && adultCount > 0) {
      setAdultCount(adultCount - 1);
    }
  };

  // Handle child count change
  const handleChildChange = (changeType) => {
    if (changeType === 'plus') {
      if (totalPeople < (PackageDetail?.max_people || 10)) {
        setChildCount(childCount + 1);
      }
    } else if (changeType === 'minus' && childCount > 0) {
      setChildCount(childCount - 1);
    }
  };

  // Calculate prices
  const adultPrice = adultCount * Number(PackageDetail?.sale_price || 0);
  const childPrice = childCount * Number(PackageDetail?.child_sale_price || 0);
  const participantsTotal = adultPrice + childPrice;

  // Calculate additional services total for per_person items
  const perPersonServicesTotal = useMemo(() => {
    return selectedServices
      .filter(service => service.type === 'per_person')
      .reduce((acc, service) => acc + (service.quantity * Number(service.price)), 0);
  }, [selectedServices, totalPeople]);

  const perBookingServicesTotal = useMemo(() => {
    return selectedServices
      .filter(service => service.type === 'per_booking')
      .reduce((acc, service) => acc + Number(service.total), 0);
  }, [selectedServices]);

  const grandTotal = participantsTotal + perPersonServicesTotal + perBookingServicesTotal;

  // Check if minimum people requirement is met
  const minPeople = PackageDetail?.min_people || 1;
  const maxPeople = PackageDetail?.max_people || 5;
  const isValidPeopleCount = totalPeople >= minPeople && totalPeople <= maxPeople;

  // Format cancellation policy for display
  const renderCancellationPolicy = () => {
    const cancellationPolicy = PackageDetail?.cancellation_policy;
    
    if (!cancellationPolicy) {
      return (
        <div className="text-center text-muted py-3">
          No cancellation policy available.
        </div>
      );
    }

    const { cancel_policy, cancellation_policies } = cancellationPolicy;

    // Non-refundable
    if (cancel_policy === 'non-refundable') {
      return (
        <div className="alert alert-danger d-flex align-items-start gap-2">
          <IoCloseCircle size={24} className="mt-1" />
          <div>
            <h6 className="mb-1">Non-Refundable</h6>
            <p className="mb-0 small">
              This booking cannot be cancelled or refunded under any circumstances.
            </p>
          </div>
        </div>
      );
    }

    // Refundable with policies
    if (cancel_policy === 'refundable' && cancellation_policies && cancellation_policies.length > 0) {
      // Sort policies by time_duration (highest to lowest)
      const sortedPolicies = [...cancellation_policies].sort((a, b) => b.time_duration - a.time_duration);

      return (
        <div>
          <div className="alert alert-success d-flex align-items-start gap-2 mb-3">
            <IoCheckmarkCircle size={24} className="mt-1" />
            <div>
              <h6 className="mb-1">Refundable Booking</h6>
              <p className="mb-0 small">
                You can cancel this booking according to the policy below.
              </p>
            </div>
          </div>

          <h6 className="mb-3">Cancellation Timeline:</h6>
          
          <div className="timeline-container">
            {sortedPolicies.map((policy, index) => {
              const timeText = policy.time_duration >= 24 
                ? `${policy.time_duration / 24} day${policy.time_duration / 24 > 1 ? 's' : ''}` 
                : `${policy.time_duration} hour${policy.time_duration > 1 ? 's' : ''}`;
              
              let refundText = '';
              let refundAmount = '';
              let refundDescription = '';

              if (policy.type === 'percentage') {
                const refundPercentage = 100 - policy.value;
                refundText = `${policy.value}% Charge`;
                refundDescription = `${policy.value}% cancellation charge applies. You will receive ${refundPercentage}% of the total booking amount back.`;
              } else if (policy.type === 'fixed') {
                refundText = `Cancellation Fee`;
                refundAmount = policy.value;
                refundDescription = `A fixed cancellation fee will be charged.`;
              }

              return (
                <div 
                  key={index} 
                  className="border rounded p-3 mb-3"
                  style={{ 
                    backgroundColor: index === 0 ? '#f0fdf4' : '#f9fafb',
                    borderLeft: '4px solid',
                    borderLeftColor: index === 0 ? '#22c55e' : '#9ca3af'
                  }}
                >
                  <div className="d-flex align-items-start gap-2">
                    <IoTimeOutline 
                      size={20} 
                      className="mt-1" 
                      style={{ color: index === 0 ? '#22c55e' : '#6b7280' }}
                    />
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <h6 className="mb-0" style={{ color: index === 0 ? '#16a34a' : '#374151' }}>
                          {timeText} before activity
                        </h6>
                        <span 
                          className="badge"
                          style={{
                            backgroundColor: policy.type === 'percentage' ? '#dcfce7' : '#fee2e2',
                            color: policy.type === 'percentage' ? '#16a34a' : '#dc2626'
                          }}
                        >
                          {refundText}
                        </span>
                      </div>
                      
                      <p className="mb-2 small text-muted">
                        {refundDescription}
                      </p>

                      {policy.type === 'fixed' && (
                        <div className="mt-2">
                          <strong className="text-danger">
                            Cancellation Fee: <PriceDisplay price={refundAmount} currency={PackageDetail?.currency_code} />
                          </strong>
                        </div>
                      )}

                      {policy.type === 'percentage' && policy.value === 0 && (
                        <div className="mt-2 small text-success">
                          <strong>✓ Full refund - No cancellation charges</strong>
                        </div>
                      )}
                      {policy.type === 'percentage' && policy.value === 100 && (
                        <div className="mt-2 small text-danger">
                          <strong>⚠ No refund - 100% cancellation charge</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="alert alert-warning mt-3 mb-0">
            <small>
              <strong>Important:</strong> Cancellation must be made before the stated time. 
              After this period, the booking is non-refundable.
            </small>
          </div>
        </div>
      );
    }

    // Default free cancellation
    return (
      <div className="alert alert-success d-flex align-items-start gap-2">
        <IoCheckmarkCircle size={24} className="mt-1" />
        <div>
          <h6 className="mb-1">Free Cancellation</h6>
          <p className="mb-0 small">
            This booking can be cancelled free of charge.
          </p>
        </div>
      </div>
    );
  };

  const buildBaseActivityData = () => ({
    'id': PackageDetail?.id,
    'title': PackageDetail?.title,
    'address': PackageDetail?.address,
    'included_items': PackageDetail?.included_items,
    'excluded_items': PackageDetail?.excluded_items,
    'banner_image': PackageDetail?.banner_image,
    'featured_image': PackageDetail?.featured_image,
    'duration': PackageDetail?.activity_duration,
    'provider': PackageDetail?.provider,
    'payment_methods': PackageDetail.payment_methods,
    'payment_mode': PackageDetail.payment_mode,
    'slug': PackageDetail?.slug,
    'travel_date': selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : null,
    'meeting_and_pickup': PackageDetail.meeting_and_pickup,
    'rating_stars': PackageDetail?.rating_stars,
    'selected_services': selectedServices,
    'currency': PackageDetail?.original_currency_code || PackageDetail?.currency_code,
    'ppserson_services_total': perPersonServicesTotal,
    'pb_services_total': perBookingServicesTotal,
    'services_total': perPersonServicesTotal + perBookingServicesTotal,
    'city': PackageDetail?.city,
    'country': PackageDetail?.country,
    'cancellation_policy_text': PackageDetail?.cancellation_policy_text,
    'cancellation_policy': PackageDetail?.cancellation_policy,
    'questions': PackageDetail?.questions || [],
  });

  const HandleBookNow = () => {
    const activityData = {
      ...buildBaseActivityData(),
      'adults': adultCount,
      'children': childCount,
      'participants_total': participantsTotal,
      'grand_total': grandTotal,
      'price_per_adult': PackageDetail?.sale_price,
      'price_per_child': PackageDetail?.child_sale_price,
      'questions': PackageDetail?.questions || [],
    };
    setSelectedActivity(activityData);
    router.push(`/activities/${PackageDetail.slug}/checkout`);
  };

  const HandleModalityProceed = (selection) => {
    const servicesTotalAmount = perPersonServicesTotal + perBookingServicesTotal;
    const activityData = {
      ...buildBaseActivityData(),
      'adults': selection.adults,
      'children': selection.children,
      'participants_total': selection.participants_total,
      'grand_total': selection.participants_total + servicesTotalAmount,
      'price_per_adult': selection.price_per_adult,
      'price_per_child': selection.price_per_child,
      'duration': selection.duration
        ? `${selection.duration.value} ${String(selection.duration.metric || '').toLowerCase()}`
        : PackageDetail?.activity_duration,
      'modality': {
        code: selection.modality?.code,
        name: selection.modality?.name,
        unique_identifier: selection.modality?.unique_identifier,
        rate_key: selection.rate_key,
        session: selection.session,
        language: selection.language,
        quantities: selection.quantities,
        selected_pax: selection.selected_pax || [],
        cancellation_policies: selection.cancellation_policies,
        duration: selection.duration,
      },
    };
    setSelectedActivity(activityData);
    router.push(`/activities/${PackageDetail.slug}/checkout`);
  };

  return (
    <div className={styles.root}>
      <Availability PackageDetail={PackageDetail} setSelectedDate={setSelectedDate} selectedDate={selectedDate} />
      <Modal
        opened={opened}
        onClose={close}
        title={<strong>Cancellation Policy</strong>}
        size="lg"
        centered
      >
        {renderCancellationPolicy()}
      </Modal>
      {hasModalities ? (
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h5 className={styles.panelTitle}>Select Options</h5>
            <p className={styles.panelSub}>Choose time, package and tickets.</p>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.guarantee}>
              <MdVerifiedUser size={20} className={styles.guaranteeIcon} />
              <span className={styles.guaranteeText}>Lowest Price Guarantee</span>
            </div>
            <ModalityOptions
              modalities={modalities}
              currency={PackageDetail?.original_currency_code || PackageDetail?.currency_code}
              selectedDate={selectedDate}
              maxPeople={PackageDetail?.max_people || 12}
              minPeople={PackageDetail?.min_people || 1}
              cancellationPolicy={PackageDetail?.cancellation_policy}
              onProceed={HandleModalityProceed}
            />
          </div>
        </div>
      ) : (
        <>
          <div className={styles.panel}>
            <div className={styles.panelHeader}>
              <h5 className={styles.panelTitle}>Select Activity</h5>
              <p className={styles.panelSub}>Fill in activity, date, passenger count, etc.</p>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.reqNote}>
                <strong>Participant Requirements:</strong>&nbsp;Minimum {minPeople} - Maximum {maxPeople} people
              </div>

              <div className={styles.guarantee}>
                <MdVerifiedUser size={20} className={styles.guaranteeIcon} />
                <span className={styles.guaranteeText}>Lowest Price Guarantee</span>
              </div>

              <div className={styles.paxCard}>
                <div className={styles.paxInfo}>
                  <label className={styles.paxLabel}>Adult</label>
                  <div className={styles.paxPrice}>
                    <PriceDisplay price={PackageDetail?.sale_price} currency={PackageDetail?.currency_code} />
                  </div>
                  <div className={styles.paxPer}>per person</div>
                </div>
                <div className={styles.qtyBox}>
                  <button
                    type="button"
                    onClick={() => handleAdultChange('minus')}
                    className={styles.qtyBtn}
                    disabled={adultCount === 0}
                    aria-label="Decrease adults"
                  >−</button>
                  <span className={styles.qtyValue}>{adultCount}</span>
                  <button
                    type="button"
                    onClick={() => handleAdultChange('plus')}
                    className={styles.qtyBtn}
                    disabled={totalPeople >= maxPeople}
                    aria-label="Increase adults"
                  >+</button>
                </div>
              </div>

              {PackageDetail?.has_child_pricing === 1 && (
                <div className={styles.paxCard}>
                  <div className={styles.paxInfo}>
                    <label className={styles.paxLabel}>Child</label>
                    <div className={styles.paxPrice}>
                      <PriceDisplay price={PackageDetail?.child_sale_price} currency={PackageDetail?.currency_code} />
                    </div>
                    <div className={styles.paxPer}>per person</div>
                  </div>
                  <div className={styles.qtyBox}>
                    <button
                      type="button"
                      onClick={() => handleChildChange('minus')}
                      className={styles.qtyBtn}
                      disabled={childCount === 0}
                      aria-label="Decrease children"
                    >−</button>
                    <span className={styles.qtyValue}>{childCount}</span>
                    <button
                      type="button"
                      onClick={() => handleChildChange('plus')}
                      className={styles.qtyBtn}
                      disabled={totalPeople >= maxPeople}
                      aria-label="Increase children"
                    >+</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {PackageDetail?.additional_services && PackageDetail?.additional_services.length > 0 && (
            <AdditionalServices
              Services={PackageDetail?.additional_services || []}
              currency={PackageDetail?.currency_code}
              selectedServices={selectedServices}
              setSelectedServices={setSelectedServices}
              setServicesTotal={setServicesTotal}
            />
          )}

          <div className={`${styles.panel} mb-3`}>
            <div className={styles.panelBody}>
              {totalPeople > 0 && (
                <div className={styles.summaryBlock}>
                  <h5 className={styles.summaryTitle}>Booking Summary</h5>
                  <p className={styles.summarySub}>Review your selected activity, date, and passenger details.</p>

                  {adultCount > 0 && (
                    <div className={styles.summaryLine}>
                      <span>{adultCount} Adult{adultCount > 1 ? 's' : ''} × <PriceDisplay price={PackageDetail?.sale_price} currency={PackageDetail?.currency_code} /></span>
                      <span className={styles.summaryAmount}><PriceDisplay price={adultPrice} currency={PackageDetail?.currency_code} /></span>
                    </div>
                  )}
                  {childCount > 0 && (
                    <div className={styles.summaryLine}>
                      <span>{childCount} Child{childCount > 1 ? 'ren' : ''} × <PriceDisplay price={PackageDetail?.child_sale_price} currency={PackageDetail?.currency_code} /></span>
                      <span className={styles.summaryAmount}><PriceDisplay price={childPrice} currency={PackageDetail?.currency_code} /></span>
                    </div>
                  )}

                  {selectedServices.length > 0 && (
                    <>
                      <hr className={styles.summaryDivider} />
                      <div className={styles.summarySub} style={{ marginBottom: '0.45rem' }}>Additional Services:</div>
                      {selectedServices.map((service, index) => {
                        const serviceTotal = service.type === 'per_person'
                          ? service.quantity * Number(service.price)
                          : Number(service.total);
                        return (
                          <div key={index} className={styles.summaryLine}>
                            <span>{service.name} {service.type === 'per_person' && `(${service.quantity} × ${totalPeople} people)`}</span>
                            <span className={styles.summaryAmount}><PriceDisplay price={serviceTotal} currency={PackageDetail?.currency_code} /></span>
                          </div>
                        );
                      })}
                    </>
                  )}

                  <hr className={styles.summaryDivider} />
                  <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>Total Amount:</span>
                    <span className={styles.totalValue}><PriceDisplay price={grandTotal} currency={PackageDetail?.currency_code} /></span>
                  </div>
                  <div className={styles.taxNote}>Inclusive of VAT and Taxes</div>
                </div>
              )}
              {totalPeople > 0 && !isValidPeopleCount && (
                <div className={styles.warning}>
                  {totalPeople < minPeople && `Please select at least ${minPeople} participant${minPeople > 1 ? 's' : ''}.`}
                  {totalPeople > maxPeople && `Maximum ${maxPeople} participants allowed.`}
                </div>
              )}
              <button type="button" className={styles.policyLink} onClick={open}>
                <BiCalendar size={16} />
                Cancellation Policy
              </button>

              <button
                type="button"
                onClick={HandleBookNow}
                className={styles.ctaBtn}
                disabled={!selectedDate || !isValidPeopleCount || totalPeople === 0}
              >
                Proceed to checkout
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
