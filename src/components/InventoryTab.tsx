/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ArrowUpDown, Download, CheckCircle, AlertTriangle, HelpCircle, Plus, Truck, Calendar, User, FileText, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { ProductMaster, InventoryData, SalesData, PurchaseOrder } from '../types';
import { BRANDS } from '../data/mockData';
import { findInventoryForProduct, calculateProductMonthlySales, exportToCSV } from '../utils/calculations';

interface InventoryTabProps {
  products: ProductMaster[];
  inventoryList: InventoryData[];
  salesList: SalesData[];
  orders: PurchaseOrder[];
  onAddOrder: (order: PurchaseOrder) => void;
  onUpdateOrder: (order: PurchaseOrder) => void;
  uploadTimestamps?: Record<string, string>;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function InventoryTab({
  products,
  inventoryList,
  salesList,
  orders = [],
  onAddOrder,
  onUpdateOrder,
  uploadTimestamps,
  addToast
}: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedStockLevel, setSelectedStockLevel] = useState<'all' | 'critical' | 'healthy'>('all');
  const [viewMode, setViewMode] = useState<'individual' | 'brand_integrated'>('brand_integrated'); // Default to brand_integrated to highlight the integration feature!
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  // Quick Order Modal States
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [selectedProductForOrder, setSelectedProductForOrder] = useState<ProductMaster | null>(null);
  const [quickOrderQty, setQuickOrderQty] = useState<number>(100);
  const [quickOrderDelivDate, setQuickOrderDelivDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // Default 14 days lead time
    return d.toISOString().split('T')[0];
  });
  const [quickOrderGroupName, setQuickOrderGroupName] = useState('');
  const [quickOrderNotes, setQuickOrderNotes] = useState('');
  const [quickOrderStaff, setQuickOrderStaff] = useState('佐藤 拓也');
  const [quickOrderStatus, setQuickOrderStatus] = useState<'発注済' | '検収中/入庫中'>('発注済');

  // Sorting
  const [sortField, setSortField] = useState<'sku' | 'name' | 'fbaStock' | 'rslStock' | 'scStock' | 'logiStock' | 'totalStock' | 'ratio' | 'pending' | 'monthlySales' | 'safetyStock' | 'reorderPoint' | 'stockDays' | 'estimatedOutDate'>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Compile calculations for each row
  const computedRows = products.map((product) => {
    // 倉庫データの元の実アップロード在庫 (自動計算を通さずそのまま参照)
    const inv = findInventoryForProduct(product, inventoryList);
    let fba = inv.fbaStock;
    let rsl = inv.rslStock;
    let sc = inv.scStock;
    let logi = inv.logiStock;

    let monthlySales = calculateProductMonthlySales(product, salesList);

    const isParentInIntegration = !!(product.isBundle && product.bundleItems && product.bundleItems.length > 0);

    // 自分自身が子供（構成単品）である場合、どの親商品に属しているか
    const parentProducts = products.filter(
      (p) => p.isBundle && p.bundleItems?.some((item) => item.sku.toLowerCase() === product.sku.toLowerCase())
    );

    const integrationBreakdown: { name: string; sku: string; qty: number; fba: number; rsl: number; sc: number; logi: number }[] = [];

    // 元々の実在庫を記録
    const rawFba = inv.fbaStock;
    const rawRsl = inv.rslStock;
    const rawSc = inv.scStock;
    const rawLogi = inv.logiStock;

    // 単品自体の手配中（未入庫。ステータスが '発注済' または '検収中/入庫中' のもの）
    let pendingQty = 0;
    const pendingOrders = (orders || []).filter(o => o.status === '発注済' || o.status === '検収中/入庫中');
    
    pendingOrders.forEach(order => {
      const matchItem = order.items.find(it => it.sku.toLowerCase() === product.sku.toLowerCase());
      if (matchItem) {
        pendingQty += matchItem.requestedQty;
      }
    });

    const rawPendingQty = pendingQty;

    // 手配中発注の詳細リスト
    const pendingDetails: { orderId: string; groupName: string; qty: number; deliveryDate: string; status: string }[] = [];
    pendingOrders.forEach(order => {
      const matchItem = order.items.find(it => it.sku.toLowerCase() === product.sku.toLowerCase());
      if (matchItem) {
        pendingDetails.push({
          orderId: order.id,
          groupName: order.groupName,
          qty: matchItem.requestedQty,
          deliveryDate: matchItem.deliveryDate || order.scheduledDeliveryDate,
          status: order.status
        });
      }
    });

    if (viewMode === 'brand_integrated') {
      if (!isParentInIntegration) {
        // 自分が子、または独立商品である場合。自分自身をブレイクダウンに記録
        integrationBreakdown.push({
          name: '単品実在庫',
          sku: product.sku,
          qty: 1,
          fba: rawFba,
          rsl: rawRsl,
          sc: rawSc,
          logi: rawLogi
        });

        // 属している親商品の在庫を、子単品の必要個数倍(quantity)した実数を自分に合算する
        parentProducts.forEach((parent) => {
          const parentInv = findInventoryForProduct(parent, inventoryList);
          const link = parent.bundleItems?.find((item) => item.sku.toLowerCase() === product.sku.toLowerCase());
          const qty = link ? link.quantity : 1;

          fba += parentInv.fbaStock * qty;
          rsl += parentInv.rslStock * qty;
          sc += parentInv.scStock * qty;
          logi += parentInv.logiStock * qty;

          // 親商品の月間販売数（P.setQuantity倍されている）も合算
          const parentSales = calculateProductMonthlySales(parent, salesList);
          monthlySales += parentSales;

          // 親商品の手配中数量（親の発注残 * quantity）も合算
          let parentPending = 0;
          pendingOrders.forEach(order => {
            const matchItem = order.items.find(it => it.sku.toLowerCase() === parent.sku.toLowerCase());
            if (matchItem) {
              parentPending += matchItem.requestedQty;
              
              pendingDetails.push({
                orderId: order.id,
                groupName: `${order.groupName}（${parent.name}経由）`,
                qty: matchItem.requestedQty * qty,
                deliveryDate: matchItem.deliveryDate || order.scheduledDeliveryDate,
                status: order.status
              });
            }
          });
          pendingQty += parentPending * qty;

          integrationBreakdown.push({
            name: parent.name,
            sku: parent.sku,
            qty: qty,
            fba: parentInv.fbaStock,
            rsl: parentInv.rslStock,
            sc: parentInv.scStock,
            logi: parentInv.logiStock
          });
        });
      }
    }

    const totalStock = fba + rsl + sc + logi;

    // 高機能な安全在庫、発注点、在庫日数、在庫切れ予想日計算
    const averageDailySales = monthlySales / 30;
    const leadTime = typeof product.leadTime === 'number' ? product.leadTime : 14;

    const safetyStock = product.isBundle ? 0 : (typeof product.safetyStock === 'number' ? product.safetyStock : Math.round(averageDailySales * 7));
    const reorderPoint = product.isBundle ? 0 : Math.round((averageDailySales * leadTime) + safetyStock);

    let stockDays = 9999;
    if (!product.isBundle && monthlySales > 0) {
      stockDays = Math.round((totalStock / monthlySales) * 30);
    }

    let estimatedOutDate = product.isBundle ? '対象外' : '安定';
    if (!product.isBundle && monthlySales > 0) {
      const date = new Date('2026-05-25');
      date.setDate(date.getDate() + stockDays);
      estimatedOutDate = date.toISOString().split('T')[0];
    }

    // Stock ratio
    const ratio = !product.isBundle && reorderPoint > 0 ? (totalStock / reorderPoint) : (totalStock > 0 ? 99 : 0);
    const isCritical = !product.isBundle && totalStock <= reorderPoint;

    return {
      product,
      inventoryRecord: inv,
      fba,
      rsl,
      sc,
      logi,
      totalStock,
      monthlySales,
      safetyStock,
      reorderPoint,
      stockDays,
      estimatedOutDate,
      ratio,
      isCritical,
      isParentInIntegration,
      integrationBreakdown,
      rawFba,
      rawRsl,
      rawSc,
      rawLogi,
      pendingQty,
      rawPendingQty,
      pendingDetails
    };
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // CSV export
  const handleExportCSV = () => {
    const headers = [
      'SKU', 'ブランド', '商品名', 'FBA在庫', 'RSL在庫', 'SC在庫', 'ロジ在庫', 'トータル在庫', '発注残（手配中）', '月間販売数', '安全在庫', '発注点', '在庫日数', '在庫切れ予想日', '比率', 'ステータス'
    ];
    
    const rows = sortedRows.map(r => {
      let displayName = r.product.name;
      if (viewMode === 'brand_integrated' && r.integrationBreakdown && r.integrationBreakdown.length > 1) {
        const parts = r.integrationBreakdown.reduce((acc, curr) => {
          const cleaned = curr.name === '単品実在庫' ? r.product.name : curr.name;
          if (acc.includes(cleaned)) return acc;
          return [...acc, cleaned];
        }, [] as string[]);
        displayName = `${r.product.name}（${parts.join('＋')}）`;
      }

      return [
        r.product.sku,
        r.product.brand,
        displayName,
        r.fba.toString(),
        r.rsl.toString(),
        r.sc.toString(),
        r.logi.toString(),
        r.totalStock.toString(),
        r.pendingQty.toString(),
        r.monthlySales.toString(),
        r.product.isBundle ? '-' : r.safetyStock.toString(),
        r.product.isBundle ? '-' : r.reorderPoint.toString(),
        r.product.isBundle ? '-' : (r.stockDays >= 9999 ? '999+' : `${r.stockDays}日`),
        r.product.isBundle ? '-' : r.estimatedOutDate,
        r.product.isBundle ? '-' : (r.reorderPoint > 0 ? `${Math.round(r.ratio * 100)}%` : '安定'),
        r.product.isBundle ? '-' : (r.isCritical ? '要発注' : '適正在庫')
      ];
    });

    exportToCSV(headers, rows, 'inventory_report_export.csv');
    addToast('在庫一覧CSVを書き出しました', 'success');
  };

  // Filter application
  const filteredRows = computedRows.filter((row) => {
    // 統合マスタビューONの時、セット商品（親）は単品の行に合算されるため一覧からは除く
    if (viewMode === 'brand_integrated' && row.isParentInIntegration) {
      return false;
    }

    const matchSearch =
      row.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (row.product.fbaSku && row.product.fbaSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.product.rslSku && row.product.rslSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.product.scCode && row.product.scCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.product.logiId && row.product.logiId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchBrand = selectedBrand === '' || row.product.brand === selectedBrand;

    let matchLevel = true;
    if (selectedStockLevel === 'critical') matchLevel = row.isCritical;
    else if (selectedStockLevel === 'healthy') matchLevel = !row.isCritical;

    return matchSearch && matchBrand && matchLevel;
  });

  // Sort Application
  const sortedRows = [...filteredRows].sort((a, b) => {
    let valA: any;
    let valB: any;

    if (sortField === 'sku') {
      valA = a.product.sku;
      valB = b.product.sku;
    } else if (sortField === 'name') {
      valA = a.product.name;
      valB = b.product.name;
    } else if (sortField === 'fbaStock') {
      valA = a.fba;
      valB = b.fba;
    } else if (sortField === 'rslStock') {
      valA = a.rsl;
      valB = b.rsl;
    } else if (sortField === 'scStock') {
      valA = a.sc;
      valB = b.sc;
    } else if (sortField === 'logiStock') {
      valA = a.logi;
      valB = b.logi;
    } else if (sortField === 'totalStock') {
      valA = a.totalStock;
      valB = b.totalStock;
    } else if (sortField === 'ratio') {
      valA = a.ratio;
      valB = b.ratio;
    } else if (sortField === 'pending') {
      valA = a.pendingQty;
      valB = b.pendingQty;
    } else if (sortField === 'monthlySales') {
      valA = a.monthlySales;
      valB = b.monthlySales;
    } else if (sortField === 'safetyStock') {
      valA = a.safetyStock;
      valB = b.safetyStock;
    } else if (sortField === 'reorderPoint') {
      valA = a.reorderPoint;
      valB = b.reorderPoint;
    } else if (sortField === 'stockDays') {
      valA = a.stockDays;
      valB = b.stockDays;
    } else if (sortField === 'estimatedOutDate') {
      valA = a.estimatedOutDate;
      valB = b.estimatedOutDate;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDirection === 'asc' ? (valA - valB) : (valB - valA);
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedRows.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRows = sortedRows.slice(startIndex, startIndex + itemsPerPage);

  // ブランド別のマスタ統合グループ（検索やブランド・在庫状況フィルタが適用された状態の
  // filteredRows から、ブランド別に集約します。これにより各フィルタとリアルタイムに連動します）
  const getBrandGroups = () => {
    const groups: Record<string, typeof computedRows> = {};
    
    filteredRows.forEach((row) => {
      const brand = row.product.brand || 'その他';
      if (!groups[brand]) {
        groups[brand] = [];
      }
      groups[brand].push(row);
    });

    return Object.entries(groups).map(([brandName, rows]) => {
      const totalStock = rows.reduce((acc, r) => acc + r.totalStock, 0);
      const monthlySales = rows.reduce((acc, r) => acc + r.monthlySales, 0);
      const reorderPoint = rows.reduce((acc, r) => acc + r.reorderPoint, 0);
      const fbaSum = rows.reduce((acc, r) => acc + r.fba, 0);
      const rslSum = rows.reduce((acc, r) => acc + r.rsl, 0);
      const scSum = rows.reduce((acc, r) => acc + r.sc, 0);
      const logiSum = rows.reduce((acc, r) => acc + r.logi, 0);
      const ratio = reorderPoint > 0 ? (totalStock / reorderPoint) : (totalStock > 0 ? 99 : 0);
      const isCritical = totalStock <= reorderPoint;
      const criticalCount = rows.filter(r => r.isCritical).length;

      // 親（Bundle）を優先しつつ並べる
      const sortedRowsInBrand = [...rows].sort((a, b) => {
        // isBundle（親）を上に配置。次にSKU順
        if (a.product.isBundle && !b.product.isBundle) return -1;
        if (!a.product.isBundle && b.product.isBundle) return 1;
        return a.product.sku.localeCompare(b.product.sku);
      });

      return {
        brandName,
        rows: sortedRowsInBrand,
        fbaSum,
        rslSum,
        scSum,
        logiSum,
        totalStock,
        monthlySales,
        reorderPoint,
        ratio,
        isCritical,
        criticalCount
      };
    });
  };

  const brandGroups = getBrandGroups();

  const toggleBrand = (brandName: string) => {
    setExpandedBrands(prev => ({
      ...prev,
      [brandName]: prev[brandName] === false ? true : false // デフォルトは展開
    }));
  };

  const handleSaveQuickOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForOrder) return;

    if (quickOrderQty <= 0) {
      addToast('発注数量は1以上の数値を入力してください。', 'error');
      return;
    }

    const newOrder: PurchaseOrder = {
      id: `PO-ADD-${Date.now().toString().substring(6)}`,
      groupName: quickOrderGroupName || `【自社手配】${selectedProductForOrder.name} / ${new Date().toISOString().split('T')[0]}`,
      orderDate: new Date().toISOString().split('T')[0],
      scheduledDeliveryDate: quickOrderDelivDate,
      assignedStaff: quickOrderStaff || '佐藤 拓也',
      status: quickOrderStatus,
      items: [
        {
          sku: selectedProductForOrder.sku,
          productName: selectedProductForOrder.name,
          brand: selectedProductForOrder.brand,
          requestedQty: quickOrderQty,
          weight: selectedProductForOrder.weight || 165,
          orderUnitKg: selectedProductForOrder.orderUnitKg,
          calculatedWeightKg: Math.round(((quickOrderQty * (selectedProductForOrder.weight || 165)) / 1000) * 10) / 10,
          adjustedWeightKg: Math.round(((quickOrderQty * (selectedProductForOrder.weight || 165)) / 1000) * 10) / 10,
          adjustedQty: quickOrderQty,
          deliveryDate: quickOrderDelivDate
        }
      ],
      notes: quickOrderNotes || '在庫一覧からの個別即時手配。'
    };

    onAddOrder(newOrder);
    setIsQuickOrderOpen(false);
    addToast(`${selectedProductForOrder.name} の手配状況 (数量: ${quickOrderQty.toLocaleString()}個) を追加しました！`, 'success');

    // リセット
    setSelectedProductForOrder(null);
    setQuickOrderNotes('');
  };

  return (
    <div className="space-y-4">
      {/* 倉庫別データ最終アップロード一覧 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-md">
        {[
          { name: 'FBA 在庫 (Amazon)', key: 'fba', color: 'border-amber-500/10 text-amber-400 bg-amber-950/10' },
          { name: 'RSL 在庫 (楽天)', key: 'rsl', color: 'border-rose-500/10 text-rose-400 bg-rose-950/10' },
          { name: 'SC 在庫 (ショップチャンネル)', key: 'sc', color: 'border-cyan-500/10 text-cyan-400 bg-cyan-950/10' },
          { name: 'ロジ 在庫 (クラウドロジ)', key: 'logi', color: 'border-indigo-500/10 text-indigo-400 bg-indigo-950/10' }
        ].map(wh => {
          const time = uploadTimestamps?.[wh.key] || '未登録';
          return (
            <div key={wh.key} className={`border p-3 rounded-lg flex flex-col justify-between gap-1.5 ${wh.color}`}>
              <span className="text-[10px] font-bold tracking-wider opacity-80 uppercase font-mono">{wh.name}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${time !== '未登録' ? 'bg-emerald-500 animate-ping' : 'bg-slate-600'}`}></span>
                <span className="text-[11px] font-mono font-bold text-slate-200">
                  {time !== '未登録' ? `${time} 更新` : '未アップロード'}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 表示モード選択セグメンテッドコントロール */}
      <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800/80 self-start w-full md:w-fit gap-1 shadow-inner backdrop-blur-sm">
        <button
          onClick={() => setViewMode('brand_integrated')}
          className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            viewMode === 'brand_integrated'
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/15'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <span className="text-sm">🔗</span>
          <span>ブランドマスタ統合ビュー</span>
        </button>
        <button
          onClick={() => setViewMode('individual')}
          className={`flex-1 md:flex-none px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            viewMode === 'individual'
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/15'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
          }`}
        >
          <span className="text-sm">🗂️</span>
          <span>個別商品 (SKU単位)</span>
        </button>
      </div>

      {/* Search Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="商品名、SKU、各種連携コードで在庫を検索..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Filters Panel */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Brand select */}
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
          >
            <option value="">すべてのブランド</option>
            {BRANDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Stock state filter dropdown */}
          <select
            value={selectedStockLevel}
            onChange={(e) => {
              setSelectedStockLevel(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">すべての在庫状況</option>
            <option value="critical">要発注（発注点以下）</option>
            <option value="healthy">適正在庫のみ</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>出力</span>
          </button>
        </div>
      </div>

      {/* Grid Table Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-300">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800/80">
              <tr>
                <th onClick={() => handleSort('sku')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 select-none">
                  <div className="flex items-center gap-1">
                    SKU <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('name')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 select-none">
                  <div className="flex items-center gap-1">
                    商品名（ブランド） <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('fbaStock')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    FBA在庫 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('rslStock')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    RSL在庫 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('scStock')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    SC在庫 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('logiStock')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    ロジ在庫 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('totalStock')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1 bg-slate-950/40">
                    現在庫 <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('monthlySales')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    月間販売数 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('safetyStock')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    安全在庫 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('reorderPoint')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    発注点 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('stockDays')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    在庫日数 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('estimatedOutDate')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    在庫切れ予想日 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('pending')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    手配中(発注残) <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('ratio')} className="py-3.5 px-5 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-left select-none max-w-xs">
                  <div className="flex items-center gap-1">
                    在庫充足率（現在庫 / 発注点） <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold tracking-wider text-right">状態</th>
                <th className="py-3.5 px-4 font-semibold tracking-wider text-center">手配操作</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={16} className="py-12 text-center text-slate-500 font-medium">
                    一致する在庫情報が見つかりませんでした。
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  // Percentage limits for progress bars
                  const displayPercent = row.reorderPoint > 0 
                    ? Math.round(row.ratio * 100) 
                    : (row.totalStock > 0 ? 100 : 0);
                  
                  const barWidth = Math.min(Math.max(displayPercent, 0), 100);

                  return (
                    <tr key={row.product.sku} className="hover:bg-slate-850/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-100">{row.product.sku}</td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-slate-200 flex items-center gap-1.5 flex-wrap">
                            {viewMode === 'brand_integrated' && row.integrationBreakdown && row.integrationBreakdown.length > 1 ? (
                              <span>
                                {row.product.name}（
                                {row.integrationBreakdown
                                  .reduce((acc, curr) => {
                                    const cleaned = curr.name === '単品実在庫' ? row.product.name : curr.name;
                                    if (acc.includes(cleaned)) return acc;
                                    return [...acc, cleaned];
                                  }, [] as string[])
                                  .join('＋')}
                                ）
                              </span>
                            ) : (
                              <span>{row.product.name}</span>
                            )}
                            {row.product.isBundle && (
                              <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/60 text-[8px] font-bold px-1.5 py-0.2 rounded">セット自動計算</span>
                            )}
                            {row.product.integrationCode && (
                              <span className="bg-indigo-950 text-indigo-300 border border-indigo-900/50 text-[8px] font-bold px-1.5 py-0.2 rounded">🔗 統合: {row.product.integrationCode}</span>
                            )}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">{row.product.brand}</span>
                            {row.product.setQuantity > 1 && (
                              <span className="bg-amber-950/60 text-amber-400 border border-amber-900/50 text-[9px] px-1 rounded-sm font-bold">
                                セット数 ×{row.product.setQuantity}
                              </span>
                            )}
                          </div>
                          
                          {/* Brand Integration Breakdown Panel */}
                          {viewMode === 'brand_integrated' && row.integrationBreakdown && row.integrationBreakdown.length > 1 && (
                            <div className="mt-1.5 space-y-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedDetails(prev => ({
                                    ...prev,
                                    [row.product.sku]: !prev[row.product.sku]
                                  }));
                                }}
                                className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-400 bg-indigo-950/40 hover:bg-indigo-900/30 border border-indigo-900/40 px-2 py-0.5 rounded cursor-pointer transition-all active:scale-95"
                              >
                                {expandedDetails[row.product.sku] ? (
                                  <>
                                    <ChevronUp className="w-3 h-3" />
                                    <span>合算内訳を閉じる</span>
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="w-3 h-3" />
                                    <span>合算内訳を表示 ({row.integrationBreakdown.length}点)</span>
                                  </>
                                )}
                              </button>

                              {expandedDetails[row.product.sku] && (
                                <div className="bg-slate-950/70 p-2 border border-slate-800 text-[10px] rounded-lg space-y-1 max-w-sm shadow-inner transition-all animate-in fade-in duration-100">
                                  <span className="block text-[8px] font-semibold text-indigo-400 uppercase tracking-wider">
                                    🔗 ブランドマスタ統合・合算内訳（単品数換算）:
                                  </span>
                                  <div className="space-y-1 divide-y divide-slate-850/50">
                                    {row.integrationBreakdown.map((item, idx) => {
                                      const itemTotal = item.fba + item.rsl + item.sc + item.logi;
                                      const itemUnifiedTotal = itemTotal * item.qty;
                                      return (
                                        <div key={idx} className="flex justify-between items-center text-[9px] text-slate-400 pt-1 first:pt-0">
                                          <span className="truncate max-w-[170px] text-slate-350" title={item.name}>
                                            {item.name} {item.qty > 1 && <span className="text-[8px] px-1 bg-amber-950 text-amber-400 border border-amber-900/50 font-bold rounded">×{item.qty}</span>}
                                          </span>
                                          <span className="font-mono text-right text-slate-300">
                                            実数:{itemTotal} &rarr; <span className="text-white font-bold">{itemUnifiedTotal}袋</span>
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {row.product.isBundle && row.product.bundleItems && row.product.bundleItems.length > 0 && (
                            <div className="mt-1 bg-slate-950/40 p-1.5 rounded border border-slate-850 text-[10px] space-y-1">
                              <span className="block text-[9px] font-bold text-emerald-400">構成品目の使用量と現在庫:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0.5">
                                {row.product.bundleItems.map((item, idx) => {
                                  const child = products.find(p => p.sku === item.sku);
                                  const childInv = findInventoryForProduct(child || { sku: item.sku } as any, inventoryList, products);
                                  const childTotal = childInv.fbaStock + childInv.rslStock + childInv.scStock + childInv.logiStock;
                                  return (
                                    <div key={idx} className="flex justify-between font-mono text-[9px] text-slate-400">
                                      <span className="truncate max-w-[140px] text-slate-400" title={child ? child.name : item.sku}>
                                        {child ? child.name : item.sku}
                                      </span>
                                      <span className="text-slate-350 ml-1.5">
                                        必要:{item.quantity} / 在庫:{childTotal}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        <div>{row.fba.toLocaleString()}</div>
                        {viewMode === 'brand_integrated' && row.integrationBreakdown && row.integrationBreakdown.length > 1 && row.rawFba !== row.fba && (
                          <div className="text-[9px] text-slate-500 font-sans font-medium">実:{row.rawFba}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        <div>{row.rsl.toLocaleString()}</div>
                        {viewMode === 'brand_integrated' && row.integrationBreakdown && row.integrationBreakdown.length > 1 && row.rawRsl !== row.rsl && (
                          <div className="text-[9px] text-slate-500 font-sans font-medium">実:{row.rawRsl}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        <div>{row.sc.toLocaleString()}</div>
                        {viewMode === 'brand_integrated' && row.integrationBreakdown && row.integrationBreakdown.length > 1 && row.rawSc !== row.sc && (
                          <div className="text-[9px] text-slate-500 font-sans font-medium">実:{row.rawSc}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        <div>{row.logi.toLocaleString()}</div>
                        {viewMode === 'brand_integrated' && row.integrationBreakdown && row.integrationBreakdown.length > 1 && row.rawLogi !== row.logi && (
                          <div className="text-[9px] text-slate-500 font-sans font-medium">実:{row.rawLogi}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 bg-slate-950/20">
                        <div>{row.totalStock.toLocaleString()}</div>
                        {viewMode === 'brand_integrated' && row.integrationBreakdown && row.integrationBreakdown.length > 1 && (row.rawFba + row.rawRsl + row.rawSc + row.rawLogi) !== row.totalStock && (
                          <div className="text-[9px] text-indigo-400/70 font-sans font-semibold">実:{row.rawFba + row.rawRsl + row.rawSc + row.rawLogi}</div>
                        )}
                      </td>
                      
                      {/* 月間販売数 */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        <div>{row.monthlySales.toLocaleString()}</div>
                      </td>

                      {/* 安全在庫 */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {row.product.isBundle ? (
                          <span className="text-slate-600 font-sans">-</span>
                        ) : (
                          row.safetyStock.toLocaleString()
                        )}
                      </td>

                      {/* 発注点 */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">
                        {row.product.isBundle ? (
                          <span className="text-slate-600 font-sans">-</span>
                        ) : (
                          row.reorderPoint.toLocaleString()
                        )}
                      </td>

                      {/* 在庫日数 (切迫度により色分け) */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {row.product.isBundle ? (
                          <span className="text-slate-600 font-sans">-</span>
                        ) : row.stockDays >= 9999 ? (
                          <span className="text-slate-550 font-sans">実績なし</span>
                        ) : (
                          <span className={`font-bold ${row.stockDays < 15 ? 'text-rose-400 animate-pulse' : row.stockDays < 30 ? 'text-amber-400' : 'text-slate-300'}`}>
                            {row.stockDays}日
                          </span>
                        )}
                      </td>

                      {/* 在庫切れ予想日 */}
                      <td className="py-3.5 px-4 text-right font-mono text-xs">
                        {row.product.isBundle ? (
                          <span className="text-slate-600 font-sans">-</span>
                        ) : row.stockDays >= 9999 ? (
                          <span className="text-slate-500 italic font-sans text-[11px]">安定</span>
                        ) : (
                          <span className={row.stockDays < 15 ? 'text-rose-400 font-bold' : row.stockDays < 30 ? 'text-amber-400 font-semibold' : 'text-slate-355'}>
                            {row.estimatedOutDate}
                          </span>
                        )}
                      </td>

                      {/* 発注状況・発注残（手配中） */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {row.pendingQty > 0 ? (
                          <div className="space-y-0.5">
                            <span className="text-amber-450 font-bold text-xs bg-amber-950/50 border border-amber-900/50 px-2 py-0.5 rounded inline-block text-[11px]">
                              {row.pendingQty.toLocaleString()}
                            </span>
                            {/* ホバー時もしくは小さなテキストで納期などの予定を表示 */}
                            <div className="text-[9px] text-slate-400 font-sans leading-none flex flex-col items-end gap-1 mt-1.5 min-w-[100px]">
                              {row.pendingDetails.map((detail, dIdx) => (
                                <span key={dIdx} className="truncate max-w-[120px] text-slate-400 border border-slate-800 bg-slate-950 px-1 py-0.5 rounded text-[8px]" title={`${detail.groupName}: ${detail.qty}個`}>
                                  📅 {detail.deliveryDate.substring(5)} ({detail.qty}個)
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-sans font-medium text-[10px]">-</span>
                        )}
                      </td>
                      
                      {/* Interactive responsive progress bar */}
                      <td className="py-3.5 px-5 max-w-xs">
                        {row.product.isBundle ? (
                          <span className="text-slate-500 italic text-[11px]">セット商品のため対象外</span>
                        ) : (
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                              {row.reorderPoint > 0 ? (
                                <span className={`font-mono font-semibold ${row.isCritical ? 'text-rose-400' : 'text-emerald-400'}`}>
                                  {displayPercent}%
                                </span>
                              ) : (
                                <span className="text-slate-500 font-mono">データなし</span>
                              )}
                              <span className="text-[9px] text-slate-500 font-mono">
                                ({row.totalStock} / {row.reorderPoint})
                              </span>
                            </div>
                            
                            <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  row.isCritical 
                                    ? 'bg-gradient-to-r from-red-600 to-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.3)]' 
                                    : 'bg-gradient-to-r from-emerald-600 to-green-400'
                                }`}
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Out of stock warning trigger */}
                      <td className="py-3.5 px-4 text-right">
                        {row.product.isBundle ? (
                          <span className="inline-flex items-center gap-1 bg-slate-950 border border-slate-800 text-slate-400 px-2 py-0.5 rounded text-[10px]">
                            -
                          </span>
                        ) : row.isCritical ? (
                          <span className="inline-flex items-center gap-1 bg-red-950 border border-red-950 text-red-400 font-semibold px-2 py-0.5 rounded text-[10px] animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>要発注</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-emerald-990 border border-emerald-950 text-emerald-400 font-semibold px-2 py-0.5 rounded text-[10px]">
                            <CheckCircle className="w-3 h-3" />
                            <span>充足</span>
                          </span>
                        )}
                      </td>

                      {/* クイック手配登録 */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            setSelectedProductForOrder(row.product);
                            setQuickOrderQty(row.reorderPoint > 0 && row.reorderPoint > row.totalStock ? Math.max(20, row.reorderPoint - row.totalStock) : 100);
                            setQuickOrderGroupName(`【個別手配】${row.product.brand} - 自社枠手配`);
                            setQuickOrderNotes(`在庫状況一覧から個別発注・手配状況を追加起票。`);
                            setIsQuickOrderOpen(true);
                          }}
                          className="bg-slate-850 hover:bg-slate-750 text-indigo-300 font-bold text-[10px] px-2.5 py-1.5 rounded-lg border border-indigo-950 hover:text-white transition-all flex items-center justify-center gap-1 mx-auto cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>手配状況追加</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>
            登録数 <span className="font-mono text-white font-bold">{sortedRows.length}</span> 件中 {' '}
            <span className="font-mono text-slate-300">
              {sortedRows.length === 0 ? 0 : startIndex + 1} &ndash; {Math.min(startIndex + itemsPerPage, sortedRows.length)}
            </span> 件を表示中
          </p>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-slate-900 lg:text-[10px] hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 transition-all font-medium disabled:cursor-not-allowed"
            >
              最初
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 lg:text-[10px] transition-all font-medium disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <span className="px-3.5 text-xs text-slate-400 font-mono font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 lg:text-[10px] transition-all font-medium disabled:cursor-not-allowed"
            >
              次へ
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-slate-900 lg:text-[10px] hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 transition-all font-medium disabled:cursor-not-allowed"
            >
              最終
            </button>
          </div>
        </div>
      </div>

      {/* クイック手配登録 (発注状況追加) モーダル */}
      {isQuickOrderOpen && selectedProductForOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative">
            
            {/* モーダルヘッダー */}
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">発注・手配状況のクイック追加</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsQuickOrderOpen(false);
                  setSelectedProductForOrder(null);
                }}
                className="text-slate-400 hover:text-white text-base transition-colors"
              >
                ✕
              </button>
            </div>

            {/* モーダルフォーム */}
            <form onSubmit={handleSaveQuickOrder} className="p-6 space-y-4">
              
              {/* 対象商品簡易表示 */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
                <div className="bg-indigo-950 text-indigo-400 p-2 rounded-lg border border-indigo-900/40 text-xs font-mono font-bold shrink-0">
                  {selectedProductForOrder.sku}
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-mono leading-none">{selectedProductForOrder.brand}</div>
                  <h4 className="text-xs font-bold text-slate-200 mt-1">{selectedProductForOrder.name}</h4>
                  <div className="text-[9px] text-indigo-300 font-sans tracking-tight mt-1.5 flex gap-3 flex-wrap">
                    {selectedProductForOrder.leadTime && <span>リードタイム: {selectedProductForOrder.leadTime}日</span>}
                    {selectedProductForOrder.volume && <span>規格: {selectedProductForOrder.volume}</span>}
                    {selectedProductForOrder.setQuantity && <span>セット入数: {selectedProductForOrder.setQuantity}入</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 発注グループ名 */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>発注・手配グループ名</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quickOrderGroupName}
                    onChange={(e) => setQuickOrderGroupName(e.target.value)}
                    placeholder="【ママセレクト】5月第二ロット手配分 など"
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* 発注数量 */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-500" />
                    <span>手配数量 (個)</span>
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={quickOrderQty}
                    onChange={(e) => setQuickOrderQty(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                  />
                  {selectedProductForOrder.weight && quickOrderQty > 0 && (
                    <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                      総重量: {Math.round(((quickOrderQty * (selectedProductForOrder.weight || 165)) / 1000) * 10) / 10} kg 相当
                    </p>
                  )}
                </div>

                {/* 納品予定日 */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>納品予定日 (納期)</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={quickOrderDelivDate}
                    onChange={(e) => setQuickOrderDelivDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                  />
                </div>

                {/* 担当者 */}
                <div className="space-y-1.5 font-sans">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>発注担当者</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={quickOrderStaff}
                    onChange={(e) => setQuickOrderStaff(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* 初期進捗ステータス */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    発注・手配状況ステータス
                  </label>
                  <select
                    value={quickOrderStatus}
                    onChange={(e) => setQuickOrderStatus(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="発注済">発注済 (検収前・輸送中)</option>
                    <option value="検収中/入庫中">検収中 / ロジ入庫手配中</option>
                  </select>
                </div>
              </div>

              {/* メモ */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  特記事項・引継ぎメモ (任意)
                </label>
                <textarea
                  value={quickOrderNotes}
                  onChange={(e) => setQuickOrderNotes(e.target.value)}
                  placeholder="分納や検収条件、原料引き当てに関する補足事項..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* アクションボタン */}
              <div className="pt-4 border-t border-slate-850 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickOrderOpen(false);
                    setSelectedProductForOrder(null);
                  }}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold px-4 py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-violet-500 hover:from-indigo-550 hover:to-violet-450 text-white font-bold px-4 py-2.5 rounded-lg text-xs shadow-lg shadow-indigo-500/10 transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>発注手配を反映する</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
