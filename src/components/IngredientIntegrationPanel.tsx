/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Layers } from 'lucide-react';
import { ProductMaster, Manufacturer } from '../types';

interface IngredientIntegrationPanelProps {
  products: ProductMaster[];
  manufacturers: Manufacturer[];
  onUpdateProduct: (product: ProductMaster) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function IngredientIntegrationPanel({
  products,
  manufacturers,
  onUpdateProduct,
  addToast
}: IngredientIntegrationPanelProps) {
  const [selectedIntCode, setSelectedIntCode] = useState('');
  const [isCreatingNewIntGroup, setIsCreatingNewIntGroup] = useState(false);
  const [newIntCode, setNewIntCode] = useState('');
  const [newIntName, setNewIntName] = useState('');
  const [newIntMaker, setNewIntMaker] = useState('');
  const [newIntFiller, setNewIntFiller] = useState('');
  const [newIntLotKg, setNewIntLotKg] = useState<number>(20);
  const [selectedProductsForInt, setSelectedProductsForInt] = useState<Record<string, boolean>>({});

  // Compute brand integration groups based on active products containing integration codes
  const ingredientGroups = useMemo(() => {
    const groups: Record<string, {
      code: string;
      name: string;
      maker: string;
      filler: string;
      lotUnitKg: number;
      productsCount: number;
      productNames: string[];
    }> = {};

    products.forEach(p => {
      if (p.integrationCode) {
        const code = p.integrationCode;
        if (!groups[code]) {
          // Infer pure name by clean replace
          const cleanName = p.name.replace(/(1袋|2袋セット|1包|.*袋|お試し|徳用|詰合せ).*$/, '').trim();
          groups[code] = {
            code,
            name: cleanName ? `${cleanName}原料_共通` : `${code}お茶原料`,
            maker: p.rawMaterialProducer || '',
            filler: p.fillingParty || '',
            lotUnitKg: p.orderUnitKg || 20,
            productsCount: 0,
            productNames: []
          };
        }
        groups[code].productsCount += 1;
        groups[code].productNames.push(`${p.brand} - ${p.name}`);
      }
    });

    return Object.values(groups);
  }, [products]);

  const handleSelectIntGroup = (code: string) => {
    setSelectedIntCode(code);
    setIsCreatingNewIntGroup(false);

    const checks: Record<string, boolean> = {};
    products.forEach(p => {
      checks[p.sku] = p.integrationCode === code && !!code;
    });
    setSelectedProductsForInt(checks);

    const group = ingredientGroups.find(g => g.code === code);
    if (group) {
      setNewIntCode(group.code);
      setNewIntName(group.name);
      setNewIntMaker(group.maker);
      setNewIntFiller(group.filler);
      setNewIntLotKg(group.lotUnitKg);
    } else {
      setNewIntCode('');
      setNewIntName('');
      setNewIntMaker('');
      setNewIntFiller('');
      setNewIntLotKg(20);
    }
  };

  const handleStartNewIntGroup = () => {
    setSelectedIntCode('__new__');
    setIsCreatingNewIntGroup(true);
    setNewIntCode('');
    setNewIntName('');
    setNewIntMaker('');
    setNewIntFiller('');
    setNewIntLotKg(20);
    setSelectedProductsForInt({});
  };

  const handleSaveIngredientIntegration = () => {
    const codeToUse = isCreatingNewIntGroup ? newIntCode.trim() : selectedIntCode;
    
    if (!codeToUse) {
      addToast('原料統合コード（アルファベット等のキー：例: azuki）は必須です。', 'error');
      return;
    }

    if (isCreatingNewIntGroup && products.some(p => p.integrationCode === codeToUse)) {
      addToast(`指定された統合コード「${codeToUse}」はすでに他の原料で使用されています。`, 'error');
      return;
    }

    const finalMaker = newIntMaker.trim();
    const finalFiller = newIntFiller.trim();
    const finalLotKg = newIntLotKg;

    let updateCount = 0;
    let clearCount = 0;

    products.forEach(p => {
      const isChecked = selectedProductsForInt[p.sku] || false;
      const currentlyHasCode = p.integrationCode === codeToUse;

      if (isChecked) {
        // Associate with this integration code
        const updated: ProductMaster = {
          ...p,
          integrationCode: codeToUse,
          rawMaterialProducer: finalMaker || p.rawMaterialProducer,
          fillingParty: finalFiller || p.fillingParty,
          orderUnitKg: finalLotKg
        };
        onUpdateProduct(updated);
        updateCount++;
      } else if (currentlyHasCode) {
        // Dissociate from this integration code
        const updated: ProductMaster = {
          ...p,
          integrationCode: undefined
        };
        onUpdateProduct(updated);
        clearCount++;
      }
    });

    addToast(`原料統合コード「${codeToUse}」の紐付け情報とメーカーロット設定を一括保存しました！（統合:${updateCount}品 / 除外:${clearCount}品）`, 'success');
    
    // Reset selections after saving
    setSelectedIntCode(codeToUse);
    setIsCreatingNewIntGroup(false);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex items-start gap-3.5">
        <div className="p-2 bg-emerald-950 border border-emerald-900 text-emerald-400 rounded-lg shrink-0 mt-0.5">
          <Layers className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-slate-200">
            マスタ統合 (原料ごと) ── 異なるお茶銘柄の共通原料統合
          </h4>
          <p className="text-[11px] text-slate-400 leading-relaxed md:w-[95%]">
            中身が全く同一の茶葉原料を使用している別ブランド製品や異なる仕様の製品を「共通原料コード」で紐付けます。これにより、発注調達シート上でお茶原料の自動合算及び、仕入メーカーへの発注ロット計算が最適化されます。
            <b className="text-emerald-400 ml-1">【例】</b>「温活農園 あずき茶」と「大福園 あずき茶」で同じ「あずき茶のバルク原料（azuki）」を使用する場合：どちらも同じ統合コードグループにチェックを適用して一括保存します。
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Left Column: Int Code List & Editor */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <span className="text-[11px] font-bold text-slate-400">
              統合原料（グループ）一覧
            </span>
            <button
              type="button"
              onClick={handleStartNewIntGroup}
              className="bg-emerald-955 hover:bg-emerald-900/80 border border-emerald-900/60 text-emerald-400 text-[10px] font-bold px-2.5 py-1 rounded transition-colors cursor-pointer"
            >
              ＋ 新規原料作成
            </button>
          </div>

          {/* Groups listing selection */}
          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
            {ingredientGroups.length === 0 ? (
              <p className="text-center py-6 text-[10.5px] text-slate-500">
                現在、統合された原料はありません。
              </p>
            ) : (
              ingredientGroups.map(g => (
                <button
                  key={g.code}
                  type="button"
                  onClick={() => handleSelectIntGroup(g.code)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition transition-all block cursor-pointer ${
                    selectedIntCode === g.code
                      ? 'bg-emerald-950/40 border-emerald-800 text-slate-100 shadow-sm'
                      : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900/40 hover:text-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-mono bg-slate-950 border border-slate-850/60 px-2 py-0.5 rounded font-bold text-slate-350 text-[10px]">
                      🔑 {g.code}
                    </span>
                    <span className="text-[8.5px] bg-emerald-950 text-emerald-400 border border-emerald-900/40 font-bold px-2 py-0.5 rounded leading-none">
                      {g.productsCount} 品が所属中
                    </span>
                  </div>
                  <p className="font-bold text-slate-200 text-[10.5px] tracking-wide truncate">
                    {g.name}
                  </p>
                  <p className="text-[9.5px] text-slate-500 mt-1 truncate font-sans">
                    メーカー: {g.maker || '未指定'} | ロット: {g.lotUnitKg}kg | 充填先: {g.filler || '未指定'}
                  </p>
                </button>
              ))
            )}
          </div>

          {/* Selected or New Group Editing Parameters Form */}
          {selectedIntCode ? (
            <div className="border-t border-slate-800/85 pt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 font-sans">
                ⚙️ 原料統合パラメータ設定 ({isCreatingNewIntGroup ? '新規原料追加' : '既存パラメータ編集'})
              </span>

              <div className="space-y-3.5 text-[11px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium font-mono">統合コード *</label>
                    <input
                      type="text"
                      disabled={!isCreatingNewIntGroup}
                      value={newIntCode}
                      onChange={(e) => setNewIntCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                      placeholder="例: azuki, gobou"
                      className="w-full bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-xs rounded p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium">原料名 (グループ名)</label>
                    <input
                      type="text"
                      value={newIntName}
                      onChange={(e) => setNewIntName(e.target.value)}
                      placeholder="例: あずき茶原料"
                      className="w-full bg-slate-950 border border-slate-800 text-slate-100 text-xs rounded p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium font-sans">仕入原料メーカー</label>
                    <select
                      value={newIntMaker}
                      onChange={(e) => setNewIntMaker(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded p-2 focus:outline-none"
                    >
                      <option value="">-- 未選択 --</option>
                      {manufacturers.filter(m => m.type === '原料').map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium font-sans">充填加工工場</label>
                    <select
                      value={newIntFiller}
                      onChange={(e) => setNewIntFiller(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded p-2 focus:outline-none"
                    >
                      <option value="">-- 未選択 --</option>
                      {manufacturers.filter(m => m.type === '製造').map(m => (
                        <option key={m.id} value={m.name}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 font-medium">仕入（調達）発注ロット単位 (kg単位)</label>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <input
                      type="number"
                      min="1"
                      value={newIntLotKg}
                      onChange={(e) => setNewIntLotKg(Math.max(1, parseInt(e.target.value, 10) || 20))}
                      className="w-24 bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs rounded p-2 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                    />
                    <span className="text-slate-500 text-[10px]">kg 単位</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-slate-800 pt-10 text-center text-slate-600 text-[11px]">
              既存の原料を選択するか、新規原料作成ボタンを押してください。
            </div>
          )}
        </div>

        {/* Right Column: Checkbox Product Selector Grid */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
              <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                🍃 この原料を使って統合（グループ化）するお茶商品
              </h5>
              {selectedIntCode && (
                <span className="text-[10px] bg-slate-950 text-indigo-400 px-2 py-0.5 border border-slate-800 rounded font-bold font-mono">
                  キー: {isCreatingNewIntGroup ? newIntCode || '(未入力)' : selectedIntCode}
                </span>
              )}
            </div>

            {selectedIntCode ? (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  以下の商品の中から、同一のバルク原料（統合キー）を使用しているお茶商品をチェックして紐付けてください（別ブランドであっても同一原料のお茶は同じ鍵に統合されます）。
                </p>

                <div className="max-h-[360px] overflow-y-auto border border-slate-850 rounded-lg divide-y divide-slate-850/80 bg-slate-950 pr-1">
                  {products.filter(p => !p.isBundle && p.category === 'お茶').length === 0 ? (
                    <p className="p-10 text-center text-slate-650 text-xs">有効なお茶カテゴリの単品商品がありません。</p>
                  ) : (
                    products
                      .filter(p => !p.isBundle && p.category === 'お茶')
                      .map(p => {
                        const isChecked = selectedProductsForInt[p.sku] || false;
                        const otherCode = p.integrationCode;
                        const currentlyHasOtherCode = otherCode && otherCode !== (isCreatingNewIntGroup ? newIntCode : selectedIntCode);

                        return (
                          <div
                            key={p.sku}
                            onClick={() => {
                              setSelectedProductsForInt(prev => ({
                                ...prev,
                                [p.sku]: !isChecked
                              }));
                            }}
                            className={`flex items-center gap-3.5 p-3 hover:bg-slate-900/40 cursor-pointer select-none transition-all ${
                              isChecked ? 'bg-emerald-950/20' : ''
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              readOnly
                              className="w-4.5 h-4.5 rounded text-emerald-600 bg-slate-950 border-slate-800 focus:ring-emerald-500 cursor-pointer shrink-0"
                            />
                            <div className="flex-1 space-y-0.5">
                              <span className="bg-slate-900 border border-slate-850 text-slate-400 px-2 py-0.5 rounded text-[9px] font-bold mr-1.5 select-none inline-block">
                                {p.brand}
                              </span>
                              <span className="text-slate-205 font-bold text-xs leading-none">
                                {p.name}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-[9px] font-mono text-slate-500">
                                <span>SKU: {p.sku}</span>
                                <span>|</span>
                                <span>仕様: {p.volume} ({p.weight}g)</span>
                                {currentlyHasOtherCode && (
                                  <span className="bg-amber-950/80 text-amber-400 border border-amber-900/50 px-2 py-0.2 rounded font-sans font-bold leading-normal text-[8.5px]">
                                    ⚠️ 他原料に登録済: {otherCode}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 text-slate-600 text-xs border border-dashed border-slate-800/50 rounded-lg">
                左側で対象の原料（あるいは新規作成）を選択すると、ここに統合可能な商品（お茶）一覧が表示されます。
              </div>
            )}
          </div>

          {selectedIntCode && (
            <div className="pt-4 border-t border-slate-800/80 mt-6 flex justify-between items-center bg-slate-950/30 -mx-4 -mb-4 p-4 rounded-b-xl">
              <div className="text-[10px] text-slate-500 leading-normal max-w-[65%]">
                ※ 「原料統合を確定・保存」を押すと、選択されたお茶製品に対し、一括して上記のメーカー特性及び発注ロットを同期保存します。
              </div>
              <button
                type="button"
                onClick={handleSaveIngredientIntegration}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-md"
              >
                原料統合を確定・保存する
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
