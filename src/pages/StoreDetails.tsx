import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { IoArrowBack } from 'react-icons/io5'
import { MdPhone, MdLocationOn, MdAccessTime, MdCall, MdOpenInNew } from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { getStore } from '../database'
import type { Store } from '../database'

export default function StoreDetails() {
  const { storeId } = useParams()
  const { t } = useTranslation()
  const lang = useTranslation().i18n.language || 'en'
  const [store, setStore] = useState<Store | null>(null)

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
          <h1>{(store?.name[lang] ?? store?.name['en']) || t('store.loading')}</h1>
          <p>{store?.description[lang] ?? store?.description['en']}</p>
        </div>
      </div>

      <div className="content-section no-bottom-margin">
        <div className="detail-title">
          <MdPhone className="detail-icon" /> <h3>{t('store.phone')}</h3>
        </div>
        <div className="detail-content">
          {store?.store_info?.number ? (
            <a href={`tel:${store.store_info.number}`} className="clickable-detail phone-link">
              <MdCall className="action-icon" />
              {store.store_info.number}
            </a>
          ) : (
            <p>{t('store.notAvailable')}</p>
          )}
        </div>
      </div>

      <div className="content-section no-bottom-margin">
        <div className="detail-title">
          <MdLocationOn className="detail-icon" /> <h3>{t('store.address')}</h3>
        </div>
        <div className="detail-content">
          {store?.store_info?.address ? (
            <a 
              href={`https://maps.google.com/maps?q=${encodeURIComponent(store.store_info.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="clickable-detail address-link"
            >
              <MdOpenInNew className="action-icon" />
              {store.store_info.address}
            </a>
          ) : (
            <p>{t('store.notAvailable')}</p>
          )}
        </div>
      </div>

      <div className="content-section">
        <div className="detail-title">
          <MdAccessTime className="detail-icon" /> <h3>{t('store.hours')}</h3>
        </div>
        <div className="detail-content">
          {store?.store_info?.hours ? (
            <div className="hours-list">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                <div key={day} className="hours-item">
                  <span className="day">{t(`days.${day}`)}</span>
                  <span className="hours">{store.store_info.hours[day]}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>{t('store.notAvailable')}</p>
          )}
        </div>
      </div>
    </div>
  )
} 