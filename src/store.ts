import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface CartItem {
  id: string
  name: Record<string, string>
  price: number
  quantity: number
  selected_customizations?: Array<{
    index: number
    name: Record<string, string>
    selected_options: Array<{
      index: number
      name: Record<string, string>
      price: number
    }>
  }>
}

export const calculateItemTotal = (
  basePrice: number,
  quantity: number,
  selectedCustomizations?: CartItem['selected_customizations'],
) => {
  let total = basePrice;
  if (selectedCustomizations) {
    selectedCustomizations.forEach(category => {
      category.selected_options.forEach(option => {
        if (option.price) {
          total += option.price;
        }
      });
    });
  }
  return total * quantity;
};

// Currency symbol mapping
const getCurrencySymbol = (currency?: string): string => {
  if (!currency) return '$' // Default to USD
  switch (currency.toUpperCase()) {
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    case 'GBP':
      return '£'
    case 'JPY':
      return '¥'
    case 'CAD':
      return '$'
    case 'AUD':
      return '$'
    case 'RUB':
      return '₽'
    case 'CNY':
      return '¥'
    default:
      return '$' // Return the dollar sign if no symbol is found
  }
}


interface StoreState {
  currentStore: string
  recentStores: string[]
  // Store specific state
  stores: Record<string, {
    currencySymbol: string
    cartItems: CartItem[]
    totalItems: number
    subTotal: number
    orderType: 'Not Selected' | 'In-store' | 'Pickup' | 'Delivery'
    tableNumber: string | null
    tableCode: string | null
    orderStatus: string | null
    orderId: string | null
    orderNumber: string | null
  }>
  searchQuery: string
  setCurrentStore: (store: string) => void
  addToCart: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void
  updateItemQuantity: (item: Omit<CartItem, 'quantity'>, quantity: number) => void
  clearCart: () => void
  setOrderType: (type: 'Not Selected' | 'In-store' | 'Pickup' | 'Delivery') => void
  setTableNumber: (number: string | null) => void
  setTableCode: (code: string | null) => void
  setSearchQuery: (query: string) => void
  setTaxInfo: (tax_info: Record<string, any>) => void
  setOrderStatus: (status: string | null) => void
  setOrderId: (id: string | null) => void
  setOrderNumber: (number: string | null) => void
  setCurrencySymbol: (symbol: string) => void
}

// Selector functions to get current store state
export const selectCurrentStoreState = (state: StoreState) => 
  state.stores[state.currentStore] || {
    cartItems: [],
    totalItems: 0,
    subTotal: 0,
    orderType: 'Not Selected' as const,
    tableNumber: null
  }

export const selectCartItems = (state: StoreState) => selectCurrentStoreState(state).cartItems
export const selectTotalItems = (state: StoreState) => selectCurrentStoreState(state).totalItems
export const selectSubTotal = (state: StoreState) => selectCurrentStoreState(state).subTotal
export const selectOrderType = (state: StoreState) => selectCurrentStoreState(state).orderType
export const selectTableNumber = (state: StoreState) => selectCurrentStoreState(state).tableNumber
export const selectTableCode = (state: StoreState) => selectCurrentStoreState(state).tableCode
export const selectOrderStatus = (state: StoreState) => selectCurrentStoreState(state).orderStatus
export const selectOrderId = (state: StoreState) => selectCurrentStoreState(state).orderId
export const selectOrderNumber = (state: StoreState) => selectCurrentStoreState(state).orderNumber
export const selectCurrencySymbol = (state: StoreState) => selectCurrentStoreState(state).currencySymbol
export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      currentStore: '',
      recentStores: [],
      stores: {},
      searchQuery: '',

      setCurrentStore: (store) => set((state) => {
        // Initialize store state if it doesn't exist
        if (!state.stores[store]) {
          state.stores[store] = {
            cartItems: [],
            totalItems: 0,
            subTotal: 0,
            orderType: 'Not Selected',
            tableNumber: null,
            tableCode: null,
            orderStatus: null,
            orderId: null,
            orderNumber: null,
            currencySymbol: '$'
          };
        }
        
        // If store is already in the list, don't change anything
        if (state.recentStores.includes(store)) {
          return { currentStore: store };
        }
        // Add new store to the end (rightmost)
        const newRecentStores = [...state.recentStores, store].slice(-10); // Keep last 10 stores
        return {
          currentStore: store,
          recentStores: newRecentStores
        }
      }),

      addToCart: (item) => set((state) => {
        const storeState = state.stores[state.currentStore];
        const existingItem = storeState.cartItems.find(cartItem =>
          cartItem.id === item.id &&
          JSON.stringify(cartItem.selected_customizations) === JSON.stringify(item.selected_customizations)
        );

        if (existingItem) {
          const updatedItems = storeState.cartItems.map(cartItem => 
            cartItem.id === item.id && 
            JSON.stringify(cartItem.selected_customizations) === JSON.stringify(item.selected_customizations)
              ? { ...cartItem, quantity: (item.quantity || 1) + cartItem.quantity } 
              : cartItem
          );
          
          return {
            stores: {
              ...state.stores,
              [state.currentStore]: {
                ...storeState,
                cartItems: updatedItems,
                totalItems: updatedItems.reduce((total, item) => total + item.quantity, 0),
                subTotal: updatedItems.reduce((sum, item) => 
                  sum + calculateItemTotal(item.price, item.quantity, item.selected_customizations), 0)
              }
            }
          };
        }

        const newItem = {
          ...item,
          quantity: item.quantity || 1
        };
        
        return {
          stores: {
            ...state.stores,
            [state.currentStore]: {
              ...storeState,
              cartItems: [...storeState.cartItems, newItem],
              totalItems: storeState.totalItems + (newItem.quantity || 1),
              subTotal: storeState.subTotal + calculateItemTotal(
                newItem.price,
                newItem.quantity,
                newItem.selected_customizations
              )
            }
          }
        };
      }),

      updateItemQuantity: (item, quantity) => set((state) => {
        const storeState = state.stores[state.currentStore];
        const updatedItems = storeState.cartItems.map(cartItem => 
          cartItem.id === item.id && 
          JSON.stringify(cartItem.selected_customizations) === JSON.stringify(item.selected_customizations)
            ? { ...cartItem, quantity } 
            : cartItem
        );
        const filteredItems = updatedItems.filter(item => item.quantity > 0);
        
        return {
          stores: {
            ...state.stores,
            [state.currentStore]: {
              ...storeState,
              cartItems: filteredItems,
              totalItems: filteredItems.reduce((total, item) => total + item.quantity, 0),
              subTotal: filteredItems.reduce((total, item) => 
                total + calculateItemTotal(item.price, item.quantity, item.selected_customizations), 0)
            }
          }
        };
      }),

      clearCart: () => set((state) => ({
        stores: {
          ...state.stores,
          [state.currentStore]: {
            ...state.stores[state.currentStore],
            cartItems: [],
            totalItems: 0,
            subTotal: 0
          }
        }
      })),

      setOrderType: (type) => set((state) => ({
        stores: {
          ...state.stores,
          [state.currentStore]: {
            ...state.stores[state.currentStore],
            orderType: type
          }
        }
      })),

      setTableNumber: (number) => set((state) => ({
        stores: {
          ...state.stores,
          [state.currentStore]: {
            ...state.stores[state.currentStore],
            tableNumber: number
          }
        }
      })),

      setTableCode: (code) => set((state) => ({
        stores: {
          ...state.stores,
          [state.currentStore]: {
            ...state.stores[state.currentStore],
            tableCode: code
          }
        }
      })),

      setSearchQuery: (query) => set(() => ({ searchQuery: query })),

      setTaxInfo: (tax_info) => set((state) => ({
        stores: {
          ...state.stores,
          [state.currentStore]: {
            ...state.stores[state.currentStore],
            tax_info: tax_info
          }
        }
      })),

      setOrderStatus: (status) => set((state) => ({
        stores: {
          ...state.stores,
          [state.currentStore]: {
            ...state.stores[state.currentStore],
            orderStatus: status
          }
        }
      })),

      setOrderId: (id) => set((state) => ({
        stores: {
          ...state.stores,
          [state.currentStore]: {
            ...state.stores[state.currentStore],
            orderId: id
          }
        }
      })),

      setOrderNumber: (number) => set((state) => ({
        stores: {
          ...state.stores,
          [state.currentStore]: {
            ...state.stores[state.currentStore],
            orderNumber: number
          }
        }
      })),

      setCurrencySymbol: (currency) => set((state) => ({
        stores: {
          ...state.stores,
          [state.currentStore]: {
            ...state.stores[state.currentStore],
            currencySymbol: getCurrencySymbol(currency)
          }
        }
      }))
    }),
    {
      name: 'cashflow-storage',
      storage: createJSONStorage(() => sessionStorage)
    }
  )
) 