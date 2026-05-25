import React, { useState, useMemo } from 'react';
import { Search, RotateCcw, TrendingUp, Sparkles, Filter, Check, HelpCircle, ArrowRightLeft, Percent } from 'lucide-react';
import { ProductMaster, SalesData } from '../types';
import { calculateProductMonthlySales } from '../utils/calculations';

interface MonthlySalesTabProps {
  products: ProductMaster[];
  salesList: SalesData[];
  salesOverrides: Record<string, number>;
  onUpdateSalesOverrides: (overrides: Record<string, number>) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function MonthlySalesTab({
  products,
  salesList,
  salesOverrides,
  onUpdateSalesOverrides,
  addToast,
}: MonthlySalesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Bulk adjustment inputs
  const [bulkMultiplierPercent, setBulkMultiplierPercent] = useState('20'); // as a percentage, e.g. 20 for +20%

  // Unique lists of Brands and Categories for filtering
  const brands = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.brand).filter(Boolean)));
  }, [products]);

  const categories = useMemo(() => {
    return Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  }, [products]);

  // Aggregate stats
  const salesComparison = useMemo(() => {
    let totalSystemSales = 0;
    let totalAdjustedSales = 0;
    let overriddenCount = 0;

    products.forEach((p) => {
      const systemSales = calculateProductMonthlySales(p, salesList);
      const isOverridden = p.sku in salesOverrides;
      const finalSales = isOverridden ? salesOverrides[p.sku] : systemSales;

      totalSystemSales += systemSales;
      totalAdjustedSales += finalSales;
      if (isOverridden) {
        overriddenCount++;
      }
    });

    return {
      totalSystemSales,
      totalAdjustedSales,
      overriddenCount,
      difference: totalAdjustedSales - totalSystemSales,
    };
  }, [products, salesList, salesOverrides]);

  // Combined product calculation for view rows
  const rowData = useMemo(() => {
    return products.map((p) => {
      const systemSales = calculateProductMonthlySales(p, salesList);
      const isOverridden = p.sku in salesOverrides;
      const finalSales = isOverridden ? salesOverrides[p.sku] : systemSales;

      return {
        product: p,
        systemSales,
        finalSales,
        isOverridden,
      };
    });
  }, [products, salesList, salesOverrides]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rowData.filter((row) => {
      const matchesSearch =
        row.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        row.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBrand = selectedBrand === 'all' || row.product.brand === selectedBrand;
      const matchesCategory = selectedCategory === 'all' || row.product.category === selectedCategory;

      return matchesSearch && matchesBrand && matchesCategory;
    });
  }, [rowData, searchTerm, selectedBrand, selectedCategory]);

  // Individual update handler
  const handleUpdateSingleOverride = (sku: string, value: string) => {
    const nextOverrides = { ...salesOverrides };
    const num = parseInt(value, 10);

    if (isNaN(num) || value.trim() === '') {
      // Revert if clear
      delete nextOverrides[sku];
      onUpdateSalesOverrides(nextOverrides);
    } else {
      nextOverrides[sku] = Math.max(0, num);
      onUpdateSalesOverrides(nextOverrides);
    }
  };

  // Quick action: revert individual SKU
  const handleRevertSingle = (sku: string) => {
    const nextOverrides = { ...salesOverrides };
    delete nextOverrides[sku];
    onUpdateSalesOverrides(nextOverrides);
  };

  // Revert all filtered items
  const handleRevertFiltered = () => {
    if (filteredRows.length === 0) return;
    const nextOverrides = { ...salesOverrides };
    filteredRows.forEach((row) => {
      delete nextOverrides[row.product.sku];
    });
    onUpdateSalesOverrides(nextOverrides);
    addToast('表示中の商品の手動修正をすべて解除しました。', 'warning');
  };

  // Revert absolutely all overrides
  const handleRevertAll = () => {
    if (Object.keys(salesOverrides).length === 0) return;
    onUpdateSalesOverrides({});
    addToast('すべての商品の手動修正を解除し、システム集計値にリセットしました。', 'warning');
  };

  // Apply multiplier to filtered items
  const handleApplyMultiplier = (mode: 'multiply' | 'increase' | 'decrease') => {
    const percentNum = parseFloat(bulkMultiplierPercent);
    if (isNaN(percentNum) || percentNum <= 0) {
      addToast('有効な調整率を入力してください。', 'error');
      return;
    }

    const nextOverrides = { ...salesOverrides };
    let updatedCount = 0;

    filteredRows.forEach((row) => {
      const baseValue = row.isOverridden ? row.finalSales : row.systemSales;
      let newValue = baseValue;

      if (mode === 'increase') {
        newValue = Math.round(baseValue * (1 + percentNum / 100));
      } else if (mode === 'decrease') {
        newValue = Math.round(baseValue * (1 - percentNum / 100));
      }

      nextOverrides[row.product.sku] = Math.max(0, newValue);
      updatedCount++;
    });

    onUpdateSalesOverrides(nextOverrides);
    addToast(
      `表示中の ${updatedCount} 件の商品に対して、月間販売数 ${
        mode === 'increase' ? `+${percentNum}%` : `-${percentNum}%`
      } の一括調整を適用しました。`,
      'success'
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Description */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-indigo-950/80 border border-indigo-700/60 text-indigo-300 text-[10px] font-mono tracking-wider font-bold px-2 py-0.5 rounded-full">
                DEMAND PLANNING ENGINE
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              月間販売数（予測需要）の調整・修正
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              システムが過去30日間の取引実績から自動集計した「月間販売数」をマスタ単位で手動修正できます。
              ここで設定した調整値は、<strong>推奨発注量の計算、安全在庫値、発注点（RP）、想定在庫切日</strong>にリアルタイムで反映され、計画発注へ直ちに適用されます。
            </p>
          </div>
        </div>

        {/* Aggregate KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">
                登録商品総数
              </span>
              <span className="text-lg font-mono font-bold text-slate-100">{products.length}</span>
              <span className="text-[10px] text-slate-500 block">対象マスタ件数</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg">
              <HelpCircle className="w-5 h-5 text-slate-500" />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">
                手動修正中の商品数
              </span>
              <span className={`text-lg font-mono font-bold ${salesComparison.overriddenCount > 0 ? 'text-indigo-400' : 'text-slate-400'}`}>
                {salesComparison.overriddenCount} <span className="text-[11px] font-sans font-normal text-slate-500">点</span>
              </span>
              <span className="text-[10px] text-indigo-300/80 block font-mono">
                全体の {products.length > 0 ? Math.round((salesComparison.overriddenCount / products.length) * 100) : 0}%
              </span>
            </div>
            <div className={`p-2.5 rounded-lg ${salesComparison.overriddenCount > 0 ? 'bg-indigo-950/50' : 'bg-slate-900'}`}>
              <Sparkles className={`w-5 h-5 ${salesComparison.overriddenCount > 0 ? 'text-indigo-400' : 'text-slate-500'}`} />
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider font-mono">
                システム理論月販 (総計)
              </span>
              <span className="text-lg font-mono font-bold text-slate-350">
                {salesComparison.totalSystemSales.toLocaleString()} <span className="text-xs font-sans font-normal text-slate-500">個</span>
              </span>
              <span className="text-[10px] text-slate-500 block">実績取引データから自動集計</span>
            </div>
            <div className="p-2.5 bg-slate-900 rounded-lg">
              <ArrowRightLeft className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="bg-slate-500/[0.03] border border-indigo-500/20 p-4 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-indigo-400 font-bold block uppercase tracking-wider font-mono">
                調整後月販 (総計)
              </span>
              <span className="text-lg font-mono font-bold text-emerald-400">
                {salesComparison.totalAdjustedSales.toLocaleString()} <span className="text-xs font-sans font-normal text-slate-500">個</span>
              </span>
              <span className="text-[10px] block text-slate-450">
                差分:{' '}
                <strong className={salesComparison.difference >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                  {salesComparison.difference >= 0 ? '+' : ''}
                  {salesComparison.difference.toLocaleString()} 個
                </strong>
              </span>
            </div>
            <div className="p-2.5 bg-emerald-950/30 rounded-lg border border-emerald-500/20">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel: Search Filters & Bulk Actions */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-550" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="商品名 or SKUで検索..."
                className="w-full bg-slate-950 border border-slate-800 text-xs text-white pl-8 pr-3 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-shadow placeholder:text-slate-500"
              />
            </div>

            {/* Brand Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3 h-3 text-slate-500" />
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-transparent text-xs text-slate-350 focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="all" className="bg-slate-950 text-slate-200">
                  すべてのブランド
                </option>
                {brands.map((b) => (
                  <option key={b} value={b} className="bg-slate-950 text-slate-200">
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3 h-3 text-slate-500" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-xs text-slate-350 focus:outline-none focus:ring-0 cursor-pointer"
              >
                <option value="all" className="bg-slate-950 text-slate-200">
                  すべてのカテゴリ
                </option>
                {categories.map((c) => (
                  <option key={c} value={c} className="bg-slate-950 text-slate-200">
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {salesComparison.overriddenCount > 0 && (
              <button
                onClick={handleRevertAll}
                className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>全修正解除 (システム同期)</span>
              </button>
            )}
          </div>
        </div>

        {/* Bulk Modifier Widget Block */}
        <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Percent className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <p className="text-xs font-bold text-slate-200">
                表示中の商品 ({filteredRows.length}件) に対する％一括増減ツール
              </p>
              <p className="text-[10px] text-slate-500">
                セール期・休業期・メディア露出前の需要予測調整をパーセント単位で一括適用できます（手動修正が開始されます）。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400">現在地から</span>
            <div className="relative w-16">
              <input
                type="number"
                min="1"
                max="500"
                value={bulkMultiplierPercent}
                onChange={(e) => setBulkMultiplierPercent(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-center py-1 px-1.5 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-white"
              />
              <span className="absolute right-1 text-[10px] text-slate-500 top-1.5 font-bold">%</span>
            </div>
            <button
              onClick={() => handleApplyMultiplier('increase')}
              className="bg-indigo-900/60 hover:bg-indigo-850 text-indigo-200 hover:text-white text-xs px-3 py-1.5 rounded font-bold border border-indigo-800/50 transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              <TrendingUp className="w-3 h-3 text-emerald-400" />
              <span>増加させる</span>
            </button>
            <button
              onClick={() => handleApplyMultiplier('decrease')}
              className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white text-xs px-3 py-1.5 rounded font-bold border border-slate-800 transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              <TrendingDown className="w-3 h-3 text-rose-400" />
              <span>減少させる</span>
            </button>
            {salesComparison.overriddenCount > 0 && (
              <button
                onClick={handleRevertFiltered}
                className="text-slate-500 hover:text-rose-400 hover:bg-rose-950/15 text-xs px-2.5 py-1.5 rounded border border-transparent hover:border-rose-900/40 font-medium transition-colors"
                title="表示商品の変更分のみクリアします"
              >
                表示分クリア
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main product overrides checklist table */}
      <div className="bg-slate-900 border border-slate-850 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-350">
            <thead>
              <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 uppercase text-[10px] tracking-wider font-mono">
                <th className="py-3 px-4">商品名 & SKU</th>
                <th className="py-3 px-3">ブランド</th>
                <th className="py-3 px-3">カテゴリ</th>
                <th className="py-3 px-3 text-right">グラム数・形態</th>
                <th className="py-3 px-4 text-right">システム集計実績量 (先月販)</th>
                <th className="py-3 px-4 text-center">調整フラグ</th>
                <th className="py-3 px-4 text-right bg-indigo-950/30 w-[170px] text-indigo-300">適用する月間販売数（予測）</th>
                <th className="py-3 px-4 text-center w-[76px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 bg-slate-900/50">
                    <AlertCircle className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    表示条件に一致する商品が見つかりません。検索条件を変更してください。
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const p = row.product;
                  return (
                    <tr
                      key={p.sku}
                      className={`hover:bg-slate-850/40 transition-colors border-b border-slate-850/60 ${
                        row.isOverridden ? 'bg-indigo-900/5 border-l-2 border-l-indigo-500' : 'border-l-2 border-l-transparent'
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-100 flex items-center gap-1.5">
                          <span>{p.name}</span>
                          {p.isBundle && (
                            <span className="bg-amber-950/80 border border-amber-800/40 text-amber-300 text-[9px] px-1 rounded-sm scale-90">
                              セット品
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 block">{p.sku}</span>
                      </td>
                      <td className="py-3 px-3 text-slate-350 font-medium">{p.brand}</td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-950 border border-slate-850 px-2 py-0.5 rounded text-slate-400 text-[11px]">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {p.volume} ({p.weight}g)
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-400">
                        <strong>{row.systemSales.toLocaleString()}</strong> <span className="text-[10px] text-slate-500">個</span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {row.isOverridden ? (
                          <span className="bg-indigo-950 border border-indigo-700/50 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded inline-flex items-center gap-1 scale-95 shadow">
                            <Sparkles className="w-3 h-3 text-indigo-400" />
                            手動調整中
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">- (実績値同期)</span>
                        )}
                      </td>
                      {/* Interactive Inline Edit Column */}
                      <td className="py-2.5 px-4 text-right bg-indigo-950/20 max-w-[170px]">
                        <div className="flex items-center gap-2.5 justify-end">
                          <input
                            type="number"
                            min="0"
                            placeholder={row.systemSales.toString()}
                            value={row.isOverridden ? row.finalSales : ''}
                            onChange={(e) => handleUpdateSingleOverride(p.sku, e.target.value)}
                            className={`w-28 text-right bg-slate-950 font-mono font-bold py-1.5 px-2.5 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none ${
                              row.isOverridden
                                ? 'border-indigo-600/70 text-indigo-300 text-shadow-sm'
                                : 'border-slate-850 hover:border-slate-800 text-slate-500'
                            }`}
                          />
                          <span className="text-[10px] text-slate-500 font-bold">個</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        {row.isOverridden ? (
                          <button
                            onClick={() => handleRevertSingle(p.sku)}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 p-1.5 rounded transition-colors"
                            title="システム自動集計値に戻す"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-mono select-none">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Inline fallback icon for negative trend indicator
function TrendingDown({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <polyline points="22 17 13.5 8.5 8.5 13.5 2 7" />
      <polyline points="16 17 22 17 22 11" />
    </svg>
  );
}

function AlertCircle({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
