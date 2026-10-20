import React from 'react'

const SkeletonCard = () => (
    <div className="col-12 mb-3 px-0">
        <article className="htc-card htc-card--skeleton" aria-hidden="true">
            <div className="htc-card__layout">
                <div className="htc-card__media">
                    <div className="htc-skel htc-skel--img" />
                </div>

                <div className="htc-card__content">
                    <div className="htc-card__title-row">
                        <div className="htc-skel htc-skel--title" />
                        <div className="htc-skel htc-skel--stars" />
                    </div>
                    <div className="htc-skel htc-skel--line htc-skel--w70" />
                    <div className="htc-skel htc-skel--pill htc-skel--date" />
                    <div className="htc-card__amenities htc-skel-amenities">
                        <div className="htc-skel htc-skel--chip" />
                        <div className="htc-skel htc-skel--chip htc-skel--chip-lg" />
                        <div className="htc-skel htc-skel--chip" />
                        <div className="htc-skel htc-skel--chip htc-skel--chip-md" />
                    </div>
                </div>

                <aside className="htc-card__aside htc-card__aside--skeleton">
                    <div className="htc-skel htc-skel--label" />
                    <div className="htc-skel htc-skel--price" />
                    <div className="htc-skel htc-skel--line htc-skel--w50" />
                    <div className="htc-skel htc-skel--line htc-skel--w40" />
                    <div className="htc-skel htc-skel--btn" />
                </aside>
            </div>
        </article>
    </div>
);

export default function HotelCardLoader() {
    return (
        <div className="container hotel-card">
            <div className="row" aria-busy="true" aria-label="Loading hotels">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
            </div>
        </div>
    )
}
