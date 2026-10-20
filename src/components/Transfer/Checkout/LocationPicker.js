'use client'
import React, { useState, useEffect } from 'react';
import Autocomplete from "react-google-autocomplete";
import { MdMap } from 'react-icons/md';

export default function LocationPicker({ 
    label, 
    value, 
    onChange, 
    error, 
    placeholder,
    onOpenMap,
    required = true,
    name
}) {
    const [locationDetails, setLocationDetails] = useState({
        address: value || '',
        lat: null,
        lng: null
    });

    useEffect(() => {
        if (value !== locationDetails.address) {
            setLocationDetails(prev => ({
                ...prev,
                address: value || ''
            }));
        }
    }, [value]);

    const handlePlaceSelected = (place) => {
        if (!place || !place.formatted_address) return;

        const address = place.formatted_address;
        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();

        const details = {
            address,
            lat,
            lng,
            placeId: place.place_id
        };

        setLocationDetails(details);
        onChange(details);
    };

    const handleInputChange = (e) => {
        const newAddress = e.target.value;
        setLocationDetails(prev => ({
            ...prev,
            address: newAddress
        }));
        
        // If user manually types, pass partial data
        onChange({
            address: newAddress,
            lat: locationDetails.lat,
            lng: locationDetails.lng
        });
    };

    return (
        <div className="location-picker">
            <label className="form-label">
                {label}{required && '*'}
            </label>
            
            <div className="d-flex gap-2 align-items-start">
                <div className="flex-grow-1">
                    <Autocomplete
                        apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
                        placeholder={placeholder || "Enter location"}
                        className={`form-control ${error ? "is-invalid" : ""}`}
                        name={name}
                        value={locationDetails.address}
                        onChange={handleInputChange}
                        onPlaceSelected={handlePlaceSelected}
                        options={{
                            types: ["geocode", "establishment"],
                        }}
                    />
                    {error && <div className="invalid-feedback d-block">{error}</div>}
                </div>
                
                <div className="d-flex gap-2">
                    
                    <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => onOpenMap(name, locationDetails)}
                        title="Click to select location from interactive map"
                        style={{ minWidth: '45px' }}
                    >
                        <MdMap size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}
