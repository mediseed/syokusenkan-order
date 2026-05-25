/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ArrowUpDown, Download, AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react';
import { ProductMaster, InventoryData, SalesData } from '../types';
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

  // Sorting
  const [sortField, setSortField] = useState<
    'sku' | 'name' | 'monthlySales' | 'totalStock' | 'reorderPoint' | 'stockDays' | 'recommendedQty' | 'priority'
  >('priority');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Retrieve calculated recommendations
  const recommendationsList = computeRecommendations(products, inventoryList, salesList);

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
                        <p className="font-semibold text-slate-200">{row.product.name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 font-mono">{row.product.brand}</span>
                          {row.product.setQuantity > 1 && (
                            <span className="bg-amber-950 text-amber-400 border border-amber-900 text-[9px] px-1.5 rounded-sm font-bold animate-pulse">
                              セット数 ×{row.product.setQuantity}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono text-slate-100 font-semibold">{row.monthlySales}</td>
                    <td className="py-3.5 px-3 text-right text-slate-500 font-mono text-[10px]">
                      {row.safetyStock} <span className="text-slate-600">/</span> {row.reorderPoint}
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
