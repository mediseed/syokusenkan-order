/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Search, ArrowUpDown, Download, CheckCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import { ProductMaster, InventoryData, SalesData } from '../types';
import { BRANDS } from '../data/mockData';
import { findInventoryForProduct, calculateProductMonthlySales, exportToCSV } from '../utils/calculations';

interface InventoryTabProps {
  products: ProductMaster[];
  inventoryList: InventoryData[];
  salesList: SalesData[];
  uploadTimestamps?: Record<string, string>;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function InventoryTab({
  products,
  inventoryList,
  salesList,
  uploadTimestamps,
  addToast
}: InventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedStockLevel, setSelectedStockLevel] = useState<'all' | 'critical' | 'healthy'>('all');

  // Sorting
  const [sortField, setSortField] = useState<'sku' | 'name' | 'fbaStock' | 'rslStock' | 'scStock' | 'logiStock' | 'totalStock' | 'ratio'>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Compile calculations for each row
  const computedRows = products.map((product) => {
    const inv = findInventoryForProduct(product, inventoryList);
    const fba = inv.fbaStock;
    const rsl = inv.rslStock;
    const sc = inv.scStock;
    const logi = inv.logiStock;
    const totalStock = fba + rsl + sc + logi;

    const monthlySales = calculateProductMonthlySales(product, salesList);
    const reorderPoint = Math.round(monthlySales * 2);

    // Stock ratio
    const ratio = reorderPoint > 0 ? (totalStock / reorderPoint) : (totalStock > 0 ? 99 : 0);
    const isCritical = totalStock <= reorderPoint;

    return {
      product,
      inventoryRecord: inv,
      fba,
      rsl,
      sc,
      logi,
      totalStock,
      monthlySales,
      reorderPoint,
      ratio,
      isCritical
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
      'SKU', 'ブランド', '商品名', 'FBA在庫', 'RSL在庫', 'SC在庫', 'ロジ在庫', 'トータル在庫', '発注点', '比率', 'ステータス'
    ];
    
    const rows = sortedRows.map(r => [
      r.product.sku,
      r.product.brand,
      r.product.name,
      r.fba.toString(),
      r.rsl.toString(),
      r.sc.toString(),
      r.logi.toString(),
      r.totalStock.toString(),
      r.reorderPoint.toString(),
      r.reorderPoint > 0 ? `${Math.round(r.ratio * 100)}%` : '安定',
      r.isCritical ? '要発注' : '適正在庫'
    ]);

    exportToCSV(headers, rows, 'inventory_report_export.csv');
    addToast('在庫一覧CSVを書き出しました', 'success');
  };

  // Filter application
  const filteredRows = computedRows.filter((row) => {
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
                <th className="py-3.5 px-4 font-semibold tracking-wider text-right">発注点</th>
                <th onClick={() => handleSort('ratio')} className="py-3.5 px-5 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-left select-none max-w-xs">
                  <div className="flex items-center gap-1">
                    在庫充足率（現在庫 / 発注点） <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold tracking-wider text-right">状態</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
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
                          <p className="font-semibold text-slate-200">{row.product.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500 font-mono">{row.product.brand}</span>
                            {row.product.setQuantity > 1 && (
                              <span className="bg-amber-950/60 text-amber-400 border border-amber-900/50 text-[9px] px-1 rounded-sm font-bold">
                                セット数 ×{row.product.setQuantity}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">{row.fba.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">{row.rsl.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">{row.sc.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">{row.logi.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 bg-slate-950/20">{row.totalStock.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-400">{row.reorderPoint.toLocaleString()}</td>
                      
                      {/* Interactive responsive progress bar */}
                      <td className="py-3.5 px-5 max-w-xs">
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
                      </td>

                      {/* Out of stock warning trigger */}
                      <td className="py-3.5 px-4 text-right">
                        {row.isCritical ? (
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
    </div>
  );
}
