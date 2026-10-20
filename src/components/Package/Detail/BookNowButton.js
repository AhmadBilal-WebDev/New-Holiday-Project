'use client'
import React from 'react'
import { usePackageStore } from "@/components/Store/PackageStore";
import Link from 'next/link';

export default function BookNowButton({ PackageDetail, className, wrapperClassName }) {
    const { setSelectedPackage } = usePackageStore();
    const BookNow = () => {
        setSelectedPackage(PackageDetail);
    }
    return (
        <div className={wrapperClassName || 'sticky-button-container'}>
            <Link onClick={BookNow} href={`/${PackageDetail?.category.slug}/${PackageDetail?.slug}/selection`}>
                <button type="button" className={className || 'btn btn-success sticky-button'}>
                    Book Now
                </button>
            </Link>
        </div>
    )
}
