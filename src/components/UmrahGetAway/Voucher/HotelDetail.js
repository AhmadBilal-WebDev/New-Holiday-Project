import React from 'react'
import styles from '../Checkout/Checkout.module.css';
import { FaHotel, FaStar, FaStarHalfAlt, FaUtensils } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import moment from 'moment';
import { IoMdBed } from "react-icons/io";
import { MdOutlineNightsStay } from "react-icons/md";

export default function HotelDetail({ HotelData, type }) {
  const renderStars = (rating) => {
    const roundedRating = Math.round(Number(rating || 0) * 2) / 2;
    const fullStars = Math.floor(roundedRating);
    const hasHalfStar = roundedRating % 1 !== 0;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<FaStar key={`full-${i}`} className={styles.hotelStar} />);
    }
    if (hasHalfStar) {
      stars.push(<FaStarHalfAlt key="half" className={styles.hotelStar} />);
    }
    return stars;
  };

  const getGuestLabel = (rate) => {
    const adults = Number(rate?.adults || 0);
    const children = Array.isArray(rate?.children)
      ? rate.children.length
      : Number(rate?.children || 0);

    if (!adults && !children) return null;

    const parts = [];
    if (adults) parts.push(`${adults} Adult${adults > 1 ? 's' : ''}`);
    if (children) parts.push(`${children} Child${children > 1 ? 'ren' : ''}`);
    return parts.join(', ');
  };

  const selectedRoomsFromUnits = (HotelData?.selected_room_units || []).map((unit, index) => {
    const rooms = HotelData?.rooms || [];
    const roomIndex = unit?.roomIndex ?? unit?.room_index;
    const rateIndex = unit?.rateIndex ?? unit?.rate_index;
    const rate = Number.isInteger(Number(roomIndex)) && Number.isInteger(Number(rateIndex))
      ? rooms[Number(roomIndex)]?.rates?.[Number(rateIndex)]
      : null;

    return {
      key: `unit-${unit.rateKey || index}`,
      name: unit.roomType || HotelData?.selected_room_name || 'Room',
      board: unit.boardName || HotelData?.selected_board_name || '—',
      guests: getGuestLabel(unit) || getGuestLabel(rate),
      qty: Math.max(1, Number((unit.quantity ?? unit.qty) || 1)),
    };
  });

  const selectedRoomsFromFlags = (HotelData?.rooms || [])
    .filter((room) => room.price_added_to_package || room.selected_for_package)
    .flatMap((room, roomIndex) =>
      (room.rates || [])
        .filter((rate) => rate.price_added_to_package || rate.selected_for_package)
        .map((rate, rateIndex) => ({
          key: `${roomIndex}-${rateIndex}`,
          name: room?.name || room?.type || HotelData?.selected_room_name || 'Room',
          board: rate?.board_name || HotelData?.selected_board_name || '—',
          guests: getGuestLabel(rate),
          qty: Math.max(1, Number((rate?.quantity ?? rate?.qty) || 1)),
        }))
    );

  const selectedRooms = selectedRoomsFromUnits.length ? selectedRoomsFromUnits : selectedRoomsFromFlags;

  const fallbackRate = (HotelData?.rooms || [])
    .flatMap((room) => room.rates || [])
    .find((rate) => rate.price_added_to_package || rate.selected_for_package);

  const fallbackRoom =
    !selectedRooms.length && (HotelData?.selected_room_name || HotelData?.selected_board_name)
      ? [{
          key: 'fallback',
          name: HotelData?.selected_room_name || 'Room',
          board: HotelData?.selected_board_name || '—',
          guests: getGuestLabel(fallbackRate),
          qty: 1,
        }]
      : [];

  const roomsToShow = selectedRooms.length ? selectedRooms : fallbackRoom;
  const showQty = roomsToShow.some((room) => Number(room.qty || 1) > 1);
  const nights = Number(HotelData?.nights || 0);

  return (
    <div className={styles.voucherHotelSection}>
      <div className={styles.voucherHotelHeader}>
        <span className={styles.voucherHotelHeaderIcon}>
          <FaHotel size={12} />
        </span>
        HOTEL ACCOMMODATION
        <span className={styles.voucherHotelHeaderLine} />
        <span className={styles.voucherHotelCity}>{HotelData?.city}</span>
      </div>

      <div className={styles.voucherHotelBody}>
        <div className={styles.voucherHotelTop}>
          <div className={styles.voucherHotelInfo}>
            <h3 className={styles.voucherHotelName}>{HotelData?.name}</h3>
            {HotelData?.location?.address && (
              <p className={styles.voucherHotelAddress}>
                <FaLocationDot size={13} />
                <span>{HotelData.location.address}</span>
              </p>
            )}
          </div>
          {HotelData?.star_rating > 0 && (
            <div className={styles.voucherHotelStars}>
              {renderStars(HotelData?.star_rating)}
            </div>
          )}
        </div>

        <div className={styles.voucherStayGrid}>
          <div className={styles.voucherStayItem}>
            <span className={styles.voucherStayLabel}>Check-in</span>
            <span className={styles.voucherStayValue}>
              {moment(HotelData?.check_in).format('DD MMM YYYY')}
            </span>
          </div>
          <div className={styles.voucherStayMiddle}>
            <MdOutlineNightsStay size={16} />
            <span>
              {nights > 0
                ? `${nights} Night${nights > 1 ? 's' : ''}`
                : 'Stay'}
            </span>
          </div>
          <div className={`${styles.voucherStayItem} ${styles.voucherStayItemRight}`}>
            <span className={styles.voucherStayLabel}>Check-out</span>
            <span className={styles.voucherStayValue}>
              {moment(HotelData?.check_out).format('DD MMM YYYY')}
            </span>
          </div>
        </div>

        {type !== 'receipt' && HotelData?.description && (
          <p className={styles.voucherHotelDescription}>{HotelData.description}</p>
        )}

        {roomsToShow.length > 0 && (
          <div className={styles.voucherRoomBlock}>
            <p className={styles.voucherRoomTitle}>Room Details</p>
            <div className={styles.voucherRoomTableWrap}>
              <table className={styles.voucherRoomTable}>
                <thead>
                  <tr>
                    <th className={styles.voucherRoomSr}>#</th>
                    <th>Room Type</th>
                    <th>Board Basis</th>
                    {showQty && <th>Qty</th>}
                    <th>Guests</th>
                  </tr>
                </thead>
                <tbody>
                  {roomsToShow.map((room, index) => (
                    <tr key={room.key}>
                      <td className={styles.voucherRoomSr}>{index + 1}</td>
                      <td>
                        <div className={styles.voucherRoomCell}>
                          <IoMdBed className={styles.voucherRoomIcon} />
                          <span className={styles.voucherRoomName}>{room.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className={styles.voucherRoomCell}>
                          <FaUtensils className={styles.voucherRoomIcon} />
                          <span>{room.board}</span>
                        </div>
                      </td>
                      {showQty && <td>{room.qty || 1}</td>}
                        <td>{room.guests || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
