import type {
  DeliveryMethod,
  InvoiceSaleStatus,
  ItemStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PurchaseOrderStatus,
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
  /** Precio de transferencia cargado a mano (null = se calcula con IVA) */
  priceTransferFixed: number | null;
  active: boolean;
  needsReview: boolean;
  reviewNote: string | null;
  categoryId: number | null;
  category: { id: number; name: string } | null;
  priceCash: number;
  priceTransfer: number;
}

export interface OrderItem {
  id: number;
  productId: number | null;
  productCode: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  status: ItemStatus;
  availableQuantity: number | null;
  deliveredQuantity: number;
  lineTotal: number;
}

export type ShippingStatus = 'PENDIENTE' | 'GRATIS' | 'CON_COSTO' | 'FUERA_ZONA';

export interface Order {
  id: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  deliveryMethod: DeliveryMethod;
  deliveryAddress: string | null;
  shippingStatus: ShippingStatus | null;
  shippingCost: number;
  scheduledFor: string | null;
  receiptRef: string | null;
  notes: string | null;
  source: 'WHATSAPP' | 'WEB';
  contactName: string | null;
  whatsappConfirmed: boolean;
  createdAt: string;
  customer: { id: number; phone: string; name: string | null; address: string | null };
  items: OrderItem[];
  subtotal: number;
  itemsTotal: number;
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
  minOrderForDelivery: number;
}

export interface Supplier {
  id: number;
  legalName: string;
  email: string | null;
  phone: string | null;
  contactName: string | null;
  createdAt: string;
}

export interface PurchaseOrderItem {
  id: number;
  productId: number | null;
  productCode: string;
  productName: string;
  unit: string;
  quantity: number;
}

export interface PurchaseOrder {
  id: number;
  status: PurchaseOrderStatus;
  supplierId: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  supplier: Pick<Supplier, 'id' | 'legalName' | 'email' | 'phone' | 'contactName'> | null;
  items: PurchaseOrderItem[];
}

export interface InvoiceSaleItem {
  id: number;
  productId: number | null;
  productCode: string;
  productName: string;
  unit: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface InvoiceSale {
  id: number;
  status: InvoiceSaleStatus;
  customerName: string | null;
  customerCuit: string | null;
  note: string | null;
  total: number;
  itemsTotal: number;
  invoicedAt: string | null;
  createdAt: string;
  items: InvoiceSaleItem[];
}
