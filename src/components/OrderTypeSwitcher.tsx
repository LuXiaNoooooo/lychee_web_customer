import { useStore, selectOrderType, selectTableNumber } from '../store';
import { useTranslation } from 'react-i18next';
import { useState, useRef, useEffect } from 'react';
import { MdSettings, MdStorefront, MdShoppingBasket, MdArrowDropDown, MdDeliveryDining } from 'react-icons/md';
import { getStore } from '../database';
import AlertPopup from './AlertPopup';
import { useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { resetTable, resetOrder, handleTableCode } from '../utils/orderTypeUtils';

export default function OrderTypeSwitcher() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [showTablePopup, setShowTablePopup] = useState(false);
  const [inputTableCode, setInputTableCode] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [store, setStore] = useState<any>(null);

  const orderType = useStore(selectOrderType);
  const tableNumber = useStore(selectTableNumber);
  const setOrderType = useStore(state => state.setOrderType);
  const setTableNumber = useStore(state => state.setTableNumber);
  const setTableCode = useStore(state => state.setTableCode);
  const setOrderStatus = useStore(state => state.setOrderStatus);
  const setOrderNumber = useStore(state => state.setOrderNumber);
  const setOrderId = useStore(state => state.setOrderId);
  const storeId = useStore(state => state.currentStore);

  const handlers = {
    setOrderType,
    setTableNumber,
    setTableCode,
    setOrderStatus,
    setOrderNumber,
    setOrderId
  };

  // Fetch store data to check supported order types
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

  // Handle table code and order type from URL
  useEffect(() => {
    const orderTypeFromUrl = searchParams.get('order_type');
    const tableCodeFromUrl = searchParams.get('table_code');
    if (!store) return; // Don't proceed if store data isn't loaded yet
    if (orderTypeFromUrl) {
      if (orderTypeFromUrl == 'In-store') {
        if (tableCodeFromUrl && storeId) {
          handleTableCode(storeId, tableCodeFromUrl, store, handlers, {
            onSuccess: () => {
              setShowTablePopup(false);
              setIsOpen(false);
            },
            onError: (message) => {
              setAlertMessage(t(message));
              setShowAlert(true);
              setShowTablePopup(false);
              setIsOpen(false);
            }
          });
        }
      } else if (orderTypeFromUrl == 'Pickup') {
        if (!store.supported_order_types.includes('Pickup')) {
          setAlertMessage(store?.services?.pay_online === false ?
            t('store.notAvailableNoOnlinePayments') :
            t('store.notAvailable'));
          setShowAlert(true);
        } else {
          setOrderType('Pickup');
        }
      } else if (orderTypeFromUrl == 'Delivery') {
        if (!store.supported_order_types.includes('Delivery')) {
          setAlertMessage(t('store.notAvailable'));
          setShowAlert(true);
        } else {
          setOrderType('Delivery');
        }
      }
    }
  }, [searchParams, storeId, orderType, store]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setIsOpen(false);
  };

  const handleDineInClick = () => {
    if (!store?.supported_order_types?.includes('In-store')) {
      setAlertMessage(t('store.notAvailable'));
      setShowAlert(true);
      return;
    }
    setShowTablePopup(true);
    setIsOpen(false);
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
    setIsOpen(false);
  };

  const handleTablePopupClose = () => {
    setShowTablePopup(false);
  };

  const handleTableCodeSubmit = () => {
    if (storeId && inputTableCode) {
      handleTableCode(storeId, inputTableCode, store, handlers, {
        onSuccess: () => {
          setShowTablePopup(false);
          setIsOpen(false);
        },
        onError: (message) => {
          setAlertMessage(t(message));
          setShowAlert(true);
          setShowTablePopup(false);
          setIsOpen(false);
        }
      });
    }
  };

  return (
    <>
      <div ref={dropdownRef} className="dropdown order-type-switcher">
        <button
          className="order-type-button"
          onClick={() => setIsOpen(!isOpen)}
        >
          <MdSettings />
          <span style={{ marginRight: 'auto' }}>{t('store.ordering')}</span>
          {orderType === 'In-store' ? (
            <span>
              {t('store.inStore')} {tableNumber && ` (${tableNumber})`}
            </span>
          ) : orderType === 'Pickup' ? (
            <span>
              {t('store.pickup')}
            </span>
          ) : orderType === 'Delivery' ? (
            <span>
              {t('store.delivery')}
            </span>
          ) : (
            <span>
              {t('store.notSelected')}
            </span>
          )}
          <MdArrowDropDown />
        </button>
        {isOpen && (
          <div className="dropdown-menu">
            <button
              className={`dropdown-option ${!store?.supported_order_types?.includes('In-store') ? 'disabled' : ''}`}
              onClick={handleDineInClick}
            >
              <MdStorefront /> {t('store.inStore')}
            </button>
            <button
              className={`dropdown-option ${!store?.supported_order_types?.includes('Pickup') ? 'disabled' : ''}`}
              onClick={handlePickupClick}
            >
              <MdShoppingBasket /> {t('store.pickup')}
            </button>
            <button
              className={`dropdown-option ${!store?.supported_order_types?.includes('Delivery') ? 'disabled' : ''}`}
              onClick={handleDeliveryClick}
            >
              <MdDeliveryDining /> {t('store.delivery')}
            </button>
          </div>
        )}
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