import { useParams, Link } from 'react-router-dom'
import { IoArrowBack } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'
import Cart from '../components/Cart'
import { getStore } from '../database'
import { useState, useEffect } from 'react'

export interface CustomizationOption {
  name: Record<string, string>;
  price?: number;
}

export interface Item {
  id: string;
  category: Record<string, string>;
  name: Record<string, string>;
  description: Record<string, string>;
  price: number;
  image_url: string;
  sort_order: number;
  customizations?: Array<{
    name: Record<string, string>;
    options: CustomizationOption[];
    maxSelect: number;
  }>;
}

export default function Item() {
  const { storeId, itemId } = useParams()
  const { t } = useTranslation()
  const lang = useTranslation().i18n.language || 'en'
  const [item, setItem] = useState<Item | null>(null)

  useEffect(() => {
    if (storeId) {
      getStore(storeId)
        .then(store => {
          const foundItem = store?.items?.find(item => item.id === itemId)
          setItem(foundItem || null)
        })
    }
  }, [storeId, itemId])

  if (!item) {
    return <div className="error-message">{t('store.notFound')}</div>
  }

  return (
    <div className="page-container">
      <div className="item-detail-image-container">
        <Link to={-1 as any} className="small-button">
          <IoArrowBack /> {t('store.menu')}
        </Link>
        <img src={item.image_url} alt={item.name[lang] ?? item.name['en']} className="item-detail-image" />
      </div>

      <div className="content-section">
        <h2 className="section-title">{item.name[lang] ?? item.name['en']}</h2>
        <div className="item-detail-price-section">
          <span className="item-detail-price">${item.price.toFixed(2)}</span>
          <Cart.AddButton item={item} />
        </div>
      </div>

      <div className="content-section">
        <h2 className="section-title">{t('item.description')}</h2>
        <p>{item.description[lang] ?? item.description['en']}</p>
      </div>

      <Cart />
    </div>
  )
} 