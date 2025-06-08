import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link } from 'react-router-dom'
import { IoArrowBack } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { getStore } from '../database'
import type { Store } from '../database'
import AlertPopup from '../components/AlertPopup'
import { API_URL } from '../config'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'

export default function Reservation() {
  const { storeId } = useParams()
  const { t } = useTranslation()
  const { executeRecaptcha } = useGoogleReCaptcha()
  const lang = useTranslation().i18n.language || 'en'
  const [store, setStore] = useState<Store | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    verificationCode: '',
    phone: '',
    date: '',
    time: '',
    guests: '',
    notes: ''
  })
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (storeId) {
      getStore(storeId)
        .then(data => {
          setStore(data)
        })
        .catch(() => {
          console.error('Error fetching store')
        })
    }
  }, [storeId])

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(prev => prev - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [cooldown])

  const getTimeConstraints = (date: string) => {
    if (!date || !store?.store_info?.hours) return { min: '', max: '' }

    const selectedDate = new Date(date)
    const dayOfWeek = selectedDate.getDay()
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const dayName = dayNames[dayOfWeek]
    const dayHours = store.store_info.hours[dayName]

    if (!dayHours) return { min: '', max: '' }

    const [openTime, closeTime] = dayHours.split('-')
    return {
      min: openTime,
      max: closeTime
    }
  }

  const timeConstraints = getTimeConstraints(formData.date)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    if (name === 'date') {
      // Create date in local timezone
      const selectedDate = new Date(value + 'T00:00:00')
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        return // Don't update if date is in the past
      }
    }
    
    if (name === 'time') {
      // Convert times to minutes for comparison
      const timeToMinutes = (time: string) => {
        const [hours, minutes] = time.split(':').map(Number)
        return hours * 60 + minutes
      }

      const selectedMinutes = timeToMinutes(value)
      const minMinutes = timeToMinutes(timeConstraints.min)
      const maxMinutes = timeToMinutes(timeConstraints.max)

      // Check against store hours
      if (selectedMinutes < minMinutes || selectedMinutes > maxMinutes) {
        return // Don't update if outside allowed range
      }
    }

    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSendVerificationCode = async () => {
    if (!executeRecaptcha) {
      console.error('reCAPTCHA not initialized')
      return
    }

    if (!formData.email || cooldown > 0) return

    try {
      const token = await executeRecaptcha('send_verification_code')
      const response = await fetch(`${API_URL}/email/send_verification_code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: formData.email, recaptcha_token: token })
      })

      if (!response.ok) {
        setAlertMessage(t('reservation.errorMessage'))
        setShowAlert(true)
      }
    } catch (error) {
      console.error('Error sending verification code:', error)
      setAlertMessage(t('reservation.errorMessage'))
      setShowAlert(true)
    }
  }

  const handleReservation = async () => {
    // Check if all required fields are filled
    const requiredFields = ['name', 'email', 'verificationCode', 'phone', 'date', 'time', 'guests']
    const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])

    if (missingFields.length > 0) {
      setAlertMessage(t('reservation.missingFields', { fields: missingFields.join(', ') }))
      setShowAlert(true)
      return
    }

    // Validate verification code format
    const verificationCodeRegex = /^\d{6}$/
    if (!verificationCodeRegex.test(formData.verificationCode)) {
      setAlertMessage(t('reservation.invalidVerificationCode'))
      setShowAlert(true)
      return
    }

    // Combine date and time into ISO string with timezone offset
    const reservationDateTime = new Date(`${formData.date}T${formData.time}`)
    // Convert to UTC and format with timezone offset
    const reservationTime = reservationDateTime.toISOString().replace('Z', '+00:00')

    const reservationData = {
      store_id: storeId,
      guest_name: formData.name,
      email: formData.email,
      verification_code: formData.verificationCode,
      phone: formData.phone,
      guest_count: parseInt(formData.guests),
      reservation_time: reservationTime,
      notes: formData.notes
    }

    try {
      const response = await fetch(`${API_URL}/reservation/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reservationData)
      })

      const data = await response.json()
      if (!response.ok) {
        setAlertMessage(t(data.error === 'Invalid or expired verification code' ? 'reservation.invalidVerificationCode' : 'reservation.errorMessage'))
        setShowAlert(true)
        return
      }
      setAlertMessage(t('reservation.successMessage'))
      setShowAlert(true)
    } catch (error) {
      console.error('Error creating reservation:', error)
      setAlertMessage(t('reservation.errorMessage'))
      setShowAlert(true)
    }
  }

  return (
    <div className="page-container">
      <div
        className="banner-section"
        style={{
          backgroundImage: store?.banner_url ? `url(${store.banner_url})` : undefined,
        }}
      >
        <div className="banner-top">
          <Link to={`/store/${storeId}`} className="small-button">
            <IoArrowBack /> {t('store.menu')}
          </Link>
          <LanguageSwitcher />
        </div>

        <div className="store-banner-info">
          <div className="store-banner-logo">
            <img src={store?.image_url} alt={store?.name[lang] ?? store?.name['en']} className="store-logo" />
          </div>
          <h1>{t('reservation.title')}</h1>
          <p>{t('reservation.subtitle')}</p>
        </div>
      </div>

      <div className="content-section">
        <div className="form-group email-group">
          <label>{t('reservation.email')}</label>
          <div className="email-input-container">
            <input 
              type="email" 
              name="email"
              value={formData.email}
              onChange={handleInputChange}
            />
            <button 
              type="button"
              className="verify-code-button"
              onClick={() => {
                handleSendVerificationCode()
                setCooldown(60)
              }}
              disabled={!formData.email || cooldown > 0}
            >
              {cooldown > 0 ? `${cooldown}s` : t('reservation.getCode')}
            </button>
          </div>
        </div>
        <div className="form-group">
          <label>{t('reservation.verificationCode')}</label>
          <input 
            type="text" 
            name="verificationCode"
            value={formData.verificationCode}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>{t('reservation.name')}</label>
          <input 
            type="text" 
            name="name"
            value={formData.name}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>{t('reservation.phone')}</label>
          <input 
            type="tel" 
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>{t('reservation.date')}</label>
          <input 
            type="date" 
            name="date"
            value={formData.date}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>{t('reservation.time')}</label>
          <input 
            type="time" 
            name="time"
            value={formData.time}
            onChange={handleInputChange}
            disabled={!formData.date}
          />
          {formData.date && timeConstraints.min && timeConstraints.max && (
            <small className='time-hint'>
              {t('reservation.timeRange', { min: timeConstraints.min, max: timeConstraints.max })}
            </small>
          )}
        </div>
        <div className="form-group">
          <label>{t('reservation.guests')}</label>
          <input 
            type="number" 
            min="1" 
            max="10"
            name="guests"
            value={formData.guests}
            onChange={handleInputChange}
          />
        </div>
        <div className="form-group">
          <label>{t('reservation.notes')}</label>
          <textarea 
            rows={4}
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
          />
        </div>
        <button className="big-button" onClick={handleReservation}>
          {t('reservation.submit')}
        </button>
      </div>

      {showAlert && createPortal(
        <AlertPopup
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />,
        document.body
      )}
    </div>
  )
} 