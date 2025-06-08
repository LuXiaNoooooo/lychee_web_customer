import { useStore } from '../store'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import { getAllStores } from '../database'
import type { Store } from '../database'
import { useState, useEffect } from 'react'

export default function Home() {
  const recentStores = useStore(state => state.recentStores)
  const { t } = useTranslation()
  const lang = useTranslation().i18n.language || 'en'
  const [allStores, setAllStores] = useState<Store[]>([])

  useEffect(() => {
    getAllStores().then(setAllStores)
  }, [])

  return (
    <div className="page-container">
      <div className="banner">
        <div className="banner-content banner-title">
          <h1>{t('banner.title')}</h1>
          <LanguageSwitcher />
        </div>
        <div className="banner-content">
          <p>{t('banner.subtitle')}</p>
        </div>
      </div>

      {recentStores.length > 0 && (
        <div className="content-section">
          <h2 className="section-title">{t('sections.continueVisiting')}</h2>
          <div className="horizontal-scroll">
            {recentStores.map(storeId => {
              const store = allStores.find(s => s.id === storeId)
              if (!store) {
                return null
              }
              return (
                <Link key={store.id} to={`/store/${store.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="recent-store-card">
                    <img src={store.image_url} alt={store.name[lang] ?? store.name['en']}/>
                    <p className="recent-store-title">{store.name[lang] ?? store.name['en']}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="content-section">
        <h2 className="section-title">{t('sections.allStores')}</h2>
        <div>
          {allStores
            .sort((a, b) => a.name['en'].localeCompare(b.name['en']))
            .map(store => (
              <Link key={store.id} to={`/store/${store.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="store-card">
                  <img src={store.image_url} alt={store.name[lang] ?? store.name['en']} className="store-image" />
                  <div className="store-card-info">
                    <h3>{store.name[lang] ?? store.name['en']}</h3>
                    <p>{store.description[lang] ?? store.description['en']}</p>
                    <div className="store-tags">
                      {(store.tags?.[lang] ?? store.tags?.['en'])?.map((tag: string, index: number) => (
                        <span key={index} className="store-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>
      </div>
    </div>
  )
} 