import type {
  DeliveryMethod,
  ItemStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@papelera/shared';

export interface Category {
  id: number;
  name: string;
  sortOrder: number;
  productCount: number;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  unit: string;
  price: number;
  discriminaIva: boolean;
  active: boolean;
  categoryId: number | null;
  category: { id: number; name: string } | null;
  priceCash: number;
  priceTransfer: number;
}

export interface OrderItem {
  id: number;
  productId: number;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  status: ItemStatus;
  lineTotal: number;
}

export interface Order {
  id: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
  scheduledFor: string | null;
  receiptRef: string | null;
  notes: string | null;
  createdAt: string;
  customer: { id: number; phone: string; name: string | null; address: string | null };
  items: OrderItem[];
  subtotal: number;
  total: number;
}

export interface OutboundMessage {
  id: number;
  body: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
}

export interface OrderDetail extends Order {
  messages: OutboundMessage[];
}

export interface Settings {
  businessName: string;
  ivaRate: number;
  transferInfo: string;
  pickupAddress: string;
}
