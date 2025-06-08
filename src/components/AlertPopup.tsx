import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'

interface AlertPopupProps {
  message: string
  onClose: () => void
  showCloseButton?: boolean
  countdown?: number
}

export default function AlertPopup({ message, onClose, showCloseButton = true, countdown }: AlertPopupProps) {
  const { t } = useTranslation()
  const [remainingTime, setRemainingTime] = useState(countdown)
  
  useEffect(() => {
    if (countdown && remainingTime) {
      const timer = setInterval(() => {
        setRemainingTime(prev => {
          if (prev && prev > 0) {
            return prev - 1
          }
          clearInterval(timer)
          onClose()
          return 0
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [countdown, remainingTime, onClose])
  
  return (
    <div className="popup" onClick={countdown ? undefined : onClose}>
      <div className="popup-content" onClick={e => e.stopPropagation()}>
        <h3 style={{ whiteSpace: 'pre-line' }}>{message}</h3>
        {countdown && remainingTime && (
          <p>{t('store.redirectingIn')} {remainingTime}...</p>
        )}
        {showCloseButton && !countdown && (
          <div className="button-group">
            <button className="button exit-button" onClick={onClose}>
              {t('store.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
} 