'use client'
import React, { useState, useRef } from "react";
import { DateInput } from '@mantine/dates';
import { notifications } from "@mantine/notifications";
import { useRouter } from "next/navigation";
import { FaCalendarAlt, FaRegListAlt, FaSearch } from "react-icons/fa";
export default function PackageSearch({ categoryList }) {
    const [formData, setFormData] = useState({ category: '', date: null });
    const router = useRouter();
    const dateInputRef = useRef(null);
    const handleinputchange = (e) => {
        setFormData((prev) => ({
            ...prev,
            category: e.target.value,
        }))
        if (e.target.value !== '') {
            dateInputRef.current?.focus();
        }
    }
    const handledatechange = (value) => {
        setFormData((prev) => ({
            ...prev,
            date: value,
        }))
    }
    const handlesubmit = () => {
        if (formData.category === '') {
            notifications.show({
                title: 'Error',
                message: 'Category is required',
                autoClose: 2000,
                color: 'red'
            })
            return;
        } else if (formData.date === null) {
            notifications.show({
                title: 'Error',
                message: 'Date is required',
                autoClose: 2000,
                color: 'red'
            })
            return;
        }
        // category_slug
        router.push(`/${formData.category}?date=${formData.date}`);

    }
    return (
        <div>
            <div className="package-search-row">
                <div className="package-search-field">
                    <div className="d-flex align-items-center position-relative">
                        <div className="position-absolute search-field-icon" style={{ left: '12px', zIndex: 10 }}>
                            <FaRegListAlt size={18} />
                        </div>
                        <div className="form-floating w-100">
                            <select style={{ paddingLeft: '58px', fontSize: '15px', paddingTop: '1.8em' }} id="floatingInput" value={formData.category} onChange={handleinputchange} className="form-select form-control" aria-label="Default select example"  >
                                <option className="small" value=''>Select Package Category</option>
                                {categoryList.map((item, index) => (
                                    <option key={index} value={item.slug}>{item.name}</option>
                                ))}
                            </select>
                            <label style={{ paddingLeft: '58px' }} htmlFor="floatingInput">Category</label>
                        </div>
                    </div>
                </div>

                <div className="package-search-field">
                    <div className="d-flex align-items-center position-relative">
                        <div className="position-absolute search-field-icon" style={{ left: '12px', zIndex: 10 }}>
                            <FaCalendarAlt size={18} />
                        </div>
                        <div className="form-floating w-100">
                            <DateInput onFocus={(e) => e.target.select()} style={{ paddingLeft: 0 }} ref={dateInputRef} variant="unstyled" id="floatingInput"  onChange={handledatechange} minDate={new Date()} value={formData.date} className="hotel-date-range form-control" placeholder="Select date" />
                            <label style={{ paddingLeft: '58px' }} htmlFor="floatingInput">Date</label>
                        </div>
                    </div>
                </div>

                <div className="package-search-action">
                    <button onClick={handlesubmit} className="btn btn-success search-btn-styling-home bg-color w-100 h-100">
                        <FaSearch aria-hidden="true" />
                        Search
                    </button>
                </div>
            </div>
        </div>
    );
}
