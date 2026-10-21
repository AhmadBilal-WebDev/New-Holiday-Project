'use client'
import React, { useEffect, useState } from 'react'
import { Modal } from '@mantine/core'
import { DatePicker } from '@mantine/dates'
import { notifications } from '@mantine/notifications'
import { useRouter } from 'next/navigation'
import moment from 'moment'
import { RiRobot2Line } from 'react-icons/ri'
import { AiOutlineLoading3Quarters } from 'react-icons/ai'
import { stampSearchParams } from '@/util/forceSearchRefresh'
import styles from './AiSearchRes.module.css'
import aiStyles from '../Search/ai.module.css'

function pick(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') return value
  }
  return null
}

function normalizeTime(value) {
  if (!value) return '10:00'
  const parsed = moment(value, ['HH:mm', 'H:mm', 'HH:mm:ss', moment.ISO_8601], true)
  if (parsed.isValid()) return parsed.format('HH:mm')
  const fallback = moment(value)
  return fallback.isValid() ? fallback.format('HH:mm') : '10:00'
}

function normalizeDate(value) {
  if (!value) return null
  const parsed = moment(value, ['YYYY-MM-DD', 'DD-MM-YYYY', moment.ISO_8601], true)
  if (parsed.isValid()) return parsed.format('YYYY-MM-DD')
  const fallback = moment(value)
  return fallback.isValid() ? fallback.format('YYYY-MM-DD') : null
}

function normalizeTransferType(value) {
  const raw = String(value || 'one-way').toLowerCase().replace(/_/g, '-')
  if (raw === 'return' || raw === 'round' || raw === 'round-trip' || raw === 'all-round') {
    return raw === 'all-round' ? 'all-round' : 'return'
  }
  return 'one-way'
}

export default function TransferAiSearch({ searchResponse }) {
  const router = useRouter()
  const [status, setStatus] = useState('preparing')
  const [modalOpened, setModalOpened] = useState(false)
  const [pickupDate, setPickupDate] = useState(null)

  const buildAndNavigate = (overridePickupDate = null) => {
    if (!searchResponse) return

    const transferType = normalizeTransferType(
      pick(searchResponse.transferType, searchResponse.tripType, searchResponse.type)
    )

    const pickupLatitude = pick(
      searchResponse.pickupLatitude,
      searchResponse.fromLat,
      searchResponse.from?.latitude,
      searchResponse.pickup?.latitude
    )
    const pickupLongitude = pick(
      searchResponse.pickupLongitude,
      searchResponse.fromLng,
      searchResponse.from?.longitude,
      searchResponse.pickup?.longitude
    )
    const dropoffLatitude = pick(
      searchResponse.dropoffLatitude,
      searchResponse.toLat,
      searchResponse.to?.latitude,
      searchResponse.dropoff?.latitude
    )
    const dropoffLongitude = pick(
      searchResponse.dropoffLongitude,
      searchResponse.toLng,
      searchResponse.to?.longitude,
      searchResponse.dropoff?.longitude
    )

    const pickupLocation = pick(
      searchResponse.pickupLocation,
      searchResponse.fromLocation,
      searchResponse.from?.name,
      searchResponse.pickup?.name
    )
    const dropoffLocation = pick(
      searchResponse.dropoffLocation,
      searchResponse.toLocation,
      searchResponse.to?.name,
      searchResponse.dropoff?.name
    )

    const fromCountry = pick(
      searchResponse.fromCountry,
      searchResponse.pickupCountry,
      searchResponse.from?.country
    )
    const toCountry = pick(
      searchResponse.toCountry,
      searchResponse.dropoffCountry,
      searchResponse.to?.country
    )

    const resolvedPickupDate =
      overridePickupDate ||
      normalizeDate(pick(searchResponse.pickupDate, searchResponse.date, searchResponse.departureDate))

    if (!pickupLatitude || !pickupLongitude) {
      setStatus('error')
      notifications.show({
        autoClose: 3500,
        title: 'Transfer search incomplete',
        message: 'Pickup location coordinates are missing. Please try a clearer query.',
        color: 'red',
      })
      return
    }

    if (!resolvedPickupDate) {
      setPickupDate(null)
      setModalOpened(true)
      setStatus('need-date')
      return
    }

    const adults = Math.max(1, Number(pick(searchResponse.adults, searchResponse.passengers, 1)) || 1)
    const children = Math.max(0, Number(pick(searchResponse.children, 0)) || 0)
    const infants = Math.max(0, Number(pick(searchResponse.infants, 0)) || 0)
    const passengers = Math.max(
      adults + children + infants,
      Number(pick(searchResponse.passengers, adults + children + infants)) || adults
    )

    const queryParams = new URLSearchParams()
    queryParams.append('transferType', transferType)
    queryParams.append('pickupLatitude', String(pickupLatitude))
    queryParams.append('pickupLongitude', String(pickupLongitude))
    queryParams.append('fromLat', String(pickupLatitude))
    queryParams.append('fromLng', String(pickupLongitude))
    if (pickupLocation) queryParams.append('pickupLocation', pickupLocation)
    if (fromCountry) queryParams.append('fromCountry', fromCountry)

    if (dropoffLatitude != null && dropoffLongitude != null) {
      queryParams.append('dropoffLatitude', String(dropoffLatitude))
      queryParams.append('dropoffLongitude', String(dropoffLongitude))
      queryParams.append('toLat', String(dropoffLatitude))
      queryParams.append('toLng', String(dropoffLongitude))
    }
    if (dropoffLocation) queryParams.append('dropoffLocation', dropoffLocation)
    if (toCountry) queryParams.append('toCountry', toCountry)

    queryParams.append('pickupDate', resolvedPickupDate)
    queryParams.append(
      'pickupTime',
      normalizeTime(pick(searchResponse.pickupTime, searchResponse.time, '10:00'))
    )

    const dropoffDate = normalizeDate(pick(searchResponse.dropoffDate, searchResponse.returnDate))
    if (dropoffDate && (transferType === 'return' || transferType === 'all-round')) {
      queryParams.append('dropoffDate', dropoffDate)
      queryParams.append(
        'dropoffTime',
        normalizeTime(pick(searchResponse.dropoffTime, searchResponse.returnTime, '10:00'))
      )
    }

    queryParams.append('adults', String(adults))
    queryParams.append('children', String(children))
    queryParams.append('infants', String(infants))
    queryParams.append('passengers', String(passengers))

    setStatus('redirecting')
    setModalOpened(false)
    router.push(`/transfers?${stampSearchParams(queryParams).toString()}`)
  }

  useEffect(() => {
    if (searchResponse) {
      setStatus('preparing')
      buildAndNavigate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchResponse])

  const handleDateSubmit = () => {
    if (!pickupDate) {
      notifications.show({
        autoClose: 2500,
        title: 'Error',
        message: 'Please select a pickup date',
        color: 'red',
      })
      return
    }
    buildAndNavigate(moment(pickupDate).format('YYYY-MM-DD'))
  }

  if (status === 'error') {
    return (
      <div className={aiStyles.aiResponseBox}>
        <div className={aiStyles.aiResponseHeader}>
          <RiRobot2Line size={20} />
          <span className="ms-2">Transfer Search</span>
        </div>
        <div className={aiStyles.aiResponseContent}>
          <p className="mb-0">
            We could not start the transfer search from this query. Try again with pickup and
            drop-off locations, for example: &quot;Airport transfer from Jeddah airport to Makkah&quot;.
          </p>
        </div>
      </div>
    )
  }

  return (
    <>
      {(status === 'preparing' || status === 'redirecting') && (
        <div className={aiStyles.aiResponseBox}>
          <div className={aiStyles.aiLoadingWrapper}>
            <AiOutlineLoading3Quarters className={aiStyles.aiLoadingIcon} size={22} />
            <span className="ms-2">
              {status === 'redirecting' ? 'Opening transfer results…' : 'Preparing transfer search…'}
            </span>
          </div>
        </div>
      )}

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        title="Select Pickup Date"
        centered
        className={styles.aihoteldaterange}
        size="auto"
      >
        <div className="p-2">
          <DatePicker
            className="my-3"
            value={pickupDate}
            onChange={setPickupDate}
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
              disabled={!pickupDate}
            >
              Continue to Search
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
