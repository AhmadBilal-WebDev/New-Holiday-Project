import React from "react";
import styles from "./ActivityDetailLoader.module.css";

function Bone({ className = "", style }) {
  return <div className={`${styles.bone} ${className}`} style={style} aria-hidden="true" />;
}

export default function ActivityDetailLoader() {
  return (
    <div className="container mt-4 mb-5" role="status" aria-label="Loading activity details">
      <div className="row">
        {/* Main content — col-md-8 */}
        <div className="col-md-8">
          <section className="mb-5 mt-4">
            {/* Category badges */}
            <div className="d-flex flex-wrap gap-2 mb-3">
              <Bone className={styles.badge} />
              <Bone className={styles.badgeSm} />
            </div>

            {/* Title */}
            <div className="mb-4">
              <Bone className={`${styles.title} mb-2`} />
              <Bone className={styles.titleLine} />
            </div>

            {/* Info bar */}
            <div className="d-flex flex-wrap align-items-center gap-3 gap-md-4 mb-4 pb-3 border-bottom">
              <Bone className={styles.infoItem} />
              <Bone className={styles.infoItem} />
              <Bone className={styles.infoItem} />
              <Bone className={styles.infoItem} style={{ width: 90 }} />
            </div>

            {/* Tabs */}
            <div className="d-flex gap-2 mb-4">
              <Bone className={styles.tab} />
              <Bone className={styles.tab} />
              <Bone className={styles.tab} />
            </div>

            {/* Description block */}
            <div className="mb-4">
              <Bone className={`${styles.sectionTitle} mb-3`} />
              <Bone className={`${styles.line} ${styles.lineFull} mb-2`} />
              <Bone className={`${styles.line} ${styles.lineLg} mb-2`} />
              <Bone className={`${styles.line} ${styles.lineMd} mb-2`} />
              <Bone className={`${styles.line} ${styles.lineFull} mb-2`} />
              <Bone className={`${styles.line} ${styles.lineSm} mb-2`} />
              <Bone className={`${styles.line} ${styles.lineLg} mb-2`} />
              <Bone className={`${styles.line} ${styles.lineMd}`} />
            </div>
          </section>

          {/* Meeting and Pickup card */}
          <section className="mb-5">
            <div className={styles.meetingCard}>
              <div className={`${styles.meetingHeader} d-flex align-items-center px-4`}>
                <Bone className={styles.sectionTitle} style={{ width: 180 }} />
              </div>
              <div className="p-4">
                <div className="row g-4">
                  <div className="col-md-6">
                    <Bone className={`${styles.line} mb-3`} style={{ width: 130, height: 18 }} />
                    <Bone className={`${styles.line} ${styles.lineFull} mb-2`} />
                    <Bone className={`${styles.line} ${styles.lineMd}`} />
                  </div>
                  <div className="col-md-6">
                    <Bone className={`${styles.line} mb-3`} style={{ width: 110, height: 18 }} />
                    <Bone className={`${styles.line} ${styles.lineFull} mb-2`} />
                    <Bone className={`${styles.line} ${styles.lineSm}`} />
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar — col-md-4 (Selection) */}
        <div className="col-md-4 mt-4 mt-md-0">
          <div className={styles.sidebarCard}>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <Bone className={styles.price} />
              <Bone style={{ height: 20, width: 70, borderRadius: 4 }} />
            </div>

            <Bone className={`${styles.calendar} mb-3`} />

            <Bone className={`${styles.counter} mb-2`} />
            <Bone className={`${styles.counter} mb-3`} />

            <div className="d-flex justify-content-between align-items-center mb-3">
              <Bone style={{ height: 16, width: 80, borderRadius: 4 }} />
              <Bone style={{ height: 22, width: 90, borderRadius: 4 }} />
            </div>

            <Bone className={styles.btn} />
          </div>
        </div>
      </div>
    </div>
  );
}
