/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Boxes, RefreshCw, Sparkles, UploadCloud, Bell, HelpCircle, X, Check, AlertTriangle, AlertCircle, ClipboardList, Factory, ShoppingCart, Truck, TrendingUp } from 'lucide-react';

import { ProductMaster, InventoryData, SalesData, PurchaseOrder, Manufacturer } from './types';
import { initialProducts, initialInventory, initialSales, initialManufacturers } from './data/mockData';

// Import our interactive modular tabs
import Dashboard from './components/Dashboard';
import ProductMasterTab from './components/ProductMasterTab';
import InventoryTab from './components/InventoryTab';
import OrderManagementTab from './components/OrderManagementTab';
import CSVImportModal from './components/CSVImportModal';
import ManufacturerTab from './components/ManufacturerTab';
import BrandOrderProposalsTab from './components/BrandOrderProposalsTab';
import InboundManagementTab from './components/InboundManagementTab';
import MonthlySalesTab from './components/MonthlySalesTab';

import { db, handleFirestoreError, OperationType } from './lib/firebase';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';

export default function App() {
  // Global Shared States with Firestore synchronization
  const [products, setProducts] = useState<ProductMaster[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryData[]>([]);
  const [salesList, setSalesList] = useState<SalesData[]>([]);
  const [salesOverrides, setSalesOverrides] = useState<Record<string, number>>({});
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  // Keep track of when warehouse files were last uploaded
  const [uploadTimestamps, setUploadTimestamps] = useState<Record<string, string>>({
    fba: '2026/05/25 13:32',
    rsl: '2026/05/25 13:32',
    sc: '2026/05/25 13:32',
    logi: '2026/05/25 13:32',
    products: '2026/05/25 13:32',
    sales: '2026/05/25 13:32',
  });

  // Shared proposed quantities and delivery dates
  const [proposedQuantities, setProposedQuantities] = useState<Record<string, number>>({});
  const [proposedDeliveryDates, setProposedDeliveryDates] = useState<Record<string, string>>({});
  const [proposedSelectedSkus, setProposedSelectedSkus] = useState<Record<string, boolean>>({});

  // ----------------- FIRESTORE REALTIME SYNC LISTENERS -----------------
  
  // 1. Sync Products
  useEffect(() => {
    const q = collection(db, 'products');
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap database with product defaults
        for (const p of initialProducts) {
          try {
            await setDoc(doc(db, 'products', p.sku), p);
          } catch (e) {
            console.error('Products bootstrap failed:', e);
          }
        }
      } else {
        const list: ProductMaster[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as ProductMaster);
        });
        setProducts(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'products');
    });
    return () => unsubscribe();
  }, []);

  // 2. Sync Inventory
  useEffect(() => {
    const q = collection(db, 'inventory');
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap database with inventory defaults
        for (const i of initialInventory) {
          try {
            await setDoc(doc(db, 'inventory', i.sku), i);
          } catch (e) {
            console.error('Inventory bootstrap failed:', e);
          }
        }
      } else {
        const list: InventoryData[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as InventoryData);
        });
        setInventoryList(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'inventory');
    });
    return () => unsubscribe();
  }, []);

  // 3. Sync Sales Records
  useEffect(() => {
    const q = collection(db, 'sales');
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap database with sales defaults
        let index = 0;
        for (const s of initialSales) {
          try {
            const docId = `${s.sku}_${s.date}_${index++}`;
            await setDoc(doc(db, 'sales', docId), s);
          } catch (e) {
            console.error('Sales bootstrap failed:', e);
          }
        }
      } else {
        const list: SalesData[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as SalesData);
        });
        setSalesList(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sales');
    });
    return () => unsubscribe();
  }, []);

  // 4. Sync Sales Overrides
  useEffect(() => {
    const docRef = doc(db, 'settings', 'sales_overrides');
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSalesOverrides(data.overrides || {});
      } else {
        try {
          await setDoc(docRef, { overrides: {} });
        } catch (e) {
          console.error(e);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/sales_overrides');
    });
    return () => unsubscribe();
  }, []);

  // 5. Sync Manufacturers
  useEffect(() => {
    const q = collection(db, 'manufacturers');
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap database with manufacturer defaults
        for (const m of initialManufacturers) {
          try {
            await setDoc(doc(db, 'manufacturers', m.id), m);
          } catch (e) {
            console.error('Manufacturers bootstrap failed:', e);
          }
        }
      } else {
        const list: Manufacturer[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as Manufacturer);
        });
        setManufacturers(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'manufacturers');
    });
    return () => unsubscribe();
  }, []);

  // 6. Sync Orders Ledger
  useEffect(() => {
    const q = collection(db, 'orders');
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (snapshot.empty) {
        // Bootstrap defaults
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
        for (const o of defaults) {
          try {
            await setDoc(doc(db, 'orders', o.id), o);
          } catch (e) {
            console.error('Orders bootstrap failed:', e);
          }
        }
      } else {
        const list: PurchaseOrder[] = [];
        snapshot.forEach((docSnap) => {
          list.push(docSnap.data() as PurchaseOrder);
        });
        list.sort((a, b) => b.id.localeCompare(a.id));
        setOrders(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'orders');
    });
    return () => unsubscribe();
  }, []);

  // 7. Sync Workspace Proposals
  useEffect(() => {
    const docRef = doc(db, 'settings', 'global_proposals');
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setProposedQuantities(data.quantities || {});
        setProposedDeliveryDates(data.deliveryDates || {});
        setProposedSelectedSkus(data.selectedSkus || {});
      } else {
        try {
          await setDoc(docRef, { quantities: {}, deliveryDates: {}, selectedSkus: {} });
        } catch (e) {
          console.error(e);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/global_proposals');
    });
    return () => unsubscribe();
  }, []);

  // 8. Sync CSV Upload Timestamps
  useEffect(() => {
    const docRef = doc(db, 'settings', 'upload_timestamps');
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUploadTimestamps(data.timestamps || {
          fba: '2026/05/25 13:32',
          rsl: '2026/05/25 13:32',
          sc: '2026/05/25 13:32',
          logi: '2026/05/25 13:32',
          products: '2026/05/25 13:32',
          sales: '2026/05/25 13:32',
        });
      } else {
        const initial = {
          fba: '2026/05/25 13:32',
          rsl: '2026/05/25 13:32',
          sc: '2026/05/25 13:32',
          logi: '2026/05/25 13:32',
          products: '2026/05/25 13:32',
          sales: '2026/05/25 13:32',
        };
        try {
          await setDoc(docRef, { timestamps: initial });
        } catch (e) {
          console.error(e);
        }
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'settings/upload_timestamps');
    });
    return () => unsubscribe();
  }, []);

  // ----------------- FIRESTORE MUTATIVE WRITES -----------------

  const handleUpdateSalesOverrides = async (newOverrides: Record<string, number>) => {
    setSalesOverrides(newOverrides);
    try {
      await setDoc(doc(db, 'settings', 'sales_overrides'), { overrides: newOverrides });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/sales_overrides');
    }
  };

  const handleAddManufacturer = async (newM: Manufacturer) => {
    try {
      await setDoc(doc(db, 'manufacturers', newM.id), newM);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `manufacturers/${newM.id}`);
    }
  };

  const handleUpdateManufacturer = async (updatedM: Manufacturer) => {
    try {
      await setDoc(doc(db, 'manufacturers', updatedM.id), updatedM);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `manufacturers/${updatedM.id}`);
    }
  };

  const handleDeleteManufacturer = async (idToDelete: string) => {
    try {
      await deleteDoc(doc(db, 'manufacturers', idToDelete));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `manufacturers/${idToDelete}`);
    }
  };

  const handleAddOrder = async (newOrder: PurchaseOrder) => {
    try {
      await setDoc(doc(db, 'orders', newOrder.id), newOrder);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `orders/${newOrder.id}`);
    }
  };

  const handleUpdateOrder = async (updatedOrder: PurchaseOrder) => {
    try {
      await setDoc(doc(db, 'orders', updatedOrder.id), updatedOrder);
      
      // Auto-update inventory stocks of products if the order moves to '入庫完了'
      if (updatedOrder.status === '入庫完了') {
        const nextInventoryPromises = inventoryList.map(async (inv) => {
          const matchingItem = updatedOrder.items.find(it => it.sku === inv.sku);
          if (matchingItem) {
            const updatedInv = {
              ...inv,
              logiStock: inv.logiStock + matchingItem.requestedQty,
              status: '在庫あり'
            };
            await setDoc(doc(db, 'inventory', inv.sku), updatedInv);
          }
        });
        await Promise.all(nextInventoryPromises);
        addToast(`発注商品がすべて入庫完了したため、クラウドロジ(国内流通倉庫)在庫に加算されました！`, 'success');
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `orders/${updatedOrder.id}`);
    }
  };

  const handleDeleteOrder = async (idToDelete: string) => {
    try {
      await deleteDoc(doc(db, 'orders', idToDelete));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `orders/${idToDelete}`);
    }
  };

  const handleUpdateProposedQuantities = async (newVal: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)) => {
    const next = typeof newVal === 'function' ? newVal(proposedQuantities) : newVal;
    setProposedQuantities(next);
    try {
      await setDoc(doc(db, 'settings', 'global_proposals'), {
        quantities: next,
        deliveryDates: proposedDeliveryDates,
        selectedSkus: proposedSelectedSkus
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/global_proposals');
    }
  };

  const handleUpdateProposedDeliveryDates = async (newVal: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => {
    const next = typeof newVal === 'function' ? newVal(proposedDeliveryDates) : newVal;
    setProposedDeliveryDates(next);
    try {
      await setDoc(doc(db, 'settings', 'global_proposals'), {
        quantities: proposedQuantities,
        deliveryDates: next,
        selectedSkus: proposedSelectedSkus
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/global_proposals');
    }
  };

  const handleUpdateProposedSelectedSkus = async (newVal: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>)) => {
    const next = typeof newVal === 'function' ? newVal(proposedSelectedSkus) : newVal;
    setProposedSelectedSkus(next);
    try {
      await setDoc(doc(db, 'settings', 'global_proposals'), {
        quantities: proposedQuantities,
        deliveryDates: proposedDeliveryDates,
        selectedSkus: next
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/global_proposals');
    }
  };

  const handleAddProduct = async (newProduct: ProductMaster) => {
    try {
      await setDoc(doc(db, 'products', newProduct.sku), newProduct);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `products/${newProduct.sku}`);
    }
  };

  const handleUpdateProduct = async (updatedProduct: ProductMaster) => {
    try {
      await setDoc(doc(db, 'products', updatedProduct.sku), updatedProduct);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `products/${updatedProduct.sku}`);
    }
  };

  const handleDeleteProduct = async (skuToDelete: string) => {
    try {
      await deleteDoc(doc(db, 'products', skuToDelete));
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, `products/${skuToDelete}`);
    }
  };

  // --- CSV MULTI-UPLOAD UPSERT ORCHESTRATORS ON SNAPSHOTS ---
  const handleImportProducts = async (newProducts: ProductMaster[]) => {
    try {
      for (const p of newProducts) {
        await setDoc(doc(db, 'products', p.sku), p);
      }
      const nowStr = getFormattedNow();
      await setDoc(doc(db, 'settings', 'upload_timestamps'), {
        timestamps: {
          ...uploadTimestamps,
          products: nowStr
        }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/upload_timestamps');
    }
  };

  const handleImportInventory = async (newInventory: InventoryData[], subtype?: 'fba' | 'rsl' | 'sc' | 'logi' | 'all') => {
    try {
      for (const i of newInventory) {
        await setDoc(doc(db, 'inventory', i.sku), i);
      }
      if (subtype) {
        const nowStr = getFormattedNow();
        let nextTimestamps = { ...uploadTimestamps };
        if (subtype === 'all') {
          nextTimestamps = {
            ...nextTimestamps,
            fba: nowStr,
            rsl: nowStr,
            sc: nowStr,
            logi: nowStr,
          };
        } else {
          nextTimestamps = {
            ...nextTimestamps,
            [subtype]: nowStr,
          };
        }
        await setDoc(doc(db, 'settings', 'upload_timestamps'), {
          timestamps: nextTimestamps
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/upload_timestamps');
    }
  };

  const handleImportSales = async (newSales: SalesData[]) => {
    try {
      let index = Math.floor(Math.random() * 100000);
      for (const s of newSales) {
        const docId = `${s.sku}_${s.date}_${index++}`;
        await setDoc(doc(db, 'sales', docId), s);
      }
      const nowStr = getFormattedNow();
      await setDoc(doc(db, 'settings', 'upload_timestamps'), {
        timestamps: {
          ...uploadTimestamps,
          sales: nowStr
        }
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, 'settings/upload_timestamps');
    }
  };

  // Active navigation tab
  const [activeTab, setActiveTab ] = useState<string>('dashboard');

  // Shared state for transferring proposed brand order drafts to the Order Processing tab
  const [prefilledDraft, setPrefilledDraft] = useState<{
    target: string;
    quantities: Record<string, number>;
    deliveryDates?: Record<string, string>;
  } | null>(null);

  const handleRegisterDraftToOrder = (
    target: string,
    quantities: Record<string, number>,
    deliveryDates?: Record<string, string>
  ) => {
    setPrefilledDraft({ target, quantities, deliveryDates });
    setActiveTab('orders');
  };

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
    }, 4505);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper to format system timestamp
  const getFormattedNow = () => {
    const now = new Date();
    return `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-100 flex flex-col antialiased">
      
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
            { id: 'sales', label: '月間販売数修正', icon: TrendingUp },
            { id: 'proposals', label: 'ブランド別発注希望', icon: ShoppingCart },
            { id: 'orders', label: '発注処理', icon: ClipboardList },
            { id: 'inbound', label: '入庫状況・調整', icon: Truck },
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
            salesOverrides={salesOverrides}
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
            salesOverrides={salesOverrides}
            orders={orders}
            onAddOrder={handleAddOrder}
            onUpdateOrder={handleUpdateOrder}
            uploadTimestamps={uploadTimestamps}
            addToast={addToast}
          />
        )}

        {activeTab === 'sales' && (
          <MonthlySalesTab
            products={products}
            salesList={salesList}
            salesOverrides={salesOverrides}
            onUpdateSalesOverrides={handleUpdateSalesOverrides}
            addToast={addToast}
          />
        )}

        {activeTab === 'proposals' && (
          <BrandOrderProposalsTab
            products={products}
            inventoryList={inventoryList}
            salesList={salesList}
            salesOverrides={salesOverrides}
            orders={orders}
            onRegisterDraft={handleRegisterDraftToOrder}
            addToast={addToast}
            proposedQuantities={proposedQuantities}
            onUpdateProposedQuantities={handleUpdateProposedQuantities}
            proposedDeliveryDates={proposedDeliveryDates}
            onUpdateProposedDeliveryDates={handleUpdateProposedDeliveryDates}
            proposedSelectedSkus={proposedSelectedSkus}
            onUpdateProposedSelectedSkus={handleUpdateProposedSelectedSkus}
          />
        )}

        {activeTab === 'orders' && (
          <OrderManagementTab
            products={products}
            manufacturers={manufacturers}
            inventoryList={inventoryList}
            salesList={salesList}
            salesOverrides={salesOverrides}
            orders={orders}
            onAddOrder={handleAddOrder}
            onUpdateOrder={handleUpdateOrder}
            onDeleteOrder={handleDeleteOrder}
            addToast={addToast}
            prefilledDraft={prefilledDraft}
            onClearPrefilledDraft={() => setPrefilledDraft(null)}
            proposedQuantities={proposedQuantities}
            onUpdateProposedQuantities={handleUpdateProposedQuantities}
            proposedDeliveryDates={proposedDeliveryDates}
            onUpdateProposedDeliveryDates={handleUpdateProposedDeliveryDates}
            proposedSelectedSkus={proposedSelectedSkus}
            onUpdateProposedSelectedSkus={handleUpdateProposedSelectedSkus}
          />
        )}

        {activeTab === 'inbound' && (
          <InboundManagementTab
            orders={orders}
            onUpdateOrder={handleUpdateOrder}
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
