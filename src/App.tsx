/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { LayoutDashboard, Boxes, RefreshCw, Sparkles, UploadCloud, Bell, HelpCircle, X, Check, AlertTriangle, AlertCircle, ClipboardList, Factory } from 'lucide-react';

import { ProductMaster, InventoryData, SalesData, PurchaseOrder, Manufacturer } from './types';
import { initialProducts, initialInventory, initialSales, initialManufacturers } from './data/mockData';

// Import our interactive modular tabs
import Dashboard from './components/Dashboard';
import ProductMasterTab from './components/ProductMasterTab';
import InventoryTab from './components/InventoryTab';
import RecommendationTab from './components/RecommendationTab';
import OrderManagementTab from './components/OrderManagementTab';
import CSVImportModal from './components/CSVImportModal';
import ManufacturerTab from './components/ManufacturerTab';

export default function App() {
  // Global Shared States
  const [products, setProducts] = useState<ProductMaster[]>(initialProducts);
  const [inventoryList, setInventoryList] = useState<InventoryData[]>(initialInventory);
  const [salesList, setSalesList] = useState<SalesData[]>(initialSales);

  // Manufacturers States with localStorage Support
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>(() => {
    const cached = localStorage.getItem('healthon_po_manufacturers');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fallback
      }
    }
    localStorage.setItem('healthon_po_manufacturers', JSON.stringify(initialManufacturers));
    return initialManufacturers;
  });

  const saveManufacturersToCache = (newManufacturers: Manufacturer[]) => {
    setManufacturers(newManufacturers);
    localStorage.setItem('healthon_po_manufacturers', JSON.stringify(newManufacturers));
  };

  const handleAddManufacturer = (newM: Manufacturer) => {
    saveManufacturersToCache([newM, ...manufacturers]);
  };

  const handleUpdateManufacturer = (updatedM: Manufacturer) => {
    saveManufacturersToCache(manufacturers.map(m => m.id === updatedM.id ? updatedM : m));
  };

  const handleDeleteManufacturer = (idToDelete: string) => {
    saveManufacturersToCache(manufacturers.filter(m => m.id !== idToDelete));
  };

  // Load and store orders state with localStorage support and pre-populated default mock records
  const [orders, setOrders] = useState<PurchaseOrder[]>(() => {
    const cached = localStorage.getItem('healthon_po_orders');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // Fallback
      }
    }
    const defaults: PurchaseOrder[] = [
      {
        id: "PO-TEA-001",
        groupName: "【合計】お茶/4月発注",
        orderDate: "2026-04-10",
        scheduledDeliveryDate: "2026-04-24",
        assignedStaff: "佐藤 拓也",
        status: "入庫完了",
        items: [
          { sku: "azuki", productName: "あずき茶", brand: "温活農園", requestedQty: 150, weight: 160 },
          { sku: "gobou", productName: "国産ごぼう茶", brand: "大福園", requestedQty: 100, weight: 120 },
          { sku: "chamomile", productName: "カモミールハーブティー", brand: "MEZZO", requestedQty: 80, weight: 45 }
        ],
        notes: "お茶類4月統合発注分。天草、大福、MEZZO各社一括出荷にて手配。"
      },
      {
        id: "PO-MAMA-002",
        groupName: "【ママセレクト】5月発注用",
        orderDate: "2026-05-15",
        scheduledDeliveryDate: "2026-05-29",
        assignedStaff: "鈴木 健一郎",
        status: "検収中/入庫中",
        items: [
          { sku: "tanpopo-set3", productName: "たんぽぽ茶3個セット", brand: "ママセレクト", requestedQty: 60, weight: 180 },
          { sku: "potato-pw", productName: "じゃがいもパウダー", brand: "ママセレクト", requestedQty: 120, weight: 100 }
        ],
        notes: "一部パウダー原材料入荷状況により、ほうれん草/コーンは別途発注予定。"
      }
    ];
    localStorage.setItem('healthon_po_orders', JSON.stringify(defaults));
    return defaults;
  });

  const saveOrdersToCache = (newOrders: PurchaseOrder[]) => {
    setOrders(newOrders);
    localStorage.setItem('healthon_po_orders', JSON.stringify(newOrders));
  };

  const handleAddOrder = (newOrder: PurchaseOrder) => {
    saveOrdersToCache([newOrder, ...orders]);
  };

  const handleUpdateOrder = (updatedOrder: PurchaseOrder) => {
    saveOrdersToCache(orders.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    
    // Auto-update inventory stocks of products if the order moves to '入庫完了'
    if (updatedOrder.status === '入庫完了') {
      setInventoryList(prev => {
        return prev.map(inv => {
          const matchingItem = updatedOrder.items.find(it => it.sku === inv.sku);
          if (matchingItem) {
            return {
              ...inv,
              logiStock: inv.logiStock + matchingItem.requestedQty,
              status: '在庫あり'
            };
          }
          return inv;
        });
      });
      addToast(`発注商品がすべて入庫完了したため、クラウドロジ(国内流通倉庫)在庫に加算されました！`, 'success');
    }
  };

  const handleDeleteOrder = (idToDelete: string) => {
    saveOrdersToCache(orders.filter(o => o.id !== idToDelete));
  };

  // Keep track of when warehouse files were last uploaded
  const [uploadTimestamps, setUploadTimestamps] = useState<Record<string, string>>({
    fba: '2026/05/25 13:32',
    rsl: '2026/05/25 13:32',
    sc: '2026/05/25 13:32',
    logi: '2026/05/25 13:32',
    products: '2026/05/25 13:32',
    sales: '2026/05/25 13:32',
  });

  // Active navigation tab
  const [activeTab, setActiveTab ] = useState<string>('dashboard');

  // CSV Import Modal open/close state
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  // Toast Notification Stack
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto purge toast after 4.5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper to format system timestamp
  const getFormattedNow = () => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  // --- CRUD PRODUCT MASTER HANDLERS ---
  const handleAddProduct = (newProduct: ProductMaster) => {
    setProducts((prev) => [...prev, newProduct]);
  };

  const handleUpdateProduct = (updatedProduct: ProductMaster) => {
    setProducts((prev) => prev.map((p) => (p.sku === updatedProduct.sku ? updatedProduct : p)));
  };

  const handleDeleteProduct = (skuToDelete: string) => {
    // Cascading deletion is also supported locally
    setProducts((prev) => prev.filter((p) => p.sku !== skuToDelete));
  };

  // --- CSV MULTI-UPLOAD UPSERT ORCHESTRATORS ---
  const handleImportProducts = (newProducts: ProductMaster[]) => {
    setProducts((prev) => {
      const map = new Map(prev.map((p) => [p.sku.toLowerCase(), p]));
      newProducts.forEach((p) => {
        map.set(p.sku.toLowerCase(), p);
      });
      return Array.from(map.values());
    });
    setUploadTimestamps((prev) => ({
      ...prev,
      products: getFormattedNow(),
    }));
  };

  const handleImportInventory = (newInventory: InventoryData[], subtype?: 'fba' | 'rsl' | 'sc' | 'logi' | 'all') => {
    setInventoryList((prev) => {
      const map = new Map(prev.map((i) => [i.sku.toLowerCase(), i]));
      newInventory.forEach((i) => {
        map.set(i.sku.toLowerCase(), i);
      });
      return Array.from(map.values());
    });

    if (subtype) {
      setUploadTimestamps((prev) => {
        const nowStr = getFormattedNow();
        if (subtype === 'all') {
          return {
            ...prev,
            fba: nowStr,
            rsl: nowStr,
            sc: nowStr,
            logi: nowStr,
          };
        }
        return {
          ...prev,
          [subtype]: nowStr,
        };
      });
    }
  };

  const handleImportSales = (newSales: SalesData[]) => {
    setSalesList((prev) => {
      // Append sales historical points so that we can accumulate totals
      return [...prev, ...newSales];
    });
    setUploadTimestamps((prev) => ({
      ...prev,
      sales: getFormattedNow(),
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col antialiased">
      
      {/* Dynamic Toast Alerts Container Overlay */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            onClick={() => removeToast(toast.id)}
            className={`shadow-2xl border p-4 rounded-xl flex items-start gap-3 cursor-pointer transform hover:translate-x-1 transition-all ${
              toast.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
                : toast.type === 'error'
                ? 'bg-rose-950/95 border-rose-500/40 text-rose-200'
                : 'bg-amber-950/95 border-amber-500/40 text-amber-200'
            }`}
          >
            {toast.type === 'success' && <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
            {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
            <div className="flex-1">
              <p className="text-xs font-semibold select-none">{toast.message}</p>
            </div>
            <button className="text-slate-400 hover:text-white transform scale-90">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Global Application Nav Header */}
      <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-2 bg-gradient-to-tr from-indigo-600 to-violet-500 rounded-lg shadow-md shadow-indigo-500/20">
              <Boxes className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-xs font-mono font-bold tracking-widest text-indigo-400 block uppercase">
                HEALTH-ON SPREADSHEETS CONVERTER
              </span>
              <h1 className="text-sm font-bold tracking-tight text-white leading-tight">
                発注・在庫・販売実績 統合管理システム
              </h1>
            </div>
          </div>

          {/* Core Master Action buttons */}
          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-slate-850 hover:bg-slate-800 text-indigo-300 hover:text-indigo-200 text-xs font-bold px-4 py-2.5 rounded-lg border border-indigo-950 transition-colors flex items-center justify-center gap-2 cursor-pointer w-full sm:w-auto"
            >
              <UploadCloud className="w-4 h-4 text-indigo-400" />
              <span>CSV一括アップロード</span>
            </button>
          </div>
        </div>
      </header>

      {/* Primary Tab Navigation Tabs bar */}
      <div className="bg-slate-900 border-b border-slate-800/80 sticky top-[73px] sm:top-[69px] z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap">
          {[
            { id: 'dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
            { id: 'products', label: '商品マスタ管理', icon: Boxes },
            { id: 'inventory', label: '在庫状況一覧', icon: Boxes },
            { id: 'recommendations', label: '自動発注推奨', icon: Sparkles },
            { id: 'orders', label: '発注処理', icon: ClipboardList },
            { id: 'manufacturers', label: 'メーカーマスタ管理', icon: Factory },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 px-3 sm:px-5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 justify-center flex-1 sm:flex-none ${
                    isSelected
                      ? 'border-indigo-500 text-indigo-400 bg-indigo-950/25 font-bold'
                      : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/30'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Pane Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            products={products}
            inventoryList={inventoryList}
            salesList={salesList}
            uploadTimestamps={uploadTimestamps}
            onTabChange={(tabId) => setActiveTab(tabId)}
          />
        )}

        {activeTab === 'products' && (
          <ProductMasterTab
            products={products}
            manufacturers={manufacturers}
            onAddProduct={handleAddProduct}
            onUpdateProduct={handleUpdateProduct}
            onDeleteProduct={handleDeleteProduct}
            addToast={addToast}
          />
        )}

        {activeTab === 'inventory' && (
          <InventoryTab
            products={products}
            inventoryList={inventoryList}
            salesList={salesList}
            uploadTimestamps={uploadTimestamps}
            addToast={addToast}
          />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationTab
            products={products}
            inventoryList={inventoryList}
            salesList={salesList}
            addToast={addToast}
          />
        )}

        {activeTab === 'orders' && (
          <OrderManagementTab
            products={products}
            manufacturers={manufacturers}
            inventoryList={inventoryList}
            salesList={salesList}
            orders={orders}
            onAddOrder={handleAddOrder}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
            addToast={addToast}
          />
        )}

        {activeTab === 'manufacturers' && (
          <ManufacturerTab
            manufacturers={manufacturers}
            onAddManufacturer={handleAddManufacturer}
            onUpdateManufacturer={handleUpdateManufacturer}
            onDeleteManufacturer={handleDeleteManufacturer}
            addToast={addToast}
          />
        )}
      </main>

      {/* Standard Footer */}
      <footer className="bg-slate-950 border-t border-slate-900/80 py-6 mt-12 text-center text-slate-600 text-xs font-mono">
        <p>&copy; 2026 発注管理システム | 温活農園・ママセレクト対応 | All Rights Reserved.</p>
      </footer>

      {/* Multi-Tab CSV Import Modal Overlay */}
      <CSVImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportProducts={handleImportProducts}
        onImportInventory={handleImportInventory}
        onImportSales={handleImportSales}
        existingSkus={products.map((p) => p.sku)}
        existingInventory={inventoryList}
        existingProducts={products}
        uploadTimestamps={uploadTimestamps}
        addToast={addToast}
      />
    </div>
  );
}
