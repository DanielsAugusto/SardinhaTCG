export type MovementType = 'IN' | 'OUT';

export interface Category {
  id: string;
  name: string;
  createdAt: string;
  _count?: { products: number };
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  costPrice: number;
  salePrice: number;
  quantity: number;
  minQuantity: number;
  categoryId: string;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  type: MovementType;
  quantity: number;
  reason: string | null;
  productId: string;
  product?: Pick<Product, 'id' | 'name' | 'sku'> & { quantity?: number };
  createdAt: string;
}

export interface DashboardData {
  totalProducts: number;
  totalItems: number;
  totalCategories: number;
  totalCostValue: number;
  totalSaleValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockProducts: Product[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ProductInput {
  name: string;
  sku: string;
  description: string | null;
  costPrice: number;
  salePrice: number;
  minQuantity: number;
  categoryId: string;
  quantity?: number;
}

export interface MovementInput {
  productId: string;
  type: MovementType;
  quantity: number;
  reason: string | null;
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
}

export type StockStatus = 'normal' | 'low' | 'out';
