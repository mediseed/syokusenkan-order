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
    integrationCode: 'azuki',
    isActive: true
  },
  {
    sku: 'azuki-daifuku',
    brand: '大福園',
    name: 'あずき茶',
    volume: '4g×40包',
    weight: 160,
    category: 'お茶',
    setQuantity: 1,
    fbaSku: 'daifuku-azuki-40',
    rslSku: 'RSL-DAIFUKU-AZUKI-40',
    scCode: '63985-00000005',
    logiId: 'CL-DAIFUKU-AZUKI',
    rawMaterialProducer: '大福ファーム',
    fillingParty: '大福ファーム充填',
    integrationCode: 'azuki',
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
  },
  {
    sku: 'potato-pw',
    brand: 'ママセレクト',
    name: 'じゃがいもパウダー',
    volume: '100g',
    weight: 100,
    category: '離乳食',
    setQuantity: 1,
    fbaSku: 'potato-pw-100',
    rslSku: 'RSL-POTATO-PW',
    scCode: '63985-00000300',
    logiId: 'CL-POTATO-PW',
    rawMaterialProducer: '北海道野菜ラボ',
    fillingParty: '北海道野菜工場',
    isActive: true
  },
  {
    sku: 'spinach-pw',
    brand: 'ママセレクト',
    name: 'ほうれん草パウダー',
    volume: '100g',
    weight: 100,
    category: '離乳食',
    setQuantity: 1,
    fbaSku: 'spinach-pw-100',
    rslSku: 'RSL-SPINACH-PW',
    scCode: '63985-00000301',
    logiId: 'CL-SPINACH-PW',
    rawMaterialProducer: '九州高地有機',
    fillingParty: '九州パッケージ部',
    isActive: true
  },
  {
    sku: 'pumpkin-pw',
    brand: 'ママセレクト',
    name: 'かぼちゃパウダー',
    volume: '100g',
    weight: 100,
    category: '離乳食',
    setQuantity: 1,
    fbaSku: 'pumpkin-pw-100',
    rslSku: 'RSL-PUMPKIN-PW',
    scCode: '63985-00000302',
    logiId: 'CL-PUMPKIN-PW',
    rawMaterialProducer: '北海道野菜ラボ',
    fillingParty: '北海道野菜工場',
    isActive: true
  },
  {
    sku: 'corn-pw',
    brand: 'ママセレクト',
    name: 'コーンパウダー',
    volume: '100g',
    weight: 100,
    category: '離乳食',
    setQuantity: 1,
    fbaSku: 'corn-pw-100',
    rslSku: 'RSL-CORN-PW',
    scCode: '63985-00000303',
    logiId: 'CL-CORN-PW',
    rawMaterialProducer: '宮崎あおぞら農園',
    fillingParty: '宮崎パッキング',
    isActive: true
  },
  {
    sku: 'flake-4',
    brand: 'ママセレクト',
    name: '四袋セット (flake-4)',
    volume: '4種セット',
    weight: 400,
    category: '離乳食',
    setQuantity: 1,
    fbaSku: 'flake-4-set',
    rslSku: 'RSL-FLAKE-4',
    scCode: '63985-00000304',
    logiId: 'CL-FLAKE-4',
    rawMaterialProducer: 'ママセレクトブレンド',
    fillingParty: '○○充填ライン',
    isBundle: true,
    bundleItems: [
      { sku: 'potato-pw', quantity: 4 },
      { sku: 'spinach-pw', quantity: 1 },
      { sku: 'pumpkin-pw', quantity: 1 },
      { sku: 'corn-pw', quantity: 1 }
    ],
    isActive: true
  },
  {
    sku: 'yasai-4',
    brand: 'ママセレクト',
    name: '四袋セット (yasai-4)',
    volume: '3種4袋セット',
    weight: 400,
    category: '離乳食',
    setQuantity: 1,
    fbaSku: 'yasai-4-set',
    rslSku: 'RSL-YASAI-4',
    scCode: '63985-00000305',
    logiId: 'CL-YASAI-4',
    rawMaterialProducer: 'ママセレクトブレンド',
    fillingParty: '○○充填ライン',
    isBundle: true,
    bundleItems: [
      { sku: 'potato-pw', quantity: 2 },
      { sku: 'pumpkin-pw', quantity: 1 },
      { sku: 'corn-pw', quantity: 1 }
    ],
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
    sku: 'azuki-daifuku',
    fbaStock: 120,
    rslStock: 80,
    scStock: 40,
    logiStock: 50,
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
  },
  {
    sku: 'potato-pw',
    fbaStock: 120,
    rslStock: 60,
    scStock: 20,
    logiStock: 30,
    status: '在庫あり'
  },
  {
    sku: 'spinach-pw',
    fbaStock: 40,
    rslStock: 20,
    scStock: 10,
    logiStock: 15,
    status: '在庫あり'
  },
  {
    sku: 'pumpkin-pw',
    fbaStock: 50,
    rslStock: 25,
    scStock: 12,
    logiStock: 18,
    status: '在庫あり'
  },
  {
    sku: 'corn-pw',
    fbaStock: 80,
    rslStock: 40,
    scStock: 15,
    logiStock: 20,
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
  { sku: 'baby-soap', quantity: 20, date: '2026-05-22' },

  // flake-4 sales
  { sku: 'flake-4', quantity: 4, date: '2026-05-02' },
  { sku: 'flake-4', quantity: 6, date: '2026-05-12' },
  { sku: 'flake-4', quantity: 5, date: '2026-05-20' },

  // yasai-4 sales
  { sku: 'yasai-4', quantity: 5, date: '2026-05-05' },
  { sku: 'yasai-4', quantity: 7, date: '2026-05-15' }
];

export const BRANDS = ['温活農園', 'ママセレクト', '大福園', 'MEZZO', '色彩農園', '美健工房', 'アメリカ'];
export const CATEGORIES = ['お茶', '離乳食', '化粧品', 'その他'];

import { Manufacturer } from '../types';

export const initialManufacturers: Manufacturer[] = [
  // 原料メーカー
  { id: 'm-raw-1', name: '丸菱', type: '原料', contactName: '鈴木 雅史', phone: '06-6123-4567', email: 'marubishi-sales@example.com', fax: '06-6123-4568', notes: '有機ルイボス茶、カモミールなどのハーブ原料一括仕入れ対応可能' },
  { id: 'm-raw-2', name: 'ファイナール', type: '原料', contactName: '田中 健司', phone: '03-5123-9911', email: 'finall-material@example.com', fax: '03-5123-9912', notes: '和漢植物原料エキス、各種パウダー加工が得意' },
  { id: 'm-raw-3', name: 'ルイボス・リミテッド', type: '原料', contactName: 'ピーター・スミス', phone: '050-9876-5432', email: 'rooibos-limited@example.com', fax: '052-123-4567', notes: '南アフリカ直輸入オーガニックルイボス原料サプライヤー日本窓口' },
  { id: 'm-raw-4', name: '山商', type: '原料', contactName: '山田 太郎', phone: '082-234-5678', email: 'yamasho-tea@example.com', fax: '082-234-5679', notes: 'ハトムギ茶、あずき茶の選別・焙煎原料' },
  { id: 'm-raw-5', name: '甲修園', type: '原料', contactName: '松本 一郎', phone: '075-841-1152', email: 'koshuen-raw@example.com', fax: '075-841-1153', notes: '国内産茶葉・黒豆・桑の葉の専門原料商' },
  { id: 'm-raw-6', name: 'クレインバレー', type: '原料', contactName: '鶴谷 俊雄', phone: '011-733-8899', email: 'crane-valley@example.com', fax: '011-733-8800', notes: '北海道大麦茶、トウモロコシ原料の乾燥バルク' },
  { id: 'm-raw-7', name: 'カネカサンスパイス', type: '原料', contactName: '大野 直樹', phone: '06-6330-1010', email: 'kaneka-sunspice@example.com', fax: '06-6330-1011', notes: 'ショウガパウダー、ジンジャー・スパイス系お茶原料' },
  { id: 'm-raw-8', name: 'グリムクローバー', type: '原料', contactName: 'クローバー 紗季', phone: '092-411-2233', email: 'grimm-clover@example.com', fax: '092-411-2234', notes: '西洋ハーブ（ペパーミント、ローズヒップ等）有機認証品得意' },
  { id: 'm-raw-9', name: 'あさの', type: '原料', contactName: '浅野 公介', phone: '054-255-0101', email: 'asano-shizuoka@example.com', fax: '054-255-0102', notes: '静岡緑茶・煎茶、深蒸し緑茶各種原料のブレンド・供給' },

  // 製造メーカー (ティーパック加工、充填)
  { id: 'm-proc-1', name: 'ティーパック加工センター', type: '製造', contactName: '長谷川 浩', phone: '027-310-0909', email: 'tpack-factory@example.com', fax: '027-310-0910', notes: '平袋、三角テトラパック加工対応。大型シュリンク装置あり' },
  { id: 'm-proc-2', name: '甲修園', type: '製造', contactName: '中西 啓介', phone: '075-841-1255', email: 'koshuen-factory@example.com', fax: '075-841-1256', notes: 'お茶の仕上げ焙煎から袋詰めまでの一貫OEM製造ライン' },
  { id: 'm-proc-3', name: '食の天草にじ', type: '製造', contactName: '天草 昭三', phone: '0969-23-1515', email: 'nijiamakusa@example.com', fax: '0969-23-1516', notes: '九州熊本工場。自然健康茶、粉末緑茶スタンドパック充填委託先' },
  { id: 'm-proc-4', name: 'ファイナール', type: '製造', contactName: '加藤 博之', phone: '03-5123-9955', email: 'finall-factory@example.com', fax: '03-5123-9956', notes: 'GMP準拠サプリメント・スパウト包装・ティーパック加工工場' }
];


