'use client'
import styles from "../../../hotels/invoice/[id]/Invoice.module.css";
import localStyles from "./invoice.module.css";
import moment from "moment";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelInvoiceLoader from "@/components/Loader/HotelInvoiceLoader";
import { PiDownloadSimpleThin } from "react-icons/pi";
import { Tooltip } from '@mantine/core';
import { FaHome, FaPhone, FaEnvelope, FaGlobe, FaCalendarAlt, FaFileInvoice, FaCheckCircle, FaRegStar, FaStar, FaStarHalfAlt } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import Link from "next/link";

export default function Page() {
  const { id } = useParams();
  const ref = useRef();
  const [voucherDetail, setVoucherDetail] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    setIsLoading(true);
    try {
      const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/activities/booking/${id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }, 
      });
      const res = await responses.json();
      setIsLoading(false);
      if (res.Success) {
        setVoucherDetail(res?.Content?.booking);
      } else {
        setErrorMessage(res?.message);
      }
    } catch (err) {
      setIsLoading(false);
      console.error("Error fetching activity details:", err);
    }
  };

  function capitalize(text) {
    if (!text) return "";
    return String(text).charAt(0).toUpperCase() + String(text).slice(1);
  }

  function hasGuestName(guest) {
    return Boolean(String(guest?.first_name || '').trim() || String(guest?.last_name || '').trim());
  }

  function formatChildUnderLabel(age) {
    if (age == null || age === '') return 'Child';
    return `Children (under ${age})`;
  }

  function getNamedChildren() {
    return (voucherDetail?.other_passengers?.children_details || []).filter(hasGuestName);
  }

  function getChildrenAgeSummary() {
    const details = voucherDetail?.other_passengers?.children_details || [];
    if (!details.length) {
      const count = Number(voucherDetail?.children || 0);
      return count > 0 ? [{ label: 'Children', count }] : [];
    }
    const counts = {};
    details.forEach((child) => {
      const label = formatChildUnderLabel(child?.age);
      counts[label] = (counts[label] || 0) + 1;
    });
    return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }

  function getModalityName() {
    return voucherDetail?.modality?.name || voucherDetail?.voucher?.modality?.name || '';
  }

  function getStartTime() {
    const modalityName = getModalityName();
    const timeMatch = String(modalityName).match(/(\d{1,2}:\d{2})/);
    if (timeMatch) {
      const parsed = moment(timeMatch[1], ['HH:mm', 'H:mm'], true);
      if (parsed.isValid()) return parsed.format('hh:mm A');
    }
    return '';
  }

  function getLanguageLabel() {
    const langs = voucherDetail?.languages || voucherDetail?.voucher?.languages || [];
    if (!langs.length) {
      const modalityName = getModalityName().toLowerCase();
      if (modalityName.includes('english') || modalityName.includes('eng')) return 'English';
      return '';
    }
    return langs
      .map((l) => l.description || (l.code === 'en' ? 'English' : String(l.code || '').toUpperCase()))
      .filter(Boolean)
      .join(', ');
  }

  function getCancellationPolicy() {
    return (
      voucherDetail?.cancellation_policy ||
      voucherDetail?.cancellation_policies ||
      voucherDetail?.activity?.cancellation_policy ||
      null
    );
  }

  function getCancellationPoliciesList(policyWrapper) {
    if (!policyWrapper) return [];
    if (Array.isArray(policyWrapper?.cancellation_policies)) return policyWrapper.cancellation_policies;
    if (Array.isArray(policyWrapper)) return policyWrapper;
    return [];
  }

  function parseContractRemarks() {
    const remarks =
      voucherDetail?.contract_remarks ||
      voucherDetail?.voucher?.contract_remarks ||
      voucherDetail?.voucher?.comments ||
      [];
    const text = remarks.map((r) => r?.text).filter(Boolean).join(' ');
    if (!text.trim()) return [];

    return text
      .split('//')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const sepIdx = part.indexOf(':');
        if (sepIdx === -1) return { label: '', value: part };
        return {
          label: part.slice(0, sepIdx).trim(),
          value: part.slice(sepIdx + 1).trim(),
        };
      })
      .filter((item) => item.value);
  }

  const SUPPLIER_REMARK_LABELS = [
    'supplier name',
    'supplier emergency phone',
    'supplier',
    'voucher type',
    'meeting point instructions',
    'start/opening time',
    'end/closing time',
  ];

  function getVisibleContractRemarks() {
    return parseContractRemarks().filter(
      (item) => !SUPPLIER_REMARK_LABELS.includes(String(item.label || '').toLowerCase())
    );
  }

  function convertToCustomerCurrency(price) {
    if (price == null || price === '') return Number(0).toFixed(2);
    if (!voucherDetail.customer_exchange_rate) return Number(price || 0).toFixed(2);
    if (voucherDetail.currency_code === voucherDetail.customer_currency) return Number(price).toFixed(2);
    return (Number(price) * Number(voucherDetail.customer_exchange_rate)).toFixed(2);
  }

  function getTotalPassengers() {
    const parts = [];
    const adults = Number(voucherDetail?.adults || 0);
    if (adults > 0) parts.push(`${adults} Adult${adults !== 1 ? 's' : ''}`);
    getChildrenAgeSummary().forEach((item) => {
      parts.push(`${item.count} ${item.label}`);
    });
    return parts.join(', ');
  }

  function renderCancellationPolicyContent() {
    const policyWrapper = getCancellationPolicy();
    if (!policyWrapper) return null;

    const cancelPolicy = policyWrapper.cancel_policy || 'refundable';
    const policies = getCancellationPoliciesList(policyWrapper);

    if (cancelPolicy === 'non-refundable') {
      return (
        <div className="text-danger small mt-2">
          This booking is non-refundable. No refund will be issued for cancellations.
        </div>
      );
    }

    if (!policies.length) {
      return (
        <div className="small mt-2">
          This booking is refundable. Please contact support for cancellation terms.
        </div>
      );
    }

    return (
      <ul style={{ paddingLeft: 18, margin: 0, fontSize: '0.9rem' }}>
        {policies.map((policy, i) => {
          const fromDate = policy.from || policy.dateFrom;
          const amount = policy.amount ?? policy.value ?? policy.original_amount;
          const dateLabel = fromDate ? moment(fromDate).format('D MMM YYYY') : null;

          if (fromDate || amount != null) {
            return (
              <li key={i} style={{ marginBottom: 6, color: '#555' }}>
                {dateLabel ? (
                  <>
                    Free cancellation before <strong>{dateLabel}</strong>.
                    {Number(amount) > 0 && (
                      <>
                        {' '}On or after this date, a cancellation fee of{' '}
                        <strong>
                          {voucherDetail.customer_currency} {convertToCustomerCurrency(amount)}
                        </strong>{' '}
                        will apply.
                      </>
                    )}
                  </>
                ) : (
                  <>
                    A cancellation fee of{' '}
                    <strong>
                      {voucherDetail.customer_currency} {convertToCustomerCurrency(amount)}
                    </strong>{' '}
                    may apply.
                  </>
                )}
              </li>
            );
          }

          if (policy.time_duration != null) {
            return (
              <li key={i} style={{ marginBottom: 6, color: '#555' }}>
                If cancelled <strong>{policy.time_duration} hours</strong> before departure, a{' '}
                {policy.type === 'percentage' ? (
                  <><strong>{policy.value}%</strong> cancellation charge</>
                ) : (
                  <>
                    fixed cancellation charge of{' '}
                    <strong>
                      {voucherDetail.customer_currency} {convertToCustomerCurrency(policy.value)}
                    </strong>
                  </>
                )}{' '}
                will apply.
              </li>
            );
          }

          return null;
        })}
      </ul>
    );
  }

  function formatRemarkValue(value) {
    const text = String(value || '').trim();
    if (!text) return [];

    // Protect common abbreviations so "Min. Age" does not split incorrectly
    const protectedText = text.replace(
      /\b(Min|Max|No|Nos|Dr|Mr|Mrs|Ms|Jr|Sr|vs|approx|kg|lbs?)\.\s+/gi,
      '$1.\u00A0'
    );

    const parts = protectedText
      .split(/\.\s+/)
      .map((part) => part.trim().replace(/\u00A0/g, ' ').replace(/\.$/, ''))
      .filter(Boolean);

    // Merge leftover short fragments (e.g. "Min" + "Age: 5")
    const merged = [];
    for (let i = 0; i < parts.length; i++) {
      let current = parts[i];
      while (i + 1 < parts.length && current.length <= 4) {
        i += 1;
        current = `${current}. ${parts[i]}`;
      }
      merged.push(current.endsWith('.') ? current : `${current}.`);
    }

    return merged;
  }

  function isLongRemark(item) {
    const value = String(item?.value || '');
    const label = String(item?.label || '').toLowerCase();
    const longLabels = [
      'mandatory instructions',
      'recommendations',
      'voucher type',
      'inclusions',
    ];
    return value.length > 70 || longLabels.includes(label) || formatRemarkValue(value).length > 1;
  }

  const contractRemarkItems = getVisibleContractRemarks();
  const startTime = getStartTime();
  const languageLabel = getLanguageLabel();
  const modalityName = getModalityName();
  const cancellationPolicy = getCancellationPolicy();
  const allContractRemarks = parseContractRemarks();
  const durationFromRemarks = allContractRemarks.find(
    (item) => String(item.label).toLowerCase() === 'duration'
  )?.value;
  const meetingPoint = allContractRemarks.find(
    (item) => String(item.label).toLowerCase() === 'meeting point'
  )?.value;
  const childrenAgeSummary = getChildrenAgeSummary();

  return (
    <div>
      <div className={styles.invoicecontainerwrap}>
        <div className={styles.invoicecontainer}>
          {isLoading ? (
            <div className={styles.themeholyinvoice}>
              <HotelInvoiceLoader />
            </div>
          ) : (
            <main>
              {/* Action Buttons */}
              <div className={styles.invoiceprintbutton}>
                <Tooltip label="Print Invoice" color="blue">
                  <div onClick={() => window.print()} className="bg-primary-subtle cursor-pointer p-2 text-primary rounded">
                    <PiDownloadSimpleThin size={25} />
                  </div>
                </Tooltip>
                <Tooltip label="View Voucher" color="teal">
                  <Link href={`/activities/voucher/${voucherDetail?.booking_reference}`}>
                    <div className="bg-info-subtle cursor-pointer p-2 text-info rounded mt-2">
                      <FaFileInvoice size={22} />
                    </div>
                  </Link>
                </Tooltip>
                <Tooltip label="Go Home" color="green">
                  <Link href="/">
                    <div className="bg-success-subtle cursor-pointer p-2 text-success rounded mt-2">
                      <FaHome size={25} />
                    </div>
                  </Link>
                </Tooltip>
              </div>

              <div ref={ref} id="invoice" className={styles.themeholyinvoice}>
                {/* Watermark */}
                <div className={styles.watermark}>
                  <Image
                    src="/watermark.png"
                    width={450}
                    height={450}
                    style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                    alt="Watermark"
                    quality={100}
                  />
                </div>

                {/* Invoice Header */}
                <div className={styles.invHeader}>
                  {/* Left panel */}
                  <div className={styles.invHeaderLeft}>
                    <div className={`${styles.invHeaderLogo} text-center`}>
                      <Image src="/images/logoblack.png" height={100} width={150} className="h-auto" quality={100} alt="Logo" />
                    </div>
                    <div className={styles.invHeaderMeta}>
                      <span>
                        <FaCalendarAlt size={13} className={styles.invMetaIcon} />
                        Date: <b>{moment(voucherDetail?.created_at, 'DD-MM-YYYY HH:mm:ss').format('DD-MM-YYYY')}</b>
                      </span>
                      <span>
                        <FaFileInvoice size={13} className={styles.invMetaIcon} />
                        Voucher No: <b>{voucherDetail?.booking_reference}</b>
                      </span>
                      {voucherDetail?.provider_reference && (
                        <span>
                          <FaFileInvoice size={13} className={styles.invMetaIcon} />
                          Booking Ref: <b>{voucherDetail.provider_reference}</b>
                        </span>
                      )}
                    </div>
                    <div className={styles.invHeaderTitle}>INVOICE</div>
                  </div>
                  {/* Right panel */}
                  <div className={styles.invHeaderRight}>
                    <div className={styles.invBookingFor}>Booking For:</div>
                    <div className={styles.invGuestName}>
                      {voucherDetail?.lead_title} {voucherDetail?.lead_first_name} {voucherDetail?.lead_last_name}

                    </div>
                    <div className={styles.invHeaderDivider}></div>
                    <div className={styles.invContactInfo}>
                      {voucherDetail?.lead_address && (
                        <p><FaLocationDot size={12} className={styles.invContactIcon} />{voucherDetail.lead_address}</p>
                      )}
                      {!voucherDetail?.lead_address && voucherDetail?.lead_country && (
                        <p><FaLocationDot size={12} className={styles.invContactIcon} />{voucherDetail.lead_country}</p>
                      )}
                      {voucherDetail?.lead_email && (
                        <p><FaEnvelope size={12} className={styles.invContactIcon} />{voucherDetail.lead_email}</p>
                      )}
                      {voucherDetail?.lead_phone && (
                        <p>
                          <FaPhone size={12} className={styles.invContactIcon} />
                          {`${voucherDetail?.lead_phone_code || ''} ${voucherDetail.lead_phone}`.trim()}
                        </p>
                      )}
                    </div>
                    <div className={styles.invHeaderDivider}></div>
                    <div className={styles.invStatusRow}>
                      <span className={`${styles.invStatusBadge} ${voucherDetail?.booking_status === 'confirmed' ? styles.confirmedStatus : voucherDetail?.booking_status === 'cancelled' ? styles.cancelledStatus : styles.pandingStatus}`}>
                        <FaCheckCircle size={12} />
                        STATUS: {voucherDetail?.booking_status?.toUpperCase()}
                      </span>
                      {voucherDetail?.payment_status && (
                        <span className={`${styles.confirmedStatus} ms-1 ${styles.invStatusBadge}`}>
                          Payment: {voucherDetail?.payment_status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className={styles.downloadinner}>

                  {/* Activity Details */}
                  <div className={`${styles.accomBlock} mb-3`}>
                    <div className={styles.accomHeader}>
                      <span className={styles.accomTitle}>• Activity Details</span>
                    </div>
                    <div className={styles.accomDivider}></div>
                    <div className={styles.accomRow}>
                      <span className={styles.accomLabel}>Activity Name</span>
                      <span className={styles.accomValue} style={{ fontWeight: 700 }}>{voucherDetail?.activity?.title}</span>
                    </div>
                    {modalityName && (
                      <>
                        <div className={styles.accomRowDivider}></div>
                        <div className={styles.accomRow}>
                          <span className={styles.accomLabel}>Package</span>
                          <span className={styles.accomValue}>{modalityName}</span>
                        </div>
                      </>
                    )}
                    {(meetingPoint || String(voucherDetail?.activity?.address || '').trim()) && (
                      <>
                        <div className={styles.accomRowDivider}></div>
                        <div className={styles.accomRow}>
                          <span className={styles.accomLabel}>Meeting Point</span>
                          <span className={styles.accomValue}>
                            <FaLocationDot size={11} style={{ color: '#c49a2a', marginRight: 4 }} />
                            {meetingPoint || voucherDetail.activity.address}
                          </span>
                        </div>
                      </>
                    )}
                    <div className={styles.accomRowDivider}></div>
                    <div className={styles.accomRow}>
                      <span className={styles.accomLabel}>Activity Date</span>
                      <span className={styles.accomValue}>
                        {voucherDetail?.travel_date ? moment(voucherDetail.travel_date).format('DD-MM-YYYY dddd') : '-'}
                      </span>
                    </div>
                    {startTime && (
                      <>
                        <div className={styles.accomRowDivider}></div>
                        <div className={styles.accomRow}>
                          <span className={styles.accomLabel}>Start Time</span>
                          <span className={styles.accomValue}>{startTime}</span>
                        </div>
                      </>
                    )}
                    {languageLabel && (
                      <>
                        <div className={styles.accomRowDivider}></div>
                        <div className={styles.accomRow}>
                          <span className={styles.accomLabel}>Language</span>
                          <span className={styles.accomValue}>{languageLabel}</span>
                        </div>
                      </>
                    )}
                    {(voucherDetail?.activity?.activity_duration || durationFromRemarks) && (
                      <>
                        <div className={styles.accomRowDivider}></div>
                        <div className={styles.accomRow}>
                          <span className={styles.accomLabel}>Duration</span>
                          <span className={styles.accomValue}>
                            {voucherDetail?.activity?.activity_duration || durationFromRemarks}
                          </span>
                        </div>
                      </>
                    )}
                    <div className={styles.accomRowDivider}></div>
                    <div className={styles.accomRow}>
                      <span className={styles.accomLabel}>Travelers</span>
                      <span className={styles.accomValue}>{getTotalPassengers()}</span>
                    </div>
                    {Number(voucherDetail?.activity?.rating_stars) > 0 && (
                      <>
                        <div className={styles.accomRowDivider}></div>
                        <div className={styles.accomRow}>
                          <span className={styles.accomLabel}>Rating</span>
                          <span className={styles.accomValue}>
                            <span className="d-inline-flex align-items-center gap-1">
                              {Array.from({ length: 5 }).map((_, index) => {
                                const rating = Number(voucherDetail.activity.rating_stars);
                                const fullStars = Math.floor(rating);
                                const hasHalfStar = rating - fullStars >= 0.5;
                                if (index < fullStars) return <FaStar key={index} style={{ color: '#c49a2a' }} />;
                                if (index === fullStars && hasHalfStar) return <FaStarHalfAlt key={index} style={{ color: '#c49a2a' }} />;
                                return <FaRegStar key={index} style={{ color: '#c49a2a' }} />;
                              })}
                              <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: 4 }}>
                                ({Number(voucherDetail.activity.rating_stars).toFixed(1)})
                              </span>
                            </span>
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Guest Details */}
                  <div className={`${styles.accomBlock} mb-1`}>
                    <div className={styles.accomHeader}>
                      <span className={styles.accomTitle}>• Guest Details</span>
                    </div>
                    <div className={styles.accomDivider}></div>
                    <div className={localStyles.tableResponsive}>
                      <table className={`${styles.invoicetable} ${localStyles.mobileTable} w-100`}>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Full Name</th>
                            <th>Contact</th>
                            <th>Gender</th>
                            <th>Country</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td data-label="#">1</td>
                            <td data-label="Full Name"><strong>{voucherDetail?.lead_title} {voucherDetail?.lead_first_name} {voucherDetail?.lead_last_name}</strong></td>
                            <td data-label="Contact">
                              <div>{voucherDetail?.lead_email || '-'}</div>
                              {voucherDetail?.lead_phone && (
                                <div style={{ fontSize: '0.85rem', color: '#555', marginTop: 2 }}>
                                  {`${voucherDetail?.lead_phone_code || ''} ${voucherDetail.lead_phone}`.trim()}
                                </div>
                              )}
                            </td>
                            <td data-label="Gender">{capitalize(voucherDetail?.lead_gender) || '-'}</td>
                            <td data-label="Country">{voucherDetail?.lead_country || '-'}</td>
                          </tr>
                          {voucherDetail?.other_passengers?.additional_adults?.map((adult, index) => (
                            <tr key={`adult-${index}`}>
                              <td data-label="#">{index + 2}</td>
                              <td data-label="Full Name"><strong>{adult.first_name} {adult.last_name}</strong></td>
                              <td data-label="Contact">-</td>
                              <td data-label="Gender">{capitalize(adult.gender) || '-'}</td>
                              <td data-label="Country">-</td>
                            </tr>
                          ))}
                          {getNamedChildren().map((child, index) => (
                            <tr key={`child-${index}`}>
                              <td data-label="#">{(voucherDetail?.other_passengers?.additional_adults?.length || 0) + index + 2}</td>
                              <td data-label="Full Name">
                                <strong>{child.first_name} {child.last_name}</strong>
                                <em style={{ fontSize: '0.75rem', color: '#888', marginLeft: 6 }}>
                                  ({formatChildUnderLabel(child.age)})
                                </em>
                              </td>
                              <td data-label="Contact">-</td>
                              <td data-label="Gender">{capitalize(child.gender) || '-'}</td>
                              <td data-label="Country">-</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Activity Information */}
                  {contractRemarkItems.length > 0 && (
                    <div className={`${styles.accomBlock} mb-1`}>
                      <div className={styles.accomHeader}>
                        <span className={styles.accomTitle}>• Activity Information</span>
                      </div>
                      <div className={styles.accomDivider}></div>
                      {contractRemarkItems.map((item, index) => {
                        const longRemark = isLongRemark(item);
                        const points = formatRemarkValue(item.value);

                        return (
                          <div key={index}>
                            {index > 0 && <div className={styles.accomRowDivider}></div>}
                            <div className={`${styles.accomRow} ${localStyles.infoRow}`}>
                              <span className={`${styles.accomLabel} ${localStyles.infoLabel}`}>
                                {item.label || 'Note'}
                              </span>
                              <div className={localStyles.infoContent}>
                                {longRemark && points.length > 1 ? (
                                  <ul className={localStyles.infoBlockList}>
                                    {points.map((point, pointIndex) => (
                                      <li key={pointIndex}>{point}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className={localStyles.infoBlockText}>{item.value}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Pricing Details */}
                  <div className={`${styles.accomBlock} mb-1`}>
                    <div className={styles.accomHeader}>
                      <span className={styles.accomTitle}>• Pricing Details</span>
                      <span className={styles.accomCity}>{voucherDetail?.customer_currency}</span>
                    </div>
                    <div className={styles.accomDivider}></div>
                    <div className={localStyles.tableResponsive}>
                      <table className={`${styles.invoicetable} ${localStyles.mobileTable} w-100`}>
                        <thead>
                          <tr>
                            <th>Traveler Type</th>
                            <th>Quantity &times; Unit Price</th>
                            <th className="text-end">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td data-label="Traveler Type">Adult{Number(voucherDetail?.adults) !== 1 ? 's' : ''}</td>
                            <td data-label="Quantity × Unit Price">{voucherDetail?.adults} &times; {voucherDetail?.customer_currency} {convertToCustomerCurrency(voucherDetail?.activity?.sale_price)}</td>
                            <td data-label="Total" className="text-end">{voucherDetail?.customer_currency} {convertToCustomerCurrency(voucherDetail?.adult_price)}</td>
                          </tr>
                          {Number(voucherDetail?.children) > 0 && (
                            childrenAgeSummary.length > 0 ? (
                              childrenAgeSummary.map((item, index) => (
                                <tr key={`child-price-${index}`}>
                                  <td data-label="Traveler Type">{item.label}</td>
                                  <td data-label="Quantity × Unit Price">
                                    {item.count} &times; {voucherDetail?.customer_currency}{' '}
                                    {convertToCustomerCurrency(voucherDetail?.activity?.child_sale_price)}
                                  </td>
                                  <td data-label="Total" className="text-end">
                                    {voucherDetail?.customer_currency}{' '}
                                    {convertToCustomerCurrency(
                                      Number(voucherDetail?.activity?.child_sale_price || 0) * Number(item.count)
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td data-label="Traveler Type">Child{Number(voucherDetail?.children) !== 1 ? 'ren' : ''}</td>
                                <td data-label="Quantity × Unit Price">{voucherDetail?.children} &times; {voucherDetail?.customer_currency} {convertToCustomerCurrency(voucherDetail?.activity?.child_sale_price)}</td>
                                <td data-label="Total" className="text-end">{voucherDetail?.customer_currency} {convertToCustomerCurrency(voucherDetail?.child_price)}</td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Additional Services */}
                  {voucherDetail?.additional_services?.length > 0 && (
                    <div className={`${styles.accomBlock} mb-1`}>
                      <div className={styles.accomHeader}>
                        <span className={styles.accomTitle}>• Additional Services</span>
                      </div>
                      <div className={styles.accomDivider}></div>
                      <div className={localStyles.tableResponsive}>
                        <table className={`${styles.invoicetable} ${localStyles.mobileTable} w-100`}>
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Service</th>
                              <th>Quantity &times; Unit Price</th>
                              <th className="text-end">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {voucherDetail.additional_services.map((item, index) => (
                              <tr key={index}>
                                <td data-label="#">{index + 1}</td>
                                <td data-label="Service">{item.name}</td>
                                <td data-label="Quantity × Unit Price">{item.quantity} &times; {voucherDetail?.customer_currency} {convertToCustomerCurrency(item?.price)}</td>
                                <td data-label="Total" className="text-end">{voucherDetail?.customer_currency} {convertToCustomerCurrency(item?.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Special Request */}
                  {voucherDetail?.special_request && (
                    <div className={`${styles.accomBlock} mb-1`}>
                      <div className={styles.accomHeader}>
                        <span className={styles.accomTitle}>• Special Request</span>
                      </div>
                      <div className={styles.accomDivider}></div>
                      <div className="p-3">
                        <p style={{ margin: 0, lineHeight: '1.6', color: '#333', fontSize: '0.9rem' }}>{voucherDetail.special_request}</p>
                      </div>
                    </div>
                  )}

                  {/* CANCELLATION POLICY SECTION */}
                  {cancellationPolicy && (
                    <div className={`${styles.accomBlock} mb-1`}>
                      <div className={styles.accomHeader}>
                        <span className={styles.accomTitle}>• Cancellation Policy</span>
                      </div>
                      <div className={styles.accomDivider}></div>
                      <div className="p-3">
                        {renderCancellationPolicyContent()}
                      </div>
                    </div>
                  )}

                  {/* Sub Total */}
                  <div className="text-end">
                    <table className={`${styles.totaltable} w-100`}>
                      <tbody>
                        <tr>
                          <td>Sub Total: {voucherDetail?.customer_currency} {voucherDetail?.customer_total}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Total */}
                  <div className={styles.invTotalSection}>
                    <div className={styles.invTotalLabel}>Total:</div>
                    <div className={styles.invTotalAmount}>
                      {voucherDetail?.customer_currency} {voucherDetail?.customer_total}
                    </div>
                      <span className='small'>Included VAT and Taxes</span>
                  </div>
                  <div className={styles.invTotalDivider}></div>

                  {/* Important Information */}
                  <div className={styles.invTotalNote}>
                    <b>Important Information</b>
                    <ul style={{ paddingLeft: '18px', marginTop: '8px' }}>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Please present this invoice on arrival at the activity location.</li>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Arrive at least 15 minutes before the scheduled activity start time.</li>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Valid passport or photo ID must be presented at check-in.</li>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>This invoice is valid only for the specified dates, passenger, and activity.</li>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>Activity schedules are subject to weather conditions and operator availability.</li>
                      <li style={{ fontSize: '0.88rem', color: '#555', marginBottom: '5px' }}>The invoice displays the complete pricing details inclusive of all applicable taxes.</li>
                    </ul>
                  </div>
                  <div className={styles.invTotalDivider}></div>

                  <div className="text-end mt-4 mb-4">
                    <p className="mb-0">Thank you and Best Regards</p>
                    <p className="fw-bold">Al-Hijaz Tours</p>
                  </div>
                  <p className="text-center mt-1">
                    <b>Note:</b> This is a computer generated receipt and does not require any physical signature.
                  </p>
                </div>

                {/* Footer Bar */}
                <div className={styles.invFooterBar}>
                  <div className={styles.invFooterLeft}>
                    <span className={styles.invFooterItem}>
                      <FaPhone size={13} className={styles.invFooterIcon} />
                      01217772522
                    </span>
                    <span className={styles.invFooterItem}>
                      <FaEnvelope size={13} className={styles.invFooterIcon} />
                      info@alhijaztours.net
                    </span>
                  </div>
                  <div className={styles.invFooterRight}>
                    <span className={styles.invFooterCompany}>Al-Hijaz Tours</span>
                    <span className={styles.invFooterItem}>
                      www.alhijaztours.net
                      <FaGlobe size={13} className={styles.invFooterIcon} />
                    </span>
                  </div>
                </div>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
