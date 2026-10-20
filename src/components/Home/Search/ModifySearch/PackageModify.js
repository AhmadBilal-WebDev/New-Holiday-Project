"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { DateInput } from "@mantine/dates";
import { notifications } from "@mantine/notifications";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";
import { FaCalendarAlt, FaRegListAlt, FaSearch, FaTimes } from "react-icons/fa";
import { MdEdit } from "react-icons/md";
import { Inter, Outfit } from "next/font/google";
import { usePackageCategories } from "@/contexts/PackageCategoriesContext";
import styles from "./PackageModify.module.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["700"],
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const UMRAH_SLUG = "umrah-packages";

function parseDateParam(value) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function resolvePackagePath(category) {
  if (category === UMRAH_SLUG) return `/${UMRAH_SLUG}`;
  return `/${category}`;
}

function formatDateDisplay(date) {
  if (!date) return "";
  const d = typeof date === "string" ? parseDateParam(date) : date;
  if (!d) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function formatDateForQuery(date) {
  if (!date) return "";
  if (typeof date === "string") return date;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function PackageModify({ onSearch, defaultCategory = "" }) {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { categories, loading: loadingCategories } = usePackageCategories();
  const dateInputRef = useRef(null);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [formData, setFormData] = useState({
    category: "",
    date: null,
  });
  const formDataRef = useRef(formData);

  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  useEffect(() => {
    const fromPath =
      pathname === `/${UMRAH_SLUG}` || pathname?.startsWith(`/${UMRAH_SLUG}?`)
        ? UMRAH_SLUG
        : "";
    const slug = params?.slug || defaultCategory || fromPath || "";
    const dateParam = searchParams?.get("date");
    const next = {
      category: slug,
      date: parseDateParam(dateParam),
    };
    formDataRef.current = next;
    setFormData(next);
  }, [params?.slug, defaultCategory, pathname, searchParams]);

  const selectedCategoryName = useMemo(() => {
    if (!formData.category) return "";
    const match = categories.find((item) => item.slug === formData.category);
    return match?.name || formData.category;
  }, [categories, formData.category]);

  const handleCategoryChange = (e) => {
    const next = {
      ...formDataRef.current,
      category: e.target.value,
    };
    formDataRef.current = next;
    setFormData(next);
    if (e.target.value) {
      dateInputRef.current?.focus?.();
    }
  };

  const clearCategory = () => {
    const next = {
      ...formDataRef.current,
      category: "",
    };
    formDataRef.current = next;
    setFormData(next);
  };

  const handleDateChange = (value) => {
    const next = {
      ...formDataRef.current,
      date: value,
    };
    formDataRef.current = next;
    setFormData(next);
  };

  const closeMobileSearch = () => setShowMobileSearch(false);

  const SubmitForm = () => {
    const data = formDataRef.current;

    if (!data.category) {
      notifications.show({
        autoClose: 2000,
        title: "Error",
        message: "Category is required",
        color: "red",
      });
      return;
    }

    if (!data.date) {
      notifications.show({
        autoClose: 2000,
        title: "Error",
        message: "Date is required",
        color: "red",
      });
      return;
    }

    const query = new URLSearchParams();
    query.set("date", formatDateForQuery(data.date));
    closeMobileSearch();
    if (onSearch) onSearch();
    router.push(`${resolvePackagePath(data.category)}?${query.toString()}`);
  };

  const fieldIds = {
    category: "package-modify-category",
    date: "package-modify-date",
  };

  const renderSearchBar = (idSuffix = "") => (
    <div className={styles.bar}>
      <div className={styles.field}>
        <div className="d-flex align-items-center position-relative w-100">
          <div
            className="position-absolute search-field-icon"
            style={{ left: "12px", zIndex: 10 }}
          >
            <FaRegListAlt size={18} />
          </div>
          <div className="form-floating w-100">
            <select
              id={`${fieldIds.category}${idSuffix}`}
              value={formData.category}
              onChange={handleCategoryChange}
              className="form-select form-control"
              aria-label="Package category"
              disabled={loadingCategories}
              style={{
                paddingLeft: "58px",
                fontSize: "15px",
                paddingTop: "1.8em",
                paddingRight: formData.category ? "44px" : undefined,
              }}
            >
              <option className="small" value="">
                Select Package Category
              </option>
              {categories.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            <label
              htmlFor={`${fieldIds.category}${idSuffix}`}
              style={{ paddingLeft: "58px" }}
            >
              Category
            </label>
          </div>
          {formData.category ? (
            <button
              type="button"
              className={styles.fieldClear}
              onClick={clearCategory}
              aria-label="Clear category"
            >
              <FaTimes size={12} />
            </button>
          ) : null}
        </div>
      </div>

      <div className={styles.field}>
        <div className="d-flex align-items-center position-relative w-100">
          <div
            className="position-absolute search-field-icon"
            style={{ left: "12px", zIndex: 10 }}
          >
            <FaCalendarAlt size={18} />
          </div>
          <div className="form-floating w-100">
            <DateInput
              onFocus={(e) => e.target.select()}
              style={{ paddingLeft: 0 }}
              ref={idSuffix === "-mobile" ? undefined : dateInputRef}
              variant="unstyled"
              id={`${fieldIds.date}${idSuffix}`}
              valueFormat="DD-MM-YYYY"
              onChange={handleDateChange}
              minDate={new Date()}
              value={formData.date}
              className="hotel-date-range form-control"
              placeholder="Select date"
              styles={{
                input: {
                  paddingLeft: "58px",
                  fontWeight: 700,
                  fontSize: "15px",
                },
              }}
            />
            <label
              htmlFor={`${fieldIds.date}${idSuffix}`}
              style={{ paddingLeft: "58px" }}
            >
              Date
            </label>
          </div>
        </div>
      </div>

      <div className={styles.searchAction}>
        <button type="button" onClick={SubmitForm} className={styles.searchBtn}>
          <FaSearch size={14} aria-hidden="true" />
          Search
        </button>
      </div>
    </div>
  );

  const renderIntro = () => (
    <div className={styles.intro}>
      <h1 className={`${styles.title} ${outfit.className}`}>
        Which Exciting Place Is Your Next Adventure Taking You?
      </h1>
      <p className={`${styles.subtitle} ${inter.className}`}>
        Discover Exclusive Genius Rewards Wherever Your Journey Takes You!
      </p>
    </div>
  );

  return (
    <>
      {/* Desktop: always visible */}
      <div className={`${styles.root} d-none d-md-block`}>
        <div className={styles.inner}>
          {renderIntro()}
          {renderSearchBar()}
        </div>
      </div>

      {/* Mobile: compact summary + collapsible modify panel */}
      <div className="d-block d-md-none">
        <div className="msb-bar">
          <div
            className="msb-bar__inner"
            onClick={() => setShowMobileSearch((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowMobileSearch((prev) => !prev);
              }
            }}
          >
            <div className="msb-icon" aria-hidden="true">
              <FaRegListAlt size={18} />
            </div>

            <div className="msb-info">
              <div className="msb-title">
                {selectedCategoryName || "Search Packages"}
              </div>
              <div className="msb-subtitle">
                <FaCalendarAlt size={11} className="msb-subtitle-icon" />
                {formData.date
                  ? formatDateDisplay(formData.date)
                  : "Tap to modify search"}
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMobileSearch((prev) => !prev);
              }}
              className="msb-modify-btn"
            >
              <MdEdit size={14} />
              {showMobileSearch ? "Close" : "Modify"}
            </button>
          </div>
        </div>

        <div
          className="msb-collapse"
          style={{ maxHeight: showMobileSearch ? "1200px" : "0" }}
        >
          <div className="msb-collapse-inner">
            <div className={`${styles.root} ${styles.rootMobilePanel}`}>
              <div className={styles.inner}>
                {renderIntro()}
                {renderSearchBar("-mobile")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
