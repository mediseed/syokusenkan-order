/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ProductMaster {
  sku: string;
  brand: string;
  name: string;
  volume: string;
  weight: number;
  category: 'お茶' | '離乳食' | '化粧品' | 'その他';
  setQuantity: number;
  fbaSku: string;
  rslSku: string;
  scCode: string;
  logiId: string;
  rawMaterialProducer: string;
  fillingParty: string;
  isActive: boolean;
}

export interface InventoryData {
  sku: string; // FBA SKU, Excel商品コード, or SKU
  fbaStock: number;
  rslStock: number;
  scStock: number;
  logiStock: number;
  status: string;
}

export interface SalesData {
  sku: string;
  quantity: number;
  date: string;
}

export interface RecommendedOrder {
  product: ProductMaster;
  fbaStock: number;
  rslStock: number;
  scStock: number;
  logiStock: number;
  totalStock: number;
  monthlySales: number;
  safetyStock: number;
  reorderPoint: number;
  stockDays: number;
  recommendedQty: number;
  priority: '高' | '中' | '低';
  estimatedOutDate: string;
}
