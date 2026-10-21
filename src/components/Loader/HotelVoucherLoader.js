import styles from "./HotelVoucherLoader.module.css";

function Field() {
    return (
        <div>
            <div className={`${styles.pulse} ${styles.fieldLabel}`} />
            <div className={`${styles.pulse} ${styles.fieldValue}`} />
        </div>
    );
}

export default function HotelVoucherLoader() {
    return (
        <div className={styles.wrap} aria-hidden="true">
            <div className={styles.headerBand}>
                <div>
                    <div className={`${styles.pulse} ${styles.headerTitle}`} />
                    <div className={`${styles.pulse} ${styles.headerTag}`} />
                </div>
                <div className={styles.headerContacts}>
                    <div className={`${styles.pulse} ${styles.headerContact}`} />
                    <div className={`${styles.pulse} ${styles.headerContact}`} />
                </div>
            </div>

            <div className={styles.headerSub}>
                <div className={styles.headerMain}>
                    <div className={styles.subLeft}>
                        <div className={`${styles.pulse} ${styles.lineSm}`} />
                        <div className={`${styles.pulse} ${styles.lineLg}`} />
                        <div className={`${styles.pulse} ${styles.lineMd}`} />
                    </div>
                    <div className={styles.subRight}>
                        <div className={styles.badgeRow}>
                            <div className={styles.badge} />
                            <div className={styles.badge} />
                        </div>
                        <div className={`${styles.pulse} ${styles.lineSm}`} />
                        <div className={`${styles.pulse} ${styles.lineSm}`} />
                    </div>
                </div>

                <div className={styles.qrCard}>
                    <div className={styles.qrBox} />
                    <div className={styles.qrText}>
                        <div className={`${styles.pulse} ${styles.qrTitle}`} />
                        <div className={`${styles.pulse} ${styles.qrLabel}`} />
                        <div className={`${styles.pulse} ${styles.qrLabel}`} />
                    </div>
                </div>
            </div>

            <div className={styles.body}>
                <div className={styles.card}>
                    <div className={styles.cardHead}>
                        <div className={styles.step} />
                        <div className={`${styles.pulse} ${styles.cardTitle}`} />
                    </div>
                    <div className={styles.grid}>
                        <Field />
                        <Field />
                        <Field />
                        <Field />
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHead}>
                        <div className={styles.step} />
                        <div className={`${styles.pulse} ${styles.cardTitle}`} />
                    </div>
                    <div className={styles.hotelCard}>
                        <div className={styles.hotelHead}>
                            <div className={`${styles.pulse} ${styles.hotelTitle}`} />
                            <div className={`${styles.pulse} ${styles.hotelAddr}`} />
                            <div className={styles.stayGrid}>
                                <Field />
                                <Field />
                                <Field />
                            </div>
                        </div>
                        <div className={styles.roomRow}>
                            <div className={`${styles.pulse} ${styles.fieldValue}`} />
                            <div className={`${styles.pulse} ${styles.fieldValue}`} />
                            <div className={`${styles.pulse} ${styles.fieldValue}`} />
                        </div>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHead}>
                        <div className={styles.step} />
                        <div className={`${styles.pulse} ${styles.cardTitle}`} />
                    </div>
                    <div className={styles.guestRow} />
                    <div className={styles.guestRow} />
                    <div className={styles.guestRow} />
                </div>

                <div className={styles.card}>
                    <div className={styles.cardHead}>
                        <div className={styles.step} />
                        <div className={`${styles.pulse} ${styles.cardTitle}`} />
                    </div>
                    <div className={`${styles.pulse} ${styles.fieldValue}`} />
                    <div
                        className={`${styles.pulse} ${styles.fieldValue}`}
                        style={{ marginTop: 10, width: "70%" }}
                    />
                    <div
                        className={`${styles.pulse} ${styles.fieldValue}`}
                        style={{ marginTop: 10, width: "78%" }}
                    />
                </div>
            </div>

            <div className={styles.footer}>
                <div className={`${styles.pulse} ${styles.footerTitle}`} />
                <div className={`${styles.pulse} ${styles.footerLine}`} />
                <div className={`${styles.pulse} ${styles.footerLine}`} />
            </div>

            <div className={styles.actions}>
                <div className={styles.btnPrimary} />
                <div className={styles.btnOutline} />
                <div className={styles.btnMuted} />
            </div>
        </div>
    );
}
