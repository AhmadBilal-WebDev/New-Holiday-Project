"use client";
import React, { useState } from "react";
import { Modal } from "@mantine/core";
import { RiDeleteBin6Line } from "react-icons/ri";
import { FaExclamationTriangle } from "react-icons/fa";
import moment from "moment";
export default function CancelBookingModal({
    opened,
    onClose,
    bookingReference,
    provider,
    bookingId,
    type,
    endPoint,
    onSuccess,
    email,
    otp,
    packageId,
    hotelCancellationPolicies = [],
    transferCancellationPolicies = [],
    displayCurrency = "",
    supplierCurrency = "",
    supplierToDisplayRate = 1,
}) {
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [confirmed, setConfirmed] = useState(false);
    const isDashboardOtpCancel =
        type === "umrah-getaway" || type === "holiday-package";
    const isHotelCancel = type === "hotel";
    const isTransferCancel = type === "transfer";

    const convertSupplierToDisplay = (amount) => {
        const numericAmount = Number(amount || 0);
        if (!Number.isFinite(numericAmount)) return "0.00";
        const rate = Number(supplierToDisplayRate || 1);
        const shouldConvert =
            displayCurrency &&
            supplierCurrency &&
            displayCurrency !== supplierCurrency &&
            Number.isFinite(rate) &&
            rate > 0;
        return (shouldConvert ? numericAmount * rate : numericAmount).toFixed(2);
    };

    // Keep supplier timezone from API string (no local timezone shift)
    const formatPolicyDate = (dateValue) => {
        if (!dateValue) return "";
        return moment.parseZone(dateValue).format("DD MMM YYYY, hh:mm A");
    };

    const flattenHotelRoomPolicies = () => {
        if (!Array.isArray(hotelCancellationPolicies)) return [];
        const rows = [];

        hotelCancellationPolicies.forEach((room, roomIndex) => {
            const roomName =
                room?.room_name ||
                room?.name ||
                room?.roomType ||
                room?.type ||
                `Room ${roomIndex + 1}`;
            const policies = Array.isArray(room?.policies)
                ? room.policies
                : Array.isArray(room?.cancellationPolicies)
                  ? room.cancellationPolicies
                  : Array.isArray(room?.cancellation_policies)
                    ? room.cancellation_policies
                    : [];

            if (!policies.length) return;

            rows.push({
                roomName,
                policies: policies
                    .map((policy) => ({
                        from: policy?.from || policy?.start_date || policy?.effective_from || null,
                        to: policy?.to || policy?.end_date || policy?.effective_to || null,
                        amount: Number(policy?.amount || policy?.penalty_amount || 0),
                        currency: policy?.currency || supplierCurrency || "",
                    }))
                    .filter((policy) => Number.isFinite(policy.amount))
                    .sort((a, b) => {
                        const aMoment = a.from ? moment(a.from) : moment(0);
                        const bMoment = b.from ? moment(b.from) : moment(0);
                        return aMoment.valueOf() - bMoment.valueOf();
                    }),
            });
        });

        return rows;
    };

    const getCurrentPolicy = (policies) => {
        if (!policies?.length) return null;
        const now = moment();

        const exactMatch = policies.find((policy) => {
            const fromMoment = policy?.from ? moment(policy.from) : null;
            const toMoment = policy?.to ? moment(policy.to) : null;
            const afterStart = !fromMoment || now.isSameOrAfter(fromMoment);
            const beforeEnd = !toMoment || now.isBefore(toMoment);
            return afterStart && beforeEnd;
        });
        if (exactMatch) return { ...exactMatch, isUpcoming: false };

        const startedPolicies = policies.filter(
            (policy) => policy?.from && now.isSameOrAfter(moment(policy.from)),
        );
        if (startedPolicies.length) {
            const latestStarted = startedPolicies.reduce((latest, policy) =>
                moment(policy.from).isAfter(moment(latest.from)) ? policy : latest,
            );
            return { ...latestStarted, isUpcoming: false };
        }

        const upcomingPolicies = policies.filter(
            (policy) => policy?.from && now.isBefore(moment(policy.from)),
        );
        if (upcomingPolicies.length) {
            return { ...upcomingPolicies[0], isUpcoming: true };
        }

        return { ...policies[0], isUpcoming: false };
    };

    const hotelPoliciesToShow = flattenHotelRoomPolicies()
        .map((room) => {
            const currentPolicy = getCurrentPolicy(room.policies);
            if (!currentPolicy) return null;
            return {
                roomName: room.roomName,
                policy: currentPolicy,
            };
        })
        .filter(Boolean);

    const transferPoliciesToShow = (() => {
        const isPolicyRow = (item) =>
            item &&
            typeof item === "object" &&
            ("amount" in item || "penalty_amount" in item) &&
            ("from" in item || "start_date" in item);

        const normalizedGroups = Array.isArray(transferCancellationPolicies)
            ? transferCancellationPolicies
            : transferCancellationPolicies &&
                typeof transferCancellationPolicies === "object"
              ? [transferCancellationPolicies]
              : [];
        if (!normalizedGroups.length) return [];

        // If API gives direct policies array, use it as a single group.
        const groupsToParse = normalizedGroups.every(isPolicyRow)
            ? [{ policies: normalizedGroups }]
            : normalizedGroups;

        const flattened = groupsToParse.flatMap((group, groupIndex) => {
            const policies = Array.isArray(group?.policies)
                ? group.policies
                : Array.isArray(group)
                  ? group
                  : [];
            return policies
                .map((policy, policyIndex) => ({
                    key: `${groupIndex}-${policyIndex}`,
                    from: policy?.from || policy?.start_date || null,
                    amount: Number(policy?.amount || policy?.penalty_amount || 0),
                    currency: policy?.currency || supplierCurrency || "",
                }))
                .filter((policy) => Number.isFinite(policy.amount));
        });

        return flattened.sort((a, b) => {
            const aMoment = a.from ? moment(a.from) : moment(0);
            const bMoment = b.from ? moment(b.from) : moment(0);
            return aMoment.valueOf() - bMoment.valueOf();
        });
    })();

    const currentTransferPolicy = getCurrentPolicy(transferPoliciesToShow);

    const handleClose = () => {
        setReason("");
        setError("");
        setLoading(false);
        setConfirmed(false);
        onClose();
    };
    const handleSubmit = async () => {
        if (!isDashboardOtpCancel && !reason.trim()) {
            setError("Please enter a reason for cancellation.");
            return;
        }
        setError("");
        setLoading(true);
        try {
            const body = isDashboardOtpCancel
                ? {
                    email,
                    otp,
                    booking_reference: bookingReference,
                    ...(packageId ? { package_id: packageId } : {}),
                }
                : {
                    provider,
                    cancellation_reason: reason.trim(),
                    ...(type === "hotel"
                        ? { bookingReference: bookingReference, bookingId }
                        : type === "activity" || type === "package"
                          ? {
                              booking_reference: bookingReference,
                              booking_id: bookingId,
                            }
                          : { booking_reference: bookingReference }),
                };

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}${endPoint}`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify(body),
                },
            );
          
            const data = await response.json();
            if (response.ok && (data?.success !== false)) {
                setConfirmed(true);
                if (onSuccess) onSuccess(bookingReference, bookingId);
            } else {
                setError(data?.message);
            }
        } catch {
            setError("An error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={handleClose}
            title={
                <div className="cbm-modal-title">
                    <RiDeleteBin6Line size={18} color="#dc2626" />
                    <span>Cancel Booking</span>
                </div>
            }
            centered
            overlayProps={{ backgroundOpacity: 0.45, blur: 3 }}
            size="md"
        >
            {confirmed ? (
                <div className="cbm-success">
                    <div className="cbm-success-icon">✓</div>
                    <h6 className="cbm-success-title">Booking Cancelled</h6>
                    <p className="cbm-success-msg">
                        Booking <strong>{bookingReference}</strong> has been successfully
                        cancelled.
                    </p>
                    <button className="cbm-btn-primary" onClick={handleClose}>
                        Close
                    </button>
                </div>
            ) : (
                <>
                    {/* Warning banner */}
                    <div className="cbm-warning-banner">
                        <FaExclamationTriangle size={15} color="#92400e" />
                        <span>
                            This action cannot be undone. The booking{" "}
                            <strong>{bookingReference}</strong> will be permanently cancelled.
                        </span>
                    </div>

                    {isHotelCancel && (
                        <div className="cbm-policy-box">
                            <div className="cbm-policy-title">Cancellation Policy (Hotel)</div>
                            {hotelPoliciesToShow.length > 0 ? (
                                <div className="cbm-policy-list">
                                    {hotelPoliciesToShow.map((roomPolicy, index) => (
                                        <div className="cbm-policy-item" key={`${roomPolicy.roomName}-${index}`}>
                                            <div className="cbm-policy-room">{roomPolicy.roomName}</div>
                                            <div className="cbm-policy-text">
                                                {roomPolicy.policy?.isUpcoming
                                                    ? `No active fee yet. From ${formatPolicyDate(roomPolicy.policy.from)} fee will be ${displayCurrency || roomPolicy.policy.currency} ${convertSupplierToDisplay(roomPolicy.policy.amount)}.`
                                                    : `Applicable fee: ${displayCurrency || roomPolicy.policy.currency} ${convertSupplierToDisplay(roomPolicy.policy.amount)}${roomPolicy.policy?.from ? ` (effective from ${formatPolicyDate(roomPolicy.policy.from)})` : ""}.`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="cbm-policy-empty">
                                    No hotel cancellation policy found for this booking.
                                </div>
                            )}
                        </div>
                    )}

                    {isTransferCancel && (
                        <div className="cbm-policy-box">
                            <div className="cbm-policy-title">Cancellation Policy (Transfer)</div>
                            {currentTransferPolicy ? (
                                <div className="cbm-policy-list">
                                    <div className="cbm-policy-item">
                                        <div className="cbm-policy-text">
                                            {currentTransferPolicy?.isUpcoming
                                                ? `No active fee yet. From ${formatPolicyDate(currentTransferPolicy.from)} fee will be ${displayCurrency || currentTransferPolicy.currency} ${convertSupplierToDisplay(currentTransferPolicy.amount)}.`
                                                : `Applicable fee: ${displayCurrency || currentTransferPolicy.currency} ${convertSupplierToDisplay(currentTransferPolicy.amount)}${currentTransferPolicy?.from ? ` (effective from ${formatPolicyDate(currentTransferPolicy.from)})` : ""}.`}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="cbm-policy-empty">
                                    No transfer cancellation policy found for this booking.
                                </div>
                            )}
                        </div>
                    )}

                    {/* Reason textarea */}
                    {!isDashboardOtpCancel && (
                        <div className="cbm-field">
                            <label className="cbm-label">
                                Cancellation Reason <span className="cbm-required">*</span>
                            </label>
                            <textarea
                                className="cbm-textarea"
                                rows={4}
                                placeholder="Please describe your reason for cancellation..."
                                value={reason}
                                onChange={(e) => {
                                    setReason(e.target.value);
                                    if (error) setError("");
                                }}
                                disabled={loading}
                            />
                            {error && <p className="cbm-error">{error}</p>}
                        </div>
                    )}
                    {isDashboardOtpCancel && error && (
                        <p className="cbm-error" style={{ marginTop: 12 }}>
                            {error}
                        </p>
                    )}

                    {/* Actions */}
                    <div className="cbm-actions">
                        <button
                            className="cbm-btn-secondary"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Keep Booking
                        </button>
                        <button
                            className="cbm-btn-danger"
                            onClick={handleSubmit}
                            disabled={loading || (!isDashboardOtpCancel && !reason.trim())}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" />
                                    Cancelling…
                                </>
                            ) : (
                                <>
                                    <RiDeleteBin6Line size={14} />
                                    Confirm Cancellation
                                </>
                            )}
                        </button>
                    </div>
                </>
            )}
        </Modal>
    );
}
