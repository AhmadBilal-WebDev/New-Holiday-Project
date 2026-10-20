import React, { useEffect, useMemo, useState } from 'react'
import { Inter, Outfit } from 'next/font/google';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { notifications } from '@mantine/notifications';
import { useHotelStore } from '@/components/Store/HotelStore';
import { useRouter } from 'next/navigation';
import moment from 'moment';
import { usePackageMode } from '@/components/Store/PackageModeHelper';
import { useHolidayPackageStore } from '@/components/Store/HolidayPackageStore';
import { useCurrency } from '@/util/currency';
import {
    proceedHolidayHotelRevision,
    useHolidayPackageRevision,
} from '@/components/HolidayPackages/Revision';
import { getRateOccupancy, normalizeChildrenAges } from './getRateOccupancy';
import { FaArrowRight, FaCalendarAlt } from 'react-icons/fa';
import {
    getRateSeqNo,
    getSelectedSeqNo,
    sortSelectedRoomsBySeq,
    stampAndSortRooms,
} from '@/components/Hotels/utils/roomSequence';
import styles from './RoomSummery.module.css';

const outfit = Outfit({
    subsets: ['latin'],
    weight: ['700'],
    display: 'swap',
});

const inter = Inter({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    display: 'swap',
});

const isHotelstonProvider = (detail) =>
    String(detail?.provider || '').toLowerCase() === 'hotelston';

export default function RoomSummery({ selectedRooms, roomList, detail }) {
    const SUMMARY_ROOMS_PER_PAGE = 4;
    const { handleHotelSelection, isPackageMode, isEditMode } = usePackageMode();
    const {
        isReviseMode,
        packageId: revisePackageId,
        bookingReference,
        checkIn: reviseCheckIn,
        checkOut: reviseCheckOut,
        reviseContext,
    } = useHolidayPackageRevision();
    const { packageConfig, selectedData } = useHolidayPackageStore();
    const { rates } = useCurrency();
    const { setAvailabilityData } = useHotelStore();
    const [isLoading, setIsLoading] = useState(false);
    const [totalNights, setTotalNights] = useState(1);
    const [search, setSearch] = useState([]);
    const [visibleSummaryCount, setVisibleSummaryCount] = useState(SUMMARY_ROOMS_PER_PAGE);
    const router = useRouter();
    const isHotelston = isHotelstonProvider(detail);

    const ctaLabel = isReviseMode
        ? 'Proceed to Payment'
        : isPackageMode
            ? 'Proceed to Next Service'
            : 'Proceed to checkout';
    useEffect(() => {
        if (detail?.checkIn && detail?.checkOut) {
            const nights = moment(detail.checkOut).diff(moment(detail.checkIn), 'days');
            setTotalNights(nights);
        }
        const SearchData = localStorage.getItem('searchRoomSelection');
        if (SearchData) {
            setSearch(JSON.parse(SearchData));
        }
    }, []);
    // rate_key can repeat; pair with room_type_id (and hotelston seq_no) to identify the exact rate
    const isSameRate = (selected, rate, room) => {
        if (selected?.ratekey !== rate?.rate_key) return false;
        if (isHotelston) {
            const rateSeq = getRateSeqNo(rate, room);
            const selectedSeq = getSelectedSeqNo(selected);
            if (rateSeq !== null || selectedSeq !== null) {
                return selectedSeq === rateSeq;
            }
        }
        const selectedTypeId = selected?.roomTypeId != null && selected.roomTypeId !== ''
            ? String(selected.roomTypeId)
            : null;
        const rateTypeId = rate?.metadata?.room_type_id != null
            ? String(rate.metadata.room_type_id)
            : null;
        if (selectedTypeId && rateTypeId) {
            return selectedTypeId === rateTypeId;
        }
        return true;
    };

    const findMatchingRate = (room, selected) => {
        if (!room?.rates) return null;
        return room.rates.find((rt) => isSameRate(selected, rt, room)) || null;
    };

    const { totalPrice, currency } = useMemo(() => {
        let total = 0;
        let currencySymbol = '';

        selectedRooms.forEach(selected => {
            const room = roomList.find(r => r.id === selected.roomId);
            if (room) {
                const rate = findMatchingRate(room, selected);
                if (rate) {
                    currencySymbol = rate.currency || currencySymbol;
                    total += (Number(rate.price) * selected.qty);
                }
            }
        });

        return { totalPrice: total.toFixed(2), currency: currencySymbol };
    }, [selectedRooms, roomList, isHotelston]);

    const summaryItems = useMemo(() => {
        const items = roomList.flatMap(item =>
            item?.rates
                ?.filter(rate => selectedRooms.some(room => isSameRate(room, rate, item)))
                .map(rateItem => ({
                    roomId: item.id,
                    roomName: item.name,
                    rateKey: rateItem.rate_key,
                    boardName: rateItem.board_name,
                    adults: rateItem.adults,
                    children: rateItem.children,
                    price: rateItem.price,
                    currency: rateItem.currency,
                    seqNo: getRateSeqNo(rateItem, item),
                    qty: selectedRooms.find(room => isSameRate(room, rateItem, item))?.qty || 1,
                })) || []
        );

        if (!isHotelston) return items;

        return [...items].sort((a, b) => {
            if (a.seqNo !== null && b.seqNo !== null && a.seqNo !== b.seqNo) return a.seqNo - b.seqNo;
            if (a.seqNo !== null && b.seqNo === null) return -1;
            if (a.seqNo === null && b.seqNo !== null) return 1;
            return 0;
        });
    }, [roomList, selectedRooms, isHotelston]);

    useEffect(() => {
        setVisibleSummaryCount(SUMMARY_ROOMS_PER_PAGE);
    }, [selectedRooms]);

    const freeCancellationNote = useMemo(() => {
        let earliest = null;
        selectedRooms.forEach((selected) => {
            const room = roomList.find((r) => r.id === selected.roomId);
            const rate = room ? findMatchingRate(room, selected) : null;
            const policies = rate?.cancellation_policies;
            if (!Array.isArray(policies) || policies.length === 0) return;
            const sorted = [...policies].sort(
                (a, b) => moment.utc(a.from).valueOf() - moment.utc(b.from).valueOf()
            );
            const now = moment.utc();
            const allFuture = sorted.every((policy) => moment.utc(policy.from).isAfter(now));
            if (!allFuture) return;
            const date = moment.utc(sorted[0].from);
            if (!earliest || date.isBefore(earliest)) earliest = date;
        });
        if (!earliest) return null;
        return `Free cancellation before ${earliest.format('D MMMM YYYY')}`;
    }, [selectedRooms, roomList, isHotelston]);

    const PreBooking = async () => {
        if (selectedRooms.length === 0) {
            notifications.show({
                autoClose: 3000,
                title: "Error",
                message: "Please select at least one room to proceed.",
                color: "red",
            })
            return;
        }
        if (detail?.provider === 'custom' || isPackageMode || isEditMode || isReviseMode) {
            if (!CheckCustomHotelRoomSelection()) {
                notifications.show({
                    autoClose: 3000,
                    title: "Incomplete Room Selection",
                    message: "Not enough rooms for all guests. Please adjust your selection.",
                    color: "red",
                })
                return;
            }
        }
        let searchData = {};
        const storedData = localStorage.getItem('HotelSearchData');
        if (storedData) {
            searchData = JSON.parse(storedData);
        }
        // Package/edit/revise mode: prefer hotel stay dates (flexible mode), then shared dates
        const hotelDates = packageConfig?.searchData?.hotel?.dates;
        const checkIn = (isPackageMode || isEditMode || isReviseMode)
            ? (reviseCheckIn || hotelDates?.checkIn || hotelDates?.check_in || packageConfig?.searchData?.dates?.checkIn || detail?.checkIn)
            : (searchData?.check_in || detail?.checkIn);
        const checkOut = (isPackageMode || isEditMode || isReviseMode)
            ? (reviseCheckOut || hotelDates?.checkOut || hotelDates?.check_out || packageConfig?.searchData?.dates?.checkOut || detail?.checkOut)
            : (searchData?.check_out || detail?.checkOut);
        const orderedSelectedRooms = isHotelston
            ? sortSelectedRoomsBySeq(selectedRooms)
            : selectedRooms;
        const request = {
            "provider": detail?.provider,
            "hotelId": String(detail?.hotel_code),
            "clientNationality": "",
            "checkIn": checkIn,
            "checkOut": checkOut,
            "rooms": orderedSelectedRooms.map(item => {
                const room = roomList.find(r => r.id === item.roomId);
                const rate = room ? findMatchingRate(room, item) : null;
                const occupancy = rate ? getRateOccupancy(rate) : {
                    adults: item.adults ?? 2,
                    children: normalizeChildrenAges(item.children),
                };
                return {
                    "rateKey": String(item.ratekey),
                    "quantity": Number(item.qty) || 1,
                    "adults": occupancy.adults,
                    "children": occupancy.children,
                    "roomTypeId": String(item.roomTypeId),
                    "boardTypeId": String(item.boardTypeId),
                };
            })
        }
        setIsLoading(true);
        const clientNationality = localStorage.getItem('clientNationality');
        if (clientNationality) {
            request.clientNationality = clientNationality;
        }
        try {
            const responses = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/check-rates`, {
                method: 'POST',
                cache: 'no-store',
                headers: {
                    'Content-Type': 'application/json',
                    // 'ngrok-skip-browser-warning': 'true',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(request),
            })
            const res = await responses.json();
            if (res.success) {
                if (isReviseMode) {
                    const packageCurrency =
                        reviseContext?.currency
                        || reviseContext?.pricing?.currency
                        || selectedData?.packageInfo?.currency
                        || packageConfig?.searchData?.currency
                        || detail?.currency;

                    const revisionResult = await proceedHolidayHotelRevision({
                        hotelDetail: {
                            ...detail,
                            checkIn,
                            checkOut,
                        },
                        roomList,
                        selectedRooms,
                        checkRatesData: res,
                        packageId: revisePackageId || selectedData?.packageInfo?.package_id,
                        packageCurrency,
                        rates,
                        bookingReference,
                    });

                    if (!revisionResult.success) {
                        setIsLoading(false);
                        if (revisionResult.expired) {
                            notifications.show({
                                title: 'Session expired',
                                message: revisionResult.message,
                                color: 'red',
                                autoClose: 2500,
                            });
                            setTimeout(() => router.push('/'), 2000);
                            return;
                        }
                        notifications.show({
                            title: 'Revision failed',
                            message: revisionResult.message || 'Unable to continue payment.',
                            color: 'red',
                            autoClose: 3500,
                        });
                        return;
                    }

                    router.push(revisionResult.checkoutUrl);
                    return;
                }

                if (isPackageMode || isEditMode) {
                    await handleHotelSelection(detail, selectedRooms, true);
                    // Cart sync failed (no navigation) — stop spinner so user can retry
                    setIsLoading(false);
                } else {
                    res.data.provider = res.provider;
                    res.data.address = detail?.address;
                    res.data.main_images = detail?.main_images;
                    if (isHotelston) {
                        res.data.rooms = stampAndSortRooms(res.data?.rooms, orderedSelectedRooms);
                    }
                    setAvailabilityData(res.data);
                    router.push('/hotels/checkout');
                }
            } else {
                setIsLoading(false);
                notifications.show({
                    title: 'Error',
                    message: res?.message,
                    autoClose: 3500,
                    color: 'red'
                })
            }
        } catch (err) {
            setIsLoading(false);
            console.error("Error fetching hotel details:", err);
            notifications.show({
                title: 'Error',
                message: err?.message || 'Unable to proceed right now.',
                color: 'red',
                autoClose: 3500,
            });
        }

    };
    const CheckCustomHotelRoomSelection = () => {
        const filteredRooms = roomList.filter(item =>
            selectedRooms.some(room => room?.roomId === item.id)
        );
        const totals = filteredRooms.reduce(
            (acc, item) => {
                item.rates.forEach(rate => {
                    const matched = selectedRooms.find(room => isSameRate(room, rate, item));
                    if (matched) {
                        const qty = matched.qty;
                        const adult = rate.adults * qty;
                        const child = rate.children * qty;
                        acc.adults += adult || 0;
                        acc.children += child || 0;
                    }
                });
                return acc;
            },
            { adults: 0, children: 0 }
        );
        if (isPackageMode || isEditMode || isReviseMode) {
            const adultsNeeded = Number(
                packageConfig?.searchData?.totalGuests?.adults
                ?? reviseContext?.adults
                ?? 0
            );
            const childrenNeeded = Number(
                packageConfig?.searchData?.totalGuests?.children
                ?? reviseContext?.children
                ?? 0
            );
            if (totals?.adults >= adultsNeeded && totals?.children >= childrenNeeded) {
                return true;
            } else {
                return false;
            }
        }
        const roomTotal = search.reduce((sum, item) => {
            sum.adults += item.adults || 0;
            sum.children += item.children.length || 0;
            return sum;
        }, { adults: 0, children: 0 });

        if (totals?.adults >= roomTotal?.adults && totals?.children >= roomTotal?.children) {
            return true;
        } else {
            return false;
        }
    };
    const nightsSafe = totalNights > 0 ? totalNights : 1;
    const headerStatus =
        selectedRooms.length === 0
            ? 'No Room Selected'
            : selectedRooms.length === 1
                ? 'Room Selected'
                : `${selectedRooms.length} Rooms Selected`;

    return (
        <>
            <aside className={`${styles.card} ${inter.className}`}>
                <div className={styles.header}>
                    <p className={styles.eyebrow}>Booking Summary</p>
                    <h5 className={`${styles.title} ${outfit.className}`}>{headerStatus}</h5>
                </div>

                <div className={styles.body}>
                    {selectedRooms.length === 0 ? (
                        <div className={styles.emptyBox}>No Room Selected.</div>
                    ) : (
                        <>
                            {summaryItems.slice(0, visibleSummaryCount).map((summaryItem, index) => (
                                <div
                                    key={`${summaryItem.rateKey}-${summaryItem.seqNo ?? index}`}
                                    className={styles.roomBox}
                                >
                                    <p className={styles.boardLabel}>{summaryItem.boardName || 'Room Only'}</p>
                                    <h6 className={styles.roomName}>{summaryItem.roomName}</h6>
                                    <p className={styles.occupancy}>
                                        Adults {summaryItem.adults} · Child {summaryItem.children}
                                    </p>
                                    <div className={styles.priceRow}>
                                        <span className={styles.priceLabel}>Per night</span>
                                        <span className={styles.priceValue}>
                                            <PriceDisplay
                                                price={(summaryItem.price * summaryItem.qty) / nightsSafe}
                                                currency={summaryItem.currency}
                                            />
                                        </span>
                                    </div>
                                    <div className={styles.priceRow}>
                                        <span className={styles.priceLabel}>
                                            Price ({nightsSafe} night{nightsSafe > 1 ? 's' : ''})
                                        </span>
                                        <span className={styles.priceValue}>
                                            {summaryItem.qty} ×{' '}
                                            <PriceDisplay price={summaryItem.price} currency={summaryItem.currency} />
                                        </span>
                                    </div>
                                </div>
                            ))}

                            {visibleSummaryCount < summaryItems.length && (
                                <button
                                    type="button"
                                    onClick={() => setVisibleSummaryCount((prev) => prev + SUMMARY_ROOMS_PER_PAGE)}
                                    className={styles.viewMoreBtn}
                                >
                                    View More ({Math.min(SUMMARY_ROOMS_PER_PAGE, summaryItems.length - visibleSummaryCount)} more room{Math.min(SUMMARY_ROOMS_PER_PAGE, summaryItems.length - visibleSummaryCount) !== 1 ? 's' : ''})
                                </button>
                            )}

                            <div className={styles.metaList}>
                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Total length of stay</span>
                                    <span className={styles.metaValue}>
                                        {totalNights} night{totalNights > 1 ? 's' : ''}
                                    </span>
                                </div>
                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Check-in</span>
                                    <span className={styles.metaValue}>
                                        {detail?.checkIn ? moment(detail.checkIn).format('DD-MM-YYYY') : '—'}
                                    </span>
                                </div>
                                <div className={styles.metaRow}>
                                    <span className={styles.metaLabel}>Check-out</span>
                                    <span className={styles.metaValue}>
                                        {detail?.checkOut ? moment(detail.checkOut).format('DD-MM-YYYY') : '—'}
                                    </span>
                                </div>
                            </div>

                            <hr className={styles.divider} />

                            <div className={styles.totalRow}>
                                <span className={`${styles.totalLabel} ${outfit.className}`}>Total Price</span>
                                <div className={styles.totalRight}>
                                    <div className={`${styles.totalPrice} ${outfit.className}`}>
                                        <PriceDisplay price={totalPrice} currency={currency} />
                                    </div>
                                    <span className={styles.vatNote}>Vat and Taxes included</span>
                                </div>
                            </div>
                        </>
                    )}

                    <button
                        type="button"
                        disabled={isLoading}
                        onClick={PreBooking}
                        className={`${styles.ctaBtn} d-none d-md-inline-flex`}
                    >
                        {isLoading ? (
                            <>
                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                {ctaLabel}
                            </>
                        ) : (
                            <>
                                {ctaLabel}
                                <FaArrowRight aria-hidden="true" />
                            </>
                        )}
                    </button>

                    {freeCancellationNote && selectedRooms.length > 0 && (
                        <p className={`${styles.cancelNote} d-none d-md-flex`}>
                            <FaCalendarAlt className={styles.cancelIcon} aria-hidden="true" />
                            <span>{freeCancellationNote}</span>
                        </p>
                    )}
                </div>
            </aside>

            {selectedRooms.length > 0 && (
                <div className={`d-md-none ${styles.mobileBar}`}>
                    <div className={styles.mobileBarInner}>
                        <div>
                            <span className={styles.mobileTotalLabel}>Total Price</span>
                            <div className={styles.mobileTotalPrice}>
                                <PriceDisplay price={totalPrice} currency={currency} />
                            </div>
                        </div>
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={PreBooking}
                            className={`${styles.ctaBtn} ${styles.mobileCta}`}
                        >
                            {isLoading ? (
                                <>
                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                                    {ctaLabel}
                                </>
                            ) : (
                                <>
                                    {ctaLabel}
                                    <FaArrowRight aria-hidden="true" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}
        </>
    )
}
