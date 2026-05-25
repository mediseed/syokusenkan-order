/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, SlidersHorizontal, ArrowUpDown, Download, Check, X, ToggleLeft, ToggleRight } from 'lucide-react';
import { ProductMaster } from '../types';
import { BRANDS, CATEGORIES } from '../data/mockData';
import { exportToCSV } from '../utils/calculations';

interface ProductMasterTabProps {
  products: ProductMaster[];
  onAddProduct: (product: ProductMaster) => void;
  onUpdateProduct: (product: ProductMaster) => void;
  onDeleteProduct: (sku: string) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function ProductMasterTab({
  products,
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
  const [formIsActive, setFormIsActive] = useState(true);

  // Sorting triggers
  const handleSort = (field: keyof ProductMaster) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1);
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
                      <span className="font-semibold text-slate-200">{p.name}</span>
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
                          onClick={() => {
                            if (confirm(`SKU「${p.sku}」の商品をマスタから完全に削除してよろしいですか？`)) {
                              onDeleteProduct(p.sku);
                              addToast(`商品「${p.sku}」を削除しました`, 'warning');
                            }
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                          title="削除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
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
                  <input
                    type="text"
                    value={formMaker}
                    onChange={(e) => setFormMaker(e.target.value)}
                    placeholder="例: 株式会社天草"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>

                {/* Filling party */}
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="block text-slate-400 font-medium">充填先工場</label>
                  <input
                    type="text"
                    value={formFiller}
                    onChange={(e) => setFormFiller(e.target.value)}
                    placeholder="例: ○○充填ライン"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-100 rounded p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
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
