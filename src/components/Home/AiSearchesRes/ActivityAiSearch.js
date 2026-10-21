'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { Modal } from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import Link from 'next/link'
import { RiRobot2Line } from 'react-icons/ri'
import { LuSparkle } from 'react-icons/lu'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { stampSearchParams } from '@/util/forceSearchRefresh'
import styles from './AiSearchRes.module.css'
import aiStyles from '../Search/ai.module.css'

function resolveActivityCity(searchResponse) {
  return (
    searchResponse?.city_slug ||
    searchResponse?.citySlug ||
    searchResponse?.city ||
    searchResponse?.destination?.city_slug ||
    searchResponse?.destination?.city ||
    searchResponse?.destination?.name ||
    ''
  )
}

function resolveActivityCountry(searchResponse, destinations = []) {
  const fromResponse =
    searchResponse?.country ||
    searchResponse?.countryCode ||
    searchResponse?.destination?.country ||
    searchResponse?.destination?.countryCode ||
    ''
  if (fromResponse) return fromResponse

  const city = String(resolveActivityCity(searchResponse) || '').toLowerCase()
  if (!city) return ''
  const match = destinations.find(
    (item) =>
      String(item.value || '').toLowerCase() === city ||
      String(item.label || '').toLowerCase() === city
  )
  return match?.country || ''
}

function resolveActivityDate(searchResponse) {
  const raw =
    searchResponse?.activityDate ||
    searchResponse?.date ||
    searchResponse?.departureDate ||
    null
  if (!raw) return null
  const parsed = moment(raw, ['YYYY-MM-DD', 'DD-MM-YYYY', moment.ISO_8601], true)
  if (parsed.isValid()) return parsed.format('YYYY-MM-DD')
  const fallback = moment(raw)
  return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null
}

export default function ActivityAiSearch({ searchResponse, destinations = [] }) {
  const router = useRouter()
  const [modalOpened, setModalOpened] = useState(false)
  const [selectedDate, setSelectedDate] = useState(null)
  const [pendingCity, setPendingCity] = useState({ city: '', country: '' })
  const [status, setStatus] = useState('idle')

  const city = useMemo(() => resolveActivityCity(searchResponse), [searchResponse])
  const country = useMemo(
    () => resolveActivityCountry(searchResponse, destinations),
    [searchResponse, destinations]
  )
  const activityDate = useMemo(() => resolveActivityDate(searchResponse), [searchResponse])
  const hasCity = Boolean(city)
  const needsDestinationPick = !hasCity

  const navigateToActivities = (dateValue, cityValue = city, countryValue = country) => {
    if (!dateValue) {
      notifications.show({
        autoClose: 2500,
        title: 'Date required',
        message: 'Please select an activity date to continue.',
        color: 'red',
      })
      return
    }

    const queryParams = new URLSearchParams()
    if (cityValue) queryParams.set('city', cityValue)
    queryParams.set('date', dateValue)
    if (countryValue) queryParams.set('country', countryValue)

    setModalOpened(false)
    setStatus('redirecting')
    router.push(`/activities?${stampSearchParams(queryParams).toString()}`)
  }

  useEffect(() => {
    if (!searchResponse) return

    if (hasCity && activityDate) {
      setStatus('redirecting')
      navigateToActivities(activityDate, city, country)
      return
    }

    if (hasCity && !activityDate) {
      setPendingCity({ city, country })
      setSelectedDate(null)
      setModalOpened(true)
      setStatus('need-date')
      return
    }

    setStatus(destinations.length ? 'pick-destination' : 'loading-destinations')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResponse, hasCity, activityDate, city, country, destinations.length])

  const buildChipHref = (destination) => {
    const queryParams = new URLSearchParams()
    if (destination?.value) queryParams.set('city', destination.value)
    if (activityDate) queryParams.set('date', activityDate)
    if (destination?.country) queryParams.set('country', destination.country)
    return `/activities?${stampSearchParams(queryParams).toString()}`
  }

  const openDateForDestination = (destination) => {
    setPendingCity({
      city: destination?.value || '',
      country: destination?.country || '',
    })
    setSelectedDate(null)
    setModalOpened(true)
  }

  const handleDateSubmit = () => {
    if (!selectedDate) {
      notifications.show({
        autoClose: 2500,
        title: 'Error',
        message: 'Please select a date',
        color: 'red',
      })
      return
    }
    navigateToActivities(
      moment(selectedDate).format('YYYY-MM-DD'),
      pendingCity.city || city,
      pendingCity.country || country
    )
  }

  if (status === 'redirecting') {
    return (
      <div className={aiStyles.aiResponseBox}>
        <div className={aiStyles.aiLoadingWrapper}>
          <AiOutlineLoading3Quarters className={aiStyles.aiLoadingIcon} size={22} />
          <span className="ms-2">Opening activity results…</span>
        </div>
      </div>
    )
  }

  if (needsDestinationPick) {
    if (!destinations.length) {
      return (
        <div className={aiStyles.aiResponseBox}>
          <div className={aiStyles.aiResponseHeader}>
            <RiRobot2Line size={20} />
            <span className="ms-2">Activities</span>
          </div>
          <div className={aiStyles.aiResponseContent}>
            <p className="mb-0">
              Loading destinations… If nothing appears, try again or search from the Activities tab.
            </p>
          </div>
        </div>
      )
    }

    return (
      <>
        <div className={aiStyles.aiResponseBox}>
          <div className={aiStyles.aiResponseHeader}>
            <RiRobot2Line size={20} />
            <span className="ms-2">Select Destination</span>
          </div>
          <div className={aiStyles.aiResponseContent}>
            <p className="mb-3">
              Please select your preferred destination
              {activityDate ? ` for ${moment(activityDate).format('DD MMM YYYY')}` : ''}:
            </p>
            <div className="d-flex flex-wrap gap-2">
              {destinations.map((destination) =>
                activityDate ? (
                  <Link key={destination.value} href={buildChipHref(destination)}>
                    <button type="button" className={aiStyles.aiSuggestionChip}>
                      <LuSparkle className="me-1" />
                      {destination.label}
                    </button>
                  </Link>
                ) : (
                  <button
                    key={destination.value}
                    type="button"
                    className={aiStyles.aiSuggestionChip}
                    onClick={() => openDateForDestination(destination)}
                  >
                    <LuSparkle className="me-1" />
                    {destination.label}
                  </button>
                )
              )}
              {activityDate ? (
                <Link
                  href={`/activities?${stampSearchParams(new URLSearchParams({ date: activityDate })).toString()}`}
                >
                  <button type="button" className={aiStyles.aiSuggestionChip}>
                    <LuSparkle className="me-1" />
                    All
                  </button>
                </Link>
              ) : (
                <button
                  type="button"
                  className={aiStyles.aiSuggestionChip}
                  onClick={() => openDateForDestination({ value: '', country: '' })}
                >
                  <LuSparkle className="me-1" />
                  All
                </button>
              )}
            </div>
          </div>
        </div>

        <Modal
          opened={modalOpened}
          onClose={() => setModalOpened(false)}
          title="Select Activity Date"
          centered
          className={styles.aihoteldaterange}
          size="auto"
        >
          <div className="p-2">
            <DatePicker
              className="my-3"
              value={selectedDate}
              onChange={setSelectedDate}
              numberOfColumns={1}
              valueFormat="DD-MM-YYYY"
              minDate={new Date()}
            />
            <div className="d-flex gap-2 mt-3 justify-content-end">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setModalOpened(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-success bg-color"
                onClick={handleDateSubmit}
                disabled={!selectedDate}
              >
                Continue to Search
              </button>
            </div>
          </div>
        </Modal>
      </>
    )
  }

  return (
    <Modal
      opened={modalOpened}
      onClose={() => setModalOpened(false)}
      title="Select Activity Date"
      centered
      className={styles.aihoteldaterange}
      size="auto"
    >
      <div className="p-2">
        <DatePicker
          className="my-3"
          value={selectedDate}
          onChange={setSelectedDate}
          numberOfColumns={1}
          valueFormat="DD-MM-YYYY"
          minDate={new Date()}
        />
        <div className="d-flex gap-2 mt-3 justify-content-end">
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => setModalOpened(false)}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-success bg-color"
            onClick={handleDateSubmit}
            disabled={!selectedDate}
          >
            Continue to Search
          </button>
        </div>
      </div>
    </Modal>
  )
}
