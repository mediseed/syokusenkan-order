/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductMaster, InventoryData, SalesData } from '../types';

export const initialProducts: ProductMaster[] = [
  {
    sku: 'azuki',
    brand: '温活農園',
    name: 'あずき茶',
    volume: '4g×40包',
    weight: 160,
    category: 'お茶',
    setQuantity: 1,
    fbaSku: 'azuki-40',
    rslSku: 'RSL-AZUKI-40',
    scCode: '63985-00000002',
    logiId: 'CL-AZUKI-001',
    rawMaterialProducer: '株式会社天草',
    fillingParty: '○○充填',
    isActive: true
  },
  {
    sku: 'azuki-set2',
    brand: '温活農園',
    name: 'あずき茶2個セット',
    volume: '4g×40包×2',
    weight: 320,
    category: 'お茶',
    setQuantity: 2,
    fbaSku: 'azuki-set2',
    rslSku: 'RSL-AZUKI-SET2',
    scCode: '63985-00000050',
    logiId: 'CL-AZUKI-SET2',
    rawMaterialProducer: '株式会社天草',
    fillingParty: '○○充填',
    isActive: true
  },
  {
    sku: 'tanpopo-set3',
    brand: 'ママセレクト',
    name: 'たんぽぽ茶3個セット',
    volume: '2g×30包×3',
    weight: 180,
    category: 'お茶',
    setQuantity: 3,
    fbaSku: 'tanpopo-set3',
    rslSku: 'RSL-TANPOPO-SET3',
    scCode: '63985-00000129',
    logiId: 'CL-TANPOPO-SET3',
    rawMaterialProducer: '株式会社コトブキ',
    fillingParty: '△△充填',
    isActive: true
  },
  {
    sku: 'gobou',
    brand: '大福園',
    name: '国産ごぼう茶',
    volume: '2g×60包',
    weight: 120,
    category: 'お茶',
    setQuantity: 1,
    fbaSku: 'gobou-60',
    rslSku: 'RSL-GOBOU-60',
    scCode: '63985-00000060',
    logiId: 'CL-GOBOU-001',
    rawMaterialProducer: '大福ファーム',
    fillingParty: '大福ファーム充填',
    isActive: true
  },
  {
    sku: 'chamomile',
    brand: 'MEZZO',
    name: 'カモミールハーブティー',
    volume: '1.5g×30包',
    weight: 45,
    category: 'お茶',
    setQuantity: 1,
    fbaSku: 'chamomile-30',
    rslSku: 'RSL-CHAMOMILE-30',
    scCode: '63985-00000085',
    logiId: 'CL-CHAMOMILE-001',
    rawMaterialProducer: 'MEZZOハーブ',
    fillingParty: 'MEZZOパック部',
    isActive: true
  },
  {
    sku: 'baby-soap',
    brand: '色彩農園',
    name: 'オーガニックベビーソープ',
    volume: '250ml',
    weight: 270,
    category: '化粧品',
    setQuantity: 1,
    fbaSku: 'babysoap-250',
    rslSku: 'RSL-BABYSOAP-250',
    scCode: '63985-00000210',
    logiId: 'CL-BABYSOAP-001',
    rawMaterialProducer: '色彩ラボ',
    fillingParty: '色彩ラボパック部',
    isActive: true
  }
];

export const initialInventory: InventoryData[] = [
  {
    sku: 'azuki',
    fbaStock: 500,
    rslStock: 300,
    scStock: 150,
    logiStock: 200,
    status: '在庫あり'
  },
  {
    sku: 'gobou',
    fbaStock: 100,
    rslStock: 50,
    scStock: 25,
    logiStock: 30,
    status: '在庫あり'
  },
  {
    sku: 'azuki-set2',
    fbaStock: 80,
    rslStock: 40,
    scStock: 15,
    logiStock: 20,
    status: '在庫あり'
  },
  {
    sku: 'tanpopo-set3',
    fbaStock: 30,
    rslStock: 10,
    scStock: 5,
    logiStock: 10,
    status: '残りわずか'
  },
  {
    sku: 'chamomile',
    fbaStock: 12,
    rslStock: 5,
    scStock: 2,
    logiStock: 3,
    status: '残りわずか'
  },
  {
    sku: 'baby-soap',
    fbaStock: 220,
    rslStock: 110,
    scStock: 60,
    logiStock: 70,
    status: '在庫あり'
  }
];

// Current local time has been provided as: 2026-05-25T04:05:42Z.
// We'll generate transactions within the 30 days prior (2026-04-25 to 2026-05-24)
export const initialSales: SalesData[] = [
  // azuki (setQuantity: 1) - Total direct sales over 30 days: ~180 units
  { sku: 'azuki', quantity: 15, date: '2026-04-26' },
  { sku: 'azuki', quantity: 20, date: '2026-04-30' },
  { sku: 'azuki', quantity: 25, date: '2026-05-05' },
  { sku: 'azuki', quantity: 30, date: '2026-05-10' },
  { sku: 'azuki', quantity: 40, date: '2026-05-15' },
  { sku: 'azuki', quantity: 50, date: '2026-05-22' },

  // azuki-set2 (setQuantity: 2) - Sales count: 32 packs => 32 * 2 = 64 items
  { sku: 'azuki-set2', quantity: 5, date: '2026-04-28' },
  { sku: 'azuki-set2', quantity: 8, date: '2026-05-03' },
  { sku: 'azuki-set2', quantity: 7, date: '2026-05-09' },
  { sku: 'azuki-set2', quantity: 12, date: '2026-05-18' },

  // tanpopo-set3 (setQuantity: 3) - Sales count: 18 packs => 18 * 3 = 54 items
  { sku: 'tanpopo-set3', quantity: 3, date: '2026-04-27' },
  { sku: 'tanpopo-set3', quantity: 4, date: '2026-05-02' },
  { sku: 'tanpopo-set3', quantity: 5, date: '2026-05-12' },
  { sku: 'tanpopo-set3', quantity: 6, date: '2026-05-20' },

  // gobou (setQuantity: 1) - Total sales: 120 units
  { sku: 'gobou', quantity: 15, date: '2026-04-25' },
  { sku: 'gobou', quantity: 25, date: '2026-05-01' },
  { sku: 'gobou', quantity: 35, date: '2026-05-10' },
  { sku: 'gobou', quantity: 45, date: '2026-05-20' },

  // chamomile (setQuantity: 1) - Total sales: 42 units (Current Stock is 20 => high priority out-of-stock risk!)
  { sku: 'chamomile', quantity: 10, date: '2026-04-29' },
  { sku: 'chamomile', quantity: 12, date: '2026-05-04' },
  { sku: 'chamomile', quantity: 15, date: '2026-05-14' },
  { sku: 'chamomile', quantity: 5, date: '2026-05-23' },

  // baby-soap (setQuantity: 1) - Total sales: 110 units
  { sku: 'baby-soap', quantity: 20, date: '2026-04-28' },
  { sku: 'baby-soap', quantity: 30, date: '2026-05-05' },
  { sku: 'baby-soap', quantity: 40, date: '2026-05-15' },
  { sku: 'baby-soap', quantity: 20, date: '2026-05-22' }
];

export const BRANDS = ['温活農園', 'ママセレクト', '大福園', 'MEZZO', '色彩農園', '美健工房', 'アメリカ'];
export const CATEGORIES = ['お茶', '離乳食', '化粧品', 'その他'];

