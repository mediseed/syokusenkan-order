/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BundleItem {
  sku: string;
  quantity: number;
}

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
  leadTime?: number;      // リードタイム (日)
  safetyStock?: number;   // 安全在庫 (個)
  isBundle?: boolean;     // セット商品区分
  bundleItems?: BundleItem[]; // 構成品目
  integrationCode?: string; // 統合コード（例：「azuki」など、複数ブランドのお茶などを集計・統合管理用の一致キー）
  orderUnitKg?: number;     // 発注ロット単位 (kg単位: 例: 20kg)
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

export interface Manufacturer {
  id: string;
  name: string;
  type: '原料' | '製造';
  contactName: string;   // 担当者名
  phone: string;         // 電話番号
  email: string;         // メールアドレス
  fax: string;           // FAX
  notes?: string;        // メモ欄
}

export interface PurchaseOrderItem {
  sku: string;
  productName: string;
  brand: string;
  requestedQty: number;  // 確定発注数量（個）
  weight: number;        // 単品内容量(g)
  orderUnitKg?: number;  // 発注単位 (kg: 例: 20kg単位)
  calculatedWeightKg?: number; // 原料必要重量 (kg)
  adjustedWeightKg?: number;   // 調整後発注キロ数 (kg)
  adjustedQty?: number;        // 調整後発注数量 (個)
  deliveryDate?: string;       // ブランドごと/商品ごとの納期・納品予定日
}

export interface PurchaseOrder {
  id: string;
  groupName: string; // e.g. "【合計】お茶/5月発注"
  orderDate: string;
  scheduledDeliveryDate: string;
  assignedStaff: string;
  status: '発注済' | '検収中/入庫中' | '入庫完了';
  items: PurchaseOrderItem[];
  notes?: string;
}

