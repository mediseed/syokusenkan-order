/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Layers, Search, X, Plus, Check, AlertCircle, HelpCircle } from 'lucide-react';
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
  // Navigation / Selected State
  const [selectedIntCode, setSelectedIntCode] = useState('');
  const [isCreatingNewIntGroup, setIsCreatingNewIntGroup] = useState(false);

  // States for Editing/Active parameter fields
  const [newIntCode, setNewIntCode] = useState('');
  const [newIntName, setNewIntName] = useState('');
  const [newIntMaker, setNewIntMaker] = useState('');
  const [newIntFiller, setNewIntFiller] = useState('');
  const [newIntLotKg, setNewIntLotKg] = useState<number>(20);
  const [selectedProductsForInt, setSelectedProductsForInt] = useState<Record<string, boolean>>({});

  // Search filter terms for the main screen
  const [groupSearchTerm, setGroupSearchTerm] = useState('');
  const [productSearchTerm, setProductSearchTerm] = useState('');

  // -------------------------------------------------------------
  // STATES SPECIFIC TO THE NEW RAW MATERIAL MODAL POPUP
  // -------------------------------------------------------------
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalIntCode, setModalIntCode] = useState('');
  const [modalIntName, setModalIntName] = useState('');
  const [modalIntMaker, setModalIntMaker] = useState('');
  const [modalIntFiller, setModalIntFiller] = useState('');
  const [modalIntLotKg, setModalIntLotKg] = useState<number>(20);
  const [modalSelectedProducts, setModalSelectedProducts] = useState<Record<string, boolean>>({});
  const [modalProductSearch, setModalProductSearch] = useState('');

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

  // Handle Raw Material list Search Filtering
  const filteredIngredientGroups = useMemo(() => {
    return ingredientGroups.filter(g => {
      if (!groupSearchTerm) return true;
      const term = groupSearchTerm.toLowerCase();
      return (
        g.code.toLowerCase().includes(term) ||
        g.name.toLowerCase().includes(term) ||
        g.maker.toLowerCase().includes(term) ||
        g.filler.toLowerCase().includes(term)
      );
    });
  }, [ingredientGroups, groupSearchTerm]);

  // Left group list selection mapping
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

  // Open the Create New Raw Material modal dialog
  const handleOpenCreateModal = () => {
    setModalIntCode('');
    setModalIntName('');
    setModalIntMaker('');
    setModalIntFiller('');
    setModalIntLotKg(20);
    setModalProductSearch('');
    
    // Default select all products in mock database that don't have other codes to start with?
    // Let's keep it empty and let the user select.
    setModalSelectedProducts({});
    setIsModalOpen(true);
  };

  // Save integration from Main Page (editing an existing selected group)
  const handleSaveIngredientIntegration = () => {
    const codeToUse = selectedIntCode;
    
    if (!codeToUse) {
      addToast('原料統合コードは必須です。', 'error');
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

    addToast(`原料統合コード「${codeToUse}」の紐付け情報と各種ロット設定を一括保存しました！（統合:${updateCount}品 / 除外:${clearCount}品）`, 'success');
  };

  // Save function inside the modal popup
  const handleSaveNewModalGroup = () => {
    const code = modalIntCode.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!code) {
      addToast('原料統合コード（アルファベット等のキー：例: azuki）は必須です。', 'error');
      return;
    }

    if (products.some(p => p.integrationCode === code)) {
      addToast(`指定された統合コード「${code}」はすでに他の原料で使用されています。別のコードを入力してください。`, 'error');
      return;
    }

    const nameToUse = modalIntName.trim() || `${code}共通原料`;
    const finalMaker = modalIntMaker.trim();
    const finalFiller = modalIntFiller.trim();
    const finalLotKg = modalIntLotKg;

    let updateCount = 0;

    // Apply code and settings to checked products
    products.forEach(p => {
      const isChecked = !!modalSelectedProducts[p.sku];
      if (isChecked) {
        const updated: ProductMaster = {
          ...p,
          integrationCode: code,
          rawMaterialProducer: finalMaker || p.rawMaterialProducer,
          fillingParty: finalFiller || p.fillingParty,
          orderUnitKg: finalLotKg
        };
        onUpdateProduct(updated);
        updateCount++;
      }
    });

    addToast(`新規原料「${nameToUse}」の作成と ${updateCount} 品の紐付けに成功しました！`, 'success');
    
    // Select this newly registered item on the main screen for immediate view/further adjustments
    setSelectedIntCode(code);
    setIsCreatingNewIntGroup(false);
    
    // Update main parameter editor fields
    setNewIntCode(code);
    setNewIntName(nameToUse);
    setNewIntMaker(finalMaker);
    setNewIntFiller(finalFiller);
    setNewIntLotKg(finalLotKg);

    // Sync selected items list checkbox state for main screen
    const checks: Record<string, boolean> = {};
    products.forEach(p => {
      checks[p.sku] = (p.integrationCode === code || !!modalSelectedProducts[p.sku]);
    });
    setSelectedProductsForInt(checks);

    // Close the Modal
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-4 font-sans text-xs">
      {/* Introduction Banner Card */}
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
        {/* Left Column: Int Code List & Selected Parameter Editor */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[500px]">
          <div className="space-y-3 flex-1">
            
            {/* Header section with Create Popup Button */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="text-[11px] font-bold text-slate-400">
                統合原料（グループ）一覧
              </span>
              <button
                type="button"
                id="open-create-modal-btn"
                onClick={handleOpenCreateModal}
                className="bg-emerald-600 hover:bg-emerald-500 border border-emerald-750 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
              >
                <Plus className="w-3 h-3" />
                <span>新規原料作成</span>
              </button>
            </div>

            {/* List search input filter */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="原料名、メーカー、キーで絞り込み..."
                value={groupSearchTerm}
                onChange={(e) => setGroupSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Groups listing selection */}
            <div className="space-y-1.5 max-h-[190px] overflow-y-auto pr-1 border border-slate-850/40 rounded-lg p-1 bg-slate-950/40">
              {filteredIngredientGroups.length === 0 ? (
                <p className="text-center py-8 text-[10.5px] text-slate-500 italic">
                  {groupSearchTerm ? '一致する統合原料が見つかりません。' : '現在、統合された原料はありません。'}
                </p>
              ) : (
                filteredIngredientGroups.map(g => (
                  <button
                    key={g.code}
                    type="button"
                    onClick={() => handleSelectIntGroup(g.code)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition transition-all block cursor-pointer ${
                      selectedIntCode === g.code
                        ? 'bg-emerald-950/40 border-emerald-800 text-slate-100 shadow-sm'
                        : 'bg-slate-950 border-slate-850 text-slate-450 hover:bg-slate-900/40 hover:text-slate-200'
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

            {/* Selected Group Editing Parameters Form */}
            {selectedIntCode ? (
              <div className="border-t border-slate-850 pt-3 space-y-3">
                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 font-sans">
                  ⚙️ 原料統合パラメータの編集
                </span>

                <div className="space-y-3.5 text-[11px] bg-slate-950/40 p-3 rounded-lg border border-slate-850/60">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 font-medium font-mono">統合コード</label>
                      <input
                        type="text"
                        disabled={true}
                        value={newIntCode}
                        className="w-full bg-slate-900 border border-slate-800 text-slate-500 font-mono text-xs rounded p-2 focus:outline-none cursor-not-allowed opacity-60"
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
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded p-2 focus:outline-none shrink-0"
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
                        className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded p-2 focus:outline-none shrink-0"
                      >
                        <option value="">-- 未選択 --</option>
                        {manufacturers.filter(m => m.type === '製造').map(m => (
                          <option key={m.id} value={m.name}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 font-medium font-sans">仕入（調達）発注ロット単位 (kg単位)</label>
                    <div className="flex items-center gap-1.5 mt-0.5 animate-pulse-once">
                      <input
                        type="number"
                        min="1"
                        value={newIntLotKg}
                        onChange={(e) => setNewIntLotKg(Math.max(1, parseInt(e.target.value, 15) || 20))}
                        className="w-24 bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs rounded p-2 text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 font-bold"
                      />
                      <span className="text-slate-500 text-[10px]">kg 単位</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-slate-850 border-dashed rounded-lg py-12 text-center text-slate-500 text-[11px] leading-relaxed">
                一覧から既存の統合原料（グループ）を選択するか、または上の「＋ 新規原料作成」ボタンをクリックして新原料を登録（親子紐付け）してください。
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkbox Product Selector Grid with Search Filter */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md flex flex-col justify-between min-h-[500px]">
          <div className="space-y-4">
            
            {/* Header and status badge */}
            <div className="border-b border-slate-800 pb-2.5 flex items-center justify-between">
              <h5 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                🍃 この原料を使って統合（グループ化）するお茶商品
              </h5>
              {selectedIntCode && (
                <span className="text-[10px] bg-slate-950 text-indigo-400 px-2 py-0.5 border border-slate-850 rounded font-bold font-mono">
                  選択中キー: {selectedIntCode}
                </span>
              )}
            </div>

            {selectedIntCode ? (
              <div className="space-y-3">
                <p className="text-[10px] text-slate-400 leading-normal font-sans">
                  以下の商品の中から、同一のバルク原料（統合キー）を使用しているお茶商品をチェックして紐付けてください（別ブランドであっても同一原料のお茶は同じキーに統合されます）。
                </p>

                {/* SEARCH INPUT for active list link */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="紐付け対象のお茶商品を商品名・SKU等で検索..."
                    value={productSearchTerm}
                    onChange={(e) => setProductSearchTerm(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Product checkbox scrolled list */}
                <div className="max-h-[300px] overflow-y-auto border border-slate-850 rounded-lg divide-y divide-slate-850/80 bg-slate-950 pr-1 select-none">
                  {(() => {
                    const teaProducts = products.filter(p => !p.isBundle && p.category === 'お茶');

                    if (teaProducts.length === 0) {
                      return <p className="p-10 text-center text-slate-650 text-xs">有効なお茶カテゴリの単品商品がありません。</p>;
                    }

                    const filteredPrs = teaProducts.filter(p => {
                      if (!productSearchTerm) return true;
                      const term = productSearchTerm.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(term) ||
                        p.sku.toLowerCase().includes(term) ||
                        p.brand.toLowerCase().includes(term)
                      );
                    });

                    if (filteredPrs.length === 0) {
                      return <p className="p-10 text-center text-slate-650 text-xs">検索キーワードに合致するお茶商品はありません。</p>;
                    }

                    return filteredPrs.map(p => {
                      const isChecked = !!selectedProductsForInt[p.sku];
                      const otherCode = p.integrationCode;
                      const currentlyHasOtherCode = otherCode && otherCode !== selectedIntCode;

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
                            className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-800 focus:ring-emerald-500 cursor-pointer shrink-0"
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
                    });
                  })()}
                </div>
              </div>
            ) : (
              <div className="text-center py-24 text-slate-500 text-xs border border-dashed border-slate-800/60 rounded-lg max-w-sm mx-auto my-auto leading-relaxed">
                左側で対象の原料を選択すると、ここに統合可能な商品（お茶カテゴリのみ）一覧が表示され、紐付けをチェック登録することができます。
              </div>
            )}
          </div>

          {selectedIntCode && (
            <div className="pt-4 border-t border-slate-800/80 mt-6 flex justify-between items-center bg-slate-950/30 -mx-4 -mb-4 p-4 rounded-b-xl gap-4">
              <div className="text-[10px] text-slate-500 leading-normal max-w-[60%]">
                ※ 「原料統合を確定・保存」を押すと、選択されたお茶製品に対し、一括して上記のメーカー特性及び発注ロットを同期保存します。
              </div>
              <button
                type="button"
                id="save-integration-btn"
                onClick={handleSaveIngredientIntegration}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition-colors cursor-pointer shadow-md shrink-0"
              >
                原料統合を確定・保存する
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Pop-up Modal for creating raw material group */}
      {isModalOpen && (
        <div id="new-ingredient-modal-overlay" className="fixed inset-0 bg-slate-955/85 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div id="new-ingredient-modal-card" className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 bg-slate-950">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-emerald-400 animate-pulse" />
                <h3 className="text-sm font-bold text-slate-100 font-sans">新規購入原料（共通グループ）の登録</h3>
              </div>
              <button
                type="button"
                id="close-modal-btn"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body (Scrollable container to prevent overflow) */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[calc(90vh-140px)]">
              
              {/* Grid block for code & title */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400 font-mono">原料統合コード *</label>
                  <input
                    type="text"
                    value={modalIntCode}
                    onChange={(e) => setModalIntCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
                    placeholder="例: azuki, gobou, hatomugi"
                    className="w-full bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-550"
                  />
                  <p className="text-[9px] text-slate-500 font-mono leading-none mt-0.5">※英数字・ハイフン・アンダースコア（一意）</p>
                </div>
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400">原料グループ名 *</label>
                  <input
                    type="text"
                    value={modalIntName}
                    onChange={(e) => setModalIntName(e.target.value)}
                    placeholder="例: あずき茶共通原料..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-550"
                  />
                </div>
              </div>

              {/* Manufacturers dropdowns */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400">仕入原料メーカー</label>
                  <select
                    value={modalIntMaker}
                    onChange={(e) => setModalIntMaker(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-550 cursor-pointer"
                  >
                    <option value="">-- 未選択 --</option>
                    {manufacturers.filter(m => m.type === '原料').map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400">充填加工工場</label>
                  <select
                    value={modalIntFiller}
                    onChange={(e) => setModalIntFiller(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-550 cursor-pointer"
                  >
                    <option value="">-- 未選択 --</option>
                    {manufacturers.filter(m => m.type === '製造').map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Order Lot kg */}
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-400">仕入（調達）発注ロット単位 (kg単位) *</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    value={modalIntLotKg}
                    onChange={(e) => setModalIntLotKg(Math.max(1, parseInt(e.target.value, 15) || 20))}
                    className="w-24 bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-xs rounded-lg p-2.5 text-center focus:outline-none focus:ring-1 focus:ring-emerald-550 font-bold"
                  />
                  <span className="text-slate-400 text-xs">kg（原料袋・ドラム缶発注ロット目安: 20kg、100kg 等）</span>
                </div>
              </div>

              {/* Product link association checklist with built-in SEARCH field */}
              <div className="space-y-2 border-t border-slate-800 pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="block text-[11px] font-bold text-emerald-400">
                    🍃 初期紐付ける商品の登録・選択（お茶カテゴリのみ）
                  </label>
                  {/* Select All / Deselect All */}
                  <div className="flex gap-2 text-[9px] text-slate-500 font-medium">
                    <button
                      type="button"
                      id="modal-select-all"
                      onClick={() => {
                        const next: Record<string, boolean> = {};
                        products.filter(p => !p.isBundle && p.category === 'お茶').forEach(p => {
                          next[p.sku] = true;
                        });
                        setModalSelectedProducts(next);
                      }}
                      className="hover:text-emerald-400 transition-colors"
                    >
                      すべて選択
                    </button>
                    <span>|</span>
                    <button
                      type="button"
                      id="modal-deselect-all"
                      onClick={() => setModalSelectedProducts({})}
                      className="hover:text-rose-450 transition-colors"
                    >
                      選択解除
                    </button>
                  </div>
                </div>

                {/* Sub search input inside registration modal */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={modalProductSearch}
                    onChange={(e) => setModalProductSearch(e.target.value)}
                    placeholder="登録時：商品名・SKUで紐付ける対象を絞り込み検索..."
                    className="w-full bg-slate-950 border border-slate-800 text-slate-205 text-[11px] rounded-lg pl-8 pr-3 py-2.5 focus:ring-1 focus:ring-emerald-550 focus:outline-none transition-all"
                  />
                </div>

                {/* Scrolled list inside modal */}
                <div className="border border-slate-850 rounded-lg max-h-[160px] overflow-y-auto divide-y divide-slate-850/80 bg-slate-950 pr-1">
                  {(() => {
                    const teaProducts = products.filter(p => !p.isBundle && p.category === 'お茶');

                    if (teaProducts.length === 0) {
                      return <p className="p-6 text-center text-slate-650 text-xs">有効なお茶カテゴリの単品商品がありません。</p>;
                    }

                    const filteredPrs = teaProducts.filter(p => {
                      if (!modalProductSearch) return true;
                      const term = modalProductSearch.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(term) ||
                        p.sku.toLowerCase().includes(term) ||
                        p.brand.toLowerCase().includes(term)
                      );
                    });

                    if (filteredPrs.length === 0) {
                      return <p className="p-6 text-center text-slate-650 text-xs">検索条件に合致するお茶商品はありません。</p>;
                    }

                    return filteredPrs.map(p => {
                      const isChecked = !!modalSelectedProducts[p.sku];
                      return (
                        <div
                          key={p.sku}
                          onClick={() => {
                            setModalSelectedProducts(prev => ({
                              ...prev,
                              [p.sku]: !isChecked
                            }));
                          }}
                          className={`flex items-center gap-3 p-2 hover:bg-slate-900/60 cursor-pointer select-none transition-all ${
                            isChecked ? 'bg-emerald-950/20' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="w-3.5 h-3.5 rounded text-emerald-600 bg-slate-950 border-slate-800 focus:ring-emerald-500 cursor-pointer shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.2 rounded text-[8px] font-bold">
                                {p.brand}
                              </span>
                              <span className="text-slate-200 font-medium text-xs truncate max-w-[280px]">
                                {p.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[9px] font-mono text-slate-500 mt-0.5">
                              <span>SKU: {p.sku}</span>
                              {p.integrationCode && (
                                <span className="text-amber-500 font-bold text-[8.5px]">
                                  (現在:「{p.integrationCode}」に紐付け済)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-800 px-5 py-3.5 bg-slate-950 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 max-w-[45%] leading-relaxed">
                ※「確定・登録する」を押すと、チェックされた全ての商品へこの原料グループ設定が自動適用されます。
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="cancel-modal-btn"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-900 hover:bg-slate-850 px-4 py-2 border border-slate-800 text-slate-400 hover:text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  id="submit-modal-btn"
                  onClick={handleSaveNewModalGroup}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-md"
                >
                  確定・登録する
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
