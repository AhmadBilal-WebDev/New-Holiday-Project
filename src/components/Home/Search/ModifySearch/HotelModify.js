"use client";
import React, { useEffect, useRef, useState } from "react";
import { DatePickerInput } from "@mantine/dates";
import { Popover } from "@mantine/core";
import { FaCalendarAlt, FaMinus, FaPlus, FaSearch, FaUsers } from "react-icons/fa";
import { notifications } from "@mantine/notifications";
import { useRouter, useSearchParams } from "next/navigation";
import { Inter, Outfit } from "next/font/google";
import HotelLocationSelector from '../HotelLocationSelector';
import styles from './HotelModify.module.css';

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});

export default function HotelModify({ onSearch }) {
  const [popoverOpened, setPopoverOpened] = useState(false);
  const searchParams = useSearchParams();
  const [rooms, setRooms] = useState([
    { adults: 2, children: 0, childrenAges: [], errors: {} }
  ]);
  const [breakPoint, setBreakPoint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPlaceDetailsLoading, setIsPlaceDetailsLoading] = useState(false);
  const [formData, setFormData] = useState({
    location: "",
    city: "",
    code: "",
    country: "",
    lat: null,
    lng: null,
    dateRange: [],
  })
  const formDataRef = useRef(formData);
  const [clientNationality, setClientNationality] = useState('');

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);
  const addRoom = () => {
    if (rooms.length >= 5) {
      notifications.show({
        autoClose: 2000,
        title: "Limit reached",
        message: "Maximum 5 rooms allowed",
        color: "red",
      });
      return;
    }
    setRooms([...rooms, { adults: 2, children: 0, childrenAges: [], errors: {} }]);
  };

  useEffect(() => {
    setBreakPoint(window.innerWidth <= 500);
    setIsMobile(window.innerWidth <= 768);

    const handleResize = () => {
      setBreakPoint(window.innerWidth <= 500);
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    if (searchParams && searchParams.toString()) {
      const city = searchParams.get("city");
      const countryCode = searchParams.get("code");
      const clientNationality = searchParams.get("nationality");
      const check_in = searchParams.get("checkIn");
      const check_out = searchParams.get("checkOut");
      const lat = searchParams.get("lat");
      const long = searchParams.get("lng");
      const location = searchParams.get("location");
      const country = searchParams.get("country");
      const place = searchParams.get("place");
      setClientNationality(clientNationality);
      const nextForm = {
        location: location,
        city: city,
        code: countryCode,
        country: country,
        lat: lat,
        lng: long,
        dateRange: [check_in, check_out],
      };
      formDataRef.current = nextForm;
      setFormData(nextForm);
      const loc = document.getElementsByName('hotellocation')[0];
      if (loc) loc.value = place;
    } else {
      const data = localStorage.getItem('HotelSearchData');
      if (data) {
        const newData = JSON.parse(data);
        const nextForm = {
          location: newData?.location,
          city: newData?.city,
          code: newData?.countryCode,
          country: newData?.country,
          lat: newData?.lat,
          lng: newData?.long,
          dateRange: [newData?.check_in, newData?.check_out],
        };
        formDataRef.current = nextForm;
        setFormData(nextForm);
        const loc = document.getElementsByName('hotellocation')[0];
        if (loc) loc.value = newData?.location;
      }
    }
    let RoomMap = []
    const roomData = localStorage.getItem('searchRoomSelection');
    if (roomData) {
      RoomMap = JSON.parse(roomData)
    }
    const formattedRooms = RoomMap.slice(0, 5).map(item => {
      const childrenList = (item.children || []).slice(0, 4);
      return {
        adults: Math.min(6, Math.max(1, Number(item.adults) || 1)),
        children: childrenList.length,
        childrenAges: childrenList.map(c => c.age),
        errors: {}
      };
    });
    setRooms(formattedRooms.length ? formattedRooms : [{ adults: 2, children: 0, childrenAges: [], errors: {} }]);

    return () => window.removeEventListener('resize', handleResize);
  }, [searchParams])
  const router = useRouter();
  const removeRoom = (index) => {
    if (rooms.length === 1) return;
    const updatedRooms = rooms.filter((_, i) => i !== index);
    setRooms(updatedRooms);
  };
  const handleRoomChange = (index, type, delta) => {
    const updatedRooms = [...rooms];

    if (type === "adults") {
      const prevAdults = updatedRooms[index].adults;
      if (delta > 0 && prevAdults >= 6) {
        notifications.show({
          autoClose: 2000,
          title: "Limit reached",
          message: "Maximum 6 adults allowed per room",
          color: "red",
        });
        return;
      }
      updatedRooms[index].adults = Math.min(6, Math.max(1, prevAdults + delta));
    }
    else if (type === "children") {
      const prevCount = updatedRooms[index].children;
      if (delta > 0 && prevCount >= 4) {
        notifications.show({
          autoClose: 2000,
          title: "Limit reached",
          message: "Maximum 4 children allowed per room",
          color: "red",
        });
        return;
      }
      const newCount = Math.min(4, Math.max(0, prevCount + delta));
      if (newCount === prevCount) return;

      updatedRooms[index].children = newCount;

      // copy old ages
      let ages = [...(updatedRooms[index].childrenAges || [])];

      if (newCount > prevCount) {
        // child add hua → sirf new entry null
        ages.push(null);
      } else if (newCount < prevCount) {
        // child remove hua → last age remove
        ages.pop();
      }

      updatedRooms[index].childrenAges = ages;

      // agar children 0 ho jaen to errors remove
      if (newCount === 0) {
        updatedRooms[index].errors = {};
      }
    }

    setRooms(updatedRooms);
  };
  const handleAgeChange = (roomIndex, ageIndex, value) => {
    const updatedRooms = [...rooms];
    updatedRooms[roomIndex].childrenAges[ageIndex] = value;
    const hasEmptyAge = updatedRooms[roomIndex].childrenAges.some((age) => !age);
    if (!hasEmptyAge) {
      updatedRooms[roomIndex].errors = {};
    }
    setRooms(updatedRooms);
  };

  const handleLocationChange = (e) => {
    // Typing / clearing invalidates previous place coords so Search can't use stale city
    const next = {
      ...formDataRef.current,
      location: e.target.value,
      city: "",
      code: "",
      country: "",
      lat: null,
      lng: null,
    };
    formDataRef.current = next;
    setFormData(next);
  }
  const totalAdults = rooms.reduce((sum, room) => sum + room.adults, 0);
  const totalChildren = rooms.reduce((sum, room) => sum + room.children, 0);

  const handlePlaceSelected = (place) => {
    if (!place.geometry) return;

    const lat = place.geometry?.location?.lat;
    const lng = place.geometry?.location?.lng;
    let city = "";
    let country = "";
    let code = "";
    place.address_components.forEach((component) => {
      if (component.types.includes("locality")) {
        city = component.long_name;
      } else if (!city && component.types.includes("postal_town")) {
        city = component.long_name;
      } else if (!city && component.types.includes("administrative_area_level_2")) {
        city = component.long_name;
      } else if (!city && component.types.includes("administrative_area_level_1")) {
        city = component.long_name;
      }
      if (component.types.includes("country")) {
        country = component.long_name;
        code = component.short_name;
      }
    });

    if (!city) {
      city = place.displayName || place.formatted_address || "";
    }

    const next = {
      ...formDataRef.current,
      location: place.displayName || place.formatted_address,
      lat,
      lng,
      city,
      code,
      country,
    };
    formDataRef.current = next;
    setFormData(next);
  };
  const handleDateChange = (value) => {
    let newValue = value;

    if (!value[0] && !value[1]) {
      newValue = [];
    }
    const next = {
      ...formDataRef.current,
      dateRange: newValue,
    };
    formDataRef.current = next;
    setFormData(next);
  };

  const validateForm = () => {
    const data = formDataRef.current;

    // ✅ Check location
    if (!data.location) {
      notifications.show({
        autoClose: 2000,
        title: "Error",
        message: "Location is required",
        color: "red",
      });
      return false;
    }

    // Must pick from suggestions so city/lat/lng are resolved
    if (!data.city || data.lat == null || data.lng == null) {
      notifications.show({
        autoClose: 2000,
        title: "Error",
        message: "Please select a location from the suggestions",
        color: "red",
      });
      return false;
    }

    // ✅ Check date range
    if (!data.dateRange || data.dateRange.length !== 2) {
      notifications.show({
        autoClose: 2000,
        title: "Error",
        message: "Please select check-in and check-out dates",
        color: "red",
      });
      return false;
    }

    // ✅ Check children ages for each room
    const updatedRooms = rooms.map((room) => {
      const roomErrors = {};
      if (room.children > 0) {
        const hasEmptyAge = room.childrenAges.some((age) => !age);
        if (hasEmptyAge) {
          roomErrors.childrenAges = "Please select age for all children";
        }
      }
      return { ...room, errors: roomErrors };
    });

    setRooms(updatedRooms);

    const hasRoomErrors = updatedRooms.some(
      (room) => Object.keys(room.errors).length > 0
    );

    if (hasRoomErrors) {
      notifications.show({
        autoClose: 2000,
        title: "Error",
        message: "Please select age for all children",
        color: "red",
      });
      setPopoverOpened(true);
      return false;
    }

    return true;
  };
  const SubmitForm = () => {
    if (isPlaceDetailsLoading) return;
    if (!validateForm()) return;

    const data = formDataRef.current;
    const roomsArray = rooms.map(room => ({
      adults: room.adults,
      children: room.childrenAges.map(age => ({ age: Number(age) }))
    }));

    const queryParams = new URLSearchParams();
    const locationName = document.getElementsByName('hotellocation')[0]?.value || data.location;
    queryParams.set('checkIn', data.dateRange[0])
    queryParams.set('checkOut', data.dateRange[1])
    queryParams.set('currency', 'GBP')
    queryParams.set('place', locationName)
    // Destination - flatten for readability
    queryParams.set('city', data.city)
    queryParams.set('nationality', clientNationality)
    queryParams.set('lat', data.lat)
    queryParams.set('lng', data.lng)
    queryParams.set('code', data.code)
    queryParams.set('location', data.location)
    queryParams.set('country', data.country)
    // Force a fresh search even when criteria are unchanged
    queryParams.set('r', String(Date.now()))
    localStorage.setItem('searchRoomSelection', JSON.stringify(roomsArray));
    if (onSearch) onSearch();
    router.push(`/hotels?${queryParams.toString()}`);
  };
  const ClosePopover = () => {
    // ✅ Check children ages for each room
    const updatedRooms = rooms.map((room) => {
      const roomErrors = {};
      if (room.children > 0) {
        const hasEmptyAge = room.childrenAges.some((age) => !age);
        if (hasEmptyAge) {
          roomErrors.childrenAges = "Please select age for all children";
        }
      }
      return { ...room, errors: roomErrors };
    });

    setRooms(updatedRooms);
    const hasRoomErrors = updatedRooms.some(
      (room) => Object.keys(room.errors).length > 0
    );
    if (hasRoomErrors) {
      return;
    }
    setPopoverOpened(false);
  };

  return (
    <div className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.intro}>
          <h1 className={`${styles.title} ${outfit.className}`}>
            Where is your next <span className={styles.titleAccent}>dream place?</span>
          </h1>
          <p className={`${styles.subtitle} ${inter.className}`}>
            Find exclusive Genius rewards in every corner of the world — vetted hotels,
            member rates and instant confirmation.
          </p>
        </div>

        <div className={styles.bar}>
          <div className={styles.field}>
            <HotelLocationSelector
              value={formData.location}
              onChange={handleLocationChange}
              onPlaceSelected={handlePlaceSelected}
              isMobile={isMobile}
              onLoadingChange={setIsPlaceDetailsLoading}
            />
          </div>

          <div className={styles.field}>
            <div className="d-flex align-items-center position-relative w-100">
              <div className="position-absolute search-field-icon" style={{ left: '8px', zIndex: 10 }}>
                <FaCalendarAlt size={16} />
              </div>
              <div className="form-floating w-100">
                <DatePickerInput
                  variant="unstyled"
                  id="hotel-modify-dates"
                  minDate={new Date()}
                  valueFormat="DD-MM-YYYY"
                  numberOfColumns={breakPoint ? 1 : 2}
                  value={formData.dateRange}
                  onChange={handleDateChange}
                  className="form-control hotel-date-range"
                  placeholder="Select dates"
                  styles={{
                    root: {
                      minWidth: 0,
                      width: '100%',
                      overflow: 'hidden',
                      paddingLeft: 0,
                    },
                    wrapper: {
                      overflow: 'hidden',
                      minWidth: 0,
                    },
                    input: {
                      paddingLeft: '56px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    },
                  }}
                  type="range"
                />
                <label htmlFor="hotel-modify-dates" style={{ paddingLeft: '56px' }}>Dates</label>
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <Popover
              width={300}
              opened={popoverOpened}
              onChange={setPopoverOpened}
              position="bottom"
              withArrow
              shadow="md"
              styles={{
                dropdown: {
                  maxHeight: 380,
                  overflowY: "auto",
                },
              }}
              clickOutsideEvents={["mouseup", "touchend"]}
            >
              <Popover.Target>
                <div className="d-flex align-items-center position-relative w-100">
                  <div className="position-absolute search-field-icon" style={{ left: '8px', zIndex: 10 }}>
                    <FaUsers size={16} />
                  </div>
                  <div className="form-floating w-100">
                    <button
                      id="hotel-modify-guests"
                      type="button"
                      onClick={() => setPopoverOpened((o) => !o)}
                      className="form-control btn btn-light text-start person-selection w-100"
                      style={{ paddingLeft: '56px' }}
                    >
                      {totalAdults + totalChildren} traveler{totalAdults + totalChildren !== 1 ? 's' : ''}, {rooms.length} room{rooms.length !== 1 ? 's' : ''}
                    </button>
                    <label style={{ paddingLeft: '56px' }} htmlFor="hotel-modify-guests">Guests</label>
                  </div>
                </div>
              </Popover.Target>
              <Popover.Dropdown>
                <div className="p-2">
                  {rooms.map((room, index) => (
                    <div key={index} className="mt-2">
                      <div className="d-flex justify-content-between  align-items-center">
                        <p className="small m-0">Room {index + 1}</p>
                        {index + 1 !== 1 && (
                          <button onClick={() => removeRoom(index)} className="btn btn-danger x-small btn-sm">
                            Delete
                          </button>
                        )}
                      </div>
                      <hr className="m-1" />
                      <div className="e484bb5b7a mt-2">
                        <div className="c5aae0350e">
                          <label className="small " >
                            Adults
                          </label>
                        </div>
                        <div className="e301a14002">
                          <div className="e301a14002">
                            <button onClick={() => handleRoomChange(index, "adults", -1)} className="adult-modal-btn" >
                              <FaMinus />
                            </button>
                            <span className="mx-2" aria-hidden="true">
                              {room.adults}
                            </span>
                            <button onClick={() => handleRoomChange(index, "adults", 1)} className="adult-modal-btn" >
                              <FaPlus />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="e484bb5b7a mt-2">
                        <div className="c5aae0350e">
                          <label className="small " >
                            Children
                          </label>
                        </div>
                        <div className="e301a14002">
                          <div className="e301a14002">
                            <button onClick={() => handleRoomChange(index, "children", -1)} className="adult-modal-btn" >
                              <FaMinus />
                            </button>
                            <span className="mx-2" aria-hidden="true">
                              {room.children}
                            </span>
                            <button
                              onClick={() => handleRoomChange(index, "children", 1)}
                              className="adult-modal-btn"
                            >
                              <FaPlus />
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="d-flex mt-2 flex-wrap justify-content-between">
                        {room.childrenAges.map((age, ageIndex) => (
                          <div key={ageIndex} className="kids-age-select">
                            <select onChange={(e) => handleAgeChange(index, ageIndex, e.target.value)}
                              value={age} className="form-control border  form-control-sm">
                              <option value="">Age Needed</option>
                              {[...Array(16).keys()].map((n) => (
                                <option key={n + 1} value={n + 1}>
                                  {n + 1}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>
                      {room.errors.childrenAges && (
                        <p className="text-danger small mt-1">
                          {room.errors.childrenAges}
                        </p>
                      )}
                    </div>
                  ))}
                  <hr />
                  <p onClick={addRoom} className="small cursor-pointer text-end mb-1 text-primary">+ Add Room</p>
                  <button onClick={ClosePopover} type="button" className="btn  w-100" style={{ backgroundColor: '#E7247A', color: '#fff', borderColor: '#E7247A' }}>Done</button>
                </div>
              </Popover.Dropdown>
            </Popover>
          </div>

          <div className={styles.searchAction}>
            <button
              type="button"
              onClick={SubmitForm}
              disabled={isPlaceDetailsLoading}
              className={styles.searchBtn}
            >
              {isPlaceDetailsLoading ? (
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
              ) : (
                <FaSearch size={14} aria-hidden="true" />
              )}
              Search
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
