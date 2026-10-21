'use client'
import React from 'react'
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { LuBadgeCheck, LuShield } from 'react-icons/lu';
import { CiHeart } from 'react-icons/ci';
import { MdOutlinePercent } from 'react-icons/md';
import { BiCalendar } from 'react-icons/bi';
import { IoInformation, IoCheckmarkCircle, IoCloseCircle, IoTimeOutline } from 'react-icons/io5';
import { Modal } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import moment from 'moment';
import styles from './Summery.module.css';

const PAX_LABELS = {
  ADULT: 'Adult',
  CHILD: 'Child',
  SENIOR: 'Senior',
  INFANT: 'Infant',
}

function formatAgeRange(ageFrom, ageTo) {
  if (ageFrom == null && ageTo == null) return ''
  const to = ageTo != null && ageTo >= 999 ? '99+' : ageTo
  if (ageFrom != null && to != null) return `(age ${ageFrom}–${to})`
  if (ageFrom != null) return `(age ${ageFrom}+)`
  return ''
}

function getPolicyDeadline(policy) {
  return policy?.from || policy?.dateFrom || null
}

function formatDeadlineDate(policy) {
  const deadlineRaw = getPolicyDeadline(policy)
  if (!deadlineRaw) return null
  const d = moment(deadlineRaw)
  return d.isValid() ? d.format('D MMM YYYY') : null
}

function getPolicyHours(policy, travelDate, sessionCode) {
  const raw =
    policy?.time_duration ??
    policy?.timeDuration ??
    policy?.hoursBefore ??
    policy?.hours
  const hours = Number(raw)
  if (Number.isFinite(hours) && hours >= 0) return hours

  const deadlineRaw = getPolicyDeadline(policy)
  if (!deadlineRaw || !travelDate) return null

  const deadline = moment(deadlineRaw)
  if (!deadline.isValid()) return null

  let activityStart = moment(travelDate)
  if (!activityStart.isValid()) return null

  if (sessionCode) {
    const session = moment(sessionCode, ['HH:mm', 'H:mm', 'hh:mm A'], true)
    if (session.isValid()) {
      activityStart = activityStart
        .hour(session.hour())
        .minute(session.minute())
        .second(0)
    }
  }

  return Math.max(0, activityStart.diff(deadline, 'hours'))
}

function formatPolicyTimeText(policy, travelDate, sessionCode) {
  // Prefer clear date when API sends `from`
  const deadlineLabel = formatDeadlineDate(policy)
  if (deadlineLabel && (policy?.from || policy?.dateFrom) && policy?.time_duration == null) {
    return `From ${deadlineLabel}`
  }

  const hours = getPolicyHours(policy, travelDate, sessionCode)
  if (hours != null) {
    if (hours >= 24) {
      const days = hours / 24
      const wholeDays = Number.isInteger(days) ? days : Math.round(days * 10) / 10
      return `${wholeDays} day${wholeDays > 1 ? 's' : ''} before activity`
    }
    return `${hours} hour${hours !== 1 ? 's' : ''} before activity`
  }

  if (deadlineLabel) return `From ${deadlineLabel}`
  return 'Before activity'
}

function getPolicyCharge(policy) {
  if (policy?.type === 'percentage') {
    const value = Number(policy.value)
    const refundPercentage = 100 - value
    return {
      kind: 'percentage',
      value,
      refundText: `${value}% Charge`,
      refundDescription: `${value}% cancellation charge applies. You will receive ${refundPercentage}% of the total booking amount back.`,
      refundAmount: null,
      isFree: value === 0,
      isFullCharge: value === 100,
    }
  }

  if (policy?.type === 'fixed') {
    return {
      kind: 'fixed',
      value: policy.value,
      refundText: 'Cancellation Fee',
      refundDescription: 'A fixed cancellation fee will be charged.',
      refundAmount: policy.value,
      isFree: Number(policy.value) === 0,
      isFullCharge: false,
    }
  }

  // API style: { from, amount, original_amount }
  if (policy?.amount != null || getPolicyDeadline(policy)) {
    const amount = Number(policy.amount ?? policy.original_amount ?? 0)
    const deadlineLabel = formatDeadlineDate(policy)
    if (!Number.isFinite(amount) || amount === 0) {
      return {
        kind: 'percentage',
        value: 0,
        refundText: 'Free',
        refundDescription: deadlineLabel
          ? `Cancel free until ${deadlineLabel} and get a full refund.`
          : 'Cancel free until this date and get a full refund.',
        refundAmount: null,
        isFree: true,
        isFullCharge: false,
      }
    }
    return {
      kind: 'fixed',
      value: amount,
      refundText: 'Fee applies',
      refundDescription: deadlineLabel
        ? `If you cancel on or after ${deadlineLabel}, this fee will be charged.`
        : 'If you cancel on or after this date, this fee will be charged.',
      refundAmount: amount,
      isFree: false,
      isFullCharge: false,
    }
  }

  return {
    kind: null,
    value: null,
    refundText: '',
    refundDescription: '',
    refundAmount: null,
    isFree: false,
    isFullCharge: false,
  }
}

function parsePolicyObject(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

function resolveCancellationPolicies(activityDetail) {
  const activityPolicy =
    parsePolicyObject(activityDetail?.cancellation_policy) ||
    (typeof activityDetail?.cancellation_policy === 'object'
      ? activityDetail.cancellation_policy
      : null) ||
    parsePolicyObject(activityDetail?.cancellation_policy_text)

  const activityList = Array.isArray(activityPolicy?.cancellation_policies)
    ? activityPolicy.cancellation_policies
    : []
  const modalityList = Array.isArray(activityDetail?.modality?.cancellation_policies)
    ? activityDetail.modality.cancellation_policies
    : []

  const hasUsableActivityPolicy = activityList.some(
    (p) =>
      p?.time_duration != null ||
      p?.timeDuration != null ||
      p?.hoursBefore != null ||
      p?.hours != null ||
      p?.from != null ||
      p?.dateFrom != null ||
      p?.type != null ||
      p?.amount != null
  )

  return {
    cancel_policy: activityPolicy?.cancel_policy || (modalityList.length ? 'refundable' : null),
    cancellation_policies: hasUsableActivityPolicy ? activityList : modalityList,
  }
}

function getPolicySummaryText(cancellationPolicy, policies = [], currency) {
  if (!cancellationPolicy && !policies.length) {
    return 'Cancellation terms apply to this booking.'
  }
  const { cancel_policy } = cancellationPolicy || {}
  if (cancel_policy === 'non-refundable') {
    return 'This booking cannot be cancelled. No refund will be given.'
  }
  if (cancel_policy === 'refundable' || policies.length > 0) {
    const firstWithFrom = policies.find((p) => getPolicyDeadline(p))
    if (firstWithFrom) {
      const dateLabel = formatDeadlineDate(firstWithFrom)
      const amount = Number(firstWithFrom.amount ?? firstWithFrom.original_amount ?? 0)
      if (dateLabel && amount > 0) {
        return `Free cancel before ${dateLabel}. After that, a fee of ${currency || ''} ${amount} applies.`
          .replace(/\s+/g, ' ')
          .trim()
      }
      if (dateLabel) {
        return `Free cancellation until ${dateLabel}.`
      }
    }

    const hasFree = policies.some((p) => {
      if (p?.type === 'percentage' && Number(p.value) === 0) return true
      if (p?.amount != null && Number(p.amount) === 0) return true
      return false
    })
    if (hasFree) return 'Free cancellation is available for this booking.'

    return 'This booking is refundable. Cancellation fees may apply.'
  }
  return 'Please check the full cancellation details before booking.'
}

export default function Summery({ activityDetail }) {
  const [opened, { open, close }] = useDisclosure(false)
  const totalPeople = Number(activityDetail?.adults || 0) + Number(activityDetail?.children || 0);
  const modality = activityDetail?.modality
  const selectedPax = Array.isArray(modality?.selected_pax) ? modality.selected_pax : []
  const resolvedPolicy = resolveCancellationPolicies(activityDetail)
  const hasCancellationInfo =
    !!resolvedPolicy.cancel_policy ||
    (Array.isArray(resolvedPolicy.cancellation_policies) && resolvedPolicy.cancellation_policies.length > 0) ||
    !!activityDetail?.cancellation_policy ||
    (Array.isArray(modality?.cancellation_policies) && modality.cancellation_policies.length > 0)

  const renderCancellationPolicy = () => {
    const { cancel_policy, cancellation_policies } = resolvedPolicy;

    if (!cancel_policy && (!cancellation_policies || cancellation_policies.length === 0)) {
      return (
        <div className={styles.trustItemDesc} style={{ textAlign: 'center', padding: '0.75rem 0' }}>
          No cancellation policy available.
        </div>
      );
    }

    if (cancel_policy === 'non-refundable') {
      return (
        <div className={`${styles.policyAlert} ${styles.policyAlertDanger}`}>
          <IoCloseCircle size={22} className="mt-1 flex-shrink-0" />
          <div>
            <h6>Non-Refundable</h6>
            <p>This booking cannot be cancelled or refunded under any circumstances.</p>
          </div>
        </div>
      );
    }

    if (cancellation_policies && cancellation_policies.length > 0) {
      const travelDate = activityDetail?.travel_date
      const sessionCode = modality?.session?.code || modality?.session
      const isFromAmountStyle = cancellation_policies.every(
        (p) => (p?.from || p?.dateFrom) && p?.time_duration == null && p?.type == null
      )

      // Clear 2-step message for API style: { from, amount }
      if (isFromAmountStyle) {
        const policy = cancellation_policies[0]
        const dateLabel = formatDeadlineDate(policy)
        const amount = Number(policy.amount ?? policy.original_amount ?? 0)

        return (
          <div>
            <div className={`${styles.policyAlert} ${styles.policyAlertSuccess}`}>
              <IoCheckmarkCircle size={22} className="mt-1 flex-shrink-0" />
              <div>
                <h6>You can cancel this booking</h6>
                <p>
                  {dateLabel
                    ? `Cancel free before ${dateLabel} and get a full refund.`
                    : 'Free cancellation is available until the deadline below.'}
                </p>
              </div>
            </div>

            <div className={styles.sectionLabel} style={{ marginTop: '1rem' }}>What happens if you cancel</div>

            <div className={`${styles.policyItem} ${styles.policyItemPrimary}`}>
              <div className="d-flex align-items-start gap-2">
                <IoCheckmarkCircle size={18} className="mt-1 flex-shrink-0" style={{ color: '#22c55e' }} />
                <div>
                  <h6 className="mb-1 small fw-bold" style={{ color: '#16a34a' }}>
                    {dateLabel ? `Before ${dateLabel}` : 'Before the deadline'}
                  </h6>
                  <p className="mb-0 small text-muted">
                    Full refund. No cancellation fee.
                  </p>
                </div>
              </div>
            </div>

            <div className={`${styles.policyItem} ${styles.policyItemSecondary}`}>
              <div className="d-flex align-items-start gap-2">
                <IoTimeOutline size={18} className="mt-1 flex-shrink-0" style={{ color: '#dc2626' }} />
                <div>
                  <h6 className="mb-1 small fw-bold" style={{ color: '#dc2626' }}>
                    {dateLabel ? `On or after ${dateLabel}` : 'After the deadline'}
                  </h6>
                  <p className="mb-1 small text-muted">
                    Cancellation fee will be charged.
                  </p>
                  {amount > 0 && (
                    <strong className="text-danger small">
                      Fee: <PriceDisplay price={amount} currency={activityDetail?.currency} />
                    </strong>
                  )}
                </div>
              </div>
            </div>

            <div className={`${styles.policyAlert} ${styles.policyAlertWarn}`}>
              <IoInformation size={18} className="mt-1 flex-shrink-0" />
              <p className="small mb-0">
                <strong>Tip:</strong> Cancel before the date above to get your money back.
              </p>
            </div>
          </div>
        )
      }

      const sortedPolicies = [...cancellation_policies].sort((a, b) => {
        const hoursA = getPolicyHours(a, travelDate, sessionCode) ?? 0
        const hoursB = getPolicyHours(b, travelDate, sessionCode) ?? 0
        return hoursB - hoursA
      });

      return (
        <div>
          <div className={`${styles.policyAlert} ${styles.policyAlertSuccess}`}>
            <IoCheckmarkCircle size={22} className="mt-1 flex-shrink-0" />
            <div>
              <h6>You can cancel this booking</h6>
              <p>See the rules below before you cancel.</p>
            </div>
          </div>

          <div className={styles.sectionLabel} style={{ marginTop: '1rem' }}>Cancellation rules</div>

          {sortedPolicies.map((policy, index) => {
            const timeText = formatPolicyTimeText(policy, travelDate, sessionCode);
            const charge = getPolicyCharge(policy);

            return (
              <div
                key={index}
                className={`${styles.policyItem} ${index === 0 ? styles.policyItemPrimary : styles.policyItemSecondary}`}
              >
                <div className="d-flex align-items-start gap-2">
                  <IoTimeOutline
                    size={18}
                    className="mt-1 flex-shrink-0"
                    style={{ color: index === 0 ? '#22c55e' : '#6b7280' }}
                  />
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-center mb-1 flex-wrap gap-1">
                      <h6 className="mb-0 small fw-bold" style={{ color: index === 0 ? '#16a34a' : '#374151' }}>
                        {timeText}
                      </h6>
                      {charge.refundText && (
                        <span
                          className="badge"
                          style={{
                            backgroundColor: charge.isFree ? '#dcfce7' : '#fee2e2',
                            color: charge.isFree ? '#16a34a' : '#dc2626',
                            fontSize: '0.72rem',
                          }}
                        >
                          {charge.refundText}
                        </span>
                      )}
                    </div>

                    {charge.refundDescription && (
                      <p className="mb-1 small text-muted">{charge.refundDescription}</p>
                    )}

                    {charge.kind === 'fixed' && charge.refundAmount != null && (
                      <div className="mt-1">
                        <strong className="text-danger small">
                          Fee:{' '}
                          <PriceDisplay price={charge.refundAmount} currency={activityDetail?.currency} />
                        </strong>
                      </div>
                    )}

                    {charge.isFree && (
                      <div className="mt-1 small text-success">
                        <strong>✓ Full refund — no fee</strong>
                      </div>
                    )}
                    {charge.isFullCharge && (
                      <div className="mt-1 small text-danger">
                        <strong>⚠ No refund</strong>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          <div className={`${styles.policyAlert} ${styles.policyAlertWarn}`}>
            <IoInformation size={18} className="mt-1 flex-shrink-0" />
            <p className="small mb-0">
              <strong>Tip:</strong> Cancel before the deadline to avoid fees.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className={`${styles.policyAlert} ${styles.policyAlertSuccess}`}>
        <IoCheckmarkCircle size={22} className="mt-1 flex-shrink-0" />
        <div>
          <h6>Free Cancellation</h6>
          <p>This booking can be cancelled free of charge.</p>
        </div>
      </div>
    );
  };

  const sessionLabel = (() => {
    const raw = modality?.session
    if (!raw) return null
    const parsed = moment(raw, ['HH:mm', 'H:mm', 'hh:mm A'], true)
    return parsed.isValid() ? parsed.format('h:mm A') : String(raw)
  })()

  return (
    <div className={styles.sidebar}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h5 className={styles.cardHeaderTitle}>Booking Summary</h5>
          <p className={styles.cardHeaderSub}>Review your selected activity and pricing</p>
        </div>
        <div className={styles.cardBody}>
          {modality?.name && (
            <div className={styles.modalityBox}>
              <div className={styles.modalityLabel}>Your selection</div>
              <div className={styles.modalityName}>{modality.name}</div>
              <div className={styles.modalityMeta}>
                {activityDetail?.travel_date && (
                  <span className={styles.modalityChip}>
                    {moment(activityDetail.travel_date).format('DD MMM YYYY')}
                  </span>
                )}
                {sessionLabel && <span className={styles.modalityChip}>{sessionLabel}</span>}
                {modality?.language?.description || modality?.language?.code ? (
                  <span className={styles.modalityChip}>
                    {modality.language?.description || modality.language?.code}
                  </span>
                ) : null}
              </div>
            </div>
          )}

          <div className={styles.sectionLabel}>Traveler Details</div>

          {selectedPax.length > 0 ? (
            selectedPax.map((pax, index) => {
              const qty = Number(pax.quantity || 0)
              const amount = Number(pax.amount || 0)
              if (qty <= 0) return null
              return (
                <div key={index} className={styles.line}>
                  <span className={styles.lineLabel}>
                    {qty} {PAX_LABELS[pax.paxType] || pax.paxType}{' '}
                    {formatAgeRange(pax.ageFrom, pax.ageTo)} ×{' '}
                    <PriceDisplay price={amount} currency={activityDetail.currency} />
                  </span>
                  <span className={styles.lineValue}>
                    <PriceDisplay price={amount * qty} currency={activityDetail.currency} />
                  </span>
                </div>
              )
            })
          ) : (
            <>
              {activityDetail?.adults > 0 && (
                <div className={styles.line}>
                  <span className={styles.lineLabel}>
                    {activityDetail.adults} Adult{activityDetail.adults > 1 ? 's' : ''} ×{' '}
                    <PriceDisplay price={Number(activityDetail.price_per_adult)} currency={activityDetail.currency} />
                  </span>
                  <span className={styles.lineValue}>
                    <PriceDisplay price={Number(activityDetail.price_per_adult) * Number(activityDetail.adults)} currency={activityDetail.currency} />
                  </span>
                </div>
              )}

              {activityDetail?.children > 0 && (
                <div className={styles.line}>
                  <span className={styles.lineLabel}>
                    {activityDetail.children} Child{activityDetail.children > 1 ? 'ren' : ''} ×{' '}
                    <PriceDisplay price={Number(activityDetail.price_per_child)} currency={activityDetail.currency} />
                  </span>
                  <span className={styles.lineValue}>
                    <PriceDisplay price={Number(activityDetail.price_per_child) * Number(activityDetail.children)} currency={activityDetail.currency} />
                  </span>
                </div>
              )}
            </>
          )}

          {activityDetail?.selected_services && activityDetail.selected_services.length > 0 && (
            <>
              <hr className={styles.divider} />
              <div className={styles.sectionLabel}>Additional Services</div>
              {activityDetail.selected_services.map((service, index) => {
                const serviceTotal = service.type === 'per_person'
                  ? service.quantity * Number(service.price)
                  : Number(service.total);
                return (
                  <div key={index} className={styles.line}>
                    <span className={styles.lineLabel}>
                      {service.name}
                      {service.type === 'per_person' && ` (${service.quantity} × ${totalPeople} people)`}
                    </span>
                    <span className={styles.lineValue}>
                      <PriceDisplay price={serviceTotal} currency={activityDetail.currency} />
                    </span>
                  </div>
                );
              })}
            </>
          )}

          <hr className={styles.divider} />

          {activityDetail?.selected_services && activityDetail.selected_services.length > 0 && (
            <div className={styles.line}>
              <span className={styles.lineLabel}>Services Total</span>
              <span className={styles.lineValue}>
                <PriceDisplay price={activityDetail.services_total} currency={activityDetail.currency} />
              </span>
            </div>
          )}

          <div className={styles.line}>
            <span className={styles.lineLabel}>Sub Total</span>
            <span className={styles.lineValue}>
              <PriceDisplay price={activityDetail.grand_total} currency={activityDetail.currency} />
            </span>
          </div>

          <div className={styles.totalWrap}>
            <div className={styles.totalRow}>
              <span className={styles.totalLabel}>Total</span>
              <span className={styles.totalValue}>
                <PriceDisplay price={activityDetail.grand_total} currency={activityDetail.currency} />
              </span>
            </div>
          </div>
          <div className={styles.taxNote}>Inclusive of VAT and taxes</div>
        </div>
      </div>

      {hasCancellationInfo && (
        <>
          <div className={styles.card}>
            <div className={styles.cancelHeader}>
              <h5 className={styles.cancelHeaderTitle}>Cancellation Policy</h5>
            </div>
            <div className={styles.cancelBody}>
              <div className={styles.cancelPreview}>
                <BiCalendar size={18} className={styles.cancelIcon} />
                <div>
                  <p className={styles.cancelText}>
                    {getPolicySummaryText(
                      resolvedPolicy,
                      resolvedPolicy.cancellation_policies,
                      activityDetail?.currency
                    )}
                  </p>
                  <button type="button" className={styles.cancelLink} onClick={open}>
                    View Policy
                  </button>
                </div>
              </div>
            </div>
          </div>

          <Modal
            opened={opened}
            onClose={close}
            title={<strong>Cancellation Policy</strong>}
            size="lg"
            centered
          >
            {renderCancellationPolicy()}
          </Modal>
        </>
      )}

      <div className={styles.card}>
        <div className={styles.trustHeader}>
          <h5 className={styles.trustHeaderTitle}>Why Book With Us</h5>
        </div>
        <div className={styles.trustBody}>
          <div className={styles.trustItem}>
            <div className={styles.trustIcon}><LuShield size={18} /></div>
            <div>
              <div className={styles.trustItemTitle}>Best Price Guarantee</div>
              <div className={styles.trustItemDesc}>Find it cheaper, we&apos;ll match it</div>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIcon}><LuBadgeCheck size={18} /></div>
            <div>
              <div className={styles.trustItemTitle}>Verified Operator</div>
              <div className={styles.trustItemDesc}>Licensed &amp; insured experiences</div>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIcon}><CiHeart size={20} /></div>
            <div>
              <div className={styles.trustItemTitle}>24/7 Support</div>
              <div className={styles.trustItemDesc}>We&apos;re here before, during &amp; after</div>
            </div>
          </div>

          <div className={styles.trustItem}>
            <div className={styles.trustIcon}><MdOutlinePercent size={18} /></div>
            <div>
              <div className={styles.trustItemTitle}>No Hidden Fees</div>
              <div className={styles.trustItemDesc}>Price you see is the price you pay</div>
            </div>
          </div>
        </div>

        <div className={styles.trustHelp}>
          <div className={styles.trustHelpIcon}><IoInformation size={20} /></div>
          <div className={styles.trustItemTitle}>Need Help?</div>
          <div className={styles.trustItemDesc} style={{ marginTop: '0.25rem' }}>
            Our travel experts are available 24/7
          </div>
          <a href="tel:00000000000" className={styles.supportBtn}>
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
