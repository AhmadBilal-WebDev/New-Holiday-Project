'use client'
import React from 'react'
import './checkout-skeleton.css'

export default function CheckoutSkeleton() {
  return (
    <div className="activity-checkout-container activity-checkout-skeleton">
      <div className="container">
        <div className="checkout-page-header mt-3">
          <div className="cks-shimmer cks-back" />
          <div className="cks-shimmer cks-hero-banner" />
        </div>

        <div className="row g-4">
          <div className="col-lg-8 col-12 order-2 order-lg-1">
            <div className="booking-details-card">
              <div className="booking-details-header">
                <div className="cks-shimmer cks-line-md cks-on-dark" />
                <div className="cks-shimmer cks-line-sm cks-on-dark mt-2" />
              </div>

              <div className="booking-summary-panel">
                <div className="booking-summary-top">
                  <div className="cks-shimmer cks-square-media" />
                  <div>
                    <div className="cks-shimmer cks-line-sm mb-2" />
                    <div className="cks-shimmer cks-line-lg mb-2" />
                    <div className="cks-shimmer cks-line-md mb-3" />
                    <div className="row g-2">
                      {[1, 2, 3, 4].map((item) => (
                        <div key={item} className="col-6">
                          <div className="cks-shimmer cks-line-md" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="cks-shimmer cks-price-bar mt-3" />
              </div>

              <div className="booking-includes-section">
                <div className="row g-3">
                  {[1, 2].map((col) => (
                    <div key={col} className="col-md-6">
                      <div className="cks-shimmer cks-line-md mb-2" />
                      <div className="cks-shimmer cks-block" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="booking-policy-section">
                <div className="cks-shimmer cks-line-md mb-2" />
                <div className="cks-shimmer cks-block" />
              </div>
            </div>

            <div className="checkout-form-card">
              <div className="checkout-form-card-header">
                <div className="cks-shimmer cks-step-badge" />
                <div>
                  <div className="cks-shimmer cks-line-md mb-2" />
                  <div className="cks-shimmer cks-line-sm" />
                </div>
              </div>
              <div className="row g-3">
                {[1, 2, 3, 4].map((field) => (
                  <div key={field} className="col-md-6">
                    <div className="cks-shimmer cks-line-sm mb-2" />
                    <div className="cks-shimmer cks-input" />
                  </div>
                ))}
              </div>
            </div>

            <div className="checkout-form-card">
              <div className="checkout-form-card-header">
                <div className="cks-shimmer cks-step-badge" />
                <div>
                  <div className="cks-shimmer cks-line-md mb-2" />
                  <div className="cks-shimmer cks-line-sm" />
                </div>
              </div>
              <div className="cks-shimmer cks-block-tall" />
            </div>
          </div>

          <div className="col-lg-4 col-12 order-1 order-lg-2">
            <div className="checkout-sidebar">
              <div className="booking-details-card mb-3">
                <div className="booking-details-header">
                  <div className="cks-shimmer cks-line-md cks-on-dark" />
                  <div className="cks-shimmer cks-line-sm cks-on-dark mt-2" />
                </div>
                <div className="booking-summary-panel">
                  {[1, 2, 3, 4].map((row) => (
                    <div key={row} className="cks-summary-row">
                      <div className="cks-shimmer cks-line-sm" />
                      <div className="cks-shimmer cks-line-xs" />
                    </div>
                  ))}
                  <div className="cks-shimmer cks-total mt-3" />
                </div>
              </div>

              <div className="booking-details-card">
                <div className="booking-summary-panel">
                  <div className="cks-shimmer cks-line-md mb-2" />
                  <div className="cks-shimmer cks-block" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
