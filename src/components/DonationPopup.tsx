import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useStore, selectCurrencySymbol } from '../store'

interface DonationPopupProps {
  onConfirm: (donationAmount: number) => void
  onCancel: () => void
}

export default function DonationPopup({ onConfirm, onCancel }: DonationPopupProps) {
  const { t } = useTranslation()
  const currencySymbol = useStore(selectCurrencySymbol)
  const [donationAmount, setDonationAmount] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState('')

  const suggestedAmounts = [0.25, 0.5, 1.0]

  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [])

  const handleSuggestedAmountClick = (amount: number) => {
    setDonationAmount(amount.toFixed(2))
    setErrorMessage('')
  }

  const handleAmountChange = (value: string) => {
    setDonationAmount(value)
    setErrorMessage('')
  }

  const handleConfirm = () => {
    const amount = parseFloat(donationAmount) || 0
    if (amount < 0) {
      setErrorMessage(t('donation.errorNegativeAmount'))
      return
    }
    onConfirm(amount)
  }

  return (
    <div className="popup" onClick={onCancel}>
      <div className="popup-content" onClick={e => e.stopPropagation()}>
        <h3 className="donation-title">{t('donation.title')}</h3>
        
        <div className="donation-suggested-amounts">
          {suggestedAmounts.map((amount) => (
            <button
              key={amount}
              className="donation-amount-button"
              onClick={() => handleSuggestedAmountClick(amount)}
            >
              {currencySymbol}{amount.toFixed(2)}
            </button>
          ))}
        </div>

        <div className="donation-input-container">
          <span className="currency-prefix">{currencySymbol}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={donationAmount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder={t('donation.inputPlaceholder')}
            className="donation-input"
          />
        </div>

        {errorMessage && (
          <div className="donation-error">
            {errorMessage}
          </div>
        )}

        <div className="button-group">
          <button className="button confirm-button" onClick={handleConfirm}>
            {t('store.confirm')}
          </button>
          <button className="button exit-button" onClick={onCancel}>
            {t('store.exit')}
          </button>
        </div>
      </div>
    </div>
  )
}