import { useParams, useNavigate } from 'react-router-dom'
import { IoArrowBack } from 'react-icons/io5'
import { useTranslation } from 'react-i18next'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { useStore, selectCartItems, selectSubTotal, selectOrderType, selectTableCode, selectOrderId, calculateItemTotal, CartItem, selectOrderNumber, selectOrderStatus, selectCurrencySymbol } from '../store'
import { getOrder, getStore, Store, Order } from '../database'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { API_URL } from '../config'
import AlertPopup from '../components/AlertPopup'
import ConfirmPopup from '../components/ConfirmPopup'
import DonationPopup from '../components/DonationPopup'
import { Item } from './Item'
import { createPortal } from 'react-dom'

const getServiceFee = (store: Store | null): number => {
  return store?.currency === 'eur' ? 0.25 : 0.30
}

export default function Checkout() {
  const { storeId } = useParams()
  const [searchParams] = useSearchParams()
  const { t } = useTranslation()
  const { executeRecaptcha } = useGoogleReCaptcha()
  const formRef = useRef<HTMLFormElement>(null)
  const lang = useTranslation().i18n.language || 'en'
  const tableCode = useStore(selectTableCode)
  const cartItems = useStore(selectCartItems)
  const subTotal = useStore(selectSubTotal)
  const orderType = useStore(selectOrderType)
  const [store, setStore] = useState<Store | null>(null)
  const [notes, setNotes] = useState('')
  const [email, setEmail] = useState('')
  const [showAlert, setShowAlert] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [showDonationPopup, setShowDonationPopup] = useState(false)
  const [selectedDonationAmount, setSelectedDonationAmount] = useState(0)
  const orderId = useStore(selectOrderId)
  const setOrderId = useStore(state => state.setOrderId)
  const [order, setOrder] = useState<Order | null>(null)
  const setOrderNumber = useStore(state => state.setOrderNumber)
  const setOrderStatus = useStore(state => state.setOrderStatus)
  const orderNumber = useStore(selectOrderNumber)
  const orderStatus = useStore(selectOrderStatus)
  const setTableNumber = useStore(state => state.setTableNumber)
  const setTableCode = useStore(state => state.setTableCode)
  const setOrderType = useStore(state => state.setOrderType)
  const clearCart = useStore(state => state.clearCart)
  const currencySymbol = useStore(selectCurrencySymbol)
  const [isProcessing, setIsProcessing] = useState(false)
  const navigate = useNavigate()

  let subtotal_amount = 0
  let tax_amount = 0
  let total_amount = 0
  let service_fee_amount = 0
  let donation_surcharge_amount = 0
  let orderItems: CartItem[] = []

  // Determine if we should block navigation
  const shouldBlockNavigation = order?.status === 'Completed' || (order?.status === 'Pending' && orderType !== 'In-store')

  // Handle store and orders
  useEffect(() => {
    if (storeId) {
      getStore(storeId).then(setStore)
      // Check for order ID from URL or state
      const orderIdFromUrl = searchParams.get('order_id')
      if (orderIdFromUrl && !orderId) {
        setOrderId(orderIdFromUrl)
      }
    }
  }, [storeId, searchParams])

  // Separate effect for fetching order details
  useEffect(() => {
    if (storeId && orderId) {
      getOrder(storeId, orderId).then(order => {
        if (order) {
          setOrder(order)
          setOrderNumber(order.order_number || null)
          setOrderStatus(order.status || null)
        }
      })
    }
  }, [storeId, orderId])

  if (orderId) {  // Order has been sent to the server
    tax_amount = order?.tax_amount || 0
    total_amount = order?.total_amount || 0
    service_fee_amount = order?.service_fee_surcharge || 0
    donation_surcharge_amount = order?.donation_surcharge || 0
    subtotal_amount = total_amount - tax_amount * (store?.tax_info?.tax_included ? 0 : 1)
    const order_items = order?.order_items || []
    const store_items = store?.items || []
    orderItems = order_items.map((item: any) => {
      const store_item = store_items.find((store_item: Item) => store_item.id === item.id)
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        customizations: store_item?.customizations,
        selected_customizations: item.selected_customizations
      }
    })
  }
  else {  // Order has not been sent to the server
    orderItems = cartItems
    subtotal_amount = subTotal
    tax_amount = subtotal_amount * (store?.tax_info?.tax_rate || 0)
    total_amount = subtotal_amount + tax_amount * (store?.tax_info?.tax_included ? 0 : 1)
  }

  // Calculate item prices once for reuse
  const orderItemsWithCalculatedPrices = orderItems.map(item => ({
    ...item,
    calculatedPrice: orderId ? item.price : calculateItemTotal(item.price, 1, item.selected_customizations)
  }))

  // Calculate additional fees
  const orderInfo = {
    lang: lang,
    store_id: storeId,
    order_id: orderId,
    order_type: orderType,
    table_code: tableCode,
    email: orderType !== 'In-store' ? email : undefined,
    order_items: orderItemsWithCalculatedPrices.map(item => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      price: item.calculatedPrice,
      selected_customizations: item.selected_customizations
    })),
    total_amount: total_amount.toFixed(2),
    tax_amount: tax_amount.toFixed(2),
    donation_surcharge: selectedDonationAmount.toFixed(2),
    notes: notes,
    return_url: `${window.location.origin}/checkout/${storeId}`
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isProcessing) return

    // Validate email for non-in-store orders
    if (orderType !== 'In-store' && (!email || !email.includes('@'))) {
      setAlertMessage(t('checkout.emailRequired'))
      setShowAlert(true)
      return
    }

    // Show donation popup for online payment
    setShowDonationPopup(true)
  }

  const handleActualPayment = async () => {
    setIsProcessing(true)

    if (!executeRecaptcha) {
      console.error('reCAPTCHA not loaded')
      setIsProcessing(false)
      return
    }

    try {
      const token = await executeRecaptcha('payment')
      if (formRef.current) {
        const tokenInput = formRef.current.querySelector(
          'input[name="recaptcha_token"]'
        ) as HTMLInputElement
        if (tokenInput) {
          tokenInput.value = token
        }
        formRef.current.submit()
      }
    } catch (error) {
      console.error('reCAPTCHA failed', error)
      setIsProcessing(false)
    }
  }

  const handleDonationConfirm = (donationAmount: number) => {
    setSelectedDonationAmount(donationAmount)
    setShowDonationPopup(false)
    handleActualPayment()
  }

  const handleDonationCancel = () => {
    setShowDonationPopup(false)
    setIsProcessing(false)
  }

  // Custom navigation handler
  const handleNavigation = (e: React.MouseEvent) => {
    if (shouldBlockNavigation) {
      e.preventDefault();
      setShowConfirm(true);
    } else {
      navigate(`/store/${storeId}`);
    }
  };

  const handleConfirmNavigation = () => {
    setShowConfirm(false);
    setTableNumber(null)
    setTableCode(null)
    setOrderType('Not Selected')
    clearCart()
    navigate(`/store/${storeId}`);
  };

  const handleCancelNavigation = () => {
    setShowConfirm(false);
  };

  return (
    <div className="page-container checkout-page">
      {isProcessing && <div className="overlay-disabled" />}
      <div className="header-section">
        <button 
          className="small-button" 
          onClick={handleNavigation}
        >
          <IoArrowBack /> {t('store.menu')}
        </button>
        <h2 className="store-name">
          {orderNumber ?
            <>
              {t('checkout.orderNumber') + orderNumber}
              {' - '} {orderStatus === 'Completed' ? t('checkout.accepted') : (orderStatus === 'Pending' && orderType !== 'In-store') ? t('checkout.pending') : t('checkout.unpaid')}
            </>
            : t('checkout.orderSummary')}
        </h2>
      </div>

      <div className="checkout-content-section">
        <div className="cart-items-container">
          {orderItemsWithCalculatedPrices.map((item, index) => (
            <div key={index} className="cart-item">
              <div className="item-details">
                <div className="item-line">
                  <span>{item.quantity} x {item.name[lang] ?? item.name['en']}</span>
                  <span className="price">
                    {currencySymbol}{item.calculatedPrice.toFixed(2)}
                  </span>
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
          ))}
        </div>

        <div className="order-totals">
          <div className="total-line">
            <span>{t('checkout.subtotal')}</span>
            <span>{currencySymbol}{subtotal_amount.toFixed(2)}</span>
          </div>
          <div className="total-line">
            <span>{t(store?.tax_info?.tax_included ? 'checkout.taxIncluded' : 'checkout.tax')} ({(store?.tax_info?.tax_rate ?? 0) * 100}%)</span>
            <span>{currencySymbol}{tax_amount.toFixed(2)}</span>
          </div>
          {orderId && service_fee_amount > 0 && (
            <div className="total-line">
              <span>{t('checkout.onlinePaymentServiceFee')}</span>
              <span>{currencySymbol}{service_fee_amount.toFixed(2)}</span>
            </div>
          )}
          {orderId && donation_surcharge_amount > 0 && (
            <div className="total-line">
              <span>{t('checkout.donationSurcharge')}</span>
              <span>{currencySymbol}{donation_surcharge_amount.toFixed(2)}</span>
            </div>
          )}
          <div className="total-line total">
            <span>{t('checkout.total')}</span>
            <span>{currencySymbol}{(total_amount + service_fee_amount + donation_surcharge_amount).toFixed(2)}</span>
          </div>
        </div>

        {orderStatus === null && (
          <>
            <textarea
              placeholder={t('checkout.addNotes')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="notes-input"
              rows={2}
            />
            {orderType !== 'In-store' && (
              <textarea
                placeholder={t('checkout.email')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="notes-input email-input"
                rows={1}
                required
              />
            )}
          </>
        )}
      </div>

      {!(orderStatus === 'Completed' || (orderStatus === 'Pending' && orderType !== 'In-store')) ? (
        <>
          <div className={`payment-buttons ${orderType === 'In-store' ? 'double' : 'single'}`}>
            {orderType === 'In-store' ? (
              <>
                <button 
                  className="big-button"
                  onClick={() => {
                    setAlertMessage(t('checkout.inStorePaymentMessage') + ' ' + orderNumber)
                    setShowAlert(true)
                  }}
                >
                  {t('checkout.inStorePayment')}
                </button>
                {store?.services.pay_online ? (
                  <form 
                    ref={formRef}
                    onSubmit={handleFormSubmit}
                    action={`${API_URL}/orders_new/pay`} 
                    method="POST"
                  >
                    <input type="hidden" name="order_info" value={JSON.stringify(orderInfo)} />
                    <button 
                      type="submit" 
                      className={`big-button ${isProcessing ? 'loading' : ''}`}
                      disabled={isProcessing}
                    >
                      {t('checkout.onlinePayment')}
                    </button>
                  </form>
                ) : (
                  <button 
                    className="big-button disabled" 
                    onClick={() => {
                      setAlertMessage(t('store.notAvailableNoOnlinePayments'))
                      setShowAlert(true)
                    }}
                    disabled={true}
                  >
                    {t('checkout.onlinePayment')}
                  </button>
                )}
              </>
            ) : (
              <form
                ref={formRef}
                onSubmit={handleFormSubmit}
                method="POST"
                action={`${API_URL}/orders_new/order-pay`}
              >
                <input type="hidden" name="order_info" value={JSON.stringify(orderInfo)} />
                <input type="hidden" name="recaptcha_token" value="" />
                <button 
                  type="submit" 
                  className={`big-button ${isProcessing ? 'loading' : ''}`}
                  disabled={isProcessing}
                >
                  {t('checkout.onlinePayment')}
                </button>
              </form>
            )}
          </div>
          <div className="service-fee-note">
            <small>
              {t('checkout.serviceFeeNote', {
                currency: currencySymbol,
                amount: getServiceFee(store).toFixed(2)
              })}
            </small>
          </div>
        </>
      ) : (
        <div className="payment-buttons single">
          {orderType !== 'In-store' && (
            <>
              {orderStatus === 'Completed' ? (
                <div className="email-notification-message">
                  <p>{t('checkout.pickupMessage')}</p>
                </div>
              ) : (
          <div className="email-notification-message">
            <p>{t('checkout.emailNotification')}</p>
            <ul>
                    <li>• {t('checkout.emailNotification1')}</li>
                    <li>• {t('checkout.emailNotification2')}</li>
            </ul>
          </div>
              )}
            </>
          )}
          <button className="big-button disabled">
            {t('checkout.orderPaid')}
          </button>
        </div>
      )}

      {showAlert && createPortal(
        <AlertPopup
          message={alertMessage}
          onClose={() => {
            setShowAlert(false)
            setIsProcessing(false)
          }}
        />,
        document.body
      )}

      {showConfirm && createPortal(
        <ConfirmPopup
          message={t('checkout.navigationWarning')}
          onConfirm={handleConfirmNavigation}
          onCancel={handleCancelNavigation}
        />,
        document.body
      )}

      {showDonationPopup && createPortal(
        <DonationPopup
          onConfirm={handleDonationConfirm}
          onCancel={handleDonationCancel}
        />,
        document.body
      )}
    </div>
  )
} 