'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Drawer, Loader, Modal, Text } from '@mantine/core';
import Image from 'next/image';
import moment from 'moment';
import { FaMoon, FaStar } from 'react-icons/fa';
import { CiLocationOn } from 'react-icons/ci';
import { FiCheckCircle, FiRefreshCw, FiSearch, FiSliders } from 'react-icons/fi';
import { IoMdClose } from 'react-icons/io';
import { HiOutlineBuildingOffice2 } from 'react-icons/hi2';
import { MdErrorOutline } from 'react-icons/md';
import PriceDisplay from '@/components/Currency/PriceDisplay';
import styles from '@/components/UmrahGetAway/UpdateHotel/UpdateHotel.module.css';
import ChangeHotelRoomModal from './ChangeHotelRoomModal';

function getNightsCount(checkIn, checkOut) {
  const nights = moment(checkOut).diff(moment(checkIn), 'days');
  return Number.isFinite(nights) && nights > 0 ? nights : 1;
}

function normalizeRooms(reviseContext, pkg) {
  const searchRooms =
    (Array.isArray(pkg?.original_request?.rooms) && pkg.original_request.rooms.length
      ? pkg.original_request.rooms
      : null)
    || (Array.isArray(reviseContext?.original_search_rooms) && reviseContext.original_search_rooms.length
      ? reviseContext.original_search_rooms
      : null)
    || (Array.isArray(reviseContext?.search_rooms) ? reviseContext.search_rooms : []);

  return searchRooms.map((room) => ({
    adults: Number(room?.adults || 0),
    children: Array.isArray(room?.children)
      ? room.children
      : Array.isArray(room?.childrenAges)
        ? room.childrenAges
        : Array.from({ length: Number(room?.children || 0) }, () => ({ age: 8 })),
  }));
}

export default function ChangeHotelModal({
  opened,
  onClose,
  reviseContext,
  pkg,
  hotel,
  cityName,
}) {
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hotelDetailsCache, setHotelDetailsCache] = useState({});
  const [searchText, setSearchText] = useState('');
  const [selectedStars, setSelectedStars] = useState([]);
  const [sortBy, setSortBy] = useState('default');
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(10);
  const [searchRefreshKey, setSearchRefreshKey] = useState(0);
  const [revisionDetailOpen, setRevisionDetailOpen] = useState(false);
  const [confirmHotel, setConfirmHotel] = useState(null);

  const nights = hotel?.nights || getNightsCount(hotel?.check_in, hotel?.check_out);
  const currentHotelName = hotel?.name || reviseContext?.current_hotel?.name || 'Current hotel';
  const itemsPerPage = 10;

  const fetchHotelDetail = useCallback(async (item) => {
    const id = item?.id;
    if (!id) return;
    setHotelDetailsCache((prev) => ({ ...prev, [id]: { loading: true } }));
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/basic/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: item.provider,
          hotelId: item.id,
          checkIn: hotel?.check_in,
          checkOut: hotel?.check_out,
        }),
      });
      const res = await response.json();
      setHotelDetailsCache((prev) => ({
        ...prev,
        [id]: {
          loading: false,
          images:
            Array.isArray(res.data?.main_images) && res.data.main_images.length > 0
              ? res.data.main_images[0].url || ''
              : '',
          all_images: res.data?.main_images || [],
          address: res.data?.address || '',
          facilities: res.data?.facilities || [],
        },
      }));
    } catch {
      setHotelDetailsCache((prev) => ({ ...prev, [id]: { loading: false, error: true } }));
    }
  }, [hotel?.check_in, hotel?.check_out]);

  useEffect(() => {
    if (!opened || !hotel || !pkg) return;

    setSearchText('');
    setSelectedStars([]);
    setSortBy('default');
    setVisibleCount(10);

    const fetchHotels = async () => {
      setLoading(true);
      setError(null);
      setHotels([]);
      setHotelDetailsCache({});

      const destination = hotel?.destination || reviseContext?.destination || {};
      const request = {
        checkIn: hotel?.check_in,
        checkOut: hotel?.check_out,
        destination: {
          city: cityName || destination?.city || reviseContext?.hotel?.city || '',
          latitude: destination?.latitude || reviseContext?.latitude || hotel?.location?.latitude,
          longitude: destination?.longitude || reviseContext?.longitude || hotel?.location?.longitude,
          countryCode: destination?.countryCode || 'SA',
        },
        currency: pkg?.currency || reviseContext?.currency || 'GBP',
        rooms: normalizeRooms(reviseContext, pkg),
      };

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/hotel/search`, {
          method: 'POST',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
        });
        const data = await res.json();
        if (!data.success) {
          setHotels([]);
        } else {
          const list = data?.data?.hotels || [];
          setHotels(list);
          list.forEach((item) => fetchHotelDetail(item));
        }
      } catch (err) {
        console.error('Holiday change hotel search error:', err);
        setError('Failed to load available hotels. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [opened, hotel?.id, hotel?.check_in, hotel?.check_out, cityName, searchRefreshKey, pkg, reviseContext, fetchHotelDetail]);

  useEffect(() => {
    if (!opened) {
      setRevisionDetailOpen(false);
      setConfirmHotel(null);
    }
  }, [opened]);

  useEffect(() => {
    setVisibleCount(10);
  }, [searchText, selectedStars, sortBy, hotels.length]);

  const toggleFilter = (setter, value) =>
    setter((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  const filteredHotels = useMemo(() => {
    return hotels
      .filter((item) => {
        if (searchText && !item?.name?.toLowerCase().includes(searchText.toLowerCase())) return false;
        if (selectedStars.length) {
          const stars = Math.round(Number(item?.metadata?.stars));
          if (!selectedStars.includes(stars === 0 ? 'unrated' : stars)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return (a.metadata?.min_price ?? 0) - (b.metadata?.min_price ?? 0);
        if (sortBy === 'price_desc') return (b.metadata?.min_price ?? 0) - (a.metadata?.min_price ?? 0);
        return 0;
      });
  }, [hotels, searchText, selectedStars, sortBy]);

  const visibleHotels = filteredHotels.slice(0, visibleCount);
  const hasMore = visibleCount < filteredHotels.length;
  const activeFilterCount =
    (searchText ? 1 : 0) + selectedStars.length + (sortBy !== 'default' ? 1 : 0);

  const clearAllFilters = () => {
    setSearchText('');
    setSelectedStars([]);
    setSortBy('default');
  };

  const renderStars = (count, size = 12) => {
    const stars = Math.round(Number(count));
    if (!stars || Number.isNaN(stars) || stars <= 0) return null;
    return Array(stars).fill(0).map((_, i) => <FaStar key={i} size={size} />);
  };

  if (!hotel) return null;

  return (
    <>
      <ChangeHotelRoomModal
        opened={revisionDetailOpen}
        onClose={() => setRevisionDetailOpen(false)}
        selectedHotel={confirmHotel}
        stayHotel={hotel}
        cityName={cityName}
        pkg={pkg}
        failedService="hotel"
      />

      <Modal
        opened={opened}
        onClose={onClose}
        fullScreen
        withCloseButton={false}
        padding={0}
        radius={0}
        transitionProps={{ transition: 'fade', duration: 200 }}
        classNames={{
          content: styles.modalContent,
          body: `${styles.modalBody}${revisionDetailOpen ? ` ${styles.modalBodyLocked}` : ''}`,
        }}
      >
        <div className={styles.modalShell}>
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <div className={styles.headerIcon}><HiOutlineBuildingOffice2 size={20} /></div>
              <div className={styles.headerText}>
                <h2 className={styles.headerTitle}>Change Hotel</h2>
                <p className={styles.headerSub}>Find better accommodation in {cityName}</p>
              </div>
              <span className={styles.cityBadge}>{cityName}</span>
            </div>
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.headerRefreshBtn}
                onClick={() => setSearchRefreshKey((prev) => prev + 1)}
                disabled={loading}
              >
                <FiRefreshCw size={14} />
                <span className={styles.headerRefreshLabel}>
                  {loading ? 'Refreshing...' : 'Refresh Search'}
                </span>
              </button>
              <button type="button" onClick={onClose} className={styles.closeBtn} aria-label="Close">
                <IoMdClose size={22} />
              </button>
            </div>
          </div>

          <div className={styles.currentBar}>
            <div className={styles.currentBarInner}>
              <div>
                <div className={styles.currentLabel}>Currently Selected</div>
                <div className={styles.currentName}>{currentHotelName}</div>
                <div className={styles.currentMeta}>
                  <span className={styles.nightsPill}>
                    <FaMoon size={9} /> {nights} {nights === 1 ? 'night' : 'nights'}
                  </span>
                  <span>
                    {moment(hotel?.check_in).format('DD MMM')} → {moment(hotel?.check_out).format('DD MMM YYYY')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className={`${styles.toolbar} ${styles.toolbarMobile}`}>
            <div className={styles.searchWrap}>
              <FiSearch className={styles.searchIcon} size={15} />
              <input
                type="text"
                className={styles.searchInput}
                placeholder="Search Hotels"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>
            <button type="button" className={styles.filterBtn} onClick={() => setFilterDrawerOpen(true)}>
              <FiSliders size={14} />
              Filters
              {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
            </button>
          </div>

          <div className={styles.pageContainer}>
            <div className={styles.contentArea}>
              <aside className={styles.filterSidebar}>
                <div className={styles.filterPanel}>
                  <p className={styles.filterSectionTitle}>Sort By</p>
                  <div className={styles.pillGroup}>
                    {[
                      { value: 'default', label: 'Default' },
                      { value: 'price_asc', label: 'Price ↑' },
                      { value: 'price_desc', label: 'Price ↓' },
                    ].map(({ value, label }) => (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.sortPill} ${sortBy === value ? styles.sortPillActive : ''}`}
                        onClick={() => setSortBy(value)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <p className={styles.filterSectionTitle}>Star Rating</p>
                  <div className={styles.pillGroup}>
                    {[5, 4, 3, 2, 1, 'unrated'].map((value) => (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.sortPill} ${selectedStars.includes(value) ? styles.sortPillActive : ''}`}
                        onClick={() => toggleFilter(setSelectedStars, value)}
                      >
                        {value === 'unrated' ? 'Unrated' : `${value}★`}
                      </button>
                    ))}
                  </div>

                  {activeFilterCount > 0 && (
                    <button type="button" className={styles.clearFiltersBtn} onClick={clearAllFilters}>
                      Clear All Filters
                    </button>
                  )}
                </div>
              </aside>

              <main className={styles.resultsArea}>
                {loading && (
                  <div className={styles.stateBox}>
                    <Loader size="md" color="teal" />
                    <p className={styles.stateText}>Searching for available hotels in {cityName}…</p>
                  </div>
                )}

                {error && !loading && (
                  <div className={styles.errorBox}>
                    <MdErrorOutline size={20} />
                    <span>{error}</span>
                  </div>
                )}

                {!loading && !error && hotels.length === 0 && (
                  <div className={styles.stateBox}>
                    <HiOutlineBuildingOffice2 size={36} color="#9ca3af" />
                    <p className={styles.stateText}>No alternative hotels found for {cityName}.</p>
                  </div>
                )}

                {!loading && !error && hotels.length > 0 && (
                  <>
                    <div className={styles.resultsHeader}>
                      <div>
                        <div className={styles.resultsCount}>Showing {filteredHotels.length} Hotels</div>
                        <div className={styles.resultsSub}>Alternative Hotels in {cityName}</div>
                      </div>
                      <div className={`${styles.searchWrap} ${styles.resultsSearch}`}>
                        <FiSearch className={styles.searchIcon} size={15} />
                        <input
                          type="text"
                          className={styles.searchInput}
                          placeholder="Search Hotels"
                          value={searchText}
                          onChange={(e) => setSearchText(e.target.value)}
                        />
                      </div>
                    </div>

                    {filteredHotels.length === 0 ? (
                      <div className={styles.stateBox}>
                        <p className={styles.stateText}>No hotels match your filters. Try adjusting them.</p>
                        <button
                          type="button"
                          className={styles.clearFiltersBtn}
                          style={{ width: 'auto', padding: '10px 24px' }}
                          onClick={clearAllFilters}
                        >
                          Clear Filters
                        </button>
                      </div>
                    ) : (
                      <div className={styles.hotelList}>
                        {visibleHotels.map((item, index) => {
                          const detail = hotelDetailsCache[item?.id];
                          const detailLoading = !detail || detail?.loading;
                          return (
                            <article key={item?.id || index} className={styles.hotelCard}>
                              <div className={styles.hotelCardInner}>
                                <div className={styles.hotelImageWrap}>
                                  {detailLoading ? (
                                    <div className={styles.imageSkeleton} />
                                  ) : detail?.images ? (
                                    <Image
                                      src={detail.images}
                                      fill
                                      className={styles.hotelImage}
                                      alt={item.name}
                                      unoptimized
                                    />
                                  ) : (
                                    <div className={styles.imagePlaceholder}>No Image</div>
                                  )}
                                  {Array.isArray(item?.rooms) && item.rooms.length > 0 && (
                                    <span className={styles.roomsBadge}>
                                      Rooms: {item.rooms.length}
                                    </span>
                                  )}
                                </div>

                                <div className={styles.hotelBody}>
                                  <div className={styles.hotelContent}>
                                    <div className={styles.hotelInfo}>
                                      <div className={styles.starsRow}>
                                        {item?.metadata?.stars && !Number.isNaN(Number(item.metadata.stars))
                                          ? renderStars(item.metadata.stars, 13)
                                          : <span className={styles.noRating}>No Rating</span>}
                                      </div>
                                      <h3 className={styles.hotelName}>{item.name}</h3>
                                      {detail?.address ? (
                                        <p className={styles.hotelAddress}>
                                          <CiLocationOn size={14} />
                                          <span>{detail.address}</span>
                                        </p>
                                      ) : null}
                                      {detail?.facilities?.length > 0 ? (
                                        <div className={styles.facilitiesRow}>
                                          {detail.facilities.slice(0, 3).map((amenity, i) => (
                                            <span key={i} className={styles.facilityChip}>{amenity}</span>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className={styles.hotelAside}>
                                      <div className={styles.priceGroup}>
                                        <div className={styles.priceBlock}>
                                          <div className={styles.priceNight}>
                                            <PriceDisplay
                                              price={(item.metadata?.min_price || 0) / nights}
                                              currency={item?.metadata?.currency}
                                            /> / Night
                                          </div>
                                          <div className={styles.priceNightSub}>VAT &amp; taxes included</div>
                                        </div>
                                        <div className={styles.priceBlock}>
                                          <div className={styles.priceTotal}>
                                            <PriceDisplay
                                              price={item.metadata?.min_price}
                                              currency={item?.metadata?.currency}
                                            />
                                          </div>
                                          <div className={styles.priceTotalSub}>
                                            Total for {nights} {nights === 1 ? 'night' : 'nights'}
                                          </div>
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        className={styles.selectBtn}
                                        onClick={() => {
                                          setConfirmHotel(item);
                                          setRevisionDetailOpen(true);
                                        }}
                                      >
                                        <FiCheckCircle size={14} /> Select Hotel
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        })}

                        {hasMore ? (
                          <div className="text-center mt-3 mb-4">
                            <button
                              type="button"
                              className={styles.selectBtn}
                              style={{ width: 'auto', padding: '10px 28px' }}
                              onClick={() => setVisibleCount((prev) => Math.min(prev + itemsPerPage, filteredHotels.length))}
                            >
                              Load More
                            </button>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>
          </div>
        </div>
      </Modal>

      <Drawer
        opened={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        title={<Text fw={700} size="md">Filters &amp; Sort</Text>}
        position="bottom"
        size="70%"
        radius="lg"
        overlayProps={{ backgroundOpacity: 0.4, blur: 2 }}
        withinPortal
        lockScroll
        zIndex={400}
      >
        <div style={{ overflowY: 'auto', paddingBottom: 80 }}>
          <div className={styles.filterPanel}>
            <p className={styles.filterSectionTitle}>Sort By</p>
            <div className={styles.pillGroup}>
              {[
                { value: 'default', label: 'Default' },
                { value: 'price_asc', label: 'Price ↑' },
                { value: 'price_desc', label: 'Price ↓' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.sortPill} ${sortBy === value ? styles.sortPillActive : ''}`}
                  onClick={() => setSortBy(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className={styles.filterSectionTitle}>Star Rating</p>
            <div className={styles.pillGroup}>
              {[5, 4, 3, 2, 1, 'unrated'].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.sortPill} ${selectedStars.includes(value) ? styles.sortPillActive : ''}`}
                  onClick={() => toggleFilter(setSelectedStars, value)}
                >
                  {value === 'unrated' ? 'Unrated' : `${value}★`}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.drawerFooter}>
          {activeFilterCount > 0 && (
            <button type="button" className={styles.drawerClearBtn} onClick={clearAllFilters}>
              Clear All
            </button>
          )}
          <button type="button" className={styles.drawerShowBtn} onClick={() => setFilterDrawerOpen(false)}>
            Show {filteredHotels.length} {filteredHotels.length === 1 ? 'Hotel' : 'Hotels'}
          </button>
        </div>
      </Drawer>
    </>
  );
}
