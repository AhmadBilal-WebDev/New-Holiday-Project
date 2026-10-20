'use client'
import styles from "../../../transfers/voucher/[id]/voucher.module.css";
import moment from "moment";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import HotelInvoiceLoader from "@/components/Loader/HotelInvoiceLoader";
import { FaFileInvoice, FaHome, FaUser, FaUserFriends, FaRegStar, FaStar, FaStarHalfAlt } from "react-icons/fa";
import { FaLocationDot } from "react-icons/fa6";
import { MdOutlineFileDownload } from "react-icons/md";
import { IoWarningOutline } from "react-icons/io5";
import QRCode from "react-qr-code";
import Link from "next/link";

export default function Page() {
  const { id } = useParams();
  const ref = useRef();
  const [voucherDetail, setVoucherDetail] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [voucherUrl, setVoucherUrl] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setVoucherUrl(window.location.href);
    }
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
      <ul className={styles.importantList} style={{ fontSize: '1rem' }}>
        {policies.map((policy, i) => {
          const fromDate = policy.from || policy.dateFrom;
          const amount = policy.amount ?? policy.value ?? policy.original_amount;
          const dateLabel = fromDate ? moment(fromDate).format('D MMM YYYY') : null;

          if (fromDate || amount != null) {
            return (
              <li key={i}>
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
              <li key={i}>
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

  const handlePrint = () => window.print();
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

  return (
    <div className={styles.pageWrapper}>
      {isLoading ? (
        <div className={`container px-0 ${styles.confirmationWrapper}`}>
          <div className="bg-white rounded shadow p-3">
            <HotelInvoiceLoader />
          </div>
        </div>
      ) : (
        <div className={`container px-0 ${styles.confirmationWrapper}`}>
          {errorMessage ? (
            <div className="bg-white shadow text-center p-5 rounded">
              <IoWarningOutline className="text-warning" size={120} />
              <h5 className="mt-4">{errorMessage}</h5>
            </div>
          ) : (
            <div ref={ref} className={styles.voucherCard}>

              {/* Watermark */}
              <div className={styles.watermark}>
                <Image
                  src='/watermark.png'
                  width={450}
                  height={450}
                  style={{ objectFit: 'contain', width: '100%', height: '100%' }}
                  alt="Watermark"
                  quality={100}
                />
              </div>

              {/* Company Header Image */}
              <Image
                src={voucherDetail?.client?.client_images?.header_image}
                height={150}
                width={1000}
                className="w-100 h-auto d-block"
                quality={100}
                alt="Company Header"
              />

              {/* Title + QR Band */}
              <div className={styles.titleBand}>
                <div className={styles.titleLeft}>
                  <h1 className={styles.mainTitle}>Activity Booking<br />Voucher</h1>
                  <p className={styles.mainSubtitle}>Thank you for choosing Alhijaz Tours</p>
                </div>
                <div className={styles.titleRight}>
                  <div className={styles.qrWrapper}>
                    <QRCode
                      value={voucherUrl || ' '}
                      size={78}
                      bgColor="#ffffff"
                      fgColor="#1a1a1a"
                    />
                  </div>
                  <span className={styles.qrLabel}>Scan the QR Code<br />to Verify Booking</span>
                </div>
              </div>

              {/* Gold Divider */}
              <div className={styles.goldDivider} />

              {/* Voucher Details Band */}
              <div className={styles.voucherDetailsBand}>
                <div className={styles.voucherBandInner}>
                  <span className={styles.voucherSectionLabel}>Voucher Details</span>
                  <div className={styles.voucherDetailsRow}>
                    <div className={styles.voucherDetailsLeft}>
                      <p className={styles.voucherNoLabel}>VOUCHER NUMBER:</p>
                      <h2 className={styles.voucherNumber}>{voucherDetail?.booking_reference}</h2>
                      {voucherDetail?.provider_reference && (
                        <p className={styles.bookingDetailSmallLabel} style={{ marginTop: 8, marginBottom: 4 }}>
                          Booking Reference: <strong>{voucherDetail.provider_reference}</strong>
                        </p>
                      )}
                      <span className={styles.confirmedBadge}>
                        Status: {voucherDetail?.booking_status?.toUpperCase()}
                      </span>
                      <br />
                      {voucherDetail?.payment_status && (
                        <span className={`${styles.confirmedBadge} ${styles.paymentBadge} ${styles[`payment_${voucherDetail.payment_status.toLowerCase()}`]}`}>
                          Payment: {voucherDetail?.payment_status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className={styles.voucherDetailsDivider} />
                    <div className={styles.voucherDetailsRight}>
                      <p className={styles.bookingDetailsTitle}>BOOKING DETAILS</p>
                      <p className={styles.bookingDetailLine}>
                        <span className={styles.bookingDetailLabel}>Lead Passenger:</span>
                        <span className={styles.bookingDetailValue}>
                          {voucherDetail?.lead_title} {voucherDetail?.lead_first_name} {voucherDetail?.lead_last_name}
                        </span>
                      </p>

                      <p className={styles.bookingDetailSmallLabel}>Issue Date:</p>
                      <p className={styles.bookingDateValue}>
                        {moment(voucherDetail?.created_at, 'DD-MM-YYYY HH:mm:ss').format('DD-MM-YYYY')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Activity Details */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <div className="d-flex align-items-center gap-2">
                    <span className={styles.sectionIconWrap}><FaLocationDot size={13} /></span>
                    ACTIVITY DETAILS
                  </div>
                </div>
                <div className={styles.hotelInfoGrid}>
                  <div className={styles.hotelInfoLeft}>
                    <h3 className={styles.hotelTitle}>{voucherDetail?.activity?.title}</h3>
                    {modalityName && (
                      <p className={styles.hotelAddressLine}>
                        <strong>Package:</strong>&nbsp;{modalityName}
                      </p>
                    )}
                    {meetingPoint && (
                      <p className={styles.hotelAddressLine}>
                        <FaLocationDot size={11} style={{ marginRight: 5, color: '#c49a2a', flexShrink: 0 }} />
                        {meetingPoint}
                      </p>
                    )}
                    {String(voucherDetail?.activity?.address || '').trim() && (
                      <p className={styles.hotelAddressLine}>
                        <FaLocationDot size={11} style={{ marginRight: 5, color: '#c49a2a', flexShrink: 0 }} />
                        {voucherDetail.activity.address}
                      </p>
                    )}
                    {(voucherDetail?.activity?.activity_duration || durationFromRemarks) && (
                      <p className={styles.hotelAddressLine}>
                        <strong>Duration:</strong>&nbsp;
                        {voucherDetail?.activity?.activity_duration || durationFromRemarks}
                      </p>
                    )}
                    {Number(voucherDetail?.activity?.rating_stars) > 0 && (
                      <div className="d-flex align-items-center gap-1 mt-2">
                        {Array.from({ length: 5 }).map((_, index) => {
                          const rating = Number(voucherDetail?.activity?.rating_stars);
                          const fullStars = Math.floor(rating);
                          const hasHalfStar = rating - fullStars >= 0.5;
                          if (index < fullStars) return <FaStar key={index} style={{ color: '#c49a2a', fontSize: '0.85rem' }} />;
                          if (index === fullStars && hasHalfStar) return <FaStarHalfAlt key={index} style={{ color: '#c49a2a', fontSize: '0.85rem' }} />;
                          return <FaRegStar key={index} style={{ color: '#c49a2a', fontSize: '0.85rem' }} />;
                        })}
                        <span style={{ fontSize: '0.75rem', color: '#888', marginLeft: 4 }}>
                          {Number(voucherDetail.activity.rating_stars).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={styles.hotelInfoRight}>
                    <div className={styles.hotelDateRow}>
                      <span className={styles.hotelDateLabel}>Activity Date:</span>
                      <span className={styles.hotelDateValue}>
                        {voucherDetail?.travel_date ? moment(voucherDetail.travel_date).format('DD-MM-YYYY') : '-'}
                      </span>
                    </div>
                    <div className={styles.hotelDateRow}>
                      <span className={styles.hotelDateLabel}>Day:</span>
                      <span className={styles.hotelDateValue}>
                        {voucherDetail?.travel_date ? moment(voucherDetail.travel_date).format('dddd') : '-'}
                      </span>
                    </div>
                    {startTime && (
                      <div className={styles.hotelDateRow}>
                        <span className={styles.hotelDateLabel}>Start Time:</span>
                        <span className={styles.hotelDateValue}>{startTime}</span>
                      </div>
                    )}
                    {languageLabel && (
                      <div className={styles.hotelDateRow}>
                        <span className={styles.hotelDateLabel}>Language:</span>
                        <span className={styles.hotelDateValue}>{languageLabel}</span>
                      </div>
                    )}
                    <div className={styles.hotelDateRow}>
                      <span className={styles.hotelDateLabel}>Adults:</span>
                      <span className={styles.hotelDateValue}>{voucherDetail?.adults || 0}</span>
                    </div>
                    {getChildrenAgeSummary().map((item, index) => (
                      <div key={index} className={styles.hotelDateRow}>
                        <span className={styles.hotelDateLabel}>{item.label}:</span>
                        <span className={styles.hotelDateValue}>{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Passenger Information */}
              <div className={styles.sectionBlock}>
                <div className={styles.sectionHeader}>
                  <div className="d-flex align-items-center gap-2">
                    <span className={styles.sectionIconWrap}><FaUser size={13} /></span>
                    GUEST INFORMATION
                  </div>
                </div>
                <div className="p-3">
                  <table className={styles.premiumTable}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Gender</th>
                        <th>Country</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className={styles.srCell}>1</td>
                        <td style={{ fontWeight: 600 }}>{voucherDetail?.lead_title} {voucherDetail?.lead_first_name} {voucherDetail?.lead_last_name}</td>
                        <td>{voucherDetail?.lead_email || '-'}</td>
                        <td>
                          {voucherDetail?.lead_phone
                            ? `${voucherDetail?.lead_phone_code || ''} ${voucherDetail.lead_phone}`.trim()
                            : '-'}
                        </td>
                        <td>{capitalize(voucherDetail?.lead_gender) || '-'}</td>
                        <td>{voucherDetail?.lead_country || '-'}</td>
                      </tr>
                      {voucherDetail?.other_passengers?.additional_adults?.map((adult, index) => (
                        <tr key={`adult-${index}`}>
                          <td className={styles.srCell}>{index + 2}</td>
                          <td style={{ fontWeight: 600 }}>{adult.first_name} {adult.last_name}</td>
                          <td>-</td>
                          <td>-</td>
                          <td>{capitalize(adult.gender) || '-'}</td>
                          <td>-</td>
                        </tr>
                      ))}
                      {getNamedChildren().map((child, index) => (
                        <tr key={`child-${index}`}>
                          <td className={styles.srCell}>{(voucherDetail?.other_passengers?.additional_adults?.length || 0) + index + 2}</td>
                          <td style={{ fontWeight: 600 }}>
                            {child.first_name} {child.last_name}{' '}
                            <em style={{ fontSize: '0.75rem', color: '#888' }}>
                              ({formatChildUnderLabel(child.age)})
                            </em>
                          </td>
                          <td>-</td>
                          <td>-</td>
                          <td>{capitalize(child.gender) || '-'}</td>
                          <td>-</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Additional Services */}
              {voucherDetail?.additional_services?.length > 0 && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}><FaUserFriends size={13} /></span>
                      ADDITIONAL SERVICES
                    </div>
                  </div>
                  <div className="p-3">
                    <table className={styles.premiumTable}>
                      <thead>
                        <tr>
                          <th className={styles.srCell}>#</th>
                          <th>Service</th>
                          <th>Quantity</th>
                        </tr>
                      </thead>
                      <tbody>
                        {voucherDetail.additional_services.map((item, index) => (
                          <tr key={index}>
                            <td className={styles.srCell}>{index + 1}</td>
                            <td>{item.name}</td>
                            <td>{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Special Request */}
              {voucherDetail?.special_request && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}><IoWarningOutline size={13} /></span>
                      SPECIAL REQUEST
                    </div>
                  </div>
                  <div className="p-3">
                    <p style={{ margin: 0, lineHeight: '1.6', color: '#333' }}>{voucherDetail.special_request}</p>
                  </div>
                </div>
              )}

              {/* Activity Information from contract remarks */}
              {contractRemarkItems.length > 0 && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}><FaLocationDot size={13} /></span>
                      ACTIVITY INFORMATION
                    </div>
                  </div>
                  <div className="p-3">
                    <div className={styles.hotelInfoRight} style={{ width: '100%' }}>
                      {contractRemarkItems.map((item, index) => (
                        <div key={index} className={styles.hotelDateRow} style={{ alignItems: 'flex-start' }}>
                          <span className={styles.hotelDateLabel} style={{ minWidth: 160 }}>
                            {item.label || 'Note'}:
                          </span>
                          <span className={styles.hotelDateValue} style={{ textAlign: 'left' }}>
                            {item.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* CANCELLATION POLICY SECTION */}
              {cancellationPolicy && (
                <div className={styles.sectionBlock}>
                  <div className={styles.sectionHeader}>
                    <div className="d-flex align-items-center gap-2">
                      <span className={styles.sectionIconWrap}><IoWarningOutline size={13} /></span>
                      CANCELLATION POLICY
                    </div>
                  </div>
                  <div className="p-3">
                    {renderCancellationPolicyContent()}
                  </div>
                </div>
              )}

              {/* Important Information */}
              <div className={styles.importantSection}>
                <p className={styles.importantTitle}>IMPORTANT INFORMATION</p>
                <div className={styles.importantDivider} />
                <ul className={styles.importantList}>
                  <li>Please present this voucher on arrival at the activity location.</li>
                  <li>Arrive at least 15 minutes before the scheduled activity start time.</li>
                  <li>Valid passport or photo ID must be presented at check-in.</li>
                  <li>This voucher is valid only for the specified dates, passenger, and activity.</li>
                  <li>Activity schedules are subject to weather conditions and operator availability.</li>
                  <li>This is a computer-generated confirmation and does not require a physical signature.</li>
                </ul>
              </div>

              {/* Company Footer Image */}
              <Image
                src={voucherDetail?.client?.client_images?.footer_image}
                height={150}
                width={1000}
                className="w-100 h-auto d-block"
                quality={100}
                alt="Company Footer"
              />
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!isLoading && !errorMessage && (
        <div className={`container px-0 ${styles.confirmationWrapper}`}>
          <div className={styles.actionRow}>
            <button className={styles.btnPrimary} onClick={handlePrint}>
              <MdOutlineFileDownload size={17} />
              Print Voucher
            </button>
            <Link href={`/activities/invoice/${voucherDetail?.booking_reference}`} style={{ textDecoration: 'none' }}>
              <button className={styles.btnGold}>
                <FaFileInvoice size={14} />
                View Invoice
              </button>
            </Link>
            <Link href='/' style={{ textDecoration: 'none' }}>
              <button className={styles.btnPrimary} style={{ background: 'linear-gradient(135deg, #444, #666)' }}>
                <FaHome size={14} />
                Go to Home
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
