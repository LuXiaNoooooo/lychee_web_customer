import { useState, useEffect } from 'react'
import { useStore, CartItem, calculateItemTotal, selectCartItems, selectTotalItems, selectSubTotal, selectOrderType, selectCurrencySymbol } from '../store'
import { IoAdd, IoRemove, IoClose, IoCart } from 'react-icons/io5'
import { MdEdit } from 'react-icons/md'
import { useTranslation } from 'react-i18next'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import CustomizationModal from './CustomizationModal'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Item } from '../pages/Item'
import { selectTableCode } from '../store'
import { getStore, Store } from '../database'
import { API_URL } from '../config'
import AlertPopup from './AlertPopup'
import ConfirmPopup from './ConfirmPopup'

function AddButton({ item }: { item: Item }) {
  const [showCustomization, setShowCustomization] = useState(false)
  const cartItems = useStore(selectCartItems)
  const addToCart = useStore(state => state.addToCart)
  const updateItemQuantity = useStore(state => state.updateItemQuantity)

  // Get all cart items with this id
  const cartItemsForId = cartItems.filter(i => i.id === item.id)
  // Get total quantity across all customizations
  const totalQuantity = cartItemsForId.reduce((sum, i) => sum + i.quantity, 0)
  // Get the specific cart item with matching customizations (if any)
  const cartItem = cartItems.find(i => i.id === item.id)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent item click event
    if (item.customizations && item.customizations.length > 0) {
      setShowCustomization(true)
    } else {
      addToCart(item)
    }
  }

  const handleQuantityChange = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation() // Prevent item click event
    if (cartItem) {
      updateItemQuantity(item, cartItem.quantity + delta)
    } else if (delta > 0) {
      addToCart(item)
    }
  }

  return (
    <>
      <div className="add-button" onClick={(e) => e.stopPropagation()}>
        {cartItem ? (
          item.customizations && item.customizations.length > 0 ? (
            <div className="quantity-controls customization">
              <span className="quantity">{totalQuantity}</span>
              <button className="edit-button" onClick={() => setShowCustomization(true)}>
                <MdEdit />
              </button>
            </div>
          ) : (
            <div className="quantity-controls">
              <button onClick={(e) => handleQuantityChange(e, -1)}><IoRemove /></button>
              <span>{totalQuantity}</span>
              <button onClick={(e) => handleQuantityChange(e, 1)}><IoAdd /></button>
            </div>
          )
        ) : (
          <button className="add-circle" onClick={handleClick}>
            {item.customizations && item.customizations.length > 0 ? <MdEdit /> : <IoAdd />}
          </button>
        )}
      </div>

      {showCustomization && (
        <div style={{ display: "contents" }} onClick={(e) => e.stopPropagation()}>
          <CustomizationModal item={item} onClose={() => setShowCustomization(false)}/>
        </div>
      )}
    </>
  )
}

function CartAddButton({ item }: { item: CartItem }) {
  const cartItem = item
  const updateItemQuantity = useStore(state => state.updateItemQuantity)
  // Get total quantity across all customizations
  const totalQuantity = cartItem.quantity
  // Get the specific cart item with matching customizations (if any)
  const handleQuantityChange = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation() // Prevent item click event
    updateItemQuantity(item, cartItem.quantity + delta)
  }

  return (
    <>
      <div className="add-button" onClick={(e) => e.stopPropagation()}>
        <div className="quantity-controls">
          <button onClick={(e) => handleQuantityChange(e, -1)}><IoRemove /></button>
          <span>{totalQuantity}</span>
          <button onClick={(e) => handleQuantityChange(e, 1)}><IoAdd /></button>
        </div>
      </div>
    </>
  )
}

function CartModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const { executeRecaptcha } = useGoogleReCaptcha()
  const lang = useTranslation().i18n.language || 'en'
  const navigate = useNavigate()
  const cartItems = useStore(selectCartItems)
  const subTotal = useStore(selectSubTotal)
  const orderType = useStore(selectOrderType)
  const storeId = useStore(state => state.currentStore)
  const tableCode = useStore(selectTableCode)
  const setOrderStatus = useStore(state => state.setOrderStatus)
  const [store, setStore] = useState<Store | null>(null)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [isOrderSuccess, setIsOrderSuccess] = useState(false)
  const setOrderId = useStore(state => state.setOrderId)
  const setOrderNumber = useStore(state => state.setOrderNumber)
  const clearCart = useStore(state => state.clearCart)
  const [isClosing, setIsClosing] = useState(false)
  const currencySymbol = useStore(selectCurrencySymbol)
  const [isProcessing, setIsProcessing] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (storeId) {
      getStore(storeId).then(setStore)
    }
  }, [storeId])

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [])
  
  const handleClose = () => {
    // Don't allow closing if processing order or showing success countdown
    if (isProcessing || (showAlert && isOrderSuccess && !store?.settings?.pay_later)) return;
    
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  // Group items by id to show total quantity
  const itemGroups = cartItems.reduce((groups, item) => {
    if (!groups[item.id]) {
      groups[item.id] = {
        ...item,
        totalQuantity: 0,
        variants: []
      }
    }
    groups[item.id].totalQuantity += item.quantity
    groups[item.id].variants.push(item)
    return groups
  }, {} as Record<string, any>)

  const handlePlaceOrder = async () => {
    if (isProcessing) return;
    setIsProcessing(true);

    if (!executeRecaptcha) {
      console.error('reCAPTCHA not initialized')
      setIsProcessing(false)
      return
    }

    const tax_amount = subTotal * (store?.tax_info?.tax_rate || 0)
    const total_amount = subTotal + tax_amount * (store?.tax_info?.tax_included ? 0 : 1)
    const orderInfo = {
      lang: lang,
      store_id: storeId,
      order_type: orderType,
      table_code: tableCode,
      order_items: cartItems.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        price: calculateItemTotal(item.price, 1, item.selected_customizations),
        selected_customizations: item.selected_customizations
      })),
      total_amount: total_amount.toFixed(2),
      tax_amount: tax_amount.toFixed(2),
      notes: ''
    };

    try {
      const token = await executeRecaptcha('place_order')
      const response = await fetch(`${API_URL}/orders_new/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...orderInfo,
          recaptcha_token: token
        })
      })

      const data = await response.json()
      if (data.error) {
        setAlertMessage(t('cart.orderFailed'))
        setIsOrderSuccess(false)
        setShowAlert(true)
      } else {
        if (store?.settings?.pay_later === true) {
          setAlertMessage(t('cart.orderSuccessPayLater'))
        } else {
          setAlertMessage(t('cart.orderSuccessPayNow'))
          setTimeout(() => {
            navigate(`/checkout/${storeId}`)
          }, 3000)
        }
        setIsOrderSuccess(true)
        clearCart()
        setShowAlert(true)
        setOrderStatus('Pending')
        setOrderId(data.order.id)
        setOrderNumber(data.order.order_number)
      }
    } catch (error) {
      console.error('Error:', error)
      setAlertMessage(t('cart.orderFailed'))
      setIsOrderSuccess(false)
      setShowAlert(true)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleCheckout = () => {
    if (isProcessing) return;
    setIsProcessing(true);
    navigate(`/checkout/${storeId}`)
    onClose()
  }

  const initiateOrder = () => {
    if (orderType === 'In-store') {
      setShowConfirm(true)
    } else {
      handleCheckout()
    }
  }

  return createPortal(
    <div className={`customization-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      {!showAlert && !showConfirm && (
        <div className={`customization-modal ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
          {isProcessing && <div className="overlay-disabled" />}
          <button 
            className="modal-close" 
            onClick={handleClose} 
            disabled={isProcessing || (showAlert && isOrderSuccess && !store?.settings?.pay_later)}
          >
            <IoClose />
          </button>

          <div className="modal-content">
            <h3>{t('cart.title')} ({cartItems.length} {t('cart.items')})</h3>

            <div className="cart-items-container">
              {Object.values(itemGroups).map((group: any) => (
                group.variants.map((item: CartItem, index: number) => (
                  <div key={`${group.id}-${index}`} className="cart-item">
                    <div className="item-details">
                      <div className="item-line">
                        <span>{item.quantity} x {item.name[lang] ?? item.name['en']}</span>
                        <div className="item-price">
                          {currencySymbol}{calculateItemTotal(item.price, 1, item.selected_customizations).toFixed(2)}
                        </div>
                        <CartAddButton item={item} />
                      </div>
                      {item.selected_customizations && (
                        <div className="customizations">
                          {item.selected_customizations.map((category, categoryIndex) => (
                            <small key={categoryIndex} className="customization-detail">
                              {category.name[lang] ?? category.name['en']}: {category.selected_options.map(option =>
                                option.name[lang] ?? option.name['en']
                              ).join(', ')}
                            </small>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ))}
              {cartItems.length === 0 && (
                <div className="empty-cart">{t('cart.empty')}</div>
              )}
            </div>

            {orderType === 'In-store' ? (
              <button 
                className={`big-button ${isProcessing ? 'loading' : ''}`} 
                onClick={initiateOrder}
                disabled={isProcessing}
              >
                {t('cart.placeOrder')} - {currencySymbol}{subTotal.toFixed(2)}
              </button>
            ) : (
              <button 
                className={`big-button ${isProcessing ? 'loading' : ''}`} 
                onClick={initiateOrder}
                disabled={isProcessing}
              >
                {t('cart.checkout')} - {currencySymbol}{subTotal.toFixed(2)}
              </button>
            )}
          </div>
        </div>
      )}
      {showAlert && createPortal(
        <AlertPopup
          message={alertMessage}
          onClose={() => {
            onClose()
            setShowAlert(false)
            setIsOrderSuccess(false)
          }}
          showCloseButton={!isOrderSuccess || store?.settings?.pay_later === true}
          countdown={!isOrderSuccess ? undefined : (store?.settings?.pay_later === true ? undefined : 3)}
        />,
        document.body
      )}
      {showConfirm && createPortal(
        <ConfirmPopup
          message={t('cart.confirmOrder')}
          onConfirm={() => {
            setShowConfirm(false)
            handlePlaceOrder()
          }}
          onCancel={() => setShowConfirm(false)}
        />,
        document.body
      )}
    </div>,
    document.body
  )
}

export default function Cart({ withCheckout = false }: { withCheckout?: boolean }) {
  const [isOpen, setIsOpen] = useState(false)
  const totalItems = useStore(selectTotalItems)
  const navigate = useNavigate()
  const storeId = useStore(state => state.currentStore)
  const { t } = useTranslation()
  const orderType = useStore(selectOrderType)
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  const handleCartClick = () => {
    if (orderType === 'Not Selected') {
      setAlertMessage(t('store.errorSelectOrderType'))
      setShowAlert(true)
    } else {
      setIsOpen(true)
    }
  }

  return (
    <>
      {isOpen && <CartModal onClose={() => setIsOpen(false)} />}
      <div className="payment-buttons">
        <div
          className={`cart-button ${totalItems > 0 ? 'has-items' : ''}`}
          onClick={handleCartClick}
        >
          <IoCart />
          {totalItems > 0 && <span className="cart-count">{totalItems}</span>}
        </div>
        {withCheckout && (
          <button className="big-button" onClick={() => navigate(`/checkout/${storeId}`)}>
            {t('cart.checkout')}
          </button>
        )}
      </div>
      {showAlert && createPortal(
        <AlertPopup
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />,
        document.body
      )}
    </>
  )
}

Cart.AddButton = AddButton 