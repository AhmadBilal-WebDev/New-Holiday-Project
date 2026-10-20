'use client'
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import moment from 'moment'
import { FiClock, FiChevronLeft, FiChevronRight } from 'react-icons/fi'
import styles from './Availability.module.css'

export default function Availability({ PackageDetail, setSelectedDate, selectedDate }) {
  const stripRef = useRef(null)
  const [currentMonth, setCurrentMonth] = useState(moment())
  const [canScrollPrev, setCanScrollPrev] = useState(false)
  const [canScrollNext, setCanScrollNext] = useState(false)

  // Jump calendar to selected / search date month, else activity start month
  useEffect(() => {
    if (selectedDate?.isValid?.()) {
      setCurrentMonth(selectedDate.clone().startOf('month'))
      return
    }
    if (!PackageDetail?.start_date) return
    const startDate = moment(PackageDetail.start_date)
    const now = moment()
    setCurrentMonth(startDate.isBefore(now, 'month') ? now.clone() : startDate.clone())
  }, [PackageDetail?.start_date, selectedDate])

  // Full month of dates — only in-range + open days are selectable
  const calendarDates = useMemo(() => {
    if (!PackageDetail?.start_date || !PackageDetail?.end_date || !PackageDetail?.open_hours) {
      return []
    }

    const activityStart = moment(PackageDetail.start_date).startOf('day')
    const activityEnd = moment(PackageDetail.end_date).startOf('day')
    const today = moment().startOf('day')
    const monthStart = currentMonth.clone().startOf('month')
    const monthEnd = currentMonth.clone().endOf('month')
    const cursor = monthStart.clone()
    const dates = []

    while (cursor.isSameOrBefore(monthEnd, 'day')) {
      const dayName = cursor.format('dddd').toLowerCase()
      const dayInfo = PackageDetail.open_hours[dayName]
      const isEnabled = dayInfo && (dayInfo.enabled === '1' || dayInfo.enabled === true)
      const isInRange = cursor.isBetween(activityStart, activityEnd, 'day', '[]')
      const isPast = cursor.isBefore(today, 'day')
      const available = Boolean(isInRange && isEnabled && !isPast)

      dates.push({
        date: cursor.clone(),
        day: cursor.format('D'),
        dayName: cursor.format('ddd'),
        month: cursor.format('MMM'),
        available,
        openTime: dayInfo?.open,
        closeTime: dayInfo?.close,
      })

      cursor.add(1, 'day')
    }

    return dates
  }, [PackageDetail, currentMonth])

  const activityTiming = useMemo(() => {
    if (!PackageDetail?.open_hours) return null

    let startTime = null
    let endTime = null

    if (selectedDate) {
      const dayName = selectedDate.format('dddd').toLowerCase()
      const dayInfo = PackageDetail.open_hours[dayName]
      if (dayInfo?.enabled === '1' || dayInfo.enabled === true) {
        startTime = dayInfo.open
        endTime = dayInfo.close
      }
    } else {
      const firstAvailable = calendarDates.find((d) => d.available)
      if (firstAvailable) {
        startTime = firstAvailable.openTime
        endTime = firstAvailable.closeTime
      }
    }

    if (startTime && endTime) {
      const start = moment(startTime, 'HH:mm')
      const end = moment(endTime, 'HH:mm')
      const hours = moment.duration(end.diff(start)).asHours()

      return {
        start: start.format('h:mm A'),
        end: end.format('h:mm A'),
        duration: hours.toFixed(1) + 'hrs',
      }
    }

    return null
  }, [PackageDetail, selectedDate, calendarDates])

  const canGoPreviousMonth = currentMonth.isAfter(moment(), 'month')

  const previousMonth = () => {
    if (!canGoPreviousMonth) return
    setCurrentMonth((prev) => prev.clone().subtract(1, 'month'))
  }

  const nextMonth = () => {
    setCurrentMonth((prev) => prev.clone().add(1, 'month'))
  }

  const updateScrollButtons = useCallback(() => {
    const el = stripRef.current
    if (!el) return
    const maxScroll = el.scrollWidth - el.clientWidth
    setCanScrollPrev(el.scrollLeft > 4)
    setCanScrollNext(el.scrollLeft < maxScroll - 4)
  }, [])

  useEffect(() => {
    const el = stripRef.current
    if (!el) return

    el.scrollLeft = 0
    updateScrollButtons()
    el.addEventListener('scroll', updateScrollButtons, { passive: true })
    window.addEventListener('resize', updateScrollButtons)

    return () => {
      el.removeEventListener('scroll', updateScrollButtons)
      window.removeEventListener('resize', updateScrollButtons)
    }
  }, [calendarDates, updateScrollButtons])

  // Scroll to first available / selected date in this month
  useEffect(() => {
    if (!stripRef.current || calendarDates.length === 0) return

    let index = -1
    if (selectedDate) {
      index = calendarDates.findIndex((d) => d.date.isSame(selectedDate, 'day'))
    }
    if (index < 0) {
      index = calendarDates.findIndex((d) => d.available)
    }
    if (index < 0) return

    const card = stripRef.current.children[index]
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [selectedDate, calendarDates])

  const scrollByCards = (direction) => {
    const el = stripRef.current
    if (!el) return
    const cardWidth = el.querySelector(`.${styles.dateCard}`)?.offsetWidth || 68
    const gap = 10
    el.scrollBy({ left: direction * (cardWidth + gap) * 3, behavior: 'smooth' })
  }

  return (
    <div className={`${styles.widget} availability-widget`}>
      <div className={styles.header}>
        <div>
          <h5 className={styles.headerTitle}>Check Availability</h5>
          <p className={styles.headerSub}>Pick a date to see times and prices</p>
        </div>
      </div>

      <div className={styles.body}>
        {calendarDates.length === 0 ? (
          <div className={styles.emptyDates}>No available dates found</div>
        ) : (
          <>
            <div className={styles.monthNav}>
              <button
                type="button"
                className={styles.monthNavBtn}
                onClick={previousMonth}
                disabled={!canGoPreviousMonth}
                aria-label="Previous month"
              >
                <FiChevronLeft size={16} />
                Prev
              </button>
              <span className={styles.monthLabel}>{currentMonth.format('MMM YYYY')}</span>
              <button
                type="button"
                className={styles.monthNavBtn}
                onClick={nextMonth}
                aria-label="Next month"
              >
                Next
                <FiChevronRight size={16} />
              </button>
            </div>

            <div className={styles.dateStripWrap}>
              <button
                type="button"
                className={`${styles.navBtn} ${styles.navBtnPrev}`}
                onClick={() => scrollByCards(-1)}
                disabled={!canScrollPrev}
                aria-label="Previous dates"
              >
                <FiChevronLeft size={18} />
              </button>

              <div className={styles.dateStrip} ref={stripRef}>
                {calendarDates.map((dateInfo) => {
                  const isSelected = selectedDate && dateInfo.date.isSame(selectedDate, 'day')
                  const isDisabled = !dateInfo.available

                  return (
                    <button
                      type="button"
                      key={dateInfo.date.format('YYYY-MM-DD')}
                      className={`${styles.dateCard} ${isSelected ? styles.dateCardSelected : ''} ${isDisabled ? styles.dateCardDisabled : ''}`}
                      onClick={() => {
                        if (!isDisabled) setSelectedDate(dateInfo.date)
                      }}
                      disabled={isDisabled}
                      aria-pressed={isSelected}
                      aria-disabled={isDisabled}
                    >
                      <span className={styles.dayName}>{dateInfo.dayName}</span>
                      <span className={styles.dayNumber}>{dateInfo.day}</span>
                      <span className={styles.monthName}>{dateInfo.month}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                className={`${styles.navBtn} ${styles.navBtnNext}`}
                onClick={() => scrollByCards(1)}
                disabled={!canScrollNext}
                aria-label="Next dates"
              >
                <FiChevronRight size={18} />
              </button>
            </div>
          </>
        )}

        {activityTiming && (
          <div className={styles.timingSection}>
            <div className={styles.timingHeading}>
              <FiClock size={18} className={styles.timingIcon} />
              <h6 className={styles.timingTitle}>Activity timing</h6>
            </div>
            <div className={styles.timingBox}>
              <div className={styles.timingRow}>
                <div className={styles.timingCol}>
                  <div className={styles.timingLabel}>Start</div>
                  <div className={styles.timingValue}>{activityTiming.start}</div>
                </div>
                <div className={styles.durationBadge}>
                  {PackageDetail?.activity_duration}
                </div>
                <div className={styles.timingCol}>
                  <div className={styles.timingLabel}>End</div>
                  <div className={styles.timingValue}>{activityTiming.end}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
