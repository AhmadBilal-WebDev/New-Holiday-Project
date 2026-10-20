"use client";
import React, { useState, useEffect } from "react";
import { DatePickerInput } from "@mantine/dates";
import { Popover } from "@mantine/core";
import { FaMinus, FaPlus, FaCalendarAlt, FaUsers } from "react-icons/fa";
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import moment from "moment";
import HotelLocationSelector from './HotelLocationSelector';
export default function HotelSearch() {
  const [popoverOpened, setPopoverOpened] = useState(false);
  const [breakPoint, setBreakPoint] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isPlaceDetailsLoading, setIsPlaceDetailsLoading] = useState(false);
  const [countryCode, setCountryCode] = useState('');
  const [rooms, setRooms] = useState([
    { adults: 2, children: 0, childrenAges: [], errors: {} }
  ]);

  useEffect(() => {
    setBreakPoint(window.innerWidth <= 500);
    setIsMobile(window.innerWidth <= 768);

    const handleResize = () => {
      setBreakPoint(window.innerWidth <= 500);
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

    useEffect(() => {

    const getCountry = async () => {
      try {
        const res = await fetch("https://api.country.is/");
        const data = await res.json();

        setCountryCode(data.country);
      } catch (error) {
        console.log(error);
      }
    };

    getCountry();
  }, []);

  const [formData, setFormData] = useState({
    location: "",
    city: "",
    code: "",
    country: "",
    lat: null,
    lng: null,
    dateRange: [moment().add(1, 'days').format('YYYY-MM-DD'), moment().add(2, 'days').format('YYYY-MM-DD')],
  })
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
    setFormData((prev) => ({ ...prev, location: e.target.value }));
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
      } else if (component.types.includes("postal_town")) {
        city = component.long_name;
      }
      if (component.types.includes("country")) {
        country = component.long_name;
        code = component.short_name;
      }
    });

    setFormData((prev) => ({
      ...prev,
      location: place.displayName || place.formatted_address,
      lat,
      lng,
      city,
      code,
      country,
    }));
  };
  const handleDateChange = (value) => {
    let newValue = value;

    if (!value[0] && !value[1]) {
      newValue = [];
    }
    setFormData((prev) => ({
      ...prev,
      dateRange: newValue,
    }));
  };
  const validateForm = () => {
    // ✅ Check location
    if (!formData.location) {
      notifications.show({
        autoClose: 2000,
        title: "Error",
        message: "Location is required",
        color: "red",
      });
      return false;
    }

    // ✅ Check date range
    if (!formData.dateRange || formData.dateRange.length !== 2) {
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
    if (!validateForm()) return;

    const roomsArray = rooms.map(room => ({
      adults: room.adults,
      children: room.childrenAges.map(age => ({ age: Number(age) }))
    }));
    localStorage.setItem('clientNationality', countryCode);
    const queryParams = new URLSearchParams();
    const locationName = document.getElementsByName('hotellocation')[0].value;
    queryParams.set('checkIn', formData.dateRange[0])
    queryParams.set('checkOut', formData.dateRange[1])
    queryParams.set('currency', 'GBP')
    queryParams.set('place', locationName)
    // Destination - flatten for readability
    queryParams.set('city', formData.city)
    queryParams.set('nationality', countryCode)
    queryParams.set('lat', formData.lat)
    queryParams.set('lng', formData.lng)
    queryParams.set('code', formData.code)
    queryParams.set('location', formData.location)
    queryParams.set('country', formData.country)
    queryParams.set('r', String(Date.now()))
    localStorage.setItem('searchRoomSelection', JSON.stringify(roomsArray));
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
    <div>
      <div className="row ">
        <div className="col-md-3 my-1">
          <HotelLocationSelector
            value={formData.location}
            onChange={handleLocationChange}
            onPlaceSelected={handlePlaceSelected}
            isMobile={isMobile}
            onLoadingChange={setIsPlaceDetailsLoading}
          />
        </div>
        <div className="col-md-3 my-1">
          <div className="d-flex align-items-center position-relative">
            <div className="position-absolute search-field-icon" style={{ left: '12px', zIndex: 10 }}>
              <FaCalendarAlt size={18} />
            </div>
            <div className="form-floating w-100">
              <DatePickerInput
                variant="unstyled"
                id="floatingInput2"
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
                    paddingLeft: '58px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  },
                }}
                type="range"
              />
              <label htmlFor="floatingInput2" style={{ paddingLeft: '58px' }}>Dates</label>
            </div>
          </div>
        </div>
        <div className="col-md-3 my-1">
          <Popover
            width={300}
            opened={popoverOpened}
            onChange={setPopoverOpened}
            position="bottom"
            withArrow
            shadow="md"
            styles={{
              dropdown: {
                maxHeight: 380,       // fixed height
                overflowY: "auto",    // enable scroll
              },
            }}
            clickOutsideEvents={["mouseup", "touchend"]}
          >
            <Popover.Target>
              <div className="d-flex align-items-center position-relative">
                <div className="position-absolute search-field-icon" style={{ left: '12px', zIndex: 10 }}>
                  <FaUsers size={18} />
                </div>
                <div className="form-floating w-100">
                  <button
                    id="floatingInput3"
                    onClick={() => setPopoverOpened((o) => !o)}
                    className="form-control btn btn-light text-start person-selection w-100"
                    style={{ paddingLeft: '58px' }}
                  >
                    {totalAdults + totalChildren} traveler{totalAdults + totalChildren !== 1 ? 's' : ''}, {rooms.length} room{rooms.length !== 1 ? 's' : ''}
                    {/* {totalAdults > 1 ? 'Adults' : 'Adult'}  {totalAdults} | {totalChildren > 1 ? 'Childs' : 'Child'}  {totalChildren} | {rooms.length > 1 ? 'Rooms' : 'Room'}  {rooms.length} */}
                  </button>
                  <label htmlFor="floatingInput3" style={{ paddingLeft: '58px' }}>Guests</label>
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
                <button onClick={ClosePopover} type="button" className="btn  w-100 btn-outline-success">Done</button>
              </div>
            </Popover.Dropdown>
          </Popover>
        </div>
        <div className="col-md-3 my-1">
          <button
            onClick={SubmitForm}
            disabled={isPlaceDetailsLoading}
            className="btn btn-success search-btn-styling-home bg-color w-100 h-100"
          >
            Search
          </button>
        </div>
      </div>
    </div>
  );
}
