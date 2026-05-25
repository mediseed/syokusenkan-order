/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, SlidersHorizontal, ArrowUpDown, Download, Check, X, ToggleLeft, ToggleRight, GitFork, Layers, Boxes, Link, HelpCircle, Info } from 'lucide-react';
import { ProductMaster, Manufacturer } from '../types';
import { BRANDS, CATEGORIES } from '../data/mockData';
import { exportToCSV } from '../utils/calculations';
import BrandIntegrationPanel from './BrandIntegrationPanel';
import IngredientIntegrationPanel from './IngredientIntegrationPanel';

interface ProductMasterTabProps {
  products: ProductMaster[];
  manufacturers?: Manufacturer[];
  onAddProduct: (product: ProductMaster) => void;
  onUpdateProduct: (product: ProductMaster) => void;
  onDeleteProduct: (sku: string) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function ProductMasterTab({
  products,
  manufacturers = [],
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  addToast
}: ProductMasterTabProps) {
  // Filters & State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [skuToDeleteConfirm, setSkuToDeleteConfirm] = useState<string | null>(null);

  // Sorting
  const [sortField, setSortField] = useState<keyof ProductMaster>('sku');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductMaster | null>(null);

  // Form Field State
  const [formSku, setFormSku] = useState('');
  const [formBrand, setFormBrand] = useState(BRANDS[0]);
  const [formName, setFormName] = useState('');
  const [formVolume, setFormVolume] = useState('');
  const [formWeight, setFormWeight] = useState(0);
  const [formCategory, setFormCategory] = useState<'お茶' | '離乳食' | '化粧品' | 'その他'>('お茶');
  const [formSetQuantity, setFormSetQuantity] = useState(1);
  const [formFbaSku, setFormFbaSku] = useState('');
  const [formRslSku, setFormRslSku] = useState('');
  const [formScCode, setFormScCode] = useState('');
  const [formLogiId, setFormLogiId] = useState('');
  const [formMaker, setFormMaker] = useState('');
  const [formFiller, setFormFiller] = useState('');
  const [formLeadTime, setFormLeadTime] = useState<number>(14);
  const [formSafetyStock, setFormSafetyStock] = useState<number>(70);
  const [formIntegrationCode, setFormIntegrationCode] = useState('');
  const [formOrderUnitKg, setFormOrderUnitKg] = useState<number>(20);
  const [formIsActive, setFormIsActive] = useState(true);
  
  // Set Product (Bundle) states
  const [formIsBundle, setFormIsBundle] = useState(false);
  const [formBundleItems, setFormBundleItems] = useState<{ sku: string; quantity: number }[]>([]);

  // --- Sub-tab Navigation state ---
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'brand_integration' | 'ingredient_integration'>('products');

  // --- Brand Integration (Single & Set Parent-Child linking) State ---
  const [parentSkuForBrandInt, setParentSkuForBrandInt] = useState('');
  const [selectedChildSkuForBrandInt, setSelectedChildSkuForBrandInt] = useState('');
  const [childQtyForBrandInt, setChildQtyForBrandInt] = useState(1);
  const [tempBundleItems, setTempBundleItems] = useState<{ sku: string; quantity: number }[]>([]);

  // --- Ingredient Integration (Ingredient groupings across brands) State ---
  const [selectedIntCode, setSelectedIntCode] = useState('');
  const [isCreatingNewIntGroup, setIsCreatingNewIntGroup] = useState(false);
  const [newIntCode, setNewIntCode] = useState('');
  const [newIntName, setNewIntName] = useState('');
  const [newIntMaker, setNewIntMaker] = useState('');
  const [newIntFiller, setNewIntFiller] = useState('');
  const [newIntLotKg, setNewIntLotKg] = useState<number>(20);
  const [selectedProductsForInt, setSelectedProductsForInt] = useState<Record<string, boolean>>({});

  // --- Brand Integration Handlers ---
  const handleSelectParentProduct = (parentSku: string) => {
    setParentSkuForBrandInt(parentSku);
    const parentProd = products.find(p => p.sku === parentSku);
    if (parentProd) {
      setTempBundleItems(parentProd.bundleItems ? [...parentProd.bundleItems] : []);
    } else {
      setTempBundleItems([]);
    }
    setSelectedChildSkuForBrandInt('');
    setChildQtyForBrandInt(1);
  };

  const handleAddChildToParent = () => {
    if (!parentSkuForBrandInt) {
      addToast('統合先の親商品（セット商品）を選択してください。', 'warning');
      return;
    }
    if (!selectedChildSkuForBrandInt) {
      addToast('統合（子）にする単品商品を選択してください。', 'warning');
      return;
    }
    if (selectedChildSkuForBrandInt === parentSkuForBrandInt) {
      addToast('親商品自身を構成単品として登録することはできません。', 'error');
      return;
    }
    if (tempBundleItems.some(item => item.sku === selectedChildSkuForBrandInt)) {
      addToast('この単品商品はすでに構成品目（統合中身）に入っています。', 'warning');
      return;
    }
    if (childQtyForBrandInt < 1) {
      addToast('個数は1以上を設定してください。', 'error');
      return;
    }

    setTempBundleItems(prev => [...prev, { sku: selectedChildSkuForBrandInt, quantity: childQtyForBrandInt }]);
    setSelectedChildSkuForBrandInt('');
    setChildQtyForBrandInt(1);
    addToast('構成単品をリストに追加しました。画面下の「ブランド統合を保存」を押して確定させてください。', 'success');
  };

  const handleRemoveChildFromParent = (skuToRemove: string) => {
    setTempBundleItems(prev => prev.filter(item => item.sku !== skuToRemove));
  };

  const handleSaveBrandIntegration = () => {
    const parentProd = products.find(p => p.sku === parentSkuForBrandInt);
    if (!parentProd) {
      addToast('親商品が見つかりません。', 'error');
      return;
    }

    if (tempBundleItems.length === 0) {
      addToast('統合する単品商品が1つも選択されていません。最低1つの構成が必要、または統合を解除する場合は構成を空にして保存できます。', 'warning');
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

  // --- Ingredient Integration Handlers ---
  const ingredientGroups = React.useMemo(() => {
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
    // Default none checked
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
    
    // Automatically select the saved group
    setSelectedIntCode(codeToUse);
    setIsCreatingNewIntGroup(false);
  };

  // Sorting triggers
  const handleSort = (field: keyof ProductMaster) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    currentPage === 1 ? null : setCurrentPage(1);
  };

  // Open Add Modal
  const openAddModal = () => {
    setEditingProduct(null);
    setFormSku('');
    setFormBrand(BRANDS[0]);
    setFormName('');
    setFormVolume('');
    setFormWeight(0);
    setFormCategory('お茶');
    setFormSetQuantity(1);
    setFormFbaSku('');
    setFormRslSku('');
    setFormScCode('');
    setFormLogiId('');
    setFormMaker('');
    setFormFiller('');
    setFormLeadTime(14);
    setFormSafetyStock(70);
    setFormIntegrationCode('');
    setFormOrderUnitKg(20);
    setFormIsBundle(false);
    setFormBundleItems([]);
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (p: ProductMaster) => {
    setEditingProduct(p);
    setFormSku(p.sku);
    setFormBrand(p.brand);
    setFormName(p.name);
    setFormVolume(p.volume);
    setFormWeight(p.weight);
    setFormCategory(p.category);
    setFormSetQuantity(p.setQuantity);
    setFormFbaSku(p.fbaSku || '');
    setFormRslSku(p.rslSku || '');
    setFormScCode(p.scCode || '');
    setFormLogiId(p.logiId || '');
    setFormMaker(p.rawMaterialProducer);
    setFormFiller(p.fillingParty);
    setFormLeadTime(p.leadTime ?? 14);
    setFormSafetyStock(p.safetyStock ?? 70);
    setFormIntegrationCode(p.integrationCode || '');
    setFormOrderUnitKg(p.orderUnitKg ?? 20);
    setFormIsBundle(p.isBundle || false);
    setFormBundleItems(p.bundleItems ? [...p.bundleItems] : []);
    setFormIsActive(p.isActive);
    setIsModalOpen(true);
  };

  // Handle Form Submit
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formSku.trim()) {
      addToast('SKUは必須項目です。', 'error');
      return;
    }
    if (!formName.trim()) {
      addToast('商品名は必須項目です。', 'error');
      return;
    }
    if (formWeight < 0) {
      addToast('グラム数は0以上の数値を入力してください。', 'error');
      return;
    }
    if (formSetQuantity < 1) {
      addToast('セット数は1以上の数値を入力してください。', 'error');
      return;
    }
    if (formLeadTime < 0) {
      addToast('リードタイムは0日以上の数値を入力してください。', 'error');
      return;
    }
    if (formSafetyStock < 0) {
      addToast('安全在庫は0以上の数値を入力してください。', 'error');
      return;
    }
    if (formIsBundle && formBundleItems.length === 0) {
      addToast('セット商品の場合は、構成品目を1つ以上追加してください。', 'warning');
      return;
    }

    const payload: ProductMaster = {
      sku: formSku.trim(),
      brand: formBrand,
      name: formName.trim(),
      volume: formVolume.trim() || '1個入',
      weight: formWeight,
      category: formCategory,
      setQuantity: formSetQuantity,
      fbaSku: formFbaSku.trim(),
      rslSku: formRslSku.trim(),
      scCode: formScCode.trim(),
      logiId: formLogiId.trim(),
      rawMaterialProducer: formMaker.trim(),
      fillingParty: formFiller.trim(),
      leadTime: formLeadTime,
      safetyStock: formSafetyStock,
      isBundle: formIsBundle,
      bundleItems: formIsBundle ? formBundleItems : undefined,
      integrationCode: formIntegrationCode.trim() || undefined,
      orderUnitKg: formOrderUnitKg,
      isActive: formIsActive
    };

    if (editingProduct) {
      // Edit
      onUpdateProduct(payload);
      addToast('商品情報を更新しました！', 'success');
    } else {
      // Create new - check SKU duplicate
      const isDuplicateStatus = products.some((p) => p.sku.toLowerCase() === formSku.trim().toLowerCase());
      if (isDuplicateStatus) {
        addToast(`SKU「${formSku}」は既に登録されています。重複は許可されません。`, 'error');
        return;
      }
      onAddProduct(payload);
      addToast('新しい商品を登録しました！', 'success');
    }

    setIsModalOpen(false);
  };

  // CSV export function
  const handleExportCSV = () => {
    const headers = [
      'SKU', 'ブランド', '商品名', '内容量', 'グラム', 'カテゴリ', 
      'FBA SKU', 'RSL SKU', 'SC商品コード', 'LOGI ID', 'セット数', '原料メーカー', '充填先', 'ステータス'
    ];
    
    const rows = filteredProducts.map(p => [
      p.sku,
      p.brand,
      p.name,
      p.volume,
      p.weight.toString(),
      p.category,
      p.fbaSku || '',
      p.rslSku || '',
      p.scCode || '',
      p.logiId || '',
      p.setQuantity.toString(),
      p.rawMaterialProducer || '',
      p.fillingParty || '',
      p.isActive ? '有効' : '無効'
    ]);

    exportToCSV(headers, rows, 'product_master_export.csv');
    addToast('商品マスタCSVを書き出しました', 'success');
  };

  // Filter application
  const filteredProducts = products.filter((p) => {
    const matchSearch = 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.fbaSku && p.fbaSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.rslSku && p.rslSku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.scCode && p.scCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.logiId && p.logiId.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchBrand = selectedBrand === '' || p.brand === selectedBrand;
    const matchCategory = selectedCategory === '' || p.category === selectedCategory;
    
    let matchStatus = true;
    if (selectedStatus === 'active') matchStatus = p.isActive;
    else if (selectedStatus === 'inactive') matchStatus = !p.isActive;

    return matchSearch && matchBrand && matchCategory && matchStatus;
  });

  // Sort Application
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    }

    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    }

    if (typeof valA === 'boolean' && typeof valB === 'boolean') {
      return sortDirection === 'asc'
        ? (valA ? 1 : 0) - (valB ? 1 : 0)
        : (valB ? 1 : 0) - (valA ? 1 : 0);
    }

    return 0;
  });

  // Pagination calculation
  const totalPages = Math.ceil(sortedProducts.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = sortedProducts.slice(startIndex, startIndex + itemsPerPage);

  const toggleProductStatus = (product: ProductMaster) => {
    const updated = { ...product, isActive: !product.isActive };
    onUpdateProduct(updated);
    addToast(`商品「${product.sku}」を${updated.isActive ? '有効' : '無効'}化しました`, 'success');
  };

  return (
    <div className="space-y-4">
      {/* Sub-tab Navigation Header */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 p-1 rounded-xl gap-1 mb-4 select-none">
        <button
          type="button"
          onClick={() => setActiveSubTab('products')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'products'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>① 商品マスタ登録</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('brand_integration')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'brand_integration'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitFork className="w-4 h-4" />
          <span>② マスタ統合（ブランドごと）</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('ingredient_integration')}
          className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeSubTab === 'ingredient_integration'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>③ マスタ統合（原料ごと）</span>
        </button>
      </div>

      {activeSubTab === 'products' &&
        <div className="space-y-4">
          {/* Action / Search Header Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md">
        
        {/* Search Input inline */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="商品名、SKU、FBA SKU、Excelコードで検索..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded-lg pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-600"
          />
        </div>

        {/* Filters Panel block */}
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

          {/* Category Select */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
          >
            <option value="">すべてのカテゴリ</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status filter dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value as any);
              setCurrentPage(1);
            }}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-lg px-2.5 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
          >
            <option value="all">すべて（有効/無効）</option>
            <option value="active">有効のみ</option>
            <option value="inactive">無効のみ</option>
          </select>

          <button
            onClick={handleExportCSV}
            title="商品マスタCSVエクスポート"
            className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-medium px-3 py-2 rounded-lg border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>出力</span>
          </button>

          <button
            onClick={openAddModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4.5 py-2 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>商品登録</span>
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
                <th onClick={() => handleSort('brand')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 select-none">
                  <div className="flex items-center gap-1">
                    ブランド <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('name')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 select-none">
                  <div className="flex items-center gap-1">
                    商品名 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold tracking-wider">仕様（内容量/グラム）</th>
                <th onClick={() => handleSort('category')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 select-none">
                  <div className="flex items-center gap-1">
                    カテゴリ <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th onClick={() => handleSort('setQuantity')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-center select-none">
                  <div className="flex items-center justify-center gap-1">
                    セット数 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold tracking-wider hidden md:table-cell">連携コード (FBA/RSL/SC/LOGI)</th>
                <th onClick={() => handleSort('isActive')} className="py-3.5 px-4 font-semibold tracking-wider cursor-pointer hover:bg-slate-900 text-center select-none">
                  <div className="flex items-center justify-center gap-1">
                    状態 <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 font-semibold tracking-wider text-right">操作</th>
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-800/60">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-medium">
                    一致する商品情報が見つかりませんでした。
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p) => (
                  <tr
                    key={p.sku}
                    className={`hover:bg-slate-850/40 transition-colors ${
                      p.isActive ? '' : 'opacity-45 bg-slate-950/25'
                    }`}
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-100">{p.sku}</td>
                    <td className="py-3 px-4 font-medium text-slate-300">{p.brand}</td>
                    <td className="py-3 px-4 max-w-xxs overflow-hidden text-ellipsis whitespace-nowrap" title={p.name}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-slate-200">{p.name}</span>
                        {p.isBundle && (
                          <span className="bg-emerald-950 text-emerald-400 border border-emerald-900/60 px-1.5 py-0.5 rounded text-[8px] font-bold">セット商品</span>
                        )}
                        {p.integrationCode && (
                          <span className="bg-blue-950/80 text-blue-300 border border-blue-900/50 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono">🔗 統合: {p.integrationCode}</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] opacity-90">
                        <span className="bg-indigo-950 text-indigo-300 border border-indigo-900/50 px-1.5 py-0.2 rounded font-mono text-[9px]">LT: {p.leadTime ?? 14}日</span>
                        <span className="bg-slate-950 text-emerald-400 border border-slate-800 px-1.5 py-0.2 rounded font-mono text-[9px]">安全: {p.safetyStock ?? 70}個</span>
                      </div>
                      {p.isBundle && p.bundleItems && p.bundleItems.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1 items-center">
                          <span className="text-[9px] text-slate-500 font-medium">構成:</span>
                          {p.bundleItems.map((item, idx) => {
                            const child = products.find(prod => prod.sku === item.sku);
                            return (
                              <span key={idx} className="text-[9px] bg-slate-950/60 border border-slate-800 text-slate-350 px-1.5 py-0.2 rounded font-mono" title={child ? child.name : item.sku}>
                                {child ? child.name : item.sku}×{item.quantity}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {p.volume} <span className="text-[10px] text-slate-600">({p.weight}g)</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="p-1 px-2 text-[10px] font-medium bg-slate-950/70 text-slate-400 border border-slate-800 rounded">
                        {p.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {p.setQuantity > 1 ? (
                        <span className="bg-amber-950 text-amber-400 border border-amber-900/40 font-bold px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap animate-pulse">
                          × {p.setQuantity}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium text-[11px]">単品 (1)</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[10px] hidden md:table-cell">
                      <div className="space-y-0.5">
                        <p><span className="text-indigo-400 text-[9px] font-sans font-semibold">FBA:</span> {p.fbaSku || '-'}</p>
                        <p><span className="text-emerald-400 text-[9px] font-sans font-semibold">RSL:</span> {p.rslSku || '-'}</p>
                        <p><span className="text-amber-400 text-[9px] font-sans font-semibold">SC:</span> {p.scCode || '-'}</p>
                        <p><span className="text-cyan-400 text-[9px] font-sans font-semibold">LOGI:</span> {p.logiId || '-'}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => toggleProductStatus(p)}
                        title={p.isActive ? '現在有効です。クリックして無効化' : '現在無効です。クリックして有効化'}
                        className="focus:outline-none inline-flex items-center text-slate-400 hover:text-white"
                      >
                        {p.isActive ? (
                          <ToggleRight className="w-5.5 h-5.5 text-emerald-500 transition-colors" />
                        ) : (
                          <ToggleLeft className="w-5.5 h-5.5 text-slate-600 transition-colors" />
                        )}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {skuToDeleteConfirm === p.sku ? (
                        <div className="flex items-center justify-end gap-1.5 bg-rose-950/70 border border-rose-900/50 p-1 rounded-md max-w-[120px] ml-auto">
                          <span className="text-[10px] text-rose-300 font-bold px-0.5 select-none font-sans">削除しますか？</span>
                          <button
                            onClick={() => {
                              onDeleteProduct(p.sku);
                              addToast(`商品「${p.sku}」をマスタから完全に削除しました。`, 'warning');
                              setSkuToDeleteConfirm(null);
                            }}
                            className="bg-rose-700 hover:bg-rose-600 border border-rose-600/50 text-white font-bold rounded px-1.5 py-0.5 text-[9px] transition-colors"
                          >
                            はい
                          </button>
                          <button
                            onClick={() => setSkuToDeleteConfirm(null)}
                            className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-bold rounded px-1.5 py-0.5 text-[9px] transition-colors"
                          >
                            いいえ
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Edit block */}
                          <button
                            onClick={() => openEditModal(p)}
                            className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition"
                            title="編集"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {/* Delete block */}
                          <button
                            onClick={() => setSkuToDeleteConfirm(p.sku)}
                            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                            title="削除"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Sorting/Pagination footer */}
        <div className="px-5 py-3 border-t border-slate-800/80 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <p>
            登録数 <span className="font-mono text-white font-bold">{sortedProducts.length}</span> 件中 {' '}
            <span className="font-mono text-slate-300">
              {sortedProducts.length === 0 ? 0 : startIndex + 1} &ndash; {Math.min(startIndex + itemsPerPage, sortedProducts.length)}
            </span> 件を表示中
          </p>

          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-slate-900 text-[10px] hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 transition-all font-medium disabled:cursor-not-allowed"
            >
              最初
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 text-[10px] transition-all font-medium disabled:cursor-not-allowed"
            >
              前へ
            </button>
            <span className="px-3.5 text-xs text-slate-400 font-mono font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 text-[10px] transition-all font-medium disabled:cursor-not-allowed"
            >
              次へ
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded bg-slate-900 text-[10px] hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-900 border border-slate-800 text-slate-300 transition-all font-medium disabled:cursor-not-allowed"
            >
              最終
            </button>
          </div>
        </div>
      </div>
      </div>
    }

      {activeSubTab === 'brand_integration' &&
        <BrandIntegrationPanel
          products={products}
          onUpdateProduct={onUpdateProduct}
          addToast={addToast}
        />
      }

      {activeSubTab === 'ingredient_integration' &&
        <IngredientIntegrationPanel
          products={products}
          manufacturers={manufacturers}
          onUpdateProduct={onUpdateProduct}
          addToast={addToast}
        />
      }

      {/* CRUD Add/Edit Product Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl overflow-hidden shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-950">
              <h3 className="text-sm font-semibold tracking-wide flex items-center gap-1.5 text-slate-200">
                <span>{editingProduct ? '商品マスタ情報の編集' : '新しい商品の新規登録'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-lg transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                {/* SKU (Editable only when creating) */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium">SKU (商品識別コード) *</label>
                  <input
                    type="text"
                    required
                    disabled={!!editingProduct}
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="例: azuki, gobou-set"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all disabled:bg-slate-950 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Brand */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium">ブランド *</label>
                  <select
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  >
                    {BRANDS.map((b) => (
                      <option key={b} value={b}>{b}</option>
                    ))}
                  </select>
                </div>

                {/* Product Name */}
                <div className="space-y-1 col-span-2">
                  <label className="block text-slate-400 font-medium">商品名 *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="例: あずき茶 徳用大容量パック"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Volume */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium">内容量仕様</label>
                  <input
                    type="text"
                    value={formVolume}
                    onChange={(e) => setFormVolume(e.target.value)}
                    placeholder="例: 4g×40包, 250ml"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Weight */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium">グラム数 (g)</label>
                  <input
                    type="number"
                    value={formWeight}
                    onChange={(e) => setFormWeight(parseInt(e.target.value, 10) || 0)}
                    placeholder="例: 160"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium">カテゴリ *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Integration Code */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium flex items-center gap-1">
                    <span className="text-indigo-400">🔗 統合コード (任意)</span>
                  </label>
                  <input
                    type="text"
                    value={formIntegrationCode}
                    onChange={(e) => setFormIntegrationCode(e.target.value)}
                    placeholder="例: azuki, gobou"
                    className="w-full bg-slate-950 border border-indigo-950 text-indigo-300 font-mono font-medium rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-600 transition-all"
                  />
                  <p className="text-[10px] text-slate-500">
                    ブランドをまたいでお茶等を統合集計する一致キー（例：「azuki」で統合）
                  </p>
                </div>

                {/* Order Unit Kg */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium flex items-center gap-1">
                    <span className="text-emerald-400">⚖️ 発注ロット単位 (kg)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formOrderUnitKg}
                    onChange={(e) => setFormOrderUnitKg(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    placeholder="例: 20"
                    className="w-full bg-slate-950 border border-slate-800 text-emerald-300 font-mono font-medium rounded p-2 focus:ring-1 focus:ring-emerald-500 focus:outline-none transition-all"
                  />
                  <p className="text-[10px] text-slate-500">
                    原料や資材の最低発注ロット切り上げ単位（例: 20kg単位や10kg単位）
                  </p>
                </div>

                {/* Set Quantity */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium font-sans text-amber-400 flex items-center gap-1">
                    <span>セット入数 (セット数) *</span>
                    {formSetQuantity > 1 && <span className="text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-900 px-1 rounded">マルチパック ({formSetQuantity}倍計算)</span>}
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formSetQuantity}
                    onChange={(e) => setFormSetQuantity(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                  />
                </div>

                 {/* FBA SKU */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium text-xs">FBA SKU (FBA)</label>
                  <input
                    type="text"
                    value={formFbaSku}
                    onChange={(e) => setFormFbaSku(e.target.value)}
                    placeholder="例: azuki-40"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* RSL SKU */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium text-xs">RSL SKU (RSL)</label>
                  <input
                    type="text"
                    value={formRslSku}
                    onChange={(e) => setFormRslSku(e.target.value)}
                    placeholder="例: RSL-AZUKI-40"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* SC Code */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium text-xs">SC商品コード (SC)</label>
                  <input
                    type="text"
                    value={formScCode}
                    onChange={(e) => setFormScCode(e.target.value)}
                    placeholder="例: 63985-00000002"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* LOGI ID */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium text-xs">LOGI ID (LOGI)</label>
                  <input
                    type="text"
                    value={formLogiId}
                    onChange={(e) => setFormLogiId(e.target.value)}
                    placeholder="例: CL-AZUKI-001"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Raw Material Producer */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium">原料メーカー</label>
                  <select
                    value={formMaker}
                    onChange={(e) => setFormMaker(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="">-- 未選択 (マスタ外手動設定) --</option>
                    {(manufacturers || []).filter(m => m.type === '原料').map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                    {formMaker && !manufacturers.some(m => m.name === formMaker && m.type === '原料') && (
                      <option value={formMaker}>{formMaker} *(未登録メーカー)</option>
                    )}
                  </select>
                </div>

                {/* Filling party */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium">充填先工場</label>
                  <select
                    value={formFiller}
                    onChange={(e) => setFormFiller(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  >
                    <option value="">-- 未選択 (マスタ外手動設定) --</option>
                    {(manufacturers || []).filter(m => m.type === '製造').map(m => (
                      <option key={m.id} value={m.name}>{m.name}</option>
                    ))}
                    {formFiller && !manufacturers.some(m => m.name === formFiller && m.type === '製造') && (
                      <option value={formFiller}>{formFiller} *(未登録工場)</option>
                    )}
                  </select>
                </div>

                {/* Settle Product / Bundle Selection & Composition Recipe Settings */}
                <div className="col-span-2 bg-slate-950/40 border border-slate-800 rounded-lg p-3.5 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1 border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      📦 セット・詰合せ商品の設定
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="formIsBundleCheckbox"
                        checked={formIsBundle}
                        onChange={(e) => {
                          setFormIsBundle(e.target.checked);
                          if (e.target.checked && formBundleItems.length === 0) {
                            // Find any existing single product to add as default constituent
                            const availableSingles = products.filter(p => !p.isBundle && p.sku !== formSku);
                            if (availableSingles.length > 0) {
                              setFormBundleItems([{ sku: availableSingles[0].sku, quantity: 1 }]);
                            }
                          }
                        }}
                        className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-800 focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="formIsBundleCheckbox" className="text-xs font-bold text-slate-300 cursor-pointer select-none">
                        この商品はセット商品である
                      </label>
                    </div>
                  </div>

                  {formIsBundle && (
                    <div className="space-y-3 pt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-medium">構成単品と1セットあたりの必要個数:</span>
                        <button
                          type="button"
                          onClick={() => {
                            const availableSingles = products.filter(p => p.sku !== formSku);
                            if (availableSingles.length > 0) {
                              setFormBundleItems(prev => [...prev, { sku: availableSingles[0].sku, quantity: 1 }]);
                            } else {
                              addToast('構成品に指定できる商品が他にありません。先に別の商品を登録してください。', 'warning');
                            }
                          }}
                          className="bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-900/60 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          ＋ 構成品を追加
                        </button>
                      </div>

                      {formBundleItems.length === 0 ? (
                        <div className="text-center py-4 bg-slate-900/40 rounded border border-dashed border-slate-800 text-[11px] text-slate-500">
                          追加ボタンを押して、このセットに組み入れる単品商品を選択してください
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {formBundleItems.map((item, idx) => {
                            const selections = products.filter(p => p.sku !== formSku);
                            return (
                              <div key={idx} className="flex items-center gap-2 bg-slate-900/80 p-2 rounded border border-slate-850">
                                <span className="text-[10px] font-mono text-slate-500 font-bold w-6 text-center">#{idx + 1}</span>
                                <div className="flex-1">
                                  <select
                                    value={item.sku}
                                    onChange={(e) => {
                                      const newItems = [...formBundleItems];
                                      newItems[idx].sku = e.target.value;
                                      setFormBundleItems(newItems);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-200 rounded p-1.5 focus:ring-1 focus:ring-emerald-500"
                                  >
                                    {selections.map(p => (
                                      <option key={p.sku} value={p.sku}>
                                        {p.brand} - {p.name} ({p.sku})
                                      </option>
                                    ))}
                                    {selections.length === 0 && (
                                      <option value="">(選択可能な商品がありません)</option>
                                    )}
                                  </select>
                                </div>
                                <div className="w-24 relative flex items-center">
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const newItems = [...formBundleItems];
                                      newItems[idx].quantity = Math.max(1, parseInt(e.target.value, 10) || 1);
                                      setFormBundleItems(newItems);
                                    }}
                                    className="w-full bg-slate-950 border border-slate-800 text-center text-xs text-slate-100 rounded p-1.5 focus:ring-1 focus:ring-emerald-500 font-mono"
                                  />
                                  <span className="absolute right-2 text-[10px] text-slate-500 font-medium">個</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormBundleItems(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-slate-850 bg-slate-900 rounded border border-slate-800 cursor-pointer text-xs"
                                  title="削除"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      <div className="bg-slate-900/60 p-2.5 rounded border border-slate-850 text-[10px] text-slate-400 leading-normal font-sans">
                        <span className="text-emerald-400 font-semibold mb-0.5 block">💡 在庫自動計算の仕様:</span>
                        セット商品の在庫数は、構成品の各倉庫別在庫数から自動計算されます。
                        （例：じゃがいもが10個、ほうれん草が5個あり、セットにじゃがいも4個・ほうれん草1個必要な場合、組み立て可能限度はmin(10/4, 5/1) = 2セットになります）
                      </div>
                    </div>
                  )}
                </div>

                {/* Reorder Point Parameters */}
                <div className="col-span-2 bg-indigo-950/20 border border-indigo-900/40 rounded-lg p-3.5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1">
                    <span className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                      📊 発注点計算パラメータ (商品単位)
                    </span>
                    <span className="text-[10px] bg-slate-950/60 text-slate-400 font-semibold px-2 py-0.5 rounded border border-slate-800 font-mono">
                      計算式: (平均日販 × リードタイム) + 安全在庫
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1 text-xs">
                      <label className="block text-slate-400 font-medium">
                        リードタイム (LT日数) *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="0"
                          value={formLeadTime}
                          onChange={(e) => setFormLeadTime(parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 pr-8 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                        />
                        <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-medium font-sans">日</span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        発注してから納品されるまでの日数（例: 14日）
                      </p>
                    </div>

                    <div className="space-y-1 text-xs">
                      <label className="block text-slate-400 font-medium">
                        安全在庫数 *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          required
                          min="0"
                          value={formSafetyStock}
                          onChange={(e) => setFormSafetyStock(parseInt(e.target.value, 10) || 0)}
                          className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 pr-8 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all font-mono"
                        />
                        <span className="absolute right-3 top-2.5 text-[10px] text-slate-500 font-medium font-sans flex items-center">個 / セット</span>
                      </div>
                      <p className="text-[9px] text-slate-500 leading-normal">
                        欠品防止のため最低限確保する個数（例: 70個）
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status Toggle checkbox active */}
                <div className="col-span-2 sm:col-span-1 flex items-center space-x-2.5 py-4">
                  <input
                    type="checkbox"
                    id="formIsActiveCheckbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4.5 h-4.5 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500"
                  />
                  <label htmlFor="formIsActiveCheckbox" className="font-semibold text-slate-200 cursor-pointer select-none">
                    この商品を「有効」に設定する
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-2 pt-6 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-medium rounded transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded transition"
                >
                  保存する
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
