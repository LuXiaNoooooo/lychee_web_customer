import { useEffect, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import Cart from '../components/Cart'
import { useStore, selectOrderType, selectOrderStatus, selectCurrencySymbol } from '../store'
import { useTranslation } from 'react-i18next'
import LanguageSwitcher from '../components/LanguageSwitcher'
import OrderTypeSwitcher from '../components/OrderTypeSwitcher'
import { getStore } from '../database'
import type { Store } from '../database'
import { IoArrowBack, IoSearch, IoClose } from 'react-icons/io5'
import { MdCalendarMonth, MdPhone, MdLocationOn, MdAccessTime, MdChevronRight } from 'react-icons/md'
import { Item } from './Item'
import AlertPopup from '../components/AlertPopup'
import OrderTypePopup from '../components/OrderTypePopup'

interface CategoryGroup {
  id: string
  name: string
  items: Array<Item>
}

export default function Store() {
  const { storeId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setCurrentStore = useStore(state => state.setCurrentStore)
  const setCurrencySymbol = useStore(state => state.setCurrencySymbol)
  const orderType = useStore(selectOrderType)
  const searchQuery = useStore(state => state.searchQuery)
  const setSearchQuery = useStore(state => state.setSearchQuery)
  const orderStatus = useStore(selectOrderStatus)
  const { t } = useTranslation()
  const lang = useTranslation().i18n.language || 'en'
  const currencySymbol = useStore(selectCurrencySymbol)

  const [store, setStore] = useState<Store | null>(null)
  const [activeCategory, setActiveCategory] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const [isSearchSticky, setIsSearchSticky] = useState(false)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage] = useState('')
  const hasFetchedStore = useRef(false)
  const [showOrderTypePopup, setShowOrderTypePopup] = useState(false)

  // Group items by category
  const categories = store?.items?.reduce((acc: CategoryGroup[], item: Item) => {
    // Add to featured category if sort_order > 0
    if (item.sort_order > 0) {
      const featuredCategory = acc.find(c => c.id === 'featured')
      if (featuredCategory) {
        featuredCategory.items.push(item)
      } else {
        acc.push({
          id: 'featured',
          name: t('store.featured'),
          items: [item]
        })
      }
    }

    // Add to regular category
    const categoryName = item.category[lang] ?? item.category['en'] ?? 'Other'
    const categoryId = categoryName.toLowerCase().replace(/\s+/g, '-')
    const existingCategory = acc.find(c => c.id === categoryId)
    if (existingCategory) {
      existingCategory.items.push(item)
    } else {
      acc.push({
        id: categoryId,
        name: categoryName,
        items: [item]
      })
    }
    return acc
  }, [] as CategoryGroup[]) || []

  // Sort items within each category
  categories.forEach((category: CategoryGroup) => {
    (category.items as Item[]).sort((a: Item, b: Item) => {
      // If both have sort_order = 0, sort alphabetically by English name
      if (a.sort_order === 0 && b.sort_order === 0) {
        return a.name['en'].localeCompare(b.name['en'])
      }
      // If one has sort_order = 0, it goes last
      if (a.sort_order === 0) return 1
      if (b.sort_order === 0) return -1
      // Otherwise sort by sort_order
      return a.sort_order - b.sort_order
    })
  })

  // Move featured category to front if it exists
  const featuredIndex = categories.findIndex((c: CategoryGroup) => c.id === 'featured')
  if (featuredIndex > -1) {
    const [featured] = categories.splice(featuredIndex, 1)
    categories.unshift(featured)
    // Sort remaining categories alphabetically by name
    const sorted = categories.slice(1).sort((a: CategoryGroup, b: CategoryGroup) => a.name.localeCompare(b.name))
    categories.splice(1, categories.length - 1, ...sorted)
  }

  useEffect(() => {
    if (storeId) {
      hasFetchedStore.current = true
      setCurrentStore(storeId)
      
      getStore(storeId)
        .then(data => {
          setStore(data)
          setCurrencySymbol(data?.currency || 'usd')
          
          // Check if URL contains order type and table code to avoid showing popup
          const orderTypeFromUrl = searchParams.get('order_type')
          const tableCodeFromUrl = searchParams.get('table_code')
          const hasInStoreUrlParams = orderTypeFromUrl === 'In-store' && tableCodeFromUrl
          
          if (orderType === 'Not Selected' && !hasInStoreUrlParams) {
            setShowOrderTypePopup(true)
          }
        })
        .catch(() => {
          console.error('Error fetching store')
        })
    }
    
    // Reset the fetch flag when storeId changes
    return () => {
      hasFetchedStore.current = false
    }
  }, [storeId, setCurrentStore, setCurrencySymbol, orderType, searchParams])

  const handleScroll = useCallback(() => {
    if (menuRef.current && searchRef.current) {
      const searchRect = searchRef.current.getBoundingClientRect()
      const bannerRect = searchRef.current.closest('.banner-section')?.getBoundingClientRect()

      // Only stick if we've scrolled past the banner and the search bar would be out of view
      setIsSearchSticky(bannerRect ? searchRect.top <= 0 && bannerRect.bottom <= 0 : false)

      // Update active category based on scroll position
      for (let i = categories.length - 1; i >= 0; i--) {
        const categoryElement = document.getElementById(`category-${categories[i].id}`)
        if (categoryElement) {
          const rect = categoryElement.getBoundingClientRect()
          if (rect.top <= window.innerHeight / 2) {
            setActiveCategory(categories[i].id)
            break
          }
        }
      }
    }
  }, [categories])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [handleScroll])

  // Filter items based on search query
  const filteredItems = store?.items?.filter((item: Item) => {
    const itemName = item.name[lang] ?? item.name['en'] ?? ''
    const itemDescription = item.description[lang] ?? item.description['en'] ?? ''
    return itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
           itemDescription.toLowerCase().includes(searchQuery.toLowerCase())
  }) || []

  return (
    <div className="page-container">
      <div
        className="banner-section"
        style={{
          backgroundImage: store?.banner_url ? `url(${store.banner_url})` : undefined,
        }}
      >
        <div className="banner-top">
          <Link to="/" className="small-button">
            <IoArrowBack /> {t('store.explore')}
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
        
        <div className="info-links">
          <Link to={`/store/${storeId}/details`} className="store-info-link">
            <div className="info-icons">
              <MdPhone />
              <MdLocationOn />
              <MdAccessTime />
            </div>
            {t('store.moreDetails')}
            <MdChevronRight style={{ marginLeft: 'auto' }} />
          </Link>
          <Link to={`/store/${storeId}/reservation`} className="store-info-link">
            <MdCalendarMonth />
            {t('store.reservation')}
            <MdChevronRight style={{ marginLeft: 'auto' }} />
          </Link>
        </div>

        <div className="info-links dropdown">
          <OrderTypeSwitcher />
        </div>
      </div>

      <div className="search-container">
        <div ref={searchRef} className={`search-section ${isSearchSticky ? 'sticky' : ''}`}>
          <div className="search-bar">
            <IoSearch />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('store.searchItems')}
            />
            {searchQuery && (
              <button
                className="clear-search"
                onClick={() => setSearchQuery('')}
                aria-label="Clear search"
              >
                <IoClose />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="menu-section" ref={menuRef}>
        {searchQuery ? (
          <div className="search-results">
            <h2>{t('store.searchResults')}</h2>
            <div className="items-grid">
              {filteredItems.map((item: Item) => (
                <div
                  key={item.id}
                  className="menu-item"
                  onClick={() => navigate(`/store/${storeId}/item/${item.id}`)}
                >
                  <img src={item.image_url} alt={item.name[lang] ?? item.name['en']} />
                  <div className="item-info">
                    <h3>{item.name[lang] ?? item.name['en']}</h3>
                    <p>{item.description[lang] ?? item.description['en']}</p>
                    <div className="item-info-bottom">
                      <span className="price">{currencySymbol}{item.price.toFixed(2)}</span>
                      <Cart.AddButton item={item} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="categories-list">
              {categories.map((category: CategoryGroup) => (
                <a
                  key={category.id}
                  href={`#category-${category.id}`}
                  className={`category-link ${activeCategory === category.id ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    const categoryElement = document.getElementById(`category-${category.id}`);
                    if (categoryElement) {
                      const offset = 60;
                      const elementPosition = categoryElement.getBoundingClientRect().top;
                      const offsetPosition = elementPosition + window.scrollY - offset;
                      window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                      });
                    }
                  }}
                >
                  {category.name}
                </a>
              ))}
            </div>
            <div className="items-section">
              {categories.map((category: CategoryGroup) => (
                <div key={category.id} id={`category-${category.id}`} className="category-section">
                  <h2>{category.name}</h2>
                  <div className="items-grid">
                    {category.items.map((item: Item) => (
                      <div
                        key={item.id}
                        className="menu-item"
                        onClick={() => navigate(`/store/${storeId}/item/${item.id}`)}
                      >
                        <img src={item.image_url} alt={item.name[lang] ?? item.name['en']} />
                        <div className="item-info">
                          <h3>{item.name[lang] ?? item.name['en']}</h3>
                          <p>{item.description[lang] ?? item.description['en']}</p>
                          <div className="item-info-bottom">
                            <span className="price">{currencySymbol}{item.price.toFixed(2)}</span>
                            <Cart.AddButton item={item} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <Cart withCheckout={orderType === 'In-store' && orderStatus === 'Pending' && store?.settings.pay_later === true} />

      {showOrderTypePopup && createPortal(
        <OrderTypePopup onClose={() => setShowOrderTypePopup(false)} />,
        document.body
      )}

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