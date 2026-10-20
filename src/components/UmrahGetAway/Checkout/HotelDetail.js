import React from 'react'
import styles from './Checkout.module.css';
import { FaHotel, FaStar, FaStarHalfAlt, FaUtensils, FaUser, FaChild } from 'react-icons/fa';
import { FaLocationDot } from 'react-icons/fa6';
import moment from 'moment';
import Image from 'next/image';
import { IoMdBed } from "react-icons/io";
import { isPackageSelectedItem, getSelectedRoomUnitIndices } from '@/contexts/UmrahPackageContext';
import { getRateSeqNo } from '@/components/Hotels/utils/roomSequence';

const childrenCount = (value) => {
  if (Array.isArray(value)) return value.length;
  return Number(value || 0);
};

const isHotelstonProvider = (hotel) =>
  String(hotel?.provider || '').toLowerCase() === 'hotelston';

const getCapacityLabel = (adults, children) => {
  const adultLabel = `${adults} Adult${adults !== 1 ? 's' : ''}`;
  const childLabel = `${children} Child${children !== 1 ? 'ren' : ''}`;
  return `${adultLabel}, ${childLabel}`;
};

const getSelectedRoomsList = (hotel) => {
  if (!hotel) return [];

  const rooms = hotel.rooms || hotel.hotel_details?.rooms || [];
  const isHotelston = isHotelstonProvider(hotel);
  const selectedRooms = [];
  const pushRoom = (room, rate, key, qty, seqNo = null) => {
    if (!rate) return;
    const adults = Number(rate?.adults || 0);
    const children = childrenCount(rate?.children);
    const resolvedSeq = seqNo ?? getRateSeqNo(rate, room);
    selectedRooms.push({
      key,
      roomName: room?.name || room?.type || hotel.selected_room_name || 'Room',
      boardName: rate?.board_name || hotel.selected_board_name || '',
      qty: Math.max(1, Number(qty || 1)),
      adults,
      children,
      capacityLabel: getCapacityLabel(adults, children),
      seqNo: resolvedSeq,
    });
  };

  const units = hotel.selected_room_units || [];
  if (units.length) {
    units.forEach((unit, index) => {
      const { roomIndex, rateIndex, qty, seqNo } = getSelectedRoomUnitIndices(unit);
      const room = rooms[roomIndex];
      const rate = room?.rates?.[rateIndex];
      pushRoom(room, rate, `unit-${roomIndex}-${rateIndex}-${index}`, qty, seqNo);
    });
  } else {
    rooms.forEach((room, roomIndex) => {
      const flaggedRates = (room.rates || []).filter((rate) =>
        isPackageSelectedItem(rate) && isPackageSelectedItem(room)
      );
      const ratesToShow = flaggedRates.length
        ? flaggedRates
        : (isPackageSelectedItem(room) && room.rates?.[0] ? [room.rates[0]] : []);

      ratesToShow.forEach((rate, rateIndex) => {
        pushRoom(
          room,
          rate,
          `${roomIndex}-${rateIndex}`,
          rate?.quantity ?? rate?.qty ?? 1
        );
      });
    });
  }

  if (!isHotelston) return selectedRooms;

  return [...selectedRooms].sort((a, b) => {
    if (a.seqNo !== null && b.seqNo !== null && a.seqNo !== b.seqNo) return a.seqNo - b.seqNo;
    if (a.seqNo !== null && b.seqNo === null) return -1;
    if (a.seqNo === null && b.seqNo !== null) return 1;
    return 0;
  });
};

export default function HotelDetail({ HotelData, type }) {
  const selectedRoomsList = getSelectedRoomsList(HotelData);
  const selectedRoom = selectedRoomsList[0] || null;

  const renderStars = (rating, maxStars = 6) => {
    const numericRating = Number(rating);
    if (!numericRating) return null;

    const roundedRating = Math.round(numericRating * 2) / 2;
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

  return (
    <div className={styles.sectionCard}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderLeft}>
          <div className={styles.usectiontitleIconBox}>
            <FaHotel size={22} className={styles.usectiontitleIcon} />
          </div>
          <div>
            <div className={styles.usectiontitleTitle}>
              {HotelData?.city} Accommodation
            </div>
            <p className={styles.usectiontitleSubtitle}>
              {HotelData?.nights} Night{HotelData?.nights > 1 ? 's' : ''}
            </p>
          </div>
        </div>
        {/* <span className={styles.usectiontitleBadge}>{HotelData?.city}</span> */}
      </div>

      <div className={styles.hotelContentRow}>
        <div className={styles.hotelImageBox}>
          {HotelData?.first_image && (
            <Image src={HotelData.first_image} alt={HotelData?.name || 'Hotel'} width={200} height={150} />
          )}
        </div>

        <div className="flex-fill">
          <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-start mb-2">
            <div>
              <h3 className={styles.hotelName}>{HotelData?.name}</h3>
              {HotelData?.location?.address && (
                <p className={styles.hotelAddress}>
                  <FaLocationDot /> {HotelData?.location?.address}
                </p>
              )}
            </div>
            <div className="d-flex gap-1">
              {renderStars(HotelData?.star_rating, 6)}
            </div>
          </div>

          <div className={styles.hotelDates}>
            <span className={styles.hotelDatesLabel}>Check-in:</span>
            <span className={styles.hotelDatesValue}>{moment(HotelData?.check_in).format('DD-MM-YYYY')}</span>
            <span className="mx-2 text-muted">→</span>
            <span className={styles.hotelDatesLabel}>Check-out:</span>
            <span className={styles.hotelDatesValue}>{moment(HotelData?.check_out).format('DD-MM-YYYY')}</span>
          </div>

          {selectedRoomsList.length === 1 && (selectedRoom?.roomName || selectedRoom?.boardName) && (
            <div className={styles.hotelRoomDetails}>
              {selectedRoom?.roomName && (
                <div className={styles.hotelRoomDetailCard}>
                  <IoMdBed className={styles.hotelRoomDetailIcon} />
                  <div className={styles.hotelRoomDetailContent}>
                    <span className={styles.hotelRoomDetailLabel}>Room Type</span>
                    <p className={styles.hotelRoomDetailValue}>
                      {selectedRoom.roomName}
                      {selectedRoom.qty > 1 ? ` × ${selectedRoom.qty}` : ''}
                    </p>
                  </div>
                </div>
              )}

              {selectedRoom?.boardName && (
                <div className={styles.hotelRoomDetailCard}>
                  <FaUtensils className={styles.hotelRoomDetailIcon} />
                  <div className={styles.hotelRoomDetailContent}>
                    <span className={styles.hotelRoomDetailLabel}>Board Basis</span>
                    <p className={styles.hotelRoomDetailValue}>{selectedRoom.boardName}</p>
                  </div>
                </div>
              )}

              <div className={`${styles.hotelRoomDetailCard} ${styles.hotelRoomDetailCardFull}`}>
                <FaUser className={styles.hotelRoomDetailIcon} />
                <div className={styles.hotelRoomDetailContent}>
                  <span className={styles.hotelRoomDetailLabel}>Room Capacity</span>
                  <p className={styles.hotelRoomDetailValue}>{selectedRoom.capacityLabel}</p>
                </div>
              </div>
            </div>
          )}

          {selectedRoomsList.length > 1 && (
            <div className={styles.hotelRoomDetails}>
              {selectedRoomsList.map((room) => (
                <div key={room.key} className={`${styles.hotelRoomDetailCard} ${styles.hotelRoomDetailCardFull}`}>
                  <IoMdBed className={styles.hotelRoomDetailIcon} />
                  <div className={styles.hotelRoomDetailContent}>
                    <span className={styles.hotelRoomDetailLabel}>
                      {room.qty > 1 ? `${room.qty} Rooms` : 'Room'}
                    </span>
                    <p className={styles.hotelRoomDetailValue}>
                      {room.roomName || 'Room'}
                      {room.boardName ? ` — ${room.boardName}` : ''}
                    </p>
                    <p className={styles.hotelRoomCapacity}>
                      <FaUser size={11} /> {room.adults} Adult{room.adults !== 1 ? 's' : ''}
                      <FaChild size={11} /> {room.children} Child{room.children !== 1 ? 'ren' : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {type === 'receipt' && !selectedRoomsList.length && (
            <div className="mt-3">
              {HotelData?.rooms?.filter(isSelectedFlag).map((room, index) => (
                <div key={index}>
                  {room.rates?.filter(isSelectedFlag).map((rate, rateIndex) => (
                    <div key={rateIndex}>
                      <h6><IoMdBed size={22} /> {room?.name} - ({rate?.board_name})</h6>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
