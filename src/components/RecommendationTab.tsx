/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ArrowUpDown, Download, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { ProductMaster, InventoryData, SalesData, RecommendedOrder } from '../types';
import { BRANDS } from '../data/mockData';
import { computeRecommendations, exportToCSV } from '../utils/calculations';

interface RecommendationTabProps {
  products: ProductMaster[];
  inventoryList: InventoryData[];
  salesList: SalesData[];
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function RecommendationTab({
  products,
  inventoryList,
  salesList,
  addToast
}: RecommendationTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<'all' | '高' | '中' | '低'>('all');
  const [groupByIntegration, setGroupByIntegration] = useState(true); // Default to true as user is highly interested in this feature

  // Sorting
  const [sortField, setSortField] = useState<
    'sku' | 'name' | 'monthlySales' | 'totalStock' | 'reorderPoint' | 'stockDays' | 'recommendedQty' | 'priority'
  >('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Retrieve calculated recommendations
  const baseRecommendationsList = computeRecommendations(products, inventoryList, salesList);

  // Group by integration code if toggled
  const recommendationsList = React.useMemo(() => {
    if (!groupByIntegration) return baseRecommendationsList;

    const groups: Record<string, RecommendedOrder[]> = {};
    const singles: RecommendedOrder[] = [];

    baseRecommendationsList.forEach(r => {
      const gCode = r.product.integrationCode?.trim();
      if (gCode) {
        if (!groups[gCode]) groups[gCode] = [];
        groups[gCode].push(r);
      } else {
        singles.push(r);
      }
    });

    const aggregated: RecommendedOrder[] = Object.keys(groups).map(gCode => {
      const list = groups[gCode];
      const brands = Array.from(new Set(list.map(x => x.product.brand))).join(' / ');
      const names = Array.from(new Set(list.map(x => x.product.name))).join(' & ');

      const totalStock = list.reduce((sum, x) => sum + x.totalStock, 0);
      const fbaStock = list.reduce((sum, x) => sum + x.fbaStock, 0);
      const rslStock = list.reduce((sum, x) => sum + x.rslStock, 0);
      const scStock = list.reduce((sum, x) => sum + x.scStock, 0);
      const logiStock = list.reduce((sum, x) => sum + x.logiStock, 0);
      const monthlySales = list.reduce((sum, x) => sum + x.monthlySales, 0);

      const safetyStock = list.reduce((sum, x) => sum + x.safetyStock, 0);
      const reorderPoint = list.reduce((sum, x) => sum + x.reorderPoint, 0);
      const recommendedQty = list.reduce((sum, x) => sum + x.recommendedQty, 0);

      const stockDays = monthlySales > 0 ? Math.round((totalStock / monthlySales) * 30) : 9999;
      let priority: '高' | '中' | '低' = '低';
      if (stockDays < 15) {
        priority = '高';
      } else if (stockDays < 30) {
        priority = '中';
      }

      let estimatedOutDate = '安定 / 実績なし';
      if (monthlySales > 0) {
        const date = new Date('2026-05-25');
        date.setDate(date.getDate() + stockDays);
        estimatedOutDate = date.toISOString().split('T')[0];
      }

      const virtualProduct: ProductMaster = {
        sku: gCode,
        brand: brands,
        name: `${names}`,
        volume: `統合品目 (${list.length}ブランド)`,
        weight: list.reduce((sum, x) => sum + x.product.weight, 0),
        category: 'お茶',
        setQuantity: 1,
        fbaSku: gCode,
        rslSku: '',
        scCode: '',
        logiId: '',
        rawMaterialProducer: '',
        fillingParty: '',
        integrationCode: gCode,
        isActive: true
      };

      return {
        product: virtualProduct,
        fbaStock,
        rslStock,
        scStock,
        logiStock,
        totalStock,
        monthlySales,
        safetyStock,
        reorderPoint,
        stockDays,
        recommendedQty,
        priority,
        estimatedOutDate
      };
    });

    return [...aggregated, ...singles];
  }, [baseRecommendationsList, groupByIntegration]);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
  };

  // CSV Export for recom list
  const handleExportCSV = () => {
    const headers = [
      'SKU', 'ブランド', '商品名', '月間販売数', '現在庫', '安全在庫数', '発注点', '在庫日数', '推奨発注数', '優先度', '在庫切れ予想日'
    ];

    const rows = sortedRecoms.map(r => [
      r.product.sku,
      r.product.brand,
      r.product.name,
      r.monthlySales.toString(),
      r.totalStock.toString(),
      r.safetyStock.toString(),
      r.reorderPoint.toString(),
      r.stockDays >= 9999 ? '999+' : `${r.stockDays}日`,
      r.recommendedQty.toString(),
      r.priority,
      r.estimatedOutDate
    ]);

    exportToCSV(headers, rows, 'purchasing_recoms_export.csv');
    addToast('発注推奨リストCSVを書き出しました', 'success');
  };

  // Filter application
  const filteredRecoms = recommendationsList.filter((r) => {
    const matchSearch =
      r.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.product.fbaSku && r.product.fbaSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.product.rslSku && r.product.rslSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.product.scCode && r.product.scCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (r.product.logiId && r.product.logiId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchBrand = selectedBrand === '' || r.product.brand === selectedBrand;
    const matchPriority = selectedPriority === 'all' || r.priority === selectedPriority;

    return matchSearch && matchBrand && matchPriority;
  });

  // Sort Application
  const sortedRecoms = [...filteredRecoms].sort((a, b) => {
    let valA: any;
    let valB: any;

    if (sortField === 'sku') {
      valA = a.product.sku;
      valB = b.product.sku;
    } else if (sortField === 'name') {
      valA = a.product.name;
      valB = b.product.name;
    } else if (sortField === 'monthlySales') {
      valA = a.monthlySales;
      valB = b.monthlySales;
    } else if (sortField === 'totalStock') {
      valA = a.totalStock;
      valB = b.totalStock;
    } else if (sortField === 'reorderPoint') {
      valA = a.reorderPoint;
      valB = b.reorderPoint;
    } else if (sortField === 'stockDays') {
      valA = a.stockDays;
      valB = b.stockDays;
    } else if (sortField === 'recommendedQty') {
      valA = a.recommendedQty;
      valB = b.recommendedQty;
    } else if (sortField === 'priority') {
      // Sort priority sequence: 高 -> 中 -> 低
      const pMap = { '高': 0, '中': 1, '低': 2 };
      valA = pMap[a.priority];
      valB = pMap[b.priority];
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    return sortDirection === 'asc' ? (valA - valB) : (valB - valA);
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedRecoms.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedRecoms = sortedRecoms.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4">
      {/* Search Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="商品名、SKU、各種連携コードで発注推奨を検索..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Filters */}
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

          {/* Priority filter */}
          <select
            value={selectedPriority}
            onChange={(e) => {
              setSelectedPriority(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          >
            <option value="all">すべての優先度</option>
            <option value="高">高（15日未満）</option>
            <option value="中">中（30日未満）</option>
            <option value="低">低（30日以上）</option>
          </select>

          {/* Brand integration toggle */}
          <label className="flex items-center gap-1.5 bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-900/60 px-3 py-2 rounded-lg cursor-pointer transition select-none">
            <input
              type="checkbox"
              checked={groupByIntegration}
              onChange={(e) => {
                setGroupByIntegration(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded bg-slate-950 border-slate-800 text-indigo-500 focus:ring-indigo-600 focus:ring-offset-slate-900 accent-indigo-500 h-3.5 w-3.5 cursor-pointer"
            />
            <span className="text-indigo-200 text-xs font-semibold">🔗 統合コードで一括集計</span>
          </label>

          <button
            onClick={handleExportCSV}
            className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold px-3.5 py-2 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>推奨リスト出力</span>
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
                <th onClick={() => handleSort('monthlySales')} className="py-3.5 px-3 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1">
                    月間販売数 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-3 font-semibold tracking-wider text-right text-slate-400">安全在庫 / 発注点</th>
                <th onClick={() => handleSort('totalStock')} className="py-3.5 px-3 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1 font-semibold">
                    現在庫 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('stockDays')} className="py-3.5 px-3 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-right select-none">
                  <div className="flex items-center justify-end gap-1 font-semibold text-indigo-400">
                    在庫日数 <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold tracking-wider font-sans">在庫切れ予想日</th>
                <th onClick={() => handleSort('recommendedQty')} className="py-3.5 px-3 font-semibold tracking-wider cursor-pointer hover:bg-slate-950 text-right select-none bg-slate-950/40">
                  <div className="flex items-center justify-end gap-1 font-bold text-emerald-400">
                    推奨発注数 <ArrowUpDown className="w-3 h-3 text-emerald-400" />
                  </div>
                </th>
                <th onClick={() => handleSort('priority')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-center select-none">
                  <div className="flex items-center justify-center gap-1">
                    優先度 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {paginatedRecoms.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                    推奨対象データが見つかりませんでした。
                  </td>
                </tr>
              ) : (
                paginatedRecoms.map((row) => (
                  <tr key={row.product.sku} className="hover:bg-slate-850/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-medium text-slate-100">{row.product.sku}</td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <p className="font-semibold text-slate-200 flex items-center gap-1.5 flex-wrap">
                          <span>{row.product.name}</span>
                          {row.product.isBundle && (
                            <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/60 text-[8px] font-bold px-1.5 py-0.2 rounded">セット自動計算</span>
                          )}
                          {groupByIntegration && row.product.integrationCode && (
                            <span className="bg-indigo-950 text-indigo-300 border border-indigo-900 text-[8px] font-bold px-1.5 py-0.2 rounded">🔗 複数ブランド統合</span>
                          )}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">{row.product.brand}</span>
                          {row.product.setQuantity > 1 && (
                            <span className="bg-amber-950 text-amber-400 border border-amber-900 text-[9px] px-1.5 rounded-sm font-bold animate-pulse">
                              セット数 ×{row.product.setQuantity}
                            </span>
                          )}
                        </div>
                        {row.product.isBundle && row.product.bundleItems && row.product.bundleItems.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {row.product.bundleItems.map((item, idx) => {
                              const child = products.find(p => p.sku === item.sku);
                              return (
                                <span key={idx} className="bg-slate-950/80 border border-slate-800 text-slate-400 text-[8.5px] px-1 py-0.2 rounded font-mono" title={child ? child.name : item.sku}>
                                  {child ? child.name : item.sku}×{item.quantity}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-100 font-semibold">{row.monthlySales}</td>
                    <td className="py-3.5 px-3 text-right">
                      <div className="font-mono text-xs text-slate-200">
                        {row.safetyStock} <span className="text-slate-600 text-[10px]">/</span> <span className="font-bold text-indigo-300">{row.reorderPoint}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 font-sans tracking-tight mt-0.5">
                        LT: {row.product.leadTime ?? 14}日 • 日販:{Math.round((row.monthlySales / 30) * 10) / 10}個
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-300 font-medium">{row.totalStock}</td>
                    
                    {/* Stock Days count */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      {row.stockDays >= 9999 ? (
                        <span className="text-slate-500 font-sans">実績なし</span>
                      ) : (
                        <span
                          className={`font-bold ${
                            row.priority === '高' 
                              ? 'text-rose-400 font-bold' 
                              : row.priority === '中' 
                              ? 'text-amber-400' 
                              : 'text-emerald-400'
                          }`}
                        >
                          {row.stockDays} <span className="text-[10px] font-medium font-sans text-slate-500">日分</span>
                        </span>
                      )}
                    </td>

                    {/* Stock depletion forecasting date */}
                    <td className="py-3.5 px-4 font-mono">
                      {row.stockDays >= 9999 ? (
                        <span className="text-slate-500 italic">安定</span>
                      ) : (
                        <span
                          className={`font-semibold ${
                            row.priority === '高' ? 'text-rose-400 underline decoration-rose-900' : 'text-slate-300'
                          }`}
                        >
                          {row.estimatedOutDate}
                        </span>
                      )}
                    </td>

                    {/* Automatically calculated suggested orders counts */}
                    <td className="py-3.5 px-3 text-right font-mono bg-slate-950/20">
                      {row.recommendedQty > 0 ? (
                        <span className="font-bold text-emerald-400 text-sm">
                          + {row.recommendedQty.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-600 font-sans text-[11px]">- (充足)</span>
                      )}
                    </td>

                    {/* Color coded priorities badges */}
                    <td className="py-3.5 px-4 text-center">
                      {row.priority === '高' && (
                        <span className="inline-flex items-center gap-1 bg-red-950/80 border border-red-900/60 text-red-400 font-bold px-2 px-2.5 py-0.5 rounded text-[10px] uppercase">
                          <AlertTriangle className="w-3 h-3 text-red-400" />
                          <span>高 (緊急)</span>
                        </span>
                      )}
                      {row.priority === '中' && (
                        <span className="inline-flex items-center gap-1 bg-amber-950/80 border border-amber-900/60 text-amber-400 font-bold px-2 px-2.5 py-0.5 rounded text-[10px] uppercase">
                          <AlertCircle className="w-3 h-3 text-amber-400" />
                          <span>中 (警告)</span>
                        </span>
                      )}
                      {row.priority === '低' && (
                        <span className="inline-flex items-center gap-1 bg-emerald-950/50 border border-emerald-950/50 text-emerald-400 font-medium px-2 px-2.5 py-0.5 rounded text-[10px]">
                          <CheckCircle className="w-3 h-3 text-emerald-500" />
                          <span>低 (安定)</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>
            登録数 <span className="font-mono text-white font-bold">{sortedRecoms.length}</span> 件中 {' '}
            <span className="font-mono text-slate-300">
              {sortedRecoms.length === 0 ? 0 : startIndex + 1} &ndash; {Math.min(startIndex + itemsPerPage, sortedRecoms.length)}
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
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 lg:text-[10px] transition-all font-medium disabled:cursor-not-allowed"
            >
              次へ
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-slate-900 lg:text-[10px] hover:bg-slate-850 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 transition-all font-medium disabled:cursor-not-allowed"
            >
              最終
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
