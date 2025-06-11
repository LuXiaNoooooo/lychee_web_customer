import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { MdStorefront, MdShoppingBasket, MdDeliveryDining, MdCalendarMonth } from 'react-icons/md';
import { getStore } from '../database';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AlertPopup from './AlertPopup';
import { resetTable, resetOrder, handleTableCode } from '../utils/orderTypeUtils';

interface OrderTypePopupProps {
  onClose: () => void;
}

export default function OrderTypePopup({ onClose }: OrderTypePopupProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const storeId = useStore(state => state.currentStore);
  const setOrderType = useStore(state => state.setOrderType);
  const setTableNumber = useStore(state => state.setTableNumber);
  const setTableCode = useStore(state => state.setTableCode);
  const setOrderStatus = useStore(state => state.setOrderStatus);
  const setOrderNumber = useStore(state => state.setOrderNumber);
  const setOrderId = useStore(state => state.setOrderId);
  const [store, setStore] = useState<any>(null);
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [inputTableCode, setInputTableCode] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');

  useEffect(() => {
    if (storeId) {
      getStore(storeId)
        .then(data => {
          setStore(data);
        })
        .catch(() => {
          console.error('Error fetching store');
        });
    }
  }, [storeId]);

  const handlers = {
    setOrderType,
    setTableNumber,
    setTableCode,
    setOrderStatus,
    setOrderNumber,
    setOrderId
  };

  const handleTableCodeSubmit = () => {
    if (storeId && inputTableCode) {
      handleTableCode(storeId, inputTableCode, store, handlers, {
        onSuccess: () => {
          setShowTablePopup(false);
          onClose();
        },
        onError: (message) => {
          setAlertMessage(t(message));
          setShowAlert(true);
        }
      });
    }
  };

  const handleTablePopupClose = () => {
    setShowTablePopup(false);
  };

  const handlePickupClick = () => {
    if (!store?.supported_order_types?.includes('Pickup')) {
      setAlertMessage(store?.services?.pay_online === false ?
        t('store.notAvailableNoOnlinePayments') :
        t('store.notAvailable'));
      setShowAlert(true);
      return;
    }
    setOrderType('Pickup');
    resetTable(handlers);
    resetOrder(handlers);
    onClose();
  };

  const handleDineInClick = () => {
    if (!store?.supported_order_types?.includes('In-store')) {
      setAlertMessage(t('store.notAvailable'));
      setShowAlert(true);
      return;
    }
    setShowTablePopup(true);
  };

  const handleDeliveryClick = () => {
    if (!store?.supported_order_types?.includes('Delivery')) {
      setAlertMessage(t('store.notAvailable'));
      setShowAlert(true);
      return;
    }
    setOrderType('Delivery');
    resetTable(handlers);
    resetOrder(handlers);
    onClose();
  };

  const handleReservationClick = () => {
    navigate(`/store/${storeId}/reservation`);
    onClose();
  };

  const handleBrowseClick = () => {
    onClose();
  };

  return (
    <>
      <div className="popup" onClick={handleBrowseClick}>
        <div className="popup-content" onClick={e => e.stopPropagation()}>
          <h3>{t('store.whatWouldYouLikeToDo')}</h3>
          <div className="order-type-options">
            <button
              className={`order-type-option ${!store?.supported_order_types?.includes('In-store') ? 'disabled' : ''}`}
              onClick={handleDineInClick}
              disabled={!store?.supported_order_types?.includes('In-store')}
            >
              <MdStorefront />
              <span>{t('store.orderInStore')}</span>
            </button>
            <button
              className={`order-type-option ${!store?.supported_order_types?.includes('Pickup') ? 'disabled' : ''}`}
              onClick={handlePickupClick}
              disabled={!store?.supported_order_types?.includes('Pickup')}
            >
              <MdShoppingBasket />
              <span>{t('store.orderPickup')}</span>
            </button>
            <button
              className={`order-type-option ${!store?.supported_order_types?.includes('Delivery') ? 'disabled' : ''}`}
              onClick={handleDeliveryClick}
              disabled={!store?.supported_order_types?.includes('Delivery')}
            >
              <MdDeliveryDining />
              <span>{t('store.orderDelivery')}</span>
            </button>
            <button
              className="order-type-option"
              onClick={handleReservationClick}
            >
              <MdCalendarMonth />
              <span>{t('store.makeReservation')}</span>
            </button>
            <button
              className="order-type-option browse"
              onClick={handleBrowseClick}
            >
              <span>{t('store.justBrowsing')}</span>
            </button>
          </div>
        </div>
      </div>

      {showTablePopup && createPortal(
        <div className="popup">
          <div className="popup-content">
            <h3>{t('store.selectTable')}</h3>
            <div className="table-input">
              <input
                type="text"
                value={inputTableCode || ''}
                onChange={(e) => setInputTableCode(e.target.value)}
                placeholder={t('store.enterTableCode')}
                maxLength={6}
              />
              <div className="button-group">
                <button className="button confirm-button" onClick={handleTableCodeSubmit}>
                  {t('store.confirm')}
                </button>
                <button className="button exit-button" onClick={handleTablePopupClose}>
                  {t('store.exit')}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {showAlert && createPortal(
        <AlertPopup
          message={alertMessage}
          onClose={() => setShowAlert(false)}
        />,
        document.body
      )}
    </>
  );
} 