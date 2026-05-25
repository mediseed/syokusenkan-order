/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GitFork, Search } from 'lucide-react';
import { ProductMaster } from '../types';

interface BrandIntegrationPanelProps {
  products: ProductMaster[];
  onUpdateProduct: (product: ProductMaster) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function BrandIntegrationPanel({
  products,
  onUpdateProduct,
  addToast
}: BrandIntegrationPanelProps) {
  const [parentSku, setParentSku] = useState('');
  const [parentSearchTerm, setParentSearchTerm] = useState('');
  const [selectedChildSku, setSelectedChildSku] = useState('');
  const [childQty, setChildQty] = useState(1);
  const [tempBundleItems, setTempBundleItems] = useState<{ sku: string; quantity: number }[]>([]);

  const handleSelectParentProduct = (sku: string) => {
    setParentSku(sku);
    const parentProd = products.find(p => p.sku === sku);
    if (parentProd) {
      setTempBundleItems(parentProd.bundleItems ? [...parentProd.bundleItems] : []);
    } else {
      setTempBundleItems([]);
    }
    setSelectedChildSku('');
    setChildQty(1);
  };

  const handleAddChildToParent = () => {
    if (!parentSku) {
      addToast('統合先の親商品（セット商品）を選択してください。', 'warning');
      return;
    }
    if (!selectedChildSku) {
      addToast('構成（子）にする単品商品を選択してください。', 'warning');
      return;
    }
    if (selectedChildSku === parentSku) {
      addToast('親商品自身を構成単品として登録することはできません。', 'error');
      return;
    }
    if (tempBundleItems.some(item => item.sku === selectedChildSku)) {
      addToast('この単品商品はすでに構成品目に入っています。', 'warning');
      return;
    }
    if (childQty < 1) {
      addToast('個数は1以上を設定してください。', 'error');
      return;
    }

    setTempBundleItems(prev => [...prev, { sku: selectedChildSku, quantity: childQty }]);
    setSelectedChildSku('');
    setChildQty(1);
    addToast('構成単品をリストに追加しました。画面下の「ブランド統合を保存」を押して確定させてください。', 'success');
  };

  const handleRemoveChildFromParent = (skuToRemove: string) => {
    setTempBundleItems(prev => prev.filter(item => item.sku !== skuToRemove));
  };

  const handleSaveBrandIntegration = () => {
    const parentProd = products.find(p => p.sku === parentSku);
    if (!parentProd) {
      addToast('親商品が見つかりません。', 'error');
      return;
    }

    // Accumulate total items multiplier count
    const totalSetQuantity = tempBundleItems.reduce((acc, curr) => acc + curr.quantity, 0);

    const updatedProduct: ProductMaster = {
      ...parentProd,
      isBundle: tempBundleItems.length > 0,
      bundleItems: tempBundleItems.length > 0 ? tempBundleItems : undefined,
      setQuantity: Math.max(1, totalSetQuantity)
    };

    onUpdateProduct(updatedProduct);
    addToast(`親商品「${parentProd.name}」と単品商品のブランド統合（親子セット構成）を保存しました！`, 'success');
  };

  const parentProd = products.find(p => p.sku === parentSku);

  const parentCandidates = React.useMemo(() => {
    return products.filter(p => {
      // 1. Only allow if "isBundle" (セット商品区分) is checked
      const isParentBundle = !!p.isBundle;
      if (!isParentBundle && p.sku !== parentSku) {
        return false;
      }

      // 2. Filter by search query
      if (!parentSearchTerm) return true;
      const term = parentSearchTerm.toLowerCase();
      return p.name.toLowerCase().includes(term) || 
             p.sku.toLowerCase().includes(term) || 
             p.brand.toLowerCase().includes(term);
    });
  }, [products, parentSearchTerm, parentSku]);

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Explanatory Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex items-start gap-3.5">
        <div className="p-2 bg-indigo-950/80 border border-indigo-900 text-indigo-400 rounded-lg shrink-0 mt-0.5">
          <GitFork className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-200">
            マスタ統合 (ブランドごと) ── 単品商品と複数セット商品の親子連携
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed md:w-[95%]">
            2袋セットや3袋セット、お茶詰め合わせ袋などの「複数入り・セット商品」が、どの「単品マスタ」から構成されているかを指定して統合管理します。
            <b className="text-indigo-400 ml-1">【例】</b>「温活農園 あずき茶 1袋（単品）」と「温活農園 あずき茶 2袋セット（複数）」を統合する場合：親商品に「2袋セット」を選択し、構成品目に「1袋（単品）」を数量「2」で紐付けて保存します。これにより出荷・発注時の単品換算が自動化されます。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left: Parent Product Selector */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md">
          {/* Parent Search Input */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400">
              親商品の簡易検索 (セット商品のみ対象):
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="SKU・商品名で絞り込み..."
                value={parentSearchTerm}
                onChange={(e) => setParentSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg pl-9 pr-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-650"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-slate-400">
              統合先の親商品（セット・複数パック）を選択:
            </label>
            <select
              value={parentSku}
              onChange={(e) => handleSelectParentProduct(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-2.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
            >
              <option value="">-- 親（セット）商品を選択してください --</option>
              {parentCandidates.map(p => (
                <option key={p.sku} value={p.sku}>
                  【{p.brand}】 {p.name} ({p.sku}) {p.setQuantity > 1 ? `[既存セット:${p.setQuantity}倍]` : ''}
                </option>
              ))}
            </select>
            {parentSearchTerm && (
              <p className="text-[10px] text-indigo-400 font-mono">
                検索ヒット: {parentCandidates.length} 件 (セット登録品)
              </p>
            )}
          </div>

          {parentSku && parentProd ? (
            <div className="bg-slate-950 rounded-lg p-3.5 border border-slate-800 space-y-3">
              <div className="flex justify-between items-start">
                <span className="bg-slate-900 text-indigo-400 border border-indigo-900/60 text-[9px] font-bold px-2 py-0.5 rounded">
                  親に選択中
                </span>
                <span className="font-mono text-[9px] text-slate-500">
                  SKU: {parentProd.sku}
                </span>
              </div>
              <div className="space-y-1">
                <h5 className="text-[11px] font-bold text-slate-100 leading-snug">
                  {parentProd.name}
                </h5>
                <p className="text-[10px] text-slate-500">
                  ブランド: {parentProd.brand} | 仕様: {parentProd.volume} ({parentProd.weight}g) | カテゴリ: {parentProd.category}
                </p>
              </div>
              <div className="border-t border-slate-900 pt-2 flex justify-between items-center text-[11px]">
                <span className="text-slate-400 font-medium">現在の登録セット入数:</span>
                <span className="text-amber-400 font-bold font-mono bg-amber-955 px-2 py-0.5 rounded border border-amber-900 text-[10px]">
                  {parentProd.setQuantity}倍 (単品 {parentProd.setQuantity}個換算)
                </span>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-950/40 text-slate-500 text-xs border border-dashed border-slate-800 rounded-lg">
              親商品を選択すると詳細情報と構成エディタが表示されます。
            </div>
          )}
        </div>

        {/* Right: Child Item Composition Editor */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
              <h5 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                🔗 構成単品（統合される側）の設定
              </h5>
              {parentSku && (
                <span className="text-[10px] text-slate-500 font-mono">
                  構成アイテム数: {tempBundleItems.length}
                </span>
              )}
            </div>

            {parentSku ? (
              <div className="space-y-4">
                {/* Add child form inline */}
                <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-3 space-y-3">
                  <p className="text-[10px] text-slate-400 font-semibold">
                    ＋ 構成に入れる単品商品と数量を追加してください：
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <select
                        value={selectedChildSku}
                        onChange={(e) => setSelectedChildSku(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="">-- 単品商品（子）を選択 --</option>
                        {products
                          .filter(p => p.sku !== parentSku && !tempBundleItems.some(item => item.sku === p.sku))
                          .map(p => (
                            <option key={p.sku} value={p.sku}>
                              【{p.brand}】 {p.name} ({p.sku}) [入数 {p.setQuantity}]
                            </option>
                          ))
                        }
                      </select>
                    </div>
                    <div className="w-full sm:w-28 flex items-center gap-1 shrink-0">
                      <input
                        type="number"
                        min="1"
                        value={childQty}
                        onChange={(e) => setChildQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="bg-slate-900 border border-slate-800 text-slate-100 text-xs rounded-lg px-2 py-1.5 w-full font-mono text-center focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        placeholder="個数"
                      />
                      <span className="text-slate-500 text-[10px] shrink-0">個入</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddChildToParent}
                      className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-900/60 text-emerald-400 text-xs font-bold px-4 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                    >
                      追加
                    </button>
                  </div>
                </div>

                {/* Temporary links table list */}
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-400 font-semibold font-sans">
                    接続されている単品（この親セットに含まれる中身）一覧:
                  </p>
                  {tempBundleItems.length === 0 ? (
                    <div className="text-center py-6 bg-slate-950/30 rounded border border-dashed border-slate-800/80 text-[11px] text-slate-500">
                      構成単品がまだ登録されていません。上の追加フォームから選択登録してください。
                    </div>
                  ) : (
                    <div className="border border-slate-850 bg-slate-950 rounded-lg overflow-hidden divide-y divide-slate-850/80">
                      {tempBundleItems.map((item, idx) => {
                        const childProd = products.find(p => p.sku === item.sku);
                        return (
                          <div key={idx} className="flex items-center justify-between p-2.5 hover:bg-slate-900/30 transition-colors">
                            <div className="space-y-0.5 max-w-[80%]">
                              <p className="text-slate-200 font-bold leading-tight">
                                {childProd ? childProd.name : item.sku}
                              </p>
                              <p className="text-[10px] text-slate-500 font-mono">
                                SKU: {item.sku} | 仕様: {childProd ? childProd.volume : '-'}
                              </p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="bg-indigo-950 text-indigo-300 font-bold font-mono px-2 py-0.5 rounded text-[10px] border border-indigo-900/50">
                                × {item.quantity} 個
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveChildFromParent(item.sku)}
                                className="p-1 px-1.5 text-rose-450 hover:text-rose-300 rounded bg-slate-900 border border-slate-800 text-[11px] font-bold"
                                title="紐付け解除"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 text-slate-600 text-xs border border-dashed border-slate-800/60 rounded-lg">
                左側で親商品（セット商品）を選択すると、構成商品の紐付け編集がおこなえます。
              </div>
            )}
          </div>

          {parentSku && (
            <div className="pt-4 border-t border-slate-800/80 mt-6 flex justify-between items-center bg-slate-950/30 -mx-4 -mb-4 p-4 rounded-b-xl">
              <div className="text-[10px] text-slate-500 leading-normal max-w-[65%]">
                ※ 「ブランド統合を保存」を押すと、親商品のセット区分がONになり、各単品の入数が合算されて反映されます。
              </div>
              <button
                type="button"
                onClick={handleSaveBrandIntegration}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-md"
              >
                ブランド統合を保存
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
