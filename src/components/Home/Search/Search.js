'use client'

import React, { useEffect, useState, Suspense } from "react";
import { FaBed, FaBroom, FaCalendarAlt, FaCheck, FaHotel, FaKaaba, FaList, FaUser, FaShieldAlt, FaHeadset } from "react-icons/fa";
import dynamic from "next/dynamic";
import HeroSection from "./HeroSection";
import styles from "./search.module.css";
import { HiOutlineSparkles } from "react-icons/hi2";
import AiSearch from "./AiSearch";
import { IoIosStarOutline } from "react-icons/io";
import GeneralPackages from "./GeneralPackages";
import { FaLocationDot } from "react-icons/fa6";
import { usePackageCategories } from "@/contexts/PackageCategoriesContext";
import { Outfit } from "next/font/google";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// Dynamic imports
const HotelSearch = dynamic(() => import("./HotelSearch"));
const PackageSearch = dynamic(() => import("./PackageSearch"));
const ActivitySearch = dynamic(() => import("./ActivitySearch"));
const FlightSearch = dynamic(() => import("./FlightSearch"));
const TransferSearch = dynamic(() => import("./TransferSearch"));
const UmrahGetAway = dynamic(() => import("./UmrahGetAway"));


export default function Search() {
  const { categories, loading: loadingCategories } = usePackageCategories();
  const [isMobile, setIsMobile] = useState(true);
  const [activeTab, setActiveTab] = useState('umrah-get-away');
  // const LabelsList = [
  //   {name : 'umrah-get-away' , label : 'Build Your Own Package in 4 Easy Steps'},
  //   {name : 'package-tab-pane' , label : 'Build Your Group Package in 4 Easy Steps'},
  //   {name : 'hotel-tab-pane' , label : 'Secure Your Stay in 4 Easy Steps'},
  //   {name : 'flight-tab-pane' , label : 'Book Your Flight in 3 Easy Steps'},
  //   {name : 'transfer-tab-pane' , label : 'Arrange Your Transfer in 3 Easy Steps'},
  //   {name : 'activity-tab-pane' , label : 'Discover & Book Activities in 3 Easy Steps'},
  //   {name : 'general-package-tab-pane' , label : 'Build Your Holiday Package in 3 Easy Steps'},

  // ]
  useEffect(() => {
    if (window.innerWidth > 768) {
      setIsMobile(false);
    }

    // Load saved tab from localStorage
    const savedTab = localStorage.getItem('selectedSearchTab');
    if (savedTab) {
      setActiveTab(savedTab);
    }
  }, []);

  // Handle tab change
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem('selectedSearchTab', tabId);
  };

  return (
    <div className={styles.heroWrapper}>
      {/* Swiper Carousel Background */}
      <div className={styles.heroCarouselBackground}>
        <HeroSection />
      </div>

      {/* Content */}
      <div className={`${styles.heroContent} ${outfit.className}`}>
        <div className="container px-0 px-sm-auto">
          {/* Hero intro — lg+ only (992px+) */}
          <div className={styles.heroIntro}>
            <span className={styles.heroBadge}>
              <HiOutlineSparkles aria-hidden="true" />
              Trusted by 250,000+ travelers worldwide
            </span>
            <h1 className={styles.heroHeading}>
              Where every journey feels{' '}
              <span className={styles.heroHeadingAccent}>extraordinary.</span>
            </h1>
            <p className={styles.heroLead}>
              From relaxing beach breaks and city escapes to exciting adventures, find the perfect holiday with stays, flights, experiences and more — all in one place.
            </p>
            <ul className={styles.heroFeatures}>
              <li>
                <FaCheck className={styles.heroFeatureIcon} aria-hidden="true" />
                Best price guarantee
              </li>
              <li>
                <FaShieldAlt className={styles.heroFeatureIcon} aria-hidden="true" />
                Secure booking
              </li>
              <li>
                <FaHeadset className={styles.heroFeatureIcon} aria-hidden="true" />
                24/7 concierge
              </li>
            </ul>
          </div>

          {/* Search panel — tabs + forms (UI shell only; tab logic unchanged) */}
          <div className={styles.searchPanel}>
          <div className={`${styles.searchTabsWrapper} home-search-top-wrapper`}>
            <ul className={`nav nav-pills ${styles.largesearch} d-none d-md-flex gap-2 lights medium px-0`} id="searchTabs" role="tablist">
              {/* <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'umrah-get-away' ? 'active' : ''} h-100`} id="umrah-get-tab" data-bs-toggle="tab" data-bs-target="#umrah-get-away" type="button" role="tab" aria-controls="umrah-get-away" aria-selected={activeTab === 'umrah-get-away'} onClick={() => handleTabChange('umrah-get-away')}>
                  <FaKaaba color='#ffffff' size={30} />{' '}
                  Umrah Getaway
                </button>
              </li> */}

              <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'package-tab-pane' ? 'active' : ''} h-100`} id="package-tab" data-bs-toggle="tab" data-bs-target="#package-tab-pane" type="button" role="tab" aria-controls="package-tab-pane" aria-selected={activeTab === 'package-tab-pane'} onClick={() => handleTabChange('package-tab-pane')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width='30px' height='30px' fill="none" viewBox="0 0 33 33" focusable="false" aria-hidden="true" role="img"><g clipPath="url(#PackagesGrey_tsx__a)"><path fill='#ffffff' d="M3.197 28.105h-1.9v1.135h1.9zM15.72 28.105h-2.356v.87h2.355z"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687H1.14"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M2.979 20.694H1.648a.509.509 0 0 0 0 1.015h13.726a.509.509 0 0 0 0-1.015H14.03"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687h7.368"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M3.713 27.687v1.647H1.14v-5.06c0-.828.316-1.622.887-2.219l.338-.354 1.6-2.675a1.56 1.56 0 0 1 1.429-.935h6.178c.61 0 1.17.359 1.42.913l1.652 2.697.495.52c.405.427.738 1.255.738 1.844v5.269h-2.573v-1.647"></path><path fill='#ffffff' d="m5.347 27.687.559-1.114c.162-.324.546-.537.977-.537h3.238c.423 0 .807.209.969.525l.584 1.122M11.628 24.93c.102-.4.96-1.365 2.12-1.365.273 0 .55.086.644.35.094.265.145.606.06 1.067a.52.52 0 0 1-.427.414 6.3 6.3 0 0 1-2.073 0c-.218-.039-.371-.248-.32-.461zM5.39 24.93c-.103-.4-.96-1.365-2.12-1.365-.274 0-.551.086-.645.35-.094.265-.145.606-.06 1.067.038.213.213.38.427.414.426.072 1.203.15 2.073 0 .218-.039.372-.248.32-.461zM10.24 24.257H6.777a.39.39 0 0 0-.388.388v.444c0 .214.174.388.388.388h3.465a.39.39 0 0 0 .388-.388v-.444a.39.39 0 0 0-.388-.388"></path><path fill='#ffffff' stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="m14.985 8.295-10.423 2.13a1.79 1.79 0 0 1-1.899-.841L1.14 7.019l1.075-.537 1.596 1.365L14.422 5.68a2.96 2.96 0 0 1 1.677.145l.073.03a.983.983 0 0 1 .345 1.6 2.96 2.96 0 0 1-1.532.84Z"></path><path fill='#ffffff' d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path fill='#ffffff' d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M19.354 11.026h9.212000000000002M20.195 11.026v18.312M27.73 11.026v18.312"></path><path fill='#ffffff' d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338v-8.076h-4.13"></path><path fill='#ffffff' d="M23.066 13.453h-.814a.324.324 0 0 0-.325.325v.806c0 .18.145.324.325.324h.814c.18 0 .325-.145.325-.324v-.806a.324.324 0 0 0-.325-.325M25.89 13.453h-.814a.324.324 0 0 0-.324.325v.806c0 .18.145.324.324.324h.815c.179 0 .324-.145.324-.324v-.806a.324.324 0 0 0-.324-.325M23.066 16.338h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.146.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 16.338h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.146.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 19.299h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 19.299h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 22.26h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 22.26h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338H20.195"></path></g><defs><clipPath id="PackagesGrey_tsx__a"><path fill="#fff" d="M.5 3.021h32v26.957H.5z"></path></clipPath></defs></svg>
                  {' '}Packages
                </button>
              </li>

              <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'hotel-tab-pane' ? 'active' : ''} h-100`} id="hotel-tab" data-bs-toggle="tab" data-bs-target="#hotel-tab-pane" type="button" role="tab" aria-controls="hotel-tab-pane" aria-selected={activeTab === 'hotel-tab-pane'} onClick={() => handleTabChange('hotel-tab-pane')}>
                  <svg fill='#ffffff' height='30px' width='30px' version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 275.214 275.214" xmlSpace="preserve" stroke='#ffffff'><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M273.799,250.321c-1.872-3.152-5.304-5.276-7.256-4.592c-0.06,0.024-0.116-0.008-0.184-0.032 c2.052-3.628,0.356-8.808-2.452-11.6c-2.408-2.384-5.348-2.916-7.692-1.408c-0.036-0.02-0.124-0.14-0.1-0.32 c0.88-6.632-2.08-9.08-3.924-9.952c-3.128-1.472-7.54-0.524-10.576,2.204c-0.02-0.068-0.036-0.14-0.04-0.2 c-0.308-5.224-3.052-7.632-5.516-8.144c-2.696-0.568-5.42,0.844-7.276,3.728c-0.232-0.412-0.48-0.892-0.648-1.22 c-0.36-0.7-0.676-1.308-0.948-1.66c-0.72-0.932-1.56-1.688-2.468-2.356v-159.7h4.052l1.768-1.768V42.673l-1.768-1.768h-17.268 c0.136-0.272,0.228-0.564,0.228-0.888v-7.836c0-1.116-0.904-2.02-2.02-2.02h-6.964V12.953c0-1.116-0.904-2.02-2.02-2.02h-9.176 c-1.116,0-2.02,0.904-2.02,2.02v27.06c0,0.324,0.092,0.616,0.228,0.888h-4.18c0.136-0.272,0.228-0.564,0.228-0.888v-7.568 c0-0.884-0.564-1.632-1.356-1.908c0.064-0.192,0.096-0.4,0.096-0.616v-7.072c0-0.268-0.052-0.52-0.144-0.756 c0.46-0.372,0.756-0.94,0.756-1.576v-7.568c0-1.116-0.904-2.02-2.02-2.02h-18.616c-1.116,0-2.02,0.904-2.02,2.02v27.06 c0,0.324,0.092,0.616,0.228,0.888h-9.84c0.136-0.272,0.228-0.564,0.228-0.888v-17.36h4.632c1.116,0,2.02-0.904,2.02-2.02v-7.684 c0-1.116-0.904-2.02-2.02-2.02h-22.4c-1.116,0-2.02,0.904-2.02,2.02v7.684c0,1.116,0.904,2.02,2.02,2.02h4.632v17.36 c0,0.324,0.092,0.616,0.228,0.888h-16.14c1.44-0.708,2.788-1.536,3.932-2.6c1.556-1.456,2.78-3.22,3.652-5.252 c0.868-2.028,1.312-4.288,1.312-6.72c0-2.436-0.444-4.684-1.32-6.68c-0.868-1.992-2.104-3.724-3.664-5.14 c-1.552-1.4-3.384-2.484-5.452-3.228c-2.04-0.74-4.276-1.116-6.648-1.116c-2.368,0-4.604,0.376-6.652,1.116 c-2.076,0.748-3.904,1.836-5.432,3.232c-1.544,1.412-2.768,3.136-3.644,5.132c-0.872,1.992-1.316,4.236-1.316,6.68 c0,2.436,0.44,4.696,1.308,6.72c0.872,2.032,2.092,3.796,3.628,5.24c1.132,1.068,2.48,1.9,3.924,2.608H94.847 c0.136-0.272,0.228-0.564,0.228-0.888v-27.06c0-1.116-0.904-2.02-2.02-2.02h-9.136c-1.116,0-2.02,0.904-2.02,2.02v7.168h-3.376 v-7.152c0-1.116-0.904-2.02-2.02-2.02h-9.06c-1.116,0-2.02,0.904-2.02,2.02v27.06c0,0.324,0.092,0.616,0.228,0.888H44.299 l-1.76,1.768v10.628l1.768,1.768h4.052v161.892c-0.112,0.064-0.248,0.08-0.332,0.188c-0.272,0.352-0.584,0.96-0.948,1.66 c-0.168,0.328-0.416,0.808-0.648,1.216c-1.856-2.88-4.584-4.296-7.276-3.728c-2.468,0.512-5.208,2.92-5.516,8.136 c-0.004,0.064-0.016,0.136-0.04,0.204c-3.036-2.728-7.44-3.692-10.576-2.204c-1.844,0.868-4.804,3.32-3.924,9.948 c0.016,0.136-0.028,0.236,0.008,0.292c-2.5-1.468-5.42-0.928-7.804,1.436c-2.804,2.788-4.5,7.96-2.444,11.596 c-0.06,0.024-0.116,0.04-0.132,0.04c-2.02-0.716-5.44,1.424-7.312,4.576c-1.324,2.224-3.616,8.092,3.672,14.48l0.668,0.252 h36.316h38.892h113.296h36.752h38.452l0.668-0.252C277.415,258.413,275.123,252.545,273.799,250.321z M200.731,12.957v19.224 h8.984v7.836h-18.156v-27.06H200.731z M164.519,12.957h0.004h18.616v7.568h-10.056v2.332h9.444v7.072h-9.444v2.524h10.7v7.568 h-19.264V12.957z M135.351,20.641v-7.684h22.4v7.684h-6.652v19.38h-9.096v-19.38H135.351z M105.167,36.829 c-1.34-1.264-2.392-2.788-3.156-4.568c-0.764-1.784-1.144-3.76-1.144-5.924c0-2.168,0.38-4.124,1.144-5.868 c0.764-1.748,1.816-3.228,3.156-4.452c1.336-1.22,2.924-2.164,4.756-2.824c1.836-0.664,3.824-0.996,5.964-0.996 c2.144,0,4.128,0.332,5.964,0.996c1.836,0.66,3.428,1.604,4.78,2.824c1.348,1.224,2.408,2.708,3.168,4.452 c0.764,1.748,1.148,3.7,1.148,5.868c0,2.164-0.384,4.14-1.148,5.924c-0.76,1.78-1.82,3.304-3.168,4.568 c-1.352,1.26-2.944,2.232-4.78,2.924c-1.832,0.688-3.82,1.032-5.964,1.032c-2.14,0-4.128-0.344-5.964-1.032 C108.091,39.065,106.503,38.089,105.167,36.829z M67.443,12.957h0.004h9.06v9.172h7.416v-9.172h9.136v27.06h-9.1v-10.28h-7.416 v10.28h-9.1V12.957z M82.171,40.909h-3.832c0.136-0.272,0.228-0.568,0.228-0.888v-8.26h3.376v8.26 C81.943,40.345,82.035,40.637,82.171,40.909z M46.071,51.537v-7.096h180.932v7.096H46.071z M158.527,167.189h-43.976 l-1.768,1.768v82.892H51.895V55.069h169.288v196.78h-60.888v-82.892L158.527,167.189z M156.759,170.725v80.364h-40.44v-80.364 H156.759z M40.307,253.973v9.092H6.139c-5.612-5.112-4.292-9.524-2.984-11.72c1.632-2.744,4.252-3.908,4.896-3.704 c0.82,0.288,1.968-0.056,2.536-0.744c0.488-0.588,0.528-1.352,0.108-2.04c-1.66-2.716-0.284-7.016,2.044-9.328 c1.016-1.008,3.06-2.496,5.412-1.092c0.612,0.364,1.348,0.34,1.964-0.06c0.724-0.472,1.112-1.36,0.996-2.256 c-0.528-3.98,0.464-6.78,2.792-7.876c2.572-1.232,6.392-0.212,8.848,2.364c0.364,0.384,0.904,0.512,1.408,0.328 c0.86-0.312,1.452-1.476,1.508-2.376c0.2-3.428,1.7-5.84,3.916-6.296c2.064-0.44,4.26,0.988,5.664,3.724 c0.228,0.44,0.64,0.7,1.104,0.7c0.784,0,1.316-0.696,2.016-1.98v31.496h-6.292L40.307,253.973z M229.239,261.525H43.835v-5.792 h185.404V261.525z M269.075,263.057h-36.3v-9.092l-1.768-1.768h-6.292v-34.74c0.296,0.288,0.604,0.556,0.868,0.896 c0.192,0.248,0.452,0.776,0.748,1.348c1,1.952,1.568,2.964,2.54,2.964c0.464,0,0.876-0.264,1.104-0.7 c1.404-2.736,3.608-4.152,5.664-3.724c2.212,0.46,3.712,2.872,3.916,6.304c0.056,0.896,0.648,2.06,1.508,2.376 c0.504,0.184,1.04,0.056,1.412-0.332c2.452-2.572,6.268-3.592,8.844-2.36c2.328,1.096,3.32,3.896,2.792,7.88 c-0.12,0.896,0.272,1.784,0.996,2.256c0.616,0.4,1.352,0.432,1.968,0.056c2.336-1.392,4.392,0.084,5.404,1.096 c2.328,2.312,3.704,6.616,2.044,9.336c-0.42,0.684-0.38,1.448,0.108,2.036c0.572,0.692,1.728,1.036,2.532,0.744 c0.688-0.212,3.268,0.968,4.9,3.708C273.367,253.537,274.687,257.953,269.075,263.057z"></path> <path d="M66.267,118.365l-1.512,1.512v36.412l1.512,1.512h31.716l1.512-1.512v-36.412l-1.512-1.512H66.267z M96.467,154.781 H67.779v-33.388h28.688V154.781z"></path> <path d="M94.003,152.165L94.003,152.165l0.504-0.504v-23.832c0-0.28-0.228-0.504-0.504-0.504s-0.504,0.228-0.504,0.504v10.14 H70.755v-12.952h8.636h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504s-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.14l-0.504,0.504 v27.148l0.504,0.504H94.003z M70.755,138.981h22.744v12.176H70.755V138.981z"></path> <path d="M149.387,239.661l1.008-1.008v-56.928l-1.008-1.008h-25.692l-1.008,1.008v56.928l1.008,1.008H149.387z M124.703,182.733 h23.672v54.912h-23.672V182.733z"></path> <path d="M128.379,194.165l-0.76,0.76v5.376l0.76,0.76h16.316l0.76-0.76v-5.376l-0.76-0.76H128.379z M143.935,199.545h-14.796 v-3.86h14.796V199.545z"></path> <path d="M119.347,210.917c0.476,0,0.956-0.136,1.384-0.416c0.564-0.372,0.948-0.944,1.084-1.604 c0.132-0.66,0.004-1.332-0.368-1.892c-0.768-1.164-2.332-1.488-3.496-0.72c-1.164,0.764-1.484,2.336-0.716,3.496 C117.719,210.517,118.527,210.917,119.347,210.917z M118.507,207.129c0.684-0.452,1.636-0.268,2.096,0.432 c0.224,0.336,0.3,0.736,0.22,1.132s-0.308,0.736-0.652,0.964c-0.684,0.448-1.632,0.268-2.096-0.432 C117.615,208.529,117.811,207.585,118.507,207.129z"></path> <path d="M176.799,118.757l-1.512,1.512v36.412l1.512,1.512h31.716l1.512-1.512v-36.412l-1.512-1.512H176.799z M207.003,155.169 h-28.688v-33.388h28.688V155.169z"></path> <path d="M204.535,152.557v-0.004l0.504-0.504v-23.828c0-0.28-0.228-0.504-0.504-0.504c-0.28,0-0.504,0.228-0.504,0.504v10.14 h-22.748v-12.952h8.64h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504s-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.144l-0.504,0.504 v27.148l0.504,0.504H204.535z M181.283,139.365h22.748v12.176h-22.748V139.365z"></path> <path d="M122.335,118.757l-1.512,1.512v36.412l1.512,1.512h31.716l1.512-1.512v-36.412l-1.512-1.512H122.335z M152.539,155.169 h-28.688v-33.388h28.688V155.169z"></path> <path d="M150.071,152.557v-0.004l0.504-0.504v-23.828c0-0.28-0.228-0.504-0.504-0.504c-0.28,0-0.504,0.228-0.504,0.504v10.14 h-22.744v-12.952h8.636h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504s-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.14l-0.504,0.504 v27.148l0.504,0.504H150.071z M126.823,139.365h22.744v12.176h-22.744V139.365z"></path> <path d="M66.267,177.897l-1.512,1.512v36.408l1.512,1.512h31.716l1.512-1.512v-36.408l-1.512-1.512H66.267z M96.467,214.305 H67.779v-33.384h28.688V214.305z"></path> <path d="M94.003,211.693L94.003,211.693l0.504-0.504v-23.832c0-0.28-0.228-0.504-0.504-0.504s-0.504,0.228-0.504,0.504v10.14 H70.755v-12.952h8.636h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504c0-0.28-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.14l-0.504,0.504 v27.148l0.504,0.504H94.003z M70.755,198.505h22.744v12.176H70.755V198.505z"></path> <path d="M208.079,214.645l1.512-1.512v-36.412l-1.512-1.512h-31.716l-1.512,1.512v36.412l1.512,1.512H208.079z M177.879,178.233 h28.688v33.388h-28.688V178.233z"></path> <path d="M204.099,184.165c-0.28,0-0.504,0.228-0.504,0.504v10.14h-22.744v-12.948h8.636h0.9h6.656 c0.28,0,0.504-0.228,0.504-0.504c0-0.28-0.228-0.504-0.504-0.504h-6.656h-0.9h-9.14l-0.504,0.504v27.144l0.504,0.504h23.752 l0.504-0.504v-23.832C204.603,184.389,204.379,184.165,204.099,184.165z M203.595,207.993h-22.744v-12.176h22.744V207.993z"></path> <path d="M97.875,106.117l1.512-1.512V68.189l-1.512-1.512H66.159l-1.512,1.512v36.412l1.512,1.516H97.875z M67.671,69.705h28.688 v33.388H67.671V69.705z"></path> <path d="M93.895,75.637c-0.28,0-0.504,0.228-0.504,0.504v10.14H70.643V73.329h8.64h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504 s-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.144l-0.504,0.504v27.148l0.504,0.504h23.756l0.504-0.504V76.141 C94.399,75.861,94.171,75.637,93.895,75.637z M93.391,99.469H70.643V87.293h22.748V99.469z"></path> <path d="M208.403,106.505l1.512-1.512V68.581l-1.512-1.512h-31.712l-1.512,1.512v36.412l1.512,1.512H208.403z M178.203,70.093 h28.684v33.388h-28.684V70.093z"></path> <path d="M204.423,76.025c-0.28,0-0.504,0.228-0.504,0.504v10.14h-22.744V73.717h8.636h0.9h6.656c0.28,0,0.504-0.228,0.504-0.504 c0-0.28-0.228-0.504-0.504-0.504h-6.656h-0.9h-9.14l-0.504,0.504v27.148l0.504,0.504h23.752l0.504-0.504V76.533 C204.927,76.253,204.703,76.025,204.423,76.025z M203.919,99.853h-22.744V87.677h22.744V99.853z"></path> <path d="M153.943,106.505l1.512-1.512V68.581l-1.512-1.512h-31.716l-1.512,1.512v36.412l1.512,1.512H153.943z M123.743,70.093 h28.688v33.388h-28.688V70.093z"></path> <path d="M149.963,76.025c-0.28,0-0.504,0.228-0.504,0.504v10.14h-22.748V73.717h8.64h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504 c0-0.28-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.144l-0.504,0.504v27.148l0.504,0.504h23.756l0.504-0.504V76.533 C150.471,76.253,150.243,76.025,149.963,76.025z M149.463,99.853h-22.748V87.677h22.748V99.853z"></path> <path d="M112.047,30.693c0.472,0.536,1.04,0.948,1.7,1.244c0.66,0.296,1.376,0.44,2.14,0.44c0.764,0,1.472-0.148,2.124-0.44 s1.216-0.708,1.7-1.244c0.484-0.536,0.86-1.172,1.128-1.912c0.268-0.736,0.4-1.556,0.4-2.444c0-0.868-0.132-1.664-0.4-2.392 c-0.268-0.724-0.644-1.336-1.128-1.832c-0.484-0.496-1.052-0.888-1.7-1.164c-0.652-0.28-1.356-0.42-2.124-0.42 c-0.76,0-1.48,0.14-2.14,0.42c-0.66,0.28-1.228,0.668-1.7,1.164c-0.468,0.496-0.84,1.108-1.108,1.832 c-0.268,0.728-0.404,1.524-0.404,2.392c0,0.892,0.136,1.708,0.404,2.444C111.203,29.517,111.575,30.157,112.047,30.693z M112.835,24.645c0.168-0.464,0.396-0.844,0.68-1.144c0.28-0.292,0.612-0.52,1.016-0.692c0.412-0.176,0.864-0.264,1.356-0.264 s0.924,0.084,1.32,0.256c0.412,0.176,0.756,0.412,1.056,0.72c0.288,0.296,0.508,0.664,0.68,1.128 c0.18,0.492,0.276,1.064,0.276,1.688c0,0.656-0.092,1.248-0.28,1.756c-0.18,0.496-0.416,0.904-0.728,1.248 c-0.296,0.328-0.632,0.576-1.028,0.752c-0.396,0.18-0.816,0.264-1.296,0.264c-0.484,0-0.916-0.088-1.316-0.264 c-0.404-0.18-0.732-0.416-1.012-0.736c-0.3-0.344-0.544-0.768-0.72-1.256c-0.192-0.524-0.284-1.116-0.284-1.764 C112.555,25.717,112.647,25.145,112.835,24.645z"></path> </g> </g> </g> </g></svg>
                  {' '}Hotels
                </button>
              </li>

              <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'flight-tab-pane' ? 'active' : ''} h-100`} id="flight-tab" data-bs-toggle="tab" data-bs-target="#flight-tab-pane" type="button" role="tab" aria-controls="flight-tab-pane" aria-selected={activeTab === 'flight-tab-pane'} onClick={() => handleTabChange('flight-tab-pane')}>
                  {/* <IoAirplane /> */}
                  <svg xmlns="http://www.w3.org/2000/svg" width='30px' height='30px' fill="none" viewBox="0 0 33 33" focusable="false" aria-hidden="true" role="img"><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m20.597 10.142-14.436-4.5-1.885 1.884 12.04 6.899M24.05 13.595l4.498 14.44-1.884 1.885-6.896-12.039"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.5" d="M11.91 25.074c-.075-.308.101-.574.331-.793 1.623-1.543 6.293-5.154 7.287-6.149L26.76 10.9a12.9 12.9 0 0 0 3.334-5.772.837.837 0 0 0-1.02-1.02 12.9 12.9 0 0 0-5.771 3.335l-7.233 7.233c-.994.994-4.695 5.883-6.149 7.286-.23.223-.484.406-.793.33l-4.243-1.03-.463.463 4.028 4.031 4.027 4.031.463-.463-1.03-4.242z"></path><path fill='#ffffff' stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.85 6.792 15.91 4.85l-2.34 2.344 2.957.918zM26.888 16.955l1.942 1.942-2.344 2.343-.922-2.96z"></path></svg>
                  {' '}Flights
                </button>
              </li>

              <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'transfer-tab-pane' ? 'active' : ''} h-100`} id="transfer-tab" data-bs-toggle="tab" data-bs-target="#transfer-tab-pane" type="button" role="tab" aria-controls="transfer-tab-pane" aria-selected={activeTab === 'transfer-tab-pane'} onClick={() => handleTabChange('transfer-tab-pane')}>
                  {/* <FaCar /> */}
                  <svg xmlns="http://www.w3.org/2000/svg" width='30px' height='30px' fill="none" viewBox="0 0 33 33" focusable="false" aria-hidden="true" role="img"><g clipPath="url(#CarsGrey_tsx__a)"><path fill='#ffffff' d="m10.17 24.424 1.082-2.158c.313-.627 1.061-1.037 1.892-1.037h6.274c.82 0 1.559.4 1.882 1.018l1.13 2.177"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.5" d="M16.3 24.424H2.024"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.5" d="M5.586 10.871H3.004a.98.98 0 0 0 0 1.96H29.6a.98.98 0 0 0 0-1.96h-2.606"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.5" d="M16.3 24.424h14.276"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.5" d="M7.01 24.423v3.19H2.023v-9.801c0-1.603.618-3.138 1.718-4.3l.652-.686 3.098-5.183a3.03 3.03 0 0 1 2.775-1.815h11.97c1.187 0 2.263.69 2.755 1.771l3.2 5.227.956 1.004c.786.825 1.428 2.432 1.428 3.571v10.213H25.59v-3.19"></path><path fill='#ffffff' d="M22.84 19.08c.202-.771 1.858-2.644 4.107-2.644.526 0 1.066.169 1.245.676.178.507.28 1.173.116 2.065a1.01 1.01 0 0 1-.83.802c-.826.135-2.327.29-4.02-.005-.42-.073-.725-.483-.618-.893M9.66 19.08c-.204-.771-1.859-2.644-4.108-2.644-.526 0-1.067.169-1.245.676s-.28 1.173-.116 2.065c.077.415.415.734.83.802.825.135 2.326.29 4.02-.005.42-.073.724-.483.618-.893"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.052 19.148h6.395"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.5" d="M18.428 12.83a2.5 2.5 0 0 1 2.505-2.504 2.5 2.5 0 0 1 2.505 2.504"></path><path fill='#ffffff' d="M2.024 24.82v2.799h4.985v-3.195zM25.89 25.022v2.794h4.985v-3.19z"></path></g><defs><clipPath id="CarsGrey_tsx__a"><path fill="#fff" d="M1.3 5.109h30v23.234h-30z"></path></clipPath></defs></svg>
                  {' '}Transfers
                </button>
              </li>

              <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'activity-tab-pane' ? 'active' : ''} h-100`} id="activity-tab" data-bs-toggle="tab" data-bs-target="#activity-tab-pane" type="button" role="tab" aria-controls="activity-tab-pane" aria-selected={activeTab === 'activity-tab-pane'} onClick={() => handleTabChange('activity-tab-pane')}>
                  {/* <GiSettingsKnobs /> */}
                  <svg version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve" width='30px' height='30px' fill='#ffffff' stroke='#ffffff'><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier">  <g> <path className="st0" d="M430.337,231.065H81.674c-29.701,0-53.858,24.16-53.858,53.862v49.884v15.976l15.806,2.262 c9.135,1.31,16.03,9.258,16.03,18.483c0,9.225-6.891,17.173-16.022,18.482l-15.814,2.262v15.978v49.892 c0,29.693,24.157,53.854,53.858,53.854h348.663c29.701,0,53.862-24.161,53.862-53.854v-49.558V391l-17.571-0.822 c-9.982-0.463-17.808-8.655-17.808-18.645c0-9.982,7.826-18.174,17.815-18.646l17.564-0.83v-17.58v-49.55 C484.199,255.225,460.038,231.065,430.337,231.065z M465.765,334.477c-19.686,0.936-35.371,17.14-35.371,37.056 c0,19.923,15.685,36.135,35.371,37.055v49.558c0,19.565-15.864,35.428-35.428,35.428H81.674c-19.569,0-35.432-15.863-35.432-35.428 v-49.892c17.991-2.579,31.836-18.011,31.836-36.722c0-18.703-13.846-34.135-31.836-36.721v-49.884 c0-19.573,15.863-35.436,35.432-35.436h348.663c19.564,0,35.428,15.863,35.428,35.436V334.477z"></path> <rect x="133.621" y="439.419" className="st0" width="12.19" height="31.8"></rect> <rect x="133.621" y="383.564" className="st0" width="12.19" height="31.792"></rect> <rect x="133.621" y="327.7" className="st0" width="12.19" height="31.8"></rect> <rect x="133.621" y="271.846" className="st0" width="12.19" height="31.799"></rect> <polygon className="st0" points="111.245,180.758 100.592,186.68 116.053,214.461 126.702,208.539 "></polygon> <path className="st0" d="M497.524,179.025l-24.095-43.311l-8.558-15.36l-15.749,7.826c-8.948,4.442-19.768,1.09-24.617-7.639 c-4.865-8.721-2.001-19.687,6.492-24.95l14.952-9.266l-8.558-15.368l-24.088-43.294C398.863,1.714,366.006-7.658,340.047,6.79 L35.374,176.299c-25.955,14.44-35.318,47.305-20.878,73.256l0.875,1.578c3.27-6.394,7.43-12.243,12.324-17.409 c-4.803-15.643,1.762-33.044,16.636-41.326l304.681-169.51c17.1-9.518,38.674-3.368,48.192,13.732l24.088,43.302 c-16.751,10.38-22.575,32.182-12.895,49.582c9.681,17.401,31.271,23.942,48.925,15.172l24.095,43.312 c7.273,13.056,5.337,28.692-3.571,39.601c4.776,3.961,8.989,8.558,12.65,13.569C505.4,224.524,508.979,199.615,497.524,179.025z"></path> </g> </g></svg>
                  {' '}Activities
                </button>
              </li>

              {/* <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'general-package-tab-pane' ? 'active' : ''} h-100`} id="general-package-tab" data-bs-toggle="tab" data-bs-target="#general-package-tab-pane" type="button" role="tab" aria-controls="general-package-tab-pane" aria-selected={activeTab === 'general-package-tab-pane'} onClick={() => handleTabChange('general-package-tab-pane')}>
                  <IoIosStarOutline size='25' /> {' '}Holiday Packages
                </button>
              </li> */}

              {/* <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'ai-tab-pane' ? 'active' : ''} h-100`} id="ai-tab" data-bs-toggle="tab" data-bs-target="#ai-tab-pane" type="button" role="tab" aria-controls="ai-tab-pane" aria-selected={activeTab === 'ai-tab-pane'} onClick={() => handleTabChange('ai-tab-pane')}>
                  <HiOutlineSparkles color='#ffffff' size='25' />
                  {' '}AI Mode
                </button>
              </li> */}
            </ul>
            <ul className={`nav nav-pills ${styles.mobilesearch} d-flex d-md-none gap-2 lights medium px-0`} id="searchTabsMobile" role="tablist">
              {/* <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'umrah-get-away' ? 'active' : ''} h-100 ${styles.mobileTab}`} id="umrah-get-tab" data-bs-toggle="tab" data-bs-target="#umrah-get-away" type="button" role="tab" aria-controls="umrah-get-away" aria-selected={activeTab === 'umrah-get-away'} onClick={() => handleTabChange('umrah-get-away')}>
                  <FaKaaba color='#0b659b' size={40} />
                  <span className={styles.tabLabel}>Umrah Getaway</span>
                </button>
              </li> */}
              <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'package-tab-pane' ? 'active' : ''} h-100 ${styles.
                mobileTab}`} id="package-tab" data-bs-toggle="tab" data-bs-target="#package-tab-pane" type="button" role="tab" aria-controls="package-tab-pane" aria-selected={activeTab === 'package-tab-pane'} onClick={() => handleTabChange('package-tab-pane')}>
                  <svg xmlns="http://www.w3.org/2000/svg" width='42px' height='42px' fill="none" viewBox="0 0 33 33" focusable="false" aria-hidden="true" role="img"><g clipPath="url(#PackagesGrey_tsx__a)"><path fill='#0b659b' d="M3.197 28.105h-1.9v1.135h1.9zM15.72 28.105h-2.356v.87h2.355z"></path><path stroke='#0b659b' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687H1.14"></path><path stroke='#0b659b' strokeLinejoin="round" strokeWidth="1.25" d="M2.979 20.694H1.648a.509.509 0 0 0 0 1.015h13.726a.509.509 0 0 0 0-1.015H14.03"></path><path stroke='#0b659b' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687h7.368"></path><path stroke='#0b659b' strokeLinejoin="round" strokeWidth="1.25" d="M3.713 27.687v1.647H1.14v-5.06c0-.828.316-1.622.887-2.219l.338-.354 1.6-2.675a1.56 1.56 0 0 1 1.429-.935h6.178c.61 0 1.17.359 1.42.913l1.652 2.697.495.52c.405.427.738 1.255.738 1.844v5.269h-2.573v-1.647"></path><path fill='#0b659b' d="m5.347 27.687.559-1.114c.162-.324.546-.537.977-.537h3.238c.423 0 .807.209.969.525l.584 1.122M11.628 24.93c.102-.4.96-1.365 2.12-1.365.273 0 .55.086.644.35.094.265.145.606.06 1.067a.52.52 0 0 1-.427.414 6.3 6.3 0 0 1-2.073 0c-.218-.039-.371-.248-.32-.461zM5.39 24.93c-.103-.4-.96-1.365-2.12-1.365-.274 0-.551.086-.645.35-.094.265-.145.606-.06 1.067.038.213.213.38.427.414.426.072 1.203.15 2.073 0 .218-.039.372-.248.32-.461zM10.24 24.257H6.777a.39.39 0 0 0-.388.388v.444c0 .214.174.388.388.388h3.465a.39.39 0 0 0 .388-.388v-.444a.39.39 0 0 0-.388-.388"></path><path fill='#0b659b' stroke='#0b659b' strokeLinejoin="round" strokeWidth="0.4" d="m14.985 8.295-10.423 2.13a1.79 1.79 0 0 1-1.899-.841L1.14 7.019l1.075-.537 1.596 1.365L14.422 5.68a2.96 2.96 0 0 1 1.677.145l.073.03a.983.983 0 0 1 .345 1.6 2.96 2.96 0 0 1-1.532.84Z"></path><path fill='#0b659b' d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path stroke='#0b659b' strokeLinejoin="round" strokeWidth="0.4" d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path fill='#0b659b' d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#0b659b' strokeLinejoin="round" strokeWidth="0.4" d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#0b659b' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M19.354 11.026h9.212000000000002M20.195 11.026v18.312M27.73 11.026v18.312"></path><path fill='#0b659b' d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#0b659b' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#0b659b' strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338v-8.076h-4.13"></path><path fill='#0b659b' d="M23.066 13.453h-.814a.324.324 0 0 0-.325.325v.806c0 .18.145.324.325.324h.814c.18 0 .325-.145.325-.324v-.806a.324.324 0 0 0-.325-.325M25.89 13.453h-.814a.324.324 0 0 0-.324.325v.806c0 .18.145.324.324.324h.815c.179 0 .324-.145.324-.324v-.806a.324.324 0 0 0-.324-.325M23.066 16.338h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.146.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 16.338h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.146.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 19.299h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 19.299h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 22.26h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 22.26h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324"></path><path stroke='#0b659b' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338H20.195"></path></g><defs><clipPath id="PackagesGrey_tsx__a"><path fill="#fff" d="M.5 3.021h32v26.957H.5z"></path></clipPath></defs></svg>
                  <span className={styles.tabLabel}>Group Packages</span>
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'hotel-tab-pane' ? 'active' : ''} h-100 ${styles.mobileTab}`} id="hotel-tab" data-bs-toggle="tab" data-bs-target="#hotel-tab-pane" type="button" role="tab" aria-controls="hotel-tab-pane" aria-selected={activeTab === 'hotel-tab-pane'} onClick={() => handleTabChange('hotel-tab-pane')}>
                  <svg fill='#0b659b' height='42px' width='42px' version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 275.214 275.214" xmlSpace="preserve" stroke='#0b659b'><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier"> <g> <g> <g> <path d="M273.799,250.321c-1.872-3.152-5.304-5.276-7.256-4.592c-0.06,0.024-0.116-0.008-0.184-0.032 c2.052-3.628,0.356-8.808-2.452-11.6c-2.408-2.384-5.348-2.916-7.692-1.408c-0.036-0.02-0.124-0.14-0.1-0.32 c0.88-6.632-2.08-9.08-3.924-9.952c-3.128-1.472-7.54-0.524-10.576,2.204c-0.02-0.068-0.036-0.14-0.04-0.2 c-0.308-5.224-3.052-7.632-5.516-8.144c-2.696-0.568-5.42,0.844-7.276,3.728c-0.232-0.412-0.48-0.892-0.648-1.22 c-0.36-0.7-0.676-1.308-0.948-1.66c-0.72-0.932-1.56-1.688-2.468-2.356v-159.7h4.052l1.768-1.768V42.673l-1.768-1.768h-17.268 c0.136-0.272,0.228-0.564,0.228-0.888v-7.836c0-1.116-0.904-2.02-2.02-2.02h-6.964V12.953c0-1.116-0.904-2.02-2.02-2.02h-9.176 c-1.116,0-2.02,0.904-2.02,2.02v27.06c0,0.324,0.092,0.616,0.228,0.888h-4.18c0.136-0.272,0.228-0.564,0.228-0.888v-7.568 c0-0.884-0.564-1.632-1.356-1.908c0.064-0.192,0.096-0.4,0.096-0.616v-7.072c0-0.268-0.052-0.52-0.144-0.756 c0.46-0.372,0.756-0.94,0.756-1.576v-7.568c0-1.116-0.904-2.02-2.02-2.02h-18.616c-1.116,0-2.02,0.904-2.02,2.02v27.06 c0,0.324,0.092,0.616,0.228,0.888h-9.84c0.136-0.272,0.228-0.564,0.228-0.888v-17.36h4.632c1.116,0,2.02-0.904,2.02-2.02v-7.684 c0-1.116-0.904-2.02-2.02-2.02h-22.4c-1.116,0-2.02,0.904-2.02,2.02v7.684c0,1.116,0.904,2.02,2.02,2.02h4.632v17.36 c0,0.324,0.092,0.616,0.228,0.888h-16.14c1.44-0.708,2.788-1.536,3.932-2.6c1.556-1.456,2.78-3.22,3.652-5.252 c0.868-2.028,1.312-4.288,1.312-6.72c0-2.436-0.444-4.684-1.32-6.68c-0.868-1.992-2.104-3.724-3.664-5.14 c-1.552-1.4-3.384-2.484-5.452-3.228c-2.04-0.74-4.276-1.116-6.648-1.116c-2.368,0-4.604,0.376-6.652,1.116 c-2.076,0.748-3.904,1.836-5.432,3.232c-1.544,1.412-2.768,3.136-3.644,5.132c-0.872,1.992-1.316,4.236-1.316,6.68 c0,2.436,0.44,4.696,1.308,6.72c0.872,2.032,2.092,3.796,3.628,5.24c1.132,1.068,2.48,1.9,3.924,2.608H94.847 c0.136-0.272,0.228-0.564,0.228-0.888v-27.06c0-1.116-0.904-2.02-2.02-2.02h-9.136c-1.116,0-2.02,0.904-2.02,2.02v7.168h-3.376 v-7.152c0-1.116-0.904-2.02-2.02-2.02h-9.06c-1.116,0-2.02,0.904-2.02,2.02v27.06c0,0.324,0.092,0.616,0.228,0.888H44.299 l-1.76,1.768v10.628l1.768,1.768h4.052v161.892c-0.112,0.064-0.248,0.08-0.332,0.188c-0.272,0.352-0.584,0.96-0.948,1.66 c-0.168,0.328-0.416,0.808-0.648,1.216c-1.856-2.88-4.584-4.296-7.276-3.728c-2.468,0.512-5.208,2.92-5.516,8.136 c-0.004,0.064-0.016,0.136-0.04,0.204c-3.036-2.728-7.44-3.692-10.576-2.204c-1.844,0.868-4.804,3.32-3.924,9.948 c0.016,0.136-0.028,0.236,0.008,0.292c-2.5-1.468-5.42-0.928-7.804,1.436c-2.804,2.788-4.5,7.96-2.444,11.596 c-0.06,0.024-0.116,0.04-0.132,0.04c-2.02-0.716-5.44,1.424-7.312,4.576c-1.324,2.224-3.616,8.092,3.672,14.48l0.668,0.252 h36.316h38.892h113.296h36.752h38.452l0.668-0.252C277.415,258.413,275.123,252.545,273.799,250.321z M200.731,12.957v19.224 h8.984v7.836h-18.156v-27.06H200.731z M164.519,12.957h0.004h18.616v7.568h-10.056v2.332h9.444v7.072h-9.444v2.524h10.7v7.568 h-19.264V12.957z M135.351,20.641v-7.684h22.4v7.684h-6.652v19.38h-9.096v-19.38H135.351z M105.167,36.829 c-1.34-1.264-2.392-2.788-3.156-4.568c-0.764-1.784-1.144-3.76-1.144-5.924c0-2.168,0.38-4.124,1.144-5.868 c0.764-1.748,1.816-3.228,3.156-4.452c1.336-1.22,2.924-2.164,4.756-2.824c1.836-0.664,3.824-0.996,5.964-0.996 c2.144,0,4.128,0.332,5.964,0.996c1.836,0.66,3.428,1.604,4.78,2.824c1.348,1.224,2.408,2.708,3.168,4.452 c0.764,1.748,1.148,3.7,1.148,5.868c0,2.164-0.384,4.14-1.148,5.924c-0.76,1.78-1.82,3.304-3.168,4.568 c-1.352,1.26-2.944,2.232-4.78,2.924c-1.832,0.688-3.82,1.032-5.964,1.032c-2.14,0-4.128-0.344-5.964-1.032 C108.091,39.065,106.503,38.089,105.167,36.829z M67.443,12.957h0.004h9.06v9.172h7.416v-9.172h9.136v27.06h-9.1v-10.28h-7.416 v10.28h-9.1V12.957z M82.171,40.909h-3.832c0.136-0.272,0.228-0.568,0.228-0.888v-8.26h3.376v8.26 C81.943,40.345,82.035,40.637,82.171,40.909z M46.071,51.537v-7.096h180.932v7.096H46.071z M158.527,167.189h-43.976 l-1.768,1.768v82.892H51.895V55.069h169.288v196.78h-60.888v-82.892L158.527,167.189z M156.759,170.725v80.364h-40.44v-80.364 H156.759z M40.307,253.973v9.092H6.139c-5.612-5.112-4.292-9.524-2.984-11.72c1.632-2.744,4.252-3.908,4.896-3.704 c0.82,0.288,1.968-0.056,2.536-0.744c0.488-0.588,0.528-1.352,0.108-2.04c-1.66-2.716-0.284-7.016,2.044-9.328 c1.016-1.008,3.06-2.496,5.412-1.092c0.612,0.364,1.348,0.34,1.964-0.06c0.724-0.472,1.112-1.36,0.996-2.256 c-0.528-3.98,0.464-6.78,2.792-7.876c2.572-1.232,6.392-0.212,8.848,2.364c0.364,0.384,0.904,0.512,1.408,0.328 c0.86-0.312,1.452-1.476,1.508-2.376c0.2-3.428,1.7-5.84,3.916-6.296c2.064-0.44,4.26,0.988,5.664,3.724 c0.228,0.44,0.64,0.7,1.104,0.7c0.784,0,1.316-0.696,2.016-1.98v31.496h-6.292L40.307,253.973z M229.239,261.525H43.835v-5.792 h185.404V261.525z M269.075,263.057h-36.3v-9.092l-1.768-1.768h-6.292v-34.74c0.296,0.288,0.604,0.556,0.868,0.896 c0.192,0.248,0.452,0.776,0.748,1.348c1,1.952,1.568,2.964,2.54,2.964c0.464,0,0.876-0.264,1.104-0.7 c1.404-2.736,3.608-4.152,5.664-3.724c2.212,0.46,3.712,2.872,3.916,6.304c0.056,0.896,0.648,2.06,1.508,2.376 c0.504,0.184,1.04,0.056,1.412-0.332c2.452-2.572,6.268-3.592,8.844-2.36c2.328,1.096,3.32,3.896,2.792,7.88 c-0.12,0.896,0.272,1.784,0.996,2.256c0.616,0.4,1.352,0.432,1.968,0.056c2.336-1.392,4.392,0.084,5.404,1.096 c2.328,2.312,3.704,6.616,2.044,9.336c-0.42,0.684-0.38,1.448,0.108,2.036c0.572,0.692,1.728,1.036,2.532,0.744 c0.688-0.212,3.268,0.968,4.9,3.708C273.367,253.537,274.687,257.953,269.075,263.057z"></path> <path d="M66.267,118.365l-1.512,1.512v36.412l1.512,1.512h31.716l1.512-1.512v-36.412l-1.512-1.512H66.267z M96.467,154.781 H67.779v-33.388h28.688V154.781z"></path> <path d="M94.003,152.165L94.003,152.165l0.504-0.504v-23.832c0-0.28-0.228-0.504-0.504-0.504s-0.504,0.228-0.504,0.504v10.14 H70.755v-12.952h8.636h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504s-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.14l-0.504,0.504 v27.148l0.504,0.504H94.003z M70.755,138.981h22.744v12.176H70.755V138.981z"></path> <path d="M149.387,239.661l1.008-1.008v-56.928l-1.008-1.008h-25.692l-1.008,1.008v56.928l1.008,1.008H149.387z M124.703,182.733 h23.672v54.912h-23.672V182.733z"></path> <path d="M128.379,194.165l-0.76,0.76v5.376l0.76,0.76h16.316l0.76-0.76v-5.376l-0.76-0.76H128.379z M143.935,199.545h-14.796 v-3.86h14.796V199.545z"></path> <path d="M119.347,210.917c0.476,0,0.956-0.136,1.384-0.416c0.564-0.372,0.948-0.944,1.084-1.604 c0.132-0.66,0.004-1.332-0.368-1.892c-0.768-1.164-2.332-1.488-3.496-0.72c-1.164,0.764-1.484,2.336-0.716,3.496 C117.719,210.517,118.527,210.917,119.347,210.917z M118.507,207.129c0.684-0.452,1.636-0.268,2.096,0.432 c0.224,0.336,0.3,0.736,0.22,1.132s-0.308,0.736-0.652,0.964c-0.684,0.448-1.632,0.268-2.096-0.432 C117.615,208.529,117.811,207.585,118.507,207.129z"></path> <path d="M176.799,118.757l-1.512,1.512v36.412l1.512,1.512h31.716l1.512-1.512v-36.412l-1.512-1.512H176.799z M207.003,155.169 h-28.688v-33.388h28.688V155.169z"></path> <path d="M204.535,152.557v-0.004l0.504-0.504v-23.828c0-0.28-0.228-0.504-0.504-0.504c-0.28,0-0.504,0.228-0.504,0.504v10.14 h-22.748v-12.952h8.64h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504s-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.144l-0.504,0.504 v27.148l0.504,0.504H204.535z M181.283,139.365h22.748v12.176h-22.748V139.365z"></path> <path d="M122.335,118.757l-1.512,1.512v36.412l1.512,1.512h31.716l1.512-1.512v-36.412l-1.512-1.512H122.335z M152.539,155.169 h-28.688v-33.388h28.688V155.169z"></path> <path d="M150.071,152.557v-0.004l0.504-0.504v-23.828c0-0.28-0.228-0.504-0.504-0.504c-0.28,0-0.504,0.228-0.504,0.504v10.14 h-22.744v-12.952h8.636h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504s-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.14l-0.504,0.504 v27.148l0.504,0.504H150.071z M126.823,139.365h22.744v12.176h-22.744V139.365z"></path> <path d="M66.267,177.897l-1.512,1.512v36.408l1.512,1.512h31.716l1.512-1.512v-36.408l-1.512-1.512H66.267z M96.467,214.305 H67.779v-33.384h28.688V214.305z"></path> <path d="M94.003,211.693L94.003,211.693l0.504-0.504v-23.832c0-0.28-0.228-0.504-0.504-0.504s-0.504,0.228-0.504,0.504v10.14 H70.755v-12.952h8.636h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504c0-0.28-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.14l-0.504,0.504 v27.148l0.504,0.504H94.003z M70.755,198.505h22.744v12.176H70.755V198.505z"></path> <path d="M208.079,214.645l1.512-1.512v-36.412l-1.512-1.512h-31.716l-1.512,1.512v36.412l1.512,1.512H208.079z M177.879,178.233 h28.688v33.388h-28.688V178.233z"></path> <path d="M204.099,184.165c-0.28,0-0.504,0.228-0.504,0.504v10.14h-22.744v-12.948h8.636h0.9h6.656 c0.28,0,0.504-0.228,0.504-0.504c0-0.28-0.228-0.504-0.504-0.504h-6.656h-0.9h-9.14l-0.504,0.504v27.144l0.504,0.504h23.752 l0.504-0.504v-23.832C204.603,184.389,204.379,184.165,204.099,184.165z M203.595,207.993h-22.744v-12.176h22.744V207.993z"></path> <path d="M97.875,106.117l1.512-1.512V68.189l-1.512-1.512H66.159l-1.512,1.512v36.412l1.512,1.516H97.875z M67.671,69.705h28.688 v33.388H67.671V69.705z"></path> <path d="M93.895,75.637c-0.28,0-0.504,0.228-0.504,0.504v10.14H70.643V73.329h8.64h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504 s-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.144l-0.504,0.504v27.148l0.504,0.504h23.756l0.504-0.504V76.141 C94.399,75.861,94.171,75.637,93.895,75.637z M93.391,99.469H70.643V87.293h22.748V99.469z"></path> <path d="M208.403,106.505l1.512-1.512V68.581l-1.512-1.512h-31.712l-1.512,1.512v36.412l1.512,1.512H208.403z M178.203,70.093 h28.684v33.388h-28.684V70.093z"></path> <path d="M204.423,76.025c-0.28,0-0.504,0.228-0.504,0.504v10.14h-22.744V73.717h8.636h0.9h6.656c0.28,0,0.504-0.228,0.504-0.504 c0-0.28-0.228-0.504-0.504-0.504h-6.656h-0.9h-9.14l-0.504,0.504v27.148l0.504,0.504h23.752l0.504-0.504V76.533 C204.927,76.253,204.703,76.025,204.423,76.025z M203.919,99.853h-22.744V87.677h22.744V99.853z"></path> <path d="M153.943,106.505l1.512-1.512V68.581l-1.512-1.512h-31.716l-1.512,1.512v36.412l1.512,1.512H153.943z M123.743,70.093 h28.688v33.388h-28.688V70.093z"></path> <path d="M149.963,76.025c-0.28,0-0.504,0.228-0.504,0.504v10.14h-22.748V73.717h8.64h0.9h6.652c0.28,0,0.504-0.228,0.504-0.504 c0-0.28-0.228-0.504-0.504-0.504h-6.652h-0.9h-9.144l-0.504,0.504v27.148l0.504,0.504h23.756l0.504-0.504V76.533 C150.471,76.253,150.243,76.025,149.963,76.025z M149.463,99.853h-22.748V87.677h22.748V99.853z"></path> <path d="M112.047,30.693c0.472,0.536,1.04,0.948,1.7,1.244c0.66,0.296,1.376,0.44,2.14,0.44c0.764,0,1.472-0.148,2.124-0.44 s1.216-0.708,1.7-1.244c0.484-0.536,0.86-1.172,1.128-1.912c0.268-0.736,0.4-1.556,0.4-2.444c0-0.868-0.132-1.664-0.4-2.392 c-0.268-0.724-0.644-1.336-1.128-1.832c-0.484-0.496-1.052-0.888-1.7-1.164c-0.652-0.28-1.356-0.42-2.124-0.42 c-0.76,0-1.48,0.14-2.14,0.42c-0.66,0.28-1.228,0.668-1.7,1.164c-0.468,0.496-0.84,1.108-1.108,1.832 c-0.268,0.728-0.404,1.524-0.404,2.392c0,0.892,0.136,1.708,0.404,2.444C111.203,29.517,111.575,30.157,112.047,30.693z M112.835,24.645c0.168-0.464,0.396-0.844,0.68-1.144c0.28-0.292,0.612-0.52,1.016-0.692c0.412-0.176,0.864-0.264,1.356-0.264 s0.924,0.084,1.32,0.256c0.412,0.176,0.756,0.412,1.056,0.72c0.288,0.296,0.508,0.664,0.68,1.128 c0.18,0.492,0.276,1.064,0.276,1.688c0,0.656-0.092,1.248-0.28,1.756c-0.18,0.496-0.416,0.904-0.728,1.248 c-0.296,0.328-0.632,0.576-1.028,0.752c-0.396,0.18-0.816,0.264-1.296,0.264c-0.484,0-0.916-0.088-1.316-0.264 c-0.404-0.18-0.732-0.416-1.012-0.736c-0.3-0.344-0.544-0.768-0.72-1.256c-0.192-0.524-0.284-1.116-0.284-1.764 C112.555,25.717,112.647,25.145,112.835,24.645z"></path> </g> </g> </g> </g></svg>
                  <span className={styles.tabLabel}>Hotels</span>
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'flight-tab-pane' ? 'active' : ''} h-100 ${styles.mobileTab}`} id="flight-tab" data-bs-toggle="tab" data-bs-target="#flight-tab-pane" type="button" role="tab" aria-controls="flight-tab-pane" aria-selected={activeTab === 'flight-tab-pane'} onClick={() => handleTabChange('flight-tab-pane')}>
                  {/* <IoAirplane /> */}
                  <svg xmlns="http://www.w3.org/2000/svg" width='42px' height='42px' fill="none" viewBox="0 0 33 33" focusable="false" aria-hidden="true" role="img"><path stroke='#0b659b' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="m20.597 10.142-14.436-4.5-1.885 1.884 12.04 6.899M24.05 13.595l4.498 14.44-1.884 1.885-6.896-12.039"></path><path stroke='#0b659b' strokeMiterlimit="10" strokeWidth="1.5" d="M11.91 25.074c-.075-.308.101-.574.331-.793 1.623-1.543 6.293-5.154 7.287-6.149L26.76 10.9a12.9 12.9 0 0 0 3.334-5.772.837.837 0 0 0-1.02-1.02 12.9 12.9 0 0 0-5.771 3.335l-7.233 7.233c-.994.994-4.695 5.883-6.149 7.286-.23.223-.484.406-.793.33l-4.243-1.03-.463.463 4.028 4.031 4.027 4.031.463-.463-1.03-4.242z"></path><path fill='#0b659b' stroke='#0b659b' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M17.85 6.792 15.91 4.85l-2.34 2.344 2.957.918zM26.888 16.955l1.942 1.942-2.344 2.343-.922-2.96z"></path></svg>
                  <span className={styles.tabLabel}>Flights</span>
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'transfer-tab-pane' ? 'active' : ''} h-100 ${styles.mobileTab}`} id="transfer-tab" data-bs-toggle="tab" data-bs-target="#transfer-tab-pane" type="button" role="tab" aria-controls="transfer-tab-pane" aria-selected={activeTab === 'transfer-tab-pane'} onClick={() => handleTabChange('transfer-tab-pane')}>
                  {/* <FaCar /> */}
                  <svg xmlns="http://www.w3.org/2000/svg" width='40px' height='40px' fill="none" viewBox="0 0 33 33" focusable="false" aria-hidden="true" role="img"><g clipPath="url(#CarsGrey_tsx__a)"><path fill='#0b659b' d="m10.17 24.424 1.082-2.158c.313-.627 1.061-1.037 1.892-1.037h6.274c.82 0 1.559.4 1.882 1.018l1.13 2.177"></path><path stroke='#0b659b' strokeMiterlimit="10" strokeWidth="1.5" d="M16.3 24.424H2.024"></path><path stroke='#0b659b' strokeLinejoin="round" strokeWidth="1.5" d="M5.586 10.871H3.004a.98.98 0 0 0 0 1.96H29.6a.98.98 0 0 0 0-1.96h-2.606"></path><path stroke='#0b659b' strokeMiterlimit="10" strokeWidth="1.5" d="M16.3 24.424h14.276"></path><path stroke='#0b659b' strokeLinejoin="round" strokeWidth="1.5" d="M7.01 24.423v3.19H2.023v-9.801c0-1.603.618-3.138 1.718-4.3l.652-.686 3.098-5.183a3.03 3.03 0 0 1 2.775-1.815h11.97c1.187 0 2.263.69 2.755 1.771l3.2 5.227.956 1.004c.786.825 1.428 2.432 1.428 3.571v10.213H25.59v-3.19"></path><path fill='#0b659b' d="M22.84 19.08c.202-.771 1.858-2.644 4.107-2.644.526 0 1.066.169 1.245.676.178.507.28 1.173.116 2.065a1.01 1.01 0 0 1-.83.802c-.826.135-2.327.29-4.02-.005-.42-.073-.725-.483-.618-.893M9.66 19.08c-.204-.771-1.859-2.644-4.108-2.644-.526 0-1.067.169-1.245.676s-.28 1.173-.116 2.065c.077.415.415.734.83.802.825.135 2.326.29 4.02-.005.42-.073.724-.483.618-.893"></path><path stroke='#0b659b' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.052 19.148h6.395"></path><path stroke='#0b659b' strokeLinejoin="round" strokeWidth="1.5" d="M18.428 12.83a2.5 2.5 0 0 1 2.505-2.504 2.5 2.5 0 0 1 2.505 2.504"></path><path fill='#0b659b' d="M2.024 24.82v2.799h4.985v-3.195zM25.89 25.022v2.794h4.985v-3.19z"></path></g><defs><clipPath id="CarsGrey_tsx__a"><path fill="#fff" d="M1.3 5.109h30v23.234h-30z"></path></clipPath></defs></svg>
                  <span className={styles.tabLabel}>Transfers</span>
                </button>
              </li>
              <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'activity-tab-pane' ? 'active' : ''} h-100 ${styles.mobileTab}`} id="activity-tab" data-bs-toggle="tab" data-bs-target="#activity-tab-pane" type="button" role="tab" aria-controls="activity-tab-pane" aria-selected={activeTab === 'activity-tab-pane'} onClick={() => handleTabChange('activity-tab-pane')}>
                  {/* <GiSettingsKnobs /> */}
                  <svg version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xmlSpace="preserve" width='42px' height='42px' fill='#0b659b' stroke='#0b659b'><g id="SVGRepo_bgCarrier" strokeWidth="0"></g><g id="SVGRepo_tracerCarrier" strokeLinecap="round" strokeLinejoin="round"></g><g id="SVGRepo_iconCarrier">  <g> <path className="st0" d="M430.337,231.065H81.674c-29.701,0-53.858,24.16-53.858,53.862v49.884v15.976l15.806,2.262 c9.135,1.31,16.03,9.258,16.03,18.483c0,9.225-6.891,17.173-16.022,18.482l-15.814,2.262v15.978v49.892 c0,29.693,24.157,53.854,53.858,53.854h348.663c29.701,0,53.862-24.161,53.862-53.854v-49.558V391l-17.571-0.822 c-9.982-0.463-17.808-8.655-17.808-18.645c0-9.982,7.826-18.174,17.815-18.646l17.564-0.83v-17.58v-49.55 C484.199,255.225,460.038,231.065,430.337,231.065z M465.765,334.477c-19.686,0.936-35.371,17.14-35.371,37.056 c0,19.923,15.685,36.135,35.371,37.055v49.558c0,19.565-15.864,35.428-35.428,35.428H81.674c-19.569,0-35.432-15.863-35.432-35.428 v-49.892c17.991-2.579,31.836-18.011,31.836-36.722c0-18.703-13.846-34.135-31.836-36.721v-49.884 c0-19.573,15.863-35.436,35.432-35.436h348.663c19.564,0,35.428,15.863,35.428,35.436V334.477z"></path> <rect x="133.621" y="439.419" className="st0" width="12.19" height="31.8"></rect> <rect x="133.621" y="383.564" className="st0" width="12.19" height="31.792"></rect> <rect x="133.621" y="327.7" className="st0" width="12.19" height="31.8"></rect> <rect x="133.621" y="271.846" className="st0" width="12.19" height="31.799"></rect> <polygon className="st0" points="111.245,180.758 100.592,186.68 116.053,214.461 126.702,208.539 "></polygon> <path className="st0" d="M497.524,179.025l-24.095-43.311l-8.558-15.36l-15.749,7.826c-8.948,4.442-19.768,1.09-24.617-7.639 c-4.865-8.721-2.001-19.687,6.492-24.95l14.952-9.266l-8.558-15.368l-24.088-43.294C398.863,1.714,366.006-7.658,340.047,6.79 L35.374,176.299c-25.955,14.44-35.318,47.305-20.878,73.256l0.875,1.578c3.27-6.394,7.43-12.243,12.324-17.409 c-4.803-15.643,1.762-33.044,16.636-41.326l304.681-169.51c17.1-9.518,38.674-3.368,48.192,13.732l24.088,43.302 c-16.751,10.38-22.575,32.182-12.895,49.582c9.681,17.401,31.271,23.942,48.925,15.172l24.095,43.312 c7.273,13.056,5.337,28.692-3.571,39.601c4.776,3.961,8.989,8.558,12.65,13.569C505.4,224.524,508.979,199.615,497.524,179.025z"></path> </g> </g></svg>
                  <span className={styles.tabLabel}>Activities</span>
                </button>
              </li>
              {/* <li className="nav-item" role="presentation">
                <button className="nav-link" id="general-package-tab" data-bs-toggle="tab" data-bs-target="#general-package-tab-pane" type="button" role="tab" aria-controls="general-package-tab-pane" aria-selected="false">
                  <IoIosStarOutline color='#0b659b' size={46} />
                  <span className={styles.tabLabel}>Holiday Packages</span>
                </button>
              </li> */}

              {/* <li className="nav-item" role="presentation">
                <button className={`nav-link ${activeTab === 'ai-tab-pane' ? 'active' : ''} h-100 ${styles.mobileTab}`} id="ai-tab" data-bs-toggle="tab" data-bs-target="#ai-tab-pane" type="button" role="tab" aria-controls="ai-tab-pane" aria-selected={activeTab === 'ai-tab-pane'} onClick={() => handleTabChange('ai-tab-pane')}>
                  <HiOutlineSparkles color='#0b659b' size='40px' />
                  <span className={styles.tabLabel}>AI Mode</span>
                </button>
              </li> */}
            </ul>
          </div>
          {/* Tab Content */}
          <div className={`tab-content ${styles.searchBody}`} id="searchTabsContent">
            <div className={`tab-pane fade ${activeTab === 'hotel-tab-pane' ? 'show active' : ''} ${styles.searchBoxWrapper}`} id="hotel-tab-pane" role="tabpanel" aria-labelledby="hotel-tab">
              <Suspense fallback={<div></div>}>
                <HotelSearch />
              </Suspense>
            </div>
            <div className={`tab-pane fade ${activeTab === 'flight-tab-pane' ? 'show active' : ''} ${styles.searchBoxWrapper}`} id="flight-tab-pane" role="tabpanel" aria-labelledby="flight-tab">
              <Suspense fallback={<div></div>}>
                <FlightSearch />
              </Suspense>
            </div>
            <div className={`tab-pane fade ${activeTab === 'package-tab-pane' ? 'show active' : ''} ${styles.searchBoxWrapper}`} id="package-tab-pane" role="tabpanel" aria-labelledby="package-tab">
              <Suspense fallback={<div></div>}>
                <PackageSearch categoryList={categories} loading={loadingCategories} />
              </Suspense>
            </div>
            <div className={`tab-pane fade ${activeTab === 'activity-tab-pane' ? 'show active' : ''} ${styles.searchBoxWrapper}`} id="activity-tab-pane" role="tabpanel" aria-labelledby="activity-tab">
              <Suspense fallback={<div></div>}>
                <ActivitySearch />
              </Suspense>
            </div>
            <div className={`tab-pane fade ${activeTab === 'general-package-tab-pane' ? 'show active' : ''} ${styles.searchBoxWrapper}`} id="general-package-tab-pane" role="tabpanel" aria-labelledby="general-package-tab">
              <Suspense fallback={<div></div>}>
                <GeneralPackages />
              </Suspense>
            </div>
            <div className={`tab-pane fade ${activeTab === 'transfer-tab-pane' ? 'show active' : ''} ${styles.searchBoxWrapper}`} id="transfer-tab-pane" role="tabpanel" aria-labelledby="transfer-tab">
              <Suspense fallback={<div></div>}>
                <TransferSearch />
              </Suspense>
            </div>
            <div className={`tab-pane fade ${activeTab === 'umrah-get-away' ? 'show active' : ''} ${styles.searchBoxWrapper}`} id="umrah-get-away" role="tabpanel" aria-labelledby="umrah-get-tab">
              <Suspense fallback={<div></div>}>
                <UmrahGetAway />
              </Suspense>
            </div>
            <div className={`tab-pane fade ${activeTab === 'ai-tab-pane' ? 'show active' : ''} ${styles.searchBoxWrapper}`} id="ai-tab-pane" role="tabpanel" aria-labelledby="ai-tab">
              <Suspense fallback={<div></div>}>
                <AiSearch categoryList={categories} />
              </Suspense>
            </div>
          </div>
          </div>
          
          {/* {activeTab !== 'ai-tab-pane' && (
            <div className="text-center mb-3 mt-3 search-step-header">
              {LabelsList.filter(label => label.name === activeTab).map((label , index) => (
                <span key={index} className="text-white px-3 py-2 rounded px-1">{label.label}</span>
              ))}
            </div>
          )}
          {activeTab === 'package-tab-pane' && (
            <div className="row g-1 mx-0 justify-content-center search-steps-card" >
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaUser size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Select Your Preferences</h6>
                      <small className="text-muted">Select your package category</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    1
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaList size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Select Your Package</h6>
                      <small className="text-muted">Select from available packages</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    2
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaHotel size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Review & Customize</h6>
                      <small className="text-muted">Review and adjust your booking</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    3
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaCheck size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Confirm & Book</h6>
                      <small className="text-muted">Pay securely & confirm instantly</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    4
                  </div>
                </div>
              </div>

            </div>
          )}
          {activeTab === 'umrah-get-away' && (
            <div className="row g-1 mx-0 justify-content-center search-steps-card" >
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaUser size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Select Your Preferences</h6>
                      <small className="text-muted">Choose Guests, nights and date</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    1
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaList size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Pick Your Package</h6>
                      <small className="text-muted">Select from available packages</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    2
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaHotel size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Review & Customize</h6>
                      <small className="text-muted">Adjust your choices as needed</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    3
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaCheck size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Confirm & Book</h6>
                      <small className="text-muted">Pay & confirm instantly</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    4
                  </div>
                </div>
              </div>

            </div>
          )}
          {activeTab === 'hotel-tab-pane' && (
            <div className="row g-1 mx-0 justify-content-center search-steps-card" >
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaLocationDot size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Choose Destination</h6>
                      <small className="text-muted">Select your destination</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    1
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaHotel size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Choose Hotel</h6>
                      <small className="text-muted">View available hotels</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    2
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaBed size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Choose Room Type</h6>
                      <small className="text-muted">Select your preferred room</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    3
                  </div>
                </div>
              </div>

              <div className="col-12 col-md-6 col-lg-3">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaCheck size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Confirm & Pay</h6>
                      <small className="text-muted">Secure your booking instantly</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    4
                  </div>
                </div>
              </div>

            </div>
          )}
          {activeTab === 'flight-tab-pane' && (
            <div className="row g-1 mx-0 justify-content-center search-steps-card" >
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaLocationDot size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Enter Your Route</h6>
                      <small className="text-muted">Select departure and arrival airports</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    1
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaCalendarAlt size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Select Dates</h6>
                      <small className="text-muted">Choose your travel dates</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    2
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaCheck size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Choose & Confirm</h6>
                      <small className="text-muted">Select your flight and pay securely</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    3
                  </div>
                </div>
              </div>

            </div>
          )}
          {activeTab === 'transfer-tab-pane' && (
            <div className="row g-1 mx-0 justify-content-center search-steps-card" >
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaLocationDot size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Enter Your Journey Details</h6>
                      <small className="text-muted">Select pickup and drop-off locations</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    1
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaCalendarAlt size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Select Date & Time</h6>
                      <small className="text-muted">Choose your pickup and return times</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    2
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaCheck size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Choose Vehicle & Confirm</h6>
                      <small className="text-muted">Select your transfer option and pay securely</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    3
                  </div>
                </div>
              </div>

            </div>
          )}
          {activeTab === 'activity-tab-pane' && (
            <div className="row g-1 mx-0 justify-content-center search-steps-card" >
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaLocationDot size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Choose Destination</h6>
                      <small className="text-muted">Select your destination city</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    1
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaCalendarAlt size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Select Date</h6>
                      <small className="text-muted">Choose your activity date</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    2
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaCheck size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Choose Activity & Confirm</h6>
                      <small className="text-muted">Select your activity and pay securely</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    3
                  </div>
                </div>
              </div>

            </div>
          )}
          {activeTab === 'general-package-tab-pane' && (
            <div className="row g-1 mx-0 justify-content-center search-steps-card" >
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width='30px' height='30px' fill="none" viewBox="0 0 33 33" focusable="false" aria-hidden="true" role="img"><g clipPath="url(#PackagesGrey_tsx__a)"><path fill='#ffffff' d="M3.197 28.105h-1.9v1.135h1.9zM15.72 28.105h-2.356v.87h2.355z"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687H1.14"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M2.979 20.694H1.648a.509.509 0 0 0 0 1.015h13.726a.509.509 0 0 0 0-1.015H14.03"></path><path stroke='#ffffff' strokeMiterlimit="10" strokeWidth="1.25" d="M8.509 27.687h7.368"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M3.713 27.687v1.647H1.14v-5.06c0-.828.316-1.622.887-2.219l.338-.354 1.6-2.675a1.56 1.56 0 0 1 1.429-.935h6.178c.61 0 1.17.359 1.42.913l1.652 2.697.495.52c.405.427.738 1.255.738 1.844v5.269h-2.573v-1.647"></path><path fill='#ffffff' d="m5.347 27.687.559-1.114c.162-.324.546-.537.977-.537h3.238c.423 0 .807.209.969.525l.584 1.122M11.628 24.93c.102-.4.96-1.365 2.12-1.365.273 0 .55.086.644.35.094.265.145.606.06 1.067a.52.52 0 0 1-.427.414 6.3 6.3 0 0 1-2.073 0c-.218-.039-.371-.248-.32-.461zM5.39 24.93c-.103-.4-.96-1.365-2.12-1.365-.274 0-.551.086-.645.35-.094.265-.145.606-.06 1.067.038.213.213.38.427.414.426.072 1.203.15 2.073 0 .218-.039.372-.248.32-.461zM10.24 24.257H6.777a.39.39 0 0 0-.388.388v.444c0 .214.174.388.388.388h3.465a.39.39 0 0 0 .388-.388v-.444a.39.39 0 0 0-.388-.388"></path><path fill='#ffffff' stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="m14.985 8.295-10.423 2.13a1.79 1.79 0 0 1-1.899-.841L1.14 7.019l1.075-.537 1.596 1.365L14.422 5.68a2.96 2.96 0 0 1 1.677.145l.073.03a.983.983 0 0 1 .345 1.6 2.96 2.96 0 0 1-1.532.84Z"></path><path fill='#ffffff' d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="m7.847 9.72-2.022 4.463h1.8l5.342-5.53"></path><path fill='#ffffff' d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="0.4" d="M8.21 6.947 5.64 3.66h2.18l3.623 2.624"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M19.354 11.026h9.212000000000002M20.195 11.026v18.312M27.73 11.026v18.312"></path><path fill='#ffffff' d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M23.348 29.338v-3.157h1.446v3.157"></path><path stroke='#ffffff' strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338v-8.076h-4.13"></path><path fill='#ffffff' d="M23.066 13.453h-.814a.324.324 0 0 0-.325.325v.806c0 .18.145.324.325.324h.814c.18 0 .325-.145.325-.324v-.806a.324.324 0 0 0-.325-.325M25.89 13.453h-.814a.324.324 0 0 0-.324.325v.806c0 .18.145.324.324.324h.815c.179 0 .324-.145.324-.324v-.806a.324.324 0 0 0-.324-.325M23.066 16.338h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.146.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 16.338h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.146.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 19.299h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 19.299h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324M23.066 22.26h-.814a.324.324 0 0 0-.325.324v.806c0 .18.145.325.325.325h.814c.18 0 .325-.145.325-.325v-.806a.324.324 0 0 0-.325-.324M25.89 22.26h-.814a.324.324 0 0 0-.324.324v.806c0 .18.145.325.324.325h.815c.179 0 .324-.145.324-.325v-.806a.324.324 0 0 0-.324-.324"></path><path stroke='#ffffff' strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.25" d="M31.86 29.338H20.195"></path></g><defs><clipPath id="PackagesGrey_tsx__a"><path fill="#fff" d="M.5 3.021h32v26.957H.5z"></path></clipPath></defs></svg>

                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Select Preferences</h6>
                      <small className="text-muted">Choose stay, flight, or transfer options</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    1
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaLocationDot size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Choose Destination</h6>
                      <small className="text-muted">Select Where you want to go and dates</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    2
                  </div>
                </div>
              </div>
              <div className="col-12 col-md-6 col-lg-4">
                <div className="card shadow-sm border h-100 rounded-4 position-relative">
                  <div className="card-body d-flex align-items-center">
                    <div className="text-white rounded-circle d-flex align-items-center justify-content-center me-3"
                      style={{ width: '50px', height: '50px', backgroundColor: '#E7247A' }}>
                      <FaCheck size={20} />
                    </div>
                    <div>
                      <h6 className="mb-1 fw-bold">Review & Confirm</h6>
                      <small className="text-muted">Select package, pay & confirm booking</small>
                    </div>
                  </div>
                  <div className="count position-absolute rounded-circle d-flex align-items-center justify-content-center">
                    3
                  </div>
                </div>
              </div>

            </div>
          )} */}
        </div>
      </div>
    </div>
  );
}
