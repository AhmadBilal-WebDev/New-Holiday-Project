'use client';
import React, { useEffect, useState } from 'react';
import styles from "./RoomSelection.module.css";
import { usePackageStore } from '@/components/Store/PackageStore';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import { FaBed, FaUser, FaChild, FaBaby } from 'react-icons/fa';
import { Inter, Outfit } from 'next/font/google';

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['600', '700'],
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

const formatRoomLabel = (type) => {
  if (!type) return 'Room';
  return String(type)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

export default function Page() {
  const [roomList, setRoomList] = useState([]);
  const [quantities, setQuantities] = useState({});
  const { selectedPackage, setSelectedPackage } = usePackageStore();
  const router = useRouter();
  const [guestDistribution, setGuestDistribution] = useState({});
  const [withoutBedGuests, setWithoutBedGuests] = useState({});

  useEffect(() => {
    if (selectedPackage?.price_Details) {
      const roomsWithIds = selectedPackage.price_Details.map((r, i) => ({
        ...r,
        _id: r.type || `without_beds_${i}`, // fallback id for without_beds
      }));

      setRoomList(roomsWithIds);

      // Check if there are already selected rooms to restore from previous checkout attempt
      if (selectedPackage.selected_rooms && selectedPackage.selected_rooms.length > 0) {
        // Restore from selected_rooms
        const restoredQuantities = {};
        const restoredGuests = {};
        const restoredWithoutBed = {};

        roomsWithIds.forEach(room => {
          // Find if this room was previously selected
          const selectedRoom = selectedPackage.selected_rooms.find(sr => sr._id === room._id);

          if (selectedRoom) {
            restoredQuantities[room._id] = selectedRoom.rooms;
            restoredGuests[room._id] = {
              adult: selectedRoom.adults || 0,
              child: selectedRoom.children || 0,
              infant: selectedRoom.infants || 0,
            };
          } else {
            restoredQuantities[room._id] = 0;
            restoredGuests[room._id] = { adult: 0, child: 0, infant: 0 };
          }

          if (room.type !== 'without_beds') {
            restoredWithoutBed[room._id] = {
              adult: selectedRoom?.adults_without_bed || 0,
              child: selectedRoom?.children_without_bed || 0,
              infant: selectedRoom?.infants_without_bed || 0,
            };
          }
        });

        setQuantities(restoredQuantities);
        setGuestDistribution(restoredGuests);
        setWithoutBedGuests(restoredWithoutBed);
      } else {
        // Initialize fresh if no previous selections
        const initialQuantities = {};
        const initialGuests = {};
        const initialWithoutBed = {};
        roomsWithIds.forEach(room => {
          initialQuantities[room._id] = 0;
          initialGuests[room._id] = { adult: 0, child: 0, infant: 0 };
          if (room.type !== 'without_beds') {
            initialWithoutBed[room._id] = { adult: 0, child: 0, infant: 0 };
          }
        });
        setQuantities(initialQuantities);
        setGuestDistribution(initialGuests);
        setWithoutBedGuests(initialWithoutBed);
      }
    }
  }, [selectedPackage]);

  // --- Quantity handlers ---
  const handleIncrease = (roomId) => {
    const newQuantities = { ...quantities };
    newQuantities[roomId] = (newQuantities[roomId] || 0) + 1;
    const totalCapacity = Object.keys(newQuantities).reduce((sum, key) => {
      const room = roomList.find(r => r._id === key);
      return sum + (newQuantities[key] * (room?.max_pax || 0));
    }, 0);
    if (totalCapacity > selectedPackage?.pax) {
      notifications.show({
        title: 'Capacity Exceeded',
        message: `Total capacity cannot exceed package pax of ${selectedPackage?.pax}.`,
        color: 'red',
      })
      return;
    }
    setQuantities(newQuantities);
  };

  const handleDecrease = (roomId) => {
    if ((quantities[roomId] || 0) > 0) {
      const newQty = quantities[roomId] - 1;
      const room = roomList.find(r => r._id === roomId);
      const maxGuests = (room?.max_pax || 0) * newQty;
      const newGuestDistribution = { ...guestDistribution };
      const g = { ...(newGuestDistribution[roomId] || { adult: 0, child: 0, infant: 0 }) };
      const total = g.adult + g.child + g.infant;
      if (total > maxGuests) {
        let excess = total - maxGuests;
        const removeInfant = Math.min(g.infant, excess);
        g.infant -= removeInfant; excess -= removeInfant;
        const removeChild = Math.min(g.child, excess);
        g.child -= removeChild; excess -= removeChild;
        g.adult = Math.max(0, g.adult - excess);
      }
      newGuestDistribution[roomId] = g;
      setQuantities({ ...quantities, [roomId]: newQty });
      setGuestDistribution(newGuestDistribution);
    }
  };

  const handleToggleWithoutAccommodation = (roomId) => {
    const newQuantities = { ...quantities };
    const currentValue = newQuantities[roomId] || 0;
    newQuantities[roomId] = currentValue === 0 ? 1 : 0;
    setQuantities(newQuantities);

    const newGuestDistribution = { ...guestDistribution };
    newGuestDistribution[roomId] = { adult: 0, child: 0, infant: 0 };
    setGuestDistribution(newGuestDistribution);
  };
  // --- Derived values ---
  const totalRooms = Object.keys(quantities).reduce((sum, key) => {
    const room = roomList.find(r => r._id === key);
    return sum + ((room?.type !== "without_beds") ? quantities[key] : 0);
  }, 0);

  const totalCapacity = Object.keys(quantities).reduce((sum, key) => {
    const room = roomList.find(r => r._id === key);
    return sum + (quantities[key] * (room?.max_pax || 0));
  }, 0);

  const hasWithoutAccommodation = roomList.some(r => r.type === "without_beds" && (quantities[r._id] || 0) > 0);
  const withoutBedsRoom = roomList.find(r => r.type === 'without_beds');

  // --- Without-bed guest handler ---
  const handleWithoutBedChange = (roomId, guestType, increment) => {
    const newWB = { ...withoutBedGuests };
    const current = { ...(newWB[roomId] || { adult: 0, child: 0, infant: 0 }) };
    const roomQty = quantities[roomId] || 1;

    if (increment) {
      if (guestType === 'adult') {
        if (current.adult < roomQty) {
          current.adult++;
          // Enforce child limit: each room with an adult without bed can only have 1 child without bed
          const maxChildAfter = current.adult * 1 + (roomQty - current.adult) * 2;
          if (current.child > maxChildAfter) current.child = maxChildAfter;
        }
      } else if (guestType === 'child') {
        const maxChild = current.adult * 1 + (roomQty - current.adult) * 2;
        if (current.child < maxChild) current.child++;
      } else if (guestType === 'infant') {
        if (current.infant < roomQty) current.infant++;
      }
    } else {
      if (current[guestType] > 0) current[guestType]--;
    }

    newWB[roomId] = current;
    setWithoutBedGuests(newWB);
  };

  // --- Guest handlers ---
  const handleGuestChange = (roomId, guestType, increment) => {
    const room = roomList.find(r => r._id === roomId);
    const newGuestDistribution = { ...guestDistribution };
    const g = { ...(newGuestDistribution[roomId] || { adult: 0, child: 0, infant: 0 }) };

    if (increment) {
      if (room?.type === "without_beds") {
        g[guestType]++;
      } else {
        const maxGuests = (room?.max_pax || 0) * (quantities[roomId] || 0);
        const currentTotal = g.adult + g.child + g.infant;
        if (currentTotal < maxGuests) {
          g[guestType]++;
        }
      }
    } else {
      if (g[guestType] > 0) g[guestType]--;
    }

    newGuestDistribution[roomId] = g;
    setGuestDistribution(newGuestDistribution);
  };

  // --- Price calculations ---
  const calculateTotals = () => {
    let totals = { adult: 0, child: 0, infant: 0, adult_wb: 0, child_wb: 0, infant_wb: 0, grand: 0 };
    Object.keys(guestDistribution).forEach(roomId => {
      const room = roomList.find(r => r._id === roomId);
      if ((quantities[roomId] || 0) > 0) {
        const g = guestDistribution[roomId] || { adult: 0, child: 0, infant: 0 };
        totals.adult += g.adult * (Number(room?.sale_per_person) || 0);
        totals.child += g.child * (Number(room?.child_sale_per_person) || 0);
        totals.infant += g.infant * (Number(room?.infant_sale_per_person) || 0);
      }
    });
    // Without-bed extras (only for selected regular rooms) — use the without_beds entry prices
    Object.keys(withoutBedGuests).forEach(roomId => {
      const room = roomList.find(r => r._id === roomId);
      if ((quantities[roomId] || 0) > 0 && room?.type !== 'without_beds') {
        const wb = withoutBedGuests[roomId] || { adult: 0, child: 0, infant: 0 };
        totals.adult_wb += wb.adult * (Number(withoutBedsRoom?.sale_per_person) || 0);
        totals.child_wb += wb.child * (Number(withoutBedsRoom?.child_sale_per_person) || 0);
        totals.infant_wb += wb.infant * (Number(withoutBedsRoom?.infant_sale_per_person) || 0);
      }
    });
    totals.grand = totals.adult + totals.child + totals.infant + totals.adult_wb + totals.child_wb + totals.infant_wb;
    return totals;
  };
  const canContinue = totalRooms > 0 || hasWithoutAccommodation;

  const ProceedToCheckout = () => {
    if (!roomList.length) return [];
    const updated = roomList
      .filter(room => quantities[room._id] > 0) // only selected rooms
      .map(room => {
        const qty = quantities[room._id] || 0;
        const guests = guestDistribution[room._id] || { adult: 0, child: 0, infant: 0 };
        const totals = { adult: guests.adult, child: guests.child, infant: guests.infant };

        // Distribute totals across individual rooms by filling to max_pax capacity first
        const perRoomGuests = [];
        let remaining = { ...totals };
        for (let i = 0; i < qty; i++) {
          const rg = { adult: 0, child: 0, infant: 0 };
          let capacity = room.max_pax || 0;
          const a = Math.min(remaining.adult, capacity);
          rg.adult = a; remaining.adult -= a; capacity -= a;
          const c = Math.min(remaining.child, capacity);
          rg.child = c; remaining.child -= c; capacity -= c;
          const inf = Math.min(remaining.infant, capacity);
          rg.infant = inf; remaining.infant -= inf;
          perRoomGuests.push(rg);
        }

        const wb = withoutBedGuests[room._id] || { adult: 0, child: 0, infant: 0 };
        return {
          ...room,          // keep original room data
          rooms: qty,              // number of rooms
          adults: totals.adult,
          children: totals.child,
          infants: totals.infant,
          adult_price: Number(room?.sale_per_person) || 0,
          child_price: Number(room?.child_sale_per_person) || 0,
          infant_price: Number(room?.infant_sale_per_person) || 0,
          adults_without_bed: wb.adult,
          children_without_bed: wb.child,
          infants_without_bed: wb.infant,
          adult_without_bed_price: Number(withoutBedsRoom?.sale_per_person) || 0,
          child_without_bed_price: Number(withoutBedsRoom?.child_sale_per_person) || 0,
          infant_without_bed_price: Number(withoutBedsRoom?.infant_sale_per_person) || 0,
        };
      });
    const invalidRoom = updated.find(
      (r) => r.adults === 0 && r.children === 0 && r.infants === 0 && r.type !== 'without_beds'
    );
    if (invalidRoom) {
      notifications.show({
        title: "Guests Required",
        message: `Please select at least 1 guest in room.`,
        color: "red",
      });
      return;
    }
    selectedPackage.selected_rooms = updated;
    const totals = calculateTotals();
    selectedPackage.total_amount = totals.grand;
    setSelectedPackage(selectedPackage);
    router.push(`/${selectedPackage?.category?.slug}/checkout`);
  };

  const regularRooms = roomList.filter((room) => room.type !== 'without_beds');
  const showWithoutBed =
    !!withoutBedsRoom &&
    (Number(withoutBedsRoom?.sale_per_person) > 0 ||
      Number(withoutBedsRoom?.child_sale_per_person) > 0 ||
      Number(withoutBedsRoom?.infant_sale_per_person) > 0);

  const selectedRooms = regularRooms.filter((room) => (quantities[room._id] || 0) > 0);
  const totals = calculateTotals();

  const summaryLines = [];
  selectedRooms.forEach((room) => {
    const g = guestDistribution[room._id] || { adult: 0, child: 0, infant: 0 };
    const labelPrefix = selectedRooms.length > 1 ? `${formatRoomLabel(room.type)} · ` : '';
    if (g.adult > 0) {
      summaryLines.push({
        key: `${room._id}-adult`,
        label: (
          <>
            {labelPrefix}Adults ({g.adult} x{' '}
            <PriceDisplay price={room?.sale_per_person} currency={selectedPackage?.currency_code} />)
          </>
        ),
        amount: g.adult * (Number(room?.sale_per_person) || 0),
      });
    }
    if (g.child > 0) {
      summaryLines.push({
        key: `${room._id}-child`,
        label: (
          <>
            {labelPrefix}Children ({g.child} x{' '}
            <PriceDisplay price={room?.child_sale_per_person} currency={selectedPackage?.currency_code} />)
          </>
        ),
        amount: g.child * (Number(room?.child_sale_per_person) || 0),
      });
    }
    if (g.infant > 0) {
      summaryLines.push({
        key: `${room._id}-infant`,
        label: (
          <>
            {labelPrefix}Infants ({g.infant} x{' '}
            <PriceDisplay price={room?.infant_sale_per_person} currency={selectedPackage?.currency_code} />)
          </>
        ),
        amount: g.infant * (Number(room?.infant_sale_per_person) || 0),
      });
    }

    const wb = withoutBedGuests[room._id] || { adult: 0, child: 0, infant: 0 };
    if (wb.adult > 0) {
      summaryLines.push({
        key: `${room._id}-adult-wb`,
        label: (
          <>
            {labelPrefix}Adults No Bed ({wb.adult} x{' '}
            <PriceDisplay price={withoutBedsRoom?.sale_per_person} currency={selectedPackage?.currency_code} />)
          </>
        ),
        amount: wb.adult * (Number(withoutBedsRoom?.sale_per_person) || 0),
      });
    }
    if (wb.child > 0) {
      summaryLines.push({
        key: `${room._id}-child-wb`,
        label: (
          <>
            {labelPrefix}Children No Bed ({wb.child} x{' '}
            <PriceDisplay
              price={withoutBedsRoom?.child_sale_per_person}
              currency={selectedPackage?.currency_code}
            />)
          </>
        ),
        amount: wb.child * (Number(withoutBedsRoom?.child_sale_per_person) || 0),
      });
    }
    if (wb.infant > 0) {
      summaryLines.push({
        key: `${room._id}-infant-wb`,
        label: (
          <>
            {labelPrefix}Infants No Bed ({wb.infant} x{' '}
            <PriceDisplay
              price={withoutBedsRoom?.infant_sale_per_person}
              currency={selectedPackage?.currency_code}
            />)
          </>
        ),
        amount: wb.infant * (Number(withoutBedsRoom?.infant_sale_per_person) || 0),
      });
    }
  });

  const totalGuestsAll = selectedRooms.reduce((sum, room) => {
    const g = guestDistribution[room._id] || { adult: 0, child: 0, infant: 0 };
    const wb = withoutBedGuests[room._id] || { adult: 0, child: 0, infant: 0 };
    return sum + g.adult + g.child + g.infant + wb.adult + wb.child + wb.infant;
  }, 0);

  const Stepper = ({ value, onMinus, onPlus, minusDisabled, plusDisabled }) => (
    <div className={styles.stepper}>
      <button type="button" className={styles.stepperBtn} onClick={onMinus} disabled={minusDisabled}>
        −
      </button>
      <span className={styles.stepperValue}>{value}</span>
      <button type="button" className={styles.stepperBtn} onClick={onPlus} disabled={plusDisabled}>
        +
      </button>
    </div>
  );

  return (
    <div className={`${styles.page} ${inter.className}`}>
      <div className={styles.headerBar}>
        <h1 className={`${styles.headerTitle} ${outfit.className}`}>Select Your Package</h1>
      </div>

      <div className="container">
        <div className={styles.layout}>
          <div className={styles.mainCol}>
            {regularRooms.map((room) => {
              const isSelected = (quantities[room._id] || 0) > 0;
              const totalRoomsOfType = quantities[room._id] || 0;
              const maxGuests = (room.max_pax || 0) * totalRoomsOfType;
              const gd = guestDistribution[room._id] || { adult: 0, child: 0, infant: 0 };
              const totalGuestsSelected = gd.adult + gd.child + gd.infant;

              return (
                <React.Fragment key={room._id}>
                  <article
                    className={`${styles.roomCard} ${isSelected ? styles.roomCardSelected : ''}`}
                  >
                    {isSelected && <span className={styles.selectedBadge}>Selected</span>}

                    <h2 className={`${styles.roomTitle} ${outfit.className}`}>
                      {formatRoomLabel(room.type)} (Sharing)
                    </h2>

                    <div className={styles.pricingGrid}>
                      <div
                        className={`${styles.priceItem} ${gd.adult > 0 ? styles.priceItemActive : ''}`}
                      >
                        <span className={styles.priceLabel}>Adult</span>
                        <span className={`${styles.priceValue} ${outfit.className}`}>
                          <PriceDisplay
                            price={room?.sale_per_person}
                            currency={selectedPackage?.currency_code}
                          />
                        </span>
                      </div>
                      <div
                        className={`${styles.priceItem} ${gd.child > 0 ? styles.priceItemActive : ''}`}
                      >
                        <span className={styles.priceLabel}>Child</span>
                        <span className={`${styles.priceValue} ${outfit.className}`}>
                          <PriceDisplay
                            price={room?.child_sale_per_person}
                            currency={selectedPackage?.currency_code}
                          />
                        </span>
                      </div>
                      <div
                        className={`${styles.priceItem} ${gd.infant > 0 ? styles.priceItemActive : ''}`}
                      >
                        <span className={styles.priceLabel}>Infant</span>
                        <span className={`${styles.priceValue} ${outfit.className}`}>
                          <PriceDisplay
                            price={room?.infant_sale_per_person}
                            currency={selectedPackage?.currency_code}
                          />
                        </span>
                      </div>
                    </div>

                    <div className={styles.roomsRow}>
                      <span className={styles.roomsLabel}>
                        <FaBed size={15} className={styles.roomsIcon} aria-hidden="true" />
                        Number Of Rooms
                      </span>
                      <Stepper
                        value={totalRoomsOfType}
                        onMinus={() => handleDecrease(room._id)}
                        onPlus={() => handleIncrease(room._id)}
                        minusDisabled={totalRoomsOfType <= 0}
                        plusDisabled={Number(totalCapacity) >= Number(selectedPackage?.pax)}
                      />
                    </div>
                  </article>

                  {isSelected && (
                    <article className={styles.guestCard}>
                      <h3 className={`${styles.sectionTitle} ${outfit.className}`}>
                        Guest Selection
                      </h3>
                      <p className={styles.sectionMeta}>
                        {formatRoomLabel(room.type)} · {totalGuestsSelected} of {maxGuests} guests
                      </p>

                      <div className={styles.guestList}>
                        <div className={styles.guestRow}>
                          <div className={styles.guestLeft}>
                            <span className={styles.guestIcon} aria-hidden="true">
                              <FaUser size={13} />
                            </span>
                            <div>
                              <p className={styles.guestName}>Adults</p>
                              <p className={styles.guestPrice}>
                                <PriceDisplay
                                  price={room?.sale_per_person}
                                  currency={selectedPackage?.currency_code}
                                />{' '}
                                each
                              </p>
                            </div>
                          </div>
                          <Stepper
                            value={gd.adult}
                            onMinus={() => handleGuestChange(room._id, 'adult', false)}
                            onPlus={() => handleGuestChange(room._id, 'adult', true)}
                            minusDisabled={gd.adult <= 0}
                            plusDisabled={totalGuestsSelected >= maxGuests}
                          />
                        </div>

                        <div className={styles.guestRow}>
                          <div className={styles.guestLeft}>
                            <span className={styles.guestIcon} aria-hidden="true">
                              <FaChild size={14} />
                            </span>
                            <div>
                              <p className={styles.guestName}>Children</p>
                              <p className={styles.guestPrice}>
                                <PriceDisplay
                                  price={room?.child_sale_per_person}
                                  currency={selectedPackage?.currency_code}
                                />{' '}
                                each
                              </p>
                            </div>
                          </div>
                          <Stepper
                            value={gd.child}
                            onMinus={() => handleGuestChange(room._id, 'child', false)}
                            onPlus={() => handleGuestChange(room._id, 'child', true)}
                            minusDisabled={gd.child <= 0}
                            plusDisabled={totalGuestsSelected >= maxGuests}
                          />
                        </div>

                        <div className={styles.guestRow}>
                          <div className={styles.guestLeft}>
                            <span className={styles.guestIcon} aria-hidden="true">
                              <FaBaby size={14} />
                            </span>
                            <div>
                              <p className={styles.guestName}>Infants</p>
                              <p className={styles.guestPrice}>
                                <PriceDisplay
                                  price={room?.infant_sale_per_person}
                                  currency={selectedPackage?.currency_code}
                                />{' '}
                                each
                              </p>
                            </div>
                          </div>
                          <Stepper
                            value={gd.infant}
                            onMinus={() => handleGuestChange(room._id, 'infant', false)}
                            onPlus={() => handleGuestChange(room._id, 'infant', true)}
                            minusDisabled={gd.infant <= 0}
                            plusDisabled={totalGuestsSelected >= maxGuests}
                          />
                        </div>
                      </div>
                    </article>
                  )}

                  {isSelected && showWithoutBed && (
                    <article className={styles.withoutBedCard}>
                      <h3 className={`${styles.sectionTitle} ${outfit.className}`}>
                        Without Bed (Extra Guests)
                      </h3>
                      <p className={styles.withoutBedSubtitle}>
                        Add extra guests who will not require a bed at discounted rates
                      </p>

                      <div className={styles.guestList}>
                        {Number(withoutBedsRoom?.sale_per_person) > 0 && (
                          <div className={styles.guestRow}>
                            <div>
                              <p className={styles.guestName}>Adult (No Bed)</p>
                              <p className={styles.guestPrice}>
                                <PriceDisplay
                                  price={withoutBedsRoom?.sale_per_person}
                                  currency={selectedPackage?.currency_code}
                                />{' '}
                                per person
                              </p>
                            </div>
                            <Stepper
                              value={withoutBedGuests[room._id]?.adult || 0}
                              onMinus={() => handleWithoutBedChange(room._id, 'adult', false)}
                              onPlus={() => handleWithoutBedChange(room._id, 'adult', true)}
                              minusDisabled={(withoutBedGuests[room._id]?.adult || 0) <= 0}
                              plusDisabled={
                                (withoutBedGuests[room._id]?.adult || 0) >= totalRoomsOfType
                              }
                            />
                          </div>
                        )}

                        {Number(withoutBedsRoom?.child_sale_per_person) > 0 && (
                          <div className={styles.guestRow}>
                            <div>
                              <p className={styles.guestName}>Child (No Bed)</p>
                              <p className={styles.guestPrice}>
                                <PriceDisplay
                                  price={withoutBedsRoom?.child_sale_per_person}
                                  currency={selectedPackage?.currency_code}
                                />{' '}
                                per person
                              </p>
                            </div>
                            <Stepper
                              value={withoutBedGuests[room._id]?.child || 0}
                              onMinus={() => handleWithoutBedChange(room._id, 'child', false)}
                              onPlus={() => handleWithoutBedChange(room._id, 'child', true)}
                              minusDisabled={(withoutBedGuests[room._id]?.child || 0) <= 0}
                              plusDisabled={(() => {
                                const wb = withoutBedGuests[room._id] || {
                                  adult: 0,
                                  child: 0,
                                  infant: 0,
                                };
                                const maxChild = wb.adult * 1 + (totalRoomsOfType - wb.adult) * 2;
                                return wb.child >= maxChild;
                              })()}
                            />
                          </div>
                        )}

                        {Number(withoutBedsRoom?.infant_sale_per_person) > 0 && (
                          <div className={styles.guestRow}>
                            <div>
                              <p className={styles.guestName}>Infant (No Bed)</p>
                              <p className={styles.guestPrice}>
                                <PriceDisplay
                                  price={withoutBedsRoom?.infant_sale_per_person}
                                  currency={selectedPackage?.currency_code}
                                />{' '}
                                per person
                              </p>
                            </div>
                            <Stepper
                              value={withoutBedGuests[room._id]?.infant || 0}
                              onMinus={() => handleWithoutBedChange(room._id, 'infant', false)}
                              onPlus={() => handleWithoutBedChange(room._id, 'infant', true)}
                              minusDisabled={(withoutBedGuests[room._id]?.infant || 0) <= 0}
                              plusDisabled={
                                (withoutBedGuests[room._id]?.infant || 0) >= totalRoomsOfType
                              }
                            />
                          </div>
                        )}
                      </div>
                    </article>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <aside className={styles.sideCol}>
            <div className={styles.summaryCard}>
              <h3 className={`${styles.summaryTitle} ${outfit.className}`}>Price Summary</h3>

              {summaryLines.length === 0 ? (
                <p className={styles.summaryEmpty}>Select rooms and guests to see pricing.</p>
              ) : (
                summaryLines.map((line) => (
                  <div key={line.key} className={styles.summaryLine}>
                    <span>{line.label}</span>
                    <span className={styles.summaryLineAmount}>
                      <PriceDisplay
                        price={line.amount}
                        currency={selectedPackage?.currency_code}
                      />
                    </span>
                  </div>
                ))
              )}

              <hr className={styles.summaryDivider} />

              <div className={styles.grandRow}>
                <span className={`${styles.grandLabel} ${outfit.className}`}>Grand Total</span>
                <span className={`${styles.grandAmount} ${outfit.className}`}>
                  <PriceDisplay price={totals.grand} currency={selectedPackage?.currency_code} />
                </span>
              </div>
              <p className={styles.taxNote}>Excluding VAT and Tourism Fee</p>

              <button
                type="button"
                className={`${styles.checkoutBtn} ${outfit.className}`}
                onClick={ProceedToCheckout}
                disabled={!canContinue}
              >
                Proceed to Checkout
              </button>
            </div>

            {selectedRooms.length > 0 && (
              <div className={styles.infoCard}>
                <h4 className={`${styles.infoTitle} ${outfit.className}`}>Selected Package:</h4>
                <ul className={styles.infoList}>
                  {selectedRooms.map((room) => (
                    <li key={room._id} className={styles.infoItem}>
                      <span className={styles.infoAccent}>{formatRoomLabel(room.type)}</span>{' '}
                      Room Sharing · {quantities[room._id]} room
                      {quantities[room._id] > 1 ? 's' : ''}
                    </li>
                  ))}
                  <li className={styles.infoItem}>
                    Tier: Adult, Child, Infant
                  </li>
                  <li className={styles.infoItem}>Total Guests: {totalGuestsAll}</li>
                </ul>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
