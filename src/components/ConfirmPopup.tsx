import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface ConfirmPopupProps {
  message: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmPopup({ message, onConfirm, onCancel }: ConfirmPopupProps) {
  const { t } = useTranslation()

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [])

  return (
    <div className="popup" onClick={onCancel}>
      <div className="popup-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ whiteSpace: 'pre-line' }}>{message}</h3>
        <div className="button-group">
          <button className="button confirm-button" onClick={onConfirm}>
            {t('cart.confirm')}
          </button>
          <button className="button exit-button" onClick={onCancel}>
            {t('cart.cancel')}
          </button>
        </div>
      </div>
    </div>
  )
} 