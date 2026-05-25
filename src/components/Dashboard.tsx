/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Package, ClipboardList, AlertTriangle, Play, Calendar, Eye, ShieldCheck, HelpCircle } from 'lucide-react';
import { ProductMaster, InventoryData, SalesData, RecommendedOrder } from '../types';
import { computeRecommendations, findInventoryForProduct } from '../utils/calculations';
import { motion } from 'motion/react';

interface DashboardProps {
  products: ProductMaster[];
  inventoryList: InventoryData[];
  salesList: SalesData[];
  salesOverrides?: Record<string, number>;
  uploadTimestamps?: Record<string, string>;
  onTabChange: (tabId: string) => void;
}

export default function Dashboard({
  products,
  inventoryList,
  salesList,
  salesOverrides,
  uploadTimestamps,
  onTabChange
}: DashboardProps) {
  // Compute calculated recommendations
  const recommendations = computeRecommendations(products, inventoryList, salesList, '2026-05-25', salesOverrides);

  // Calculate standard KPI metrics
  const totalProductsCount = products.length;
  const registeredInventoryCount = inventoryList.length;

  const itemsBelowReorderPt = recommendations.filter(r => r.totalStock <= r.reorderPoint).length;
  const recommendedOrdersCount = recommendations.filter(r => r.recommendedQty > 0).length;

  // Average stock days - only count items that have sales (stockDays < 9999) to keep it accurate
  const activeStockDaysItems = recommendations.filter(r => r.stockDays < 9999);
  const averageStockDays = activeStockDaysItems.length > 0
    ? Math.round(activeStockDaysItems.reduce((sum, r) => sum + r.stockDays, 0) / activeStockDaysItems.length)
    : 0;

  // Filter high-priority alerts
  const highPriorityAlerts = recommendations.filter(r => r.priority === '高');
  const mediumPriorityAlerts = recommendations.filter(r => r.priority === '中');

  // Brand inventory shares
  const brandInventoryStats = products.reduce((acc, p) => {
    const inv = findInventoryForProduct(p, inventoryList, products);
    const qty = inv.fbaStock + inv.rslStock + inv.scStock + inv.logiStock;
    if (!acc[p.brand]) acc[p.brand] = 0;
    acc[p.brand] += qty;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Top Welcome Panel */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-[#182237] via-[#11192b] to-[#211a44]/40 border border-slate-800 rounded-xl p-6 relative overflow-hidden shadow-lg shadow-black/20"
      >
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100 flex items-center gap-1.5 font-sans">
              <span>📊 発注意思決定ダッシュボード</span>
            </h1>
            <p className="text-xs text-slate-450 mt-1">
              現在の在庫・販売実績データから算出した自動推奨データに基づき、欠品リスクを最小化する発注業務を実行できます。
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-lg">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
            <span>基準日: 2026-05-25 (月間販売数自動集計)</span>
          </div>
        </div>

        {/* データ最終アップロード履歴スロット */}
        <div className="mt-4 pt-4 border-t border-slate-900 grid grid-cols-2 md:grid-cols-6 gap-3 text-[11px] relative z-10">
          {[
            { label: '商品マスタ', key: 'products', dot: 'bg-indigo-500' },
            { label: 'FBA在庫 (Amazon)', key: 'fba', dot: 'bg-amber-500' },
            { label: 'RSL在庫 (楽天)', key: 'rsl', dot: 'bg-rose-500' },
            { label: 'SC在庫 (SC)', key: 'sc', dot: 'bg-cyan-500' },
            { label: 'ロジ在庫 (LOGI)', key: 'logi', dot: 'bg-indigo-400' },
            { label: '販売実績', key: 'sales', dot: 'bg-emerald-500' },
          ].map((item) => {
            const time = uploadTimestamps?.[item.key] || '未登録';
            return (
              <div key={item.key} className="bg-slate-900/80 border border-slate-800 p-2 rounded-lg flex flex-col justify-center shadow-inner">
                <div className="flex items-center gap-1.5 text-slate-400 text-[10px] font-semibold">
                  <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`}></span>
                  <span>{item.label}</span>
                </div>
                <span className="font-mono font-bold text-slate-200 mt-1">
                  {time === '未登録' ? '未登録' : time}
                </span>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Products */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/60 border border-slate-800/80 hover:border-indigo-500/30 p-5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_8px_24px_-4px_rgba(99,102,241,0.15)] flex flex-col justify-between group">
          <div className="flex justify-between items-start gap-1">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-indigo-300 transition-colors tracking-wider">商品マスタ登録数</span>
            <span className="p-1 px-1.5 rounded text-[9px] uppercase font-mono tracking-tight font-bold bg-indigo-950/85 text-indigo-400 border border-indigo-900/30">MASTER</span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight group-hover:scale-[1.02] origin-left transition-transform">{totalProductsCount}</span>
            <span className="text-xs text-slate-500">点</span>
          </div>
        </div>

        {/* Registered Inventory */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/60 border border-slate-800/80 hover:border-emerald-500/30 p-5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.15)] flex flex-col justify-between group">
          <div className="flex justify-between items-start gap-1">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-emerald-300 transition-colors tracking-wider">在庫データ登録数</span>
            <span className="p-1 px-1.5 rounded text-[9px] uppercase font-mono tracking-tight font-bold bg-emerald-950/85 text-emerald-400 border border-emerald-900/30">STOCK</span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-2xl md:text-3xl font-extrabold text-slate-100 tracking-tight group-hover:scale-[1.02] origin-left transition-transform">{registeredInventoryCount}</span>
            <span className="text-xs text-slate-500">点</span>
          </div>
        </div>

        {/* Items Below Reorder Pt */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/60 border border-slate-800/80 hover:border-amber-500/40 p-5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.15)] flex flex-col justify-between group">
          <div className="flex justify-between items-start gap-1">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-amber-300 transition-colors tracking-wider">発注点以下の商品</span>
            <span className="p-1 px-1.5 rounded text-[9px] uppercase font-mono tracking-tight font-bold bg-amber-950/85 text-amber-400 border border-amber-900/30">WARNING</span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-2xl md:text-3xl font-extrabold text-amber-400 tracking-tight group-hover:scale-[1.02] origin-left transition-transform">{itemsBelowReorderPt}</span>
            <span className="text-xs text-slate-500">点</span>
          </div>
        </div>

        {/* Items Requiring Recommended Action */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/60 border border-slate-800/80 hover:border-rose-500/30 p-5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_8px_24px_-4px_rgba(239,68,68,0.15)] flex flex-col justify-between group">
          <div className="flex justify-between items-start gap-1">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-rose-300 transition-colors tracking-wider">推奨発注商品数</span>
            <span className="p-1 px-1.5 rounded text-[9px] uppercase font-mono tracking-tight font-bold bg-rose-950/85 text-rose-450 border border-rose-900/30">REORDER</span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-2xl md:text-3xl font-extrabold text-rose-450 tracking-tight group-hover:scale-[1.02] origin-left transition-transform">{recommendedOrdersCount}</span>
            <span className="text-xs text-slate-500">点</span>
          </div>
        </div>

        {/* Average Stock Days */}
        <div className="bg-gradient-to-br from-slate-900 to-slate-950/60 border border-slate-800/80 hover:border-cyan-500/30 p-5 rounded-xl transition-all duration-300 shadow-lg hover:shadow-[0_8px_24px_-4px_rgba(6,182,212,0.15)] col-span-2 lg:col-span-1 flex flex-col justify-between group">
          <div className="flex justify-between items-start gap-1">
            <span className="text-xs font-semibold text-slate-400 group-hover:text-cyan-300 transition-colors tracking-wider">平均在庫日数</span>
            <span className="p-1 px-1.5 rounded text-[9px] uppercase font-mono tracking-tight font-bold bg-cyan-950/85 text-cyan-400 border border-cyan-900/30">DURATION</span>
          </div>
          <div className="mt-4 flex items-baseline space-x-2">
            <span className="text-2xl md:text-3xl font-extrabold text-cyan-400 tracking-tight group-hover:scale-[1.02] origin-left transition-transform">{averageStockDays}</span>
            <span className="text-xs text-slate-500">日分</span>
          </div>
        </div>
      </div>

      {/* Main Panel Content Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Stock Alerts Column - Left span 2 */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl shadow-black/20 backdrop-blur-sm">
            <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/90 flex justify-between items-center">
              <h3 className="text-sm font-semibold tracking-wide text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500 animate-pulse" />
                緊急・警告対象のアラート ({highPriorityAlerts.length}件)
              </h3>
              <button
                onClick={() => onTabChange('recommendations')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition-all"
              >
                発注推奨リストで詳細を見る &rarr;
              </button>
            </div>
            
            <div className="p-4 space-y-3.5 max-h-[440px] overflow-y-auto">
              {highPriorityAlerts.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <ShieldCheck className="w-12 h-12 text-emerald-500/30 mx-auto mb-2" />
                  <p className="text-xs font-medium">現在、在庫切れ寸前（在庫日数15日未満）の緊急商品はありません。</p>
                  <p className="text-[10px] text-slate-605 mt-1">すべてのカテゴリで十分な安全在庫が確保されています。</p>
                </div>
              ) : (
                highPriorityAlerts.map((item) => (
                  <motion.div
                    key={item.product.sku}
                    animate={{
                      boxShadow: [
                        "0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -2px rgba(0, 0, 0, 0.15)",
                        "0 10px 20px -3px rgba(244, 63, 94, 0.08), 0 4px 6px -4px rgba(244, 63, 94, 0.08)",
                        "0 4px 6px -1px rgba(0, 0, 0, 0.15), 0 2px 4px -2px rgba(0, 0, 0, 0.15)"
                      ],
                      borderColor: [
                        "rgba(244, 63, 94, 0.2)",
                        "rgba(244, 63, 94, 0.45)",
                        "rgba(244, 63, 94, 0.2)"
                      ],
                      backgroundColor: [
                        "rgba(244, 63, 94, 0.015)",
                        "rgba(244, 63, 94, 0.045)",
                        "rgba(244, 63, 94, 0.015)"
                      ]
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="p-4 rounded-xl border border-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-rose-950/80 border border-rose-900/60 text-rose-400 font-bold px-2.5 py-0.5 rounded text-[10px]">
                          在庫僅少: {item.stockDays}日分
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium font-mono">
                          {item.product.brand}
                        </span>
                        {item.product.setQuantity > 1 && (
                          <span className="bg-amber-950/80 text-amber-300 border border-amber-900/40 text-[10px] font-bold px-1.5 py-0.2 rounded">
                            セット数 ×{item.product.setQuantity}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-slate-200 leading-snug">{item.product.name}</p>
                      <p className="text-[11px] text-slate-450 font-mono">SKU: {item.product.sku} / FBA SKU: {item.product.fbaSku || 'なし'}</p>
                    </div>

                    <div className="flex items-center gap-6 self-start sm:self-auto shrink-0 font-mono">
                      <div className="text-right">
                        <p className="text-slate-500 text-[10px] tracking-wide">現在庫</p>
                        <p className="font-bold text-rose-450">{item.totalStock} <span className="text-[10px] text-slate-500 font-sans">個</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-slate-500 text-[10px] tracking-wide">月販売数</p>
                        <p className="font-bold text-slate-350">{item.monthlySales} <span className="text-[10px] text-slate-500 font-sans">個</span></p>
                      </div>
                      <div className="text-right bg-rose-950/60 p-2 px-3 rounded-lg border border-rose-900/60">
                        <p className="text-rose-350 text-[10px] font-bold tracking-wide">推奨発注</p>
                        <p className="font-extrabold text-white text-sm">+{item.recommendedQty} <span className="text-[10px] text-rose-300 font-sans">個</span></p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Setup tips and documentation for new users */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 text-xs text-slate-300 shadow-inner">
            <h4 className="font-semibold text-sm mb-3 text-slate-100 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              セット商品の在庫・販売計算の仕組み
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="font-semibold text-emerald-450">1. 自動名寄せとリンク</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  インポートされた在庫や販売データは、商品マスタの「SKU」「FBA SKU」「Excel商品コード」を元に統合されます。いずれかが一致するだけで自動的に計算対象となります。
                </p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-emerald-450">2. セット数（×2、×3）の換算</p>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  セット入数が「2」や「3」の複数量パック商品は、販売数が自動的にセット数分掛け合わされて計上されます。これにより、実際の物理消費ベースでの高精度な発注推奨が可能です。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Brand Balance Share - Right span 1 */}
        <div className="space-y-6">
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between h-full min-h-[350px] backdrop-blur-sm shadow-black/20">
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-slate-100 mb-3 flex items-center gap-2">
                <Package className="w-4 h-4 text-indigo-400" />
                ブランド別在庫ボリューム
              </h3>
              <p className="text-[11px] text-slate-450 mb-4 leading-normal">
                各ブランドに現在登録されている統合在庫数（FBA + RSL + ロジ）の合計値
              </p>
              
              <div className="space-y-3.5">
                {Object.entries(brandInventoryStats).length === 0 ? (
                  <p className="text-xs text-slate-550 py-6 text-center">商品・在庫データを登録してください</p>
                ) : (
                  Object.entries(brandInventoryStats).map(([brand, cap]) => {
                    // find a max to scale bars
                    const maxCap = Math.max(...Object.values(brandInventoryStats), 100);
                    const percentage = Math.min((cap / maxCap) * 100, 100);
                    return (
                      <div key={brand} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-350">{brand}</span>
                          <span className="text-slate-100 font-bold font-mono">{cap.toLocaleString()} 個</span>
                        </div>
                        <div className="w-full bg-slate-800/80 h-2.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-800/60">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2 font-mono">
                ショートカット
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => onTabChange('products')}
                  className="bg-slate-950/80 hover:bg-slate-850 p-2 text-center rounded border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
                >
                  商品マスタ編集
                </button>
                <button
                  onClick={() => onTabChange('inventory')}
                  className="bg-slate-950/80 hover:bg-slate-850 p-2 text-center rounded border border-slate-800 hover:border-slate-700 text-slate-300 transition-colors"
                >
                  在庫レポート
                </button>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
