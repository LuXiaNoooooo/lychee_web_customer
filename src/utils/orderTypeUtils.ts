import { getTable } from '../database';

export interface OrderTypeHandlers {
  setOrderType: (type: 'Not Selected' | 'In-store' | 'Pickup' | 'Delivery') => void;
  setTableNumber: (number: string | null) => void;
  setTableCode: (code: string | null) => void;
  setOrderStatus: (status: string | null) => void;
  setOrderNumber: (number: string | null) => void;
  setOrderId: (id: string | null) => void;
}

export const resetTable = (handlers: Pick<OrderTypeHandlers, 'setTableNumber' | 'setTableCode'>) => {
  handlers.setTableNumber(null);
  handlers.setTableCode(null);
};

export const resetOrder = (handlers: Pick<OrderTypeHandlers, 'setOrderStatus' | 'setOrderNumber' | 'setOrderId'>) => {
  handlers.setOrderStatus(null);
  handlers.setOrderNumber(null);
  handlers.setOrderId(null);
};

export const handleTableCode = async (
  storeId: string,
  tableCode: string,
  store: any,
  handlers: OrderTypeHandlers,
  callbacks: {
    onSuccess: () => void;
    onError: (message: string) => void;
  }
) => {
  try {
    const table = await getTable(storeId, tableCode);
    if (table) {
      handlers.setOrderType('In-store');
      handlers.setTableNumber(table.table_number);
      handlers.setTableCode(tableCode);
      if (table.status === 'Occupied' && store?.settings?.pay_later === true) {
        handlers.setOrderStatus('Pending');
        handlers.setOrderId(table.order_id);
      } else {
        resetOrder(handlers);
      }
      callbacks.onSuccess();
    } else {
      callbacks.onError('store.tableNotFound');
    }
  } catch (error) {
    callbacks.onError('store.errorFetchingTable');
  }
}; 