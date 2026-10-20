'use client'
import React, { useEffect, useMemo, useState } from 'react'
import PackageCard from './PackageCard';
import PackageCardLoader from '../Loader/PackageCardLoader';
import PackageSearchLoader from '../Loader/PackageSearchLoader';
import { useSearchParams, useParams } from "next/navigation";
import PackagePagination from './PackagePagination';
import Link from 'next/link';
import { FaHome } from 'react-icons/fa';
import { Playfair } from 'next/font/google';
import Filter from './Filter';

const playfair = Playfair({
    weight: '700',
    subsets: ['latin']
})

function formatCategoryLabel(slug) {
    if (!slug) return 'packages';
    return String(slug)
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export default function PackageList({ category_slug }) {
    const searchParams = useSearchParams();
    const params = useParams();
    const [packageResponse, setPackageResponse] = useState({});
    const [packageList, setPackageList] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [progress, setProgress] = useState(0);

    const activeSlug = category_slug === 'umrah-packages'
        ? category_slug
        : (params?.slug || category_slug || 'packages');

    const categoryLabel = useMemo(
        () => formatCategoryLabel(activeSlug),
        [activeSlug]
    );

    useEffect(() => {
        let cancelled = false;
        let progressInterval;

        async function getPackages() {
            setIsLoading(true);
            setProgress(8);

            progressInterval = setInterval(() => {
                setProgress((prev) => {
                    if (prev >= 90) return prev;
                    return prev + Math.max(2, Math.round((90 - prev) * 0.12));
                });
            }, 220);

            try {
                const res = await fetch(
                    `${process.env.NEXT_PUBLIC_API_URL}/api/packages/search?category_slug=${activeSlug}&${searchParams}`,
                    {
                        cache: 'no-store',
                        headers: {
                            'Content-Type': 'application/json',
                        }
                    }
                );
                const response = await res.json();
                if (cancelled) return;

                clearInterval(progressInterval);
                setProgress(100);

                if (response.Success) {
                    setPackageResponse(response?.Content);
                    setPackageList(response?.Content?.packages || []);
                } else {
                    setPackageResponse({});
                    setPackageList([]);
                }

                setTimeout(() => {
                    if (!cancelled) setIsLoading(false);
                }, 280);
            } catch (error) {
                if (cancelled) return;
                clearInterval(progressInterval);
                setIsLoading(false);
                setProgress(0);
                console.log(error);
            }
        }

        getPackages();

        return () => {
            cancelled = true;
            if (progressInterval) clearInterval(progressInterval);
        };
    }, [searchParams, activeSlug]);

    return (
        <div className="container my-5">
            <div className="row">
                <div className="col-xl-3 col-md-12 col-sm-12 col-12">
                    <Filter />
                </div>
                <div className="col-xl-9 col-md-12 col-sm-12 col-12">
                    {isLoading ? (
                        <div>
                            <PackageSearchLoader
                                progress={progress}
                                categoryLabel={categoryLabel}
                            />
                            <PackageCardLoader />
                        </div>
                    ) : (
                        <div>
                            {packageList.length === 0 ? (
                                <div className='text-center packge-card-notfound'>
                                    <h3 className={playfair.className}>No Packages Found</h3>
                                    <p>We couldn’t find any packages matching your search criteria. Try adjusting your filters or search again with different dates.</p>
                                    <Link href='/'>
                                        <button className='btn btn-success mx-1'>
                                            <FaHome /> Go Back Home
                                        </button>
                                    </Link>
                                </div>
                            ) : (
                                <div>
                                    <div
                                        className='bg-white p-2 mb-3 rounded small fw-bold'
                                        style={{ color: '#37130BCC' }}
                                    >
                                        {packageResponse?.pagination?.total} packages found for your search
                                    </div>
                                    <PackageCard packageList={packageList} />
                                    {packageResponse?.pagination?.last_page > 1 && (
                                        <PackagePagination pdata={packageResponse.pagination} />
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
