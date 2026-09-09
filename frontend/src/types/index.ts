export type Role = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber?: string | null;
  customerType: CustomerType;
  address: string;
  status: CustomerStatus;
  followUpDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  challans?: {
    id: string;
    challanNumber: string;
    status: ChallanStatus;
    totalQuantity: number;
    createdAt: string;
  }[];
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  unitPrice: number | string;
  currentStock: number;
  minStockAlert: number;
  location?: string | null;
  createdAt: string;
  stockLogs?: StockLog[];
}

export type MovementType = 'IN' | 'OUT';

export interface StockLog {
  id: string;
  productId: string;
  quantityChanged: number;
  movementType: MovementType;
  reason: string;
  createdBy: string;
  createdAt: string;
  createdByUser?: {
    id: string;
    name: string;
    role: Role;
  };
}

export type ChallanStatus = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface ChallanItem {
  id: string;
  challanId: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number | string;
  quantity: number;
  product?: Product;
}

export interface Challan {
  id: string;
  challanNumber: string;
  customerId: string;
  customer: Customer;
  status: ChallanStatus;
  totalQuantity: number;
  createdBy: string;
  createdByUser: {
    id: string;
    name: string;
    role: Role;
  };
  createdAt: string;
  items: ChallanItem[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  pagination?: PaginationMeta;
  error?: {
    message: string;
    code?: string;
    details?: any;
  };
}
