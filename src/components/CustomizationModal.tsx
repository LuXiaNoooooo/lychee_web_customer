import { useState, useEffect } from 'react'
import { IoClose, IoAdd, IoRemove } from 'react-icons/io5'
import { useStore, calculateItemTotal, selectCurrencySymbol } from '../store'
import { createPortal } from 'react-dom'
import { Item } from '../pages/Item'
import { useTranslation } from 'react-i18next'

interface CustomizationModalProps {
  item: Item
  onClose: () => void
}

export default function CustomizationModal({ item, onClose }: CustomizationModalProps) {
  const [quantity, setQuantity] = useState(1)
  const [selectedCustomizations, setSelectedCustomizations] = useState<Array<{
    index: number
    name: Record<string, string>
    selected_options: Array<{
      index: number
      name: Record<string, string>
      price: number
    }>
  }>>([])
  const addToCart = useStore(state => state.addToCart)
  const { t } = useTranslation()
  const lang = useTranslation().i18n.language || 'en'
  const [isClosing, setIsClosing] = useState(false)
  const currencySymbol = useStore(selectCurrencySymbol)
  useEffect(() => {
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [])

  const handleClose = () => {
    setIsClosing(true)
    setTimeout(() => {
      onClose()
    }, 300)
  }

  const handleOptionSelect = (categoryIndex: number, optionIndex: number, maxSelect: number) => {
    setSelectedCustomizations(prev => {
      const category = prev.find(c => c.index === categoryIndex);
      const option = item.customizations![categoryIndex].options[optionIndex];
      
      if (category) {
        // If option already selected, remove it
        if (category.selected_options.some(opt => opt.index === optionIndex)) {
          return prev.map(c => 
            c.index === categoryIndex 
              ? { ...c, selected_options: c.selected_options.filter(opt => opt.index !== optionIndex) }
              : c
          );
        }

        // For single select, replace existing option
        if (maxSelect === 1) {
          return prev.map(c => 
            c.index === categoryIndex 
              ? { ...c, selected_options: [{ index: optionIndex, name: option.name, price: option.price || 0 }] }
              : c
          );
        }

        // Don't add if we hit max
        if (maxSelect > 0 && category.selected_options.length >= maxSelect) {
          return prev;
        }

        // Add new option
        return prev.map(c => 
          c.index === categoryIndex 
            ? { ...c, selected_options: [...c.selected_options, { index: optionIndex, name: option.name, price: option.price || 0 }] }
            : c
        );
      }

      // Create new category with option
      return [...prev, {
        index: categoryIndex,
        name: item.customizations![categoryIndex].name,
        selected_options: [{ index: optionIndex, name: option.name, price: option.price || 0 }]
      }];
    });
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation()
    addToCart({
      ...item,
      quantity,
      selected_customizations: selectedCustomizations
    })
    handleClose()
  }

  return createPortal(
    <div className={`customization-overlay ${isClosing ? 'closing' : ''}`} onClick={handleClose}>
      <div className={`customization-modal ${isClosing ? 'closing' : ''}`} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={handleClose}>
          <IoClose />
        </button>
        
        <div className="modal-content">
          <h3>{item.name[lang] ?? item.name['en']}</h3>
          
          <div className="quantity-controls" style={{ justifyContent: 'center', margin: '1rem 0' }}>
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>
              <IoRemove />
            </button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)}>
              <IoAdd />
            </button>
          </div>

          <div className="cart-items-container">
            {item.customizations?.map((category, categoryIndex) => (
              <div key={categoryIndex} className="option-group">
                <h4>
                  {category.name[lang] ?? category.name['en']}
                  {category.maxSelect > 0 && (
                    <span className="selection-limit">
                      {` (${t('item.selectUpTo', { max: category.maxSelect })})`}
                    </span>
                  )}
                </h4>
                <div className="option-buttons">
                  {category.options.map((option, optionIndex) => (
                    <button
                      key={optionIndex}
                      className={`option-button ${
                        selectedCustomizations.find(c => c.index === categoryIndex)?.selected_options.some(opt => opt.index === optionIndex) ? 'selected' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOptionSelect(categoryIndex, optionIndex, category.maxSelect);
                      }}
                      disabled={
                        !selectedCustomizations.find(c => c.index === categoryIndex)?.selected_options.some(opt => opt.index === optionIndex) &&
                        category.maxSelect > 0 &&
                        (selectedCustomizations.find(c => c.index === categoryIndex)?.selected_options.length || 0) >= category.maxSelect
                      }
                    >
                      {option.name[lang] ?? option.name['en']}
                      {option.price !== undefined && option.price > 0 && 
                        ` (+${currencySymbol}${option.price.toFixed(2)})`
                      }
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button className="big-button" onClick={handleAddToCart}>
            {t('item.addToCart')} - {currencySymbol}{calculateItemTotal(item.price, quantity, selectedCustomizations).toFixed(2)}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}