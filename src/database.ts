import { API_URL } from './config'

export interface Store {
  id: string
  name: Record<string, string>
  description: Record<string, string>
  currency: string
  image_url: string
  banner_url: string
  items: any[]
  tables: Array<{ number: number, code: string }>
  tags: Record<string, string[]>
  tax_info: Record<string, any>
  settings: Record<string, any>
  services: Record<string, any>
  store_info: Record<string, any>
}

export interface Table {
  table_number: string
  status: string
  order_id: string
}

export interface Order {
  total_amount: number
  tax_amount: number
  order_items: any[]
  order_number: string
  status: string
  invoice_url: string
  service_fee_surcharge?: number
}

export async function getAllStores(): Promise<Store[]> {
  const CACHE_KEY = 'database-stores'
  const cached = sessionStorage.getItem(CACHE_KEY)
  if (cached) {
    return JSON.parse(cached)
  }

  const response = await fetch(`${API_URL}/stores/`)
  const data = await response.json()
  if (response.ok) {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data.stores))
    return data.stores
  }
  return []
}

export async function getStore(id: string): Promise<Store | null> {
  const CACHE_KEY = `database-store-${id}`
  const cached = sessionStorage.getItem(CACHE_KEY)
  if (cached) {
    return JSON.parse(cached)
  }

  const response = await fetch(`${API_URL}/stores/${id}`)
  const data = await response.json()
  if (response.ok) {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(data))
    return data
  }
  return null
}

export async function getTable(storeId: string, tableCode: string): Promise<Table | null> {
  const response = await fetch(`${API_URL}/tables/${storeId}/${tableCode}`)
  if (!response.ok) {
    return null
  }
  const data = await response.json()
  return data
}

export async function getOrder(storeId: string, orderId: string): Promise<Order | null> {
  const response = await fetch(`${API_URL}/orders_new/${storeId}/${orderId}`)
  if (!response.ok) {
    return null
  }
  const data = await response.json()
  return data
}


