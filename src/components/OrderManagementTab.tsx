import React, { useState, useMemo, useEffect } from 'react';
import { 
  ClipboardList, 
  Trash2, 
  Download, 
  Check, 
  AlertCircle, 
  Calendar, 
  TrendingUp, 
  Scale, 
  Info, 
  ChevronRight,
  ChevronLeft,
  Truck, 
  Package,
  CheckCircle2,
  FileSpreadsheet,
  Building2,
  Printer,
  Copy,
  Plus,
  ArrowRightLeft,
  Search,
  CheckCircle,
  Hash,
  HelpCircle,
  FileText
} from 'lucide-react';
import { ProductMaster, InventoryData, SalesData, PurchaseOrder, PurchaseOrderItem, Manufacturer } from '../types';
import { BRANDS } from '../data/mockData';
import { computeRecommendations, findInventoryForProduct } from '../utils/calculations';

interface OrderManagementTabProps {
  products: ProductMaster[];
  manufacturers: Manufacturer[];
  inventoryList: InventoryData[];
  salesList: SalesData[];
  orders: PurchaseOrder[];
  onAddOrder: (order: PurchaseOrder) => void;
  onUpdateOrder: (order: PurchaseOrder) => void;
  onDeleteOrder: (id: string) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
  prefilledDraft?: {
    target: string;
    quantities: Record<string, number>;
  } | null;
  onClearPrefilledDraft?: () => void;
}

export default function OrderManagementTab({
  products,
  manufacturers = [],
  inventoryList,
  salesList,
  orders,
  onAddOrder,
  onUpdateOrder,
  onDeleteOrder,
  addToast,
  prefilledDraft,
  onClearPrefilledDraft
}: OrderManagementTabProps) {
  // Navigation inside Order Tab: 'planner' (Interactive Wizard) or 'ledger' (Past PO Archives & Stock In)
  const [subTab, setSubTab] = useState<'planner' | 'ledger'>('planner');

  // --- WIZARD FLOW STATE ---
  const [activeStep, setActiveStep] = useState<1 | 2 | 3 | 4>(1);
  const [orderTarget, setOrderTarget] = useState<'tea_consolidated' | string>('tea_consolidated'); 

  // PIC & Scheduled base date
  const [assignedPIC, setAssignedPIC] = useState('佐藤 拓也');
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14); // Default lead-time 14 days
    return d.toISOString().split('T')[0];
  });
  const [orderNotes, setOrderNotes] = useState('');
  const [poTitleCustom, setPoTitleCustom] = useState('');

  // Step 1: Brands raw quantities to purchase
  // {[sku]: qty}
  const [step1Quantities, setStep1Quantities] = useState<Record<string, number>>({});
  const [step1DeliveryDates, setStep1DeliveryDates] = useState<Record<string, string>>({});

  // Step 3: Rounding weights per integrationCode (or SKU if no code)
  // {[integrationKey]: kg}
  const [step3Weights, setStep3Weights] = useState<Record<string, number>>({});
  // Lot weights cache if user wants custom rounding multiplier
  const [step3LotUnits, setStep3LotUnits] = useState<Record<string, number>>({});

  // Step 4: Proportioned and fine-tuned final pack quantities
  // {[sku]: quantity}
  const [step4FinalQuantities, setStep4FinalQuantities] = useState<Record<string, number>>({});

  // Ledger Search Filters
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerStatusFilter, setLedgerStatusFilter] = useState<'all' | '発注済' | '検収中/入庫中' | '入庫完了'>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});

  // Printing document modal states
  const [activePOForDoc, setActivePOForDoc] = useState<PurchaseOrder | null>(null);
  const [selectedManufacturerDoc, setSelectedManufacturerDoc] = useState<{
    manufacturerName: string;
    type: '原料' | '製造';
    brandFilter?: string; // Optional filter for brand-specific processor sheets
  } | null>(null);

  // Compute standard automated suggestions from sales/stock trends
  const recommendations = useMemo(() => {
    return computeRecommendations(products, inventoryList, salesList);
  }, [products, inventoryList, salesList]);

  // Sync / Reset Step 1 values to recommendation suggestions on load or target toggle
  const targetedProducts = useMemo(() => {
    return products.filter(p => {
      if (!p.isActive) return false;
      if (orderTarget === 'tea_consolidated') {
        return p.category === 'お茶';
      } else {
        return p.brand === orderTarget;
      }
    });
  }, [products, orderTarget]);

  // Set suggested items to Draft step 1
  const applySuggestedToStep1 = () => {
    const qtys: Record<string, number> = {};
    const dates: Record<string, string> = {};
    targetedProducts.forEach(p => {
      const recom = recommendations.find(r => r.product.sku === p.sku);
      qtys[p.sku] = recom ? recom.recommendedQty : 0;
      dates[p.sku] = scheduledDate;
    });
    setStep1Quantities(qtys);
    setStep1DeliveryDates(dates);
    addToast('推奨発注数量をステップ1に仮入力しました！', 'success');
  };

  const clearStep1Quantities = () => {
    const qtys: Record<string, number> = {};
    targetedProducts.forEach(p => {
      qtys[p.sku] = 0;
    });
    setStep1Quantities(qtys);
    addToast('すべての仮発注数量を0にリセットしました。', 'warning');
  };

  const isPrefillingRef = React.useRef(false);

  // Run on start
  useEffect(() => {
    if (isPrefillingRef.current) {
      isPrefillingRef.current = false;
      return;
    }
    applySuggestedToStep1();
  }, [targetedProducts, recommendations, scheduledDate]);

  // Sync prefilledDraft into form setup
  useEffect(() => {
    if (prefilledDraft) {
      isPrefillingRef.current = true;
      setOrderTarget(prefilledDraft.target);
      setStep1Quantities(prefilledDraft.quantities);
      setActiveStep(1);
      setSubTab('planner');
      
      const dates: Record<string, string> = {};
      Object.keys(prefilledDraft.quantities).forEach(sku => {
        dates[sku] = scheduledDate;
      });
      setStep1DeliveryDates(dates);

      if (onClearPrefilledDraft) {
        onClearPrefilledDraft();
      }
    }
  }, [prefilledDraft, onClearPrefilledDraft, scheduledDate]);

  // -----------------------------------------------------------------
  // STEP 2: AGGREGATE SAME-CLASS TEA MERGING (INTERMEDIATE DERIVED DATA)
  // -----------------------------------------------------------------
  const step2ConsolidatedGroups = useMemo(() => {
    const groups: Record<string, {
      key: string;               // integrationCode or SKU
      name: string;              // consolidated name
      rawMaterialProducer: string;
      fillingParty: string;
      orderUnitKg: number;
      weightPerPackG: number;
      totalOriginalQty: number;
      calculatedOriginalWeightKg: number;
      items: {
        product: ProductMaster;
        qty: number;
        deliveryDate: string;
      }[];
    }> = {};

    targetedProducts.forEach(p => {
      const qty = step1Quantities[p.sku] || 0;
      if (qty <= 0) return;

      const key = p.integrationCode || p.sku;
      const weightG = p.weight || 160;

      if (!groups[key]) {
        groups[key] = {
          key,
          name: p.integrationCode ? `🌱 ${p.name}原料 等 (統合コード: ${p.integrationCode})` : p.name,
          rawMaterialProducer: p.rawMaterialProducer || '未設定',
          fillingParty: p.fillingParty || '未設定',
          orderUnitKg: p.orderUnitKg || 20,
          weightPerPackG: weightG,
          totalOriginalQty: 0,
          calculatedOriginalWeightKg: 0,
          items: []
        };
      }

      groups[key].items.push({
        product: p,
        qty,
        deliveryDate: step1DeliveryDates[p.sku] || scheduledDate || ''
      });
      groups[key].totalOriginalQty += qty;
      groups[key].calculatedOriginalWeightKg += (qty * weightG) / 1000;
    });

    return Object.values(groups);
  }, [targetedProducts, step1Quantities, step1DeliveryDates, scheduledDate]);

  // Sync Step 3 rounded values when groups compute
  useEffect(() => {
    const weights: Record<string, number> = {};
    const lots: Record<string, number> = {};
    step2ConsolidatedGroups.forEach(g => {
      lots[g.key] = g.orderUnitKg;
      // Calculate ceiling round up based on lot weight
      const rawW = g.calculatedOriginalWeightKg;
      if (g.orderUnitKg > 0) {
        weights[g.key] = Math.ceil(rawW / g.orderUnitKg) * g.orderUnitKg;
      } else {
        weights[g.key] = rawW;
      }
    });
    setStep3Weights(prev => {
      // Retain manual overrides unless group disappears
      const next = { ...weights };
      Object.keys(prev).forEach(k => {
        if (k in weights) {
          next[k] = prev[k];
        }
      });
      return next;
    });
    setStep3LotUnits(lots);
  }, [step2ConsolidatedGroups]);


  // -----------------------------------------------------------------
  // STEP 4: DISTRIBUTE surplus proportionally and back-calculate
  // -----------------------------------------------------------------
  // Auto-derived allocated outputs
  const step4DistributedOutputs = useMemo(() => {
    const allocated: Record<string, {
      sku: string;
      product: ProductMaster;
      originalQty: number;
      allocatedQty: number;
      allocatedWeightKg: number;
      deliveryDate: string;
      ratio: number;
    }> = {};

    step2ConsolidatedGroups.forEach(g => {
      const adjustedWeight = step3Weights[g.key] !== undefined ? step3Weights[g.key] : g.calculatedOriginalWeightKg;
      const totalOriginalWeight = g.calculatedOriginalWeightKg;
      
      // Determine ratio multiplier
      const multiplier = totalOriginalWeight > 0 ? (adjustedWeight / totalOriginalWeight) : 1;

      g.items.forEach(item => {
        const p = item.product;
        // Compute raw proportional kg share
        const originalItemWeight = (item.qty * (p.weight || 160)) / 1000;
        const targetItemWeightKg = originalItemWeight * multiplier;
        
        // Solve back into packs (rounded)
        const backCalculatedQty = Math.round((targetItemWeightKg * 1000) / (p.weight || 160));
        
        allocated[p.sku] = {
          sku: p.sku,
          product: p,
          originalQty: item.qty,
          allocatedQty: backCalculatedQty,
          allocatedWeightKg: targetItemWeightKg,
          deliveryDate: item.deliveryDate,
          ratio: multiplier
        };
      });
    });

    return allocated;
  }, [step2ConsolidatedGroups, step3Weights]);

  // Initial populate of Step 4 quantities once derived
  useEffect(() => {
    const qtys: Record<string, number> = {};
    Object.keys(step4DistributedOutputs).forEach(sku => {
      qtys[sku] = step4DistributedOutputs[sku].allocatedQty;
    });
    setStep4FinalQuantities(prev => {
      const next = { ...qtys };
      // Retain manual modifications inside Step 4
      Object.keys(prev).forEach(k => {
        if (k in qtys) {
          next[k] = prev[k];
        }
      });
      return next;
    });
  }, [step4DistributedOutputs]);


  // Summary of Step 4
  const step4ProportionedSummary = useMemo(() => {
    let originalTotalPacks = 0;
    let allocatedTotalPacks = 0;
    
    let originalTotalKg = 0;
    let allocatedTotalKg = 0;

    const list = Object.keys(step4FinalQuantities).map(sku => {
      const info = step4DistributedOutputs[sku];
      if (!info) return null;

      const finalQty = step4FinalQuantities[sku];
      const finalWeightKg = (finalQty * (info.product.weight || 160)) / 1000;

      originalTotalPacks += info.originalQty;
      allocatedTotalPacks += finalQty;

      originalTotalKg += info.allocatedWeightKg;
      allocatedTotalKg += finalWeightKg;

      return {
        ...info,
        finalQty,
        finalWeightKg
      };
    }).filter(Boolean);

    return {
      list,
      originalTotalPacks,
      allocatedTotalPacks,
      originalTotalKg,
      allocatedTotalKg
    };
  }, [step4FinalQuantities, step4DistributedOutputs]);


  // -----------------------------------------------------------------
  // SUBMIT ORDER TO LEDGER TRAIL
  // -----------------------------------------------------------------
  const handleRegisterPurchaseOrder = () => {
    // Collect non-zero items
    const purchaseItems: PurchaseOrderItem[] = [];
    
    step4ProportionedSummary.list.forEach(item => {
      if (!item) return;
      if (item.finalQty <= 0) return;

      purchaseItems.push({
        sku: item.product.sku,
        productName: item.product.name,
        brand: item.product.brand,
        requestedQty: item.originalQty, // original target
        weight: item.product.weight || 160,
        orderUnitKg: item.product.orderUnitKg || 20,
        calculatedWeightKg: item.allocatedWeightKg, // target fraction
        adjustedWeightKg: item.finalWeightKg,       // adjusted rounding
        adjustedQty: item.finalQty,                 // adjusted counts
        deliveryDate: item.deliveryDate
      });
    });

    if (purchaseItems.length === 0) {
      addToast('発注数量が登録されている商品がありません。', 'error');
      return;
    }

    const titlePrefix = orderTarget === 'tea_consolidated' ? '【お茶統合】' : `【${orderTarget}合算】`;
    const defaultTitle = poTitleCustom || `${titlePrefix}${new Date().getMonth() + 1}月調整仕入発注`;

    const newPO: PurchaseOrder = {
      id: `PO-${orderTarget === 'tea_consolidated' ? 'TEA' : 'BRAND'}-${Date.now().toString().slice(-6)}`,
      groupName: defaultTitle,
      orderDate: new Date().toISOString().split('T')[0],
      scheduledDeliveryDate: scheduledDate,
      assignedStaff: assignedPIC || '管理担当',
      status: '発注済',
      items: purchaseItems,
      notes: orderNotes
    };

    onAddOrder(newPO);
    addToast(`発注伝票「${newPO.id}」を確定登録しました。`, 'success');

    // Reset wizard
    setStep1Quantities({});
    setStep1DeliveryDates({});
    setStep3Weights({});
    setStep4FinalQuantities({});
    setPoTitleCustom('');
    setOrderNotes('');
    setActiveStep(1);
    
    // Jump straight to the archives ledger tab!
    setSubTab('ledger');
    // Set for direct preview
    setActivePOForDoc(newPO);
  };


  // -----------------------------------------------------------------
  // LEDGER FILTERED LISTING FOR VIEWING PAST RECORDS
  // -----------------------------------------------------------------
  const filteredLedgerPOList = useMemo(() => {
    return orders.filter(po => {
      const matchSearch = 
        po.id.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        po.groupName.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        po.assignedStaff.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        (po.notes || '').toLowerCase().includes(ledgerSearch.toLowerCase());

      const matchStatus = ledgerStatusFilter === 'all' || po.status === ledgerStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [orders, ledgerSearch, ledgerStatusFilter]);


  // Helper to resolve specific manufacturer contact profile details
  const getManufacturerInfo = (name: string, mType: '原料' | '製造') => {
    const match = manufacturers.find(m => m.name === name && m.type === mType);
    if (match) return match;
    
    // Fallback static templates matching prompt preset requirements
    return {
      name,
      type: mType,
      contactName: '担当窓口様',
      phone: '00-0000-0000',
      email: 'vendor-contact@example.com',
      fax: '00-0000-0000',
      notes: '※マスター未設定（マスタ管理タブにて追加してください）'
    };
  };

  // ---------------------------------------------------------
  // PRINT ACTION PDF POPUPS TRIGGERS
  // ---------------------------------------------------------
  const openPrintSheet = (po: PurchaseOrder, mName: string, type: '原料' | '製造', brandFilter?: string) => {
    setActivePOForDoc(po);
    setSelectedManufacturerDoc({ manufacturerName: mName, type, brandFilter });
  };

  return (
    <div className="space-y-6">

      {/* Main Mode Toggles Selector */}
      <div className="flex border-b border-slate-800 bg-slate-900/40 p-1 rounded-xl gap-1">
        <button
          onClick={() => setSubTab('planner')}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            subTab === 'planner'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>① 新規発注処理（4段階ロット調整モデル）</span>
        </button>
        <button
          onClick={() => setSubTab('ledger')}
          className={`flex-1 py-3 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            subTab === 'ledger'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          <span>② 過去発注台帳・入庫管理・各社発注書発行</span>
        </button>
      </div>

      {/* ---------------------------------------------------------
          VIEW A: ACTION INTERACTIVE PLANNER FORM WIZARD
         --------------------------------------------------------- */}
      {subTab === 'planner' && (
        <div className="space-y-6">
          
          {/* Top Wizard Control Information header */}
          <div className="bg-slate-900 border border-slate-850 rounded-xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="bg-emerald-950 text-emerald-400 text-[10px] font-mono tracking-widest px-2.5 py-0.5 rounded-full border border-emerald-900/50 mb-1.5 inline-block">
                  Tea Multi-Brand Supply Calibration
                </span>
                <h2 className="text-base font-bold text-slate-100">お茶ブランド統合発注処理キャリブレーション</h2>
                <p className="text-slate-400 text-xs mt-1">
                  ブランド各社の希望パック数から「必要総重量」を統合集計し、卸元のロット単位(kg)に丸めて、増量分を瞬時にブランド別比率配分(逆算)する高度な調達フローです。
                </p>
              </div>

              {/* Order scope target selection */}
              <div className="bg-slate-950 p-2 rounded-lg border border-slate-850 flex items-center gap-2.5">
                <span className="text-xs text-slate-400 ml-1 font-bold">発注対象:</span>
                <select
                  value={orderTarget}
                  onChange={(e) => {
                    setOrderTarget(e.target.value);
                  }}
                  className="bg-slate-900 border border-slate-800 text-xs font-bold text-emerald-400 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="tea_consolidated">🍵 【合計均一】全お茶ブランド合算</option>
                  {BRANDS.map(b => (
                    <option key={b} value={b}>{b} 専売品のみ</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Interactive Steps Indicators Bar */}
          <div className="grid grid-cols-4 gap-2 bg-slate-900 p-2 rounded-xl border border-slate-850">
            {[
              { num: 1, title: '① 数量登録', desc: 'ブランド別希望個数' },
              { num: 2, title: '② 統合データ集計', desc: '統合コード別kg換算' },
              { num: 3, title: '③ ロット丸め調整', desc: '調達単位kgの確定' },
              { num: 4, title: '④ ブランド再配分', desc: '増量分自動割り振り' }
            ].map((s) => {
              const active = activeStep === s.num;
              const completed = activeStep > s.num;
              return (
                <div
                  key={s.num}
                  className={`flex flex-col p-3 rounded-lg border transition-all text-left ${
                    active 
                      ? 'bg-indigo-950/70 border-indigo-500 text-indigo-200' 
                      : completed
                      ? 'bg-slate-950/40 border-slate-850 text-slate-400'
                      : 'border-transparent text-slate-500 bg-slate-950/20'
                  }`}
                >
                  <span className={`text-[10px] font-mono tracking-widest uppercase mb-1 ${active ? 'text-indigo-400' : 'text-slate-500'}`}>
                    Step 0{s.num} {completed && '✓'}
                  </span>
                  <p className="text-xs font-bold">{s.title}</p>
                  <span className="text-[9px] text-slate-500 font-sans mt-0.5 hidden sm:block leading-tight">{s.desc}</span>
                </div>
              );
            })}
          </div>

          {/* -------------------------------------------------------------
              STEP 1 PANELS: REGISTER BASE QUANTITIES
             ------------------------------------------------------------- */}
          {activeStep === 1 && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-indigo-505 bg-indigo-550 rounded-sm"></span>
                    <span>ステップ1：ブランド別確定発注数量（パック個数）の初期登録</span>
                  </h3>
                  <p className="text-slate-400 text-xs mt-1">
                    各温活農園やママセレクト等お茶の各銘柄に必要な個数を、売れ行きや推奨発注量を加味して入力してください。
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={applySuggestedToStep1}
                    className="bg-indigo-950 text-indigo-300 border border-indigo-900 text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-900/50 transition-colors"
                  >
                    自動予測値を一括入力
                  </button>
                  <button
                    onClick={clearStep1Quantities}
                    className="bg-slate-950 text-slate-400 border border-slate-850 text-xs px-3 py-1.5 rounded-lg hover:border-slate-800 transition-colors"
                  >
                    すべて0にクリア
                  </button>
                </div>
              </div>

              {/* List grid of Products to enter manual targeted quantities */}
              <div className="bg-slate-900 border border-slate-850 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-350">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 uppercase text-[10px] tracking-wider font-mono">
                        <th className="py-3 px-4">商品名 & SKU</th>
                        <th className="py-3 px-3">ブランド</th>
                        <th className="py-3 px-3">グラム数 / 形態</th>
                        <th className="py-3 px-3 text-center">現在総在庫</th>
                        <th className="py-3 px-3 text-center text-indigo-400">推奨発注推奨</th>
                        <th className="py-3 px-4 text-right max-w-[130px] font-bold text-white bg-indigo-950/25">確定発注希望数 (個) *</th>
                        <th className="py-3 px-4 text-center">希望納期</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {targetedProducts.map(p => {
                        const recom = recommendations.find(r => r.product.sku === p.sku);
                        const inv = findInventoryForProduct(p, inventoryList, products);
                        const totalStock = inv.fbaStock + inv.rslStock + inv.scStock + inv.logiStock;
                        
                        const qtyVal = step1Quantities[p.sku] ?? 0;
                        const dateVal = step1DeliveryDates[p.sku] || scheduledDate;

                        return (
                          <tr key={p.sku} className="hover:bg-slate-850/40">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-100">{p.name}</p>
                              <span className="font-mono text-[10px] text-slate-500">{p.sku}</span>
                              {p.integrationCode && <span className="ml-1.5 text-[9px] font-bold bg-indigo-950 text-indigo-300 px-1 border border-indigo-900/40 rounded">統合: {p.integrationCode}</span>}
                            </td>
                            <td className="py-3 px-3 font-medium text-slate-200">{p.brand}</td>
                            <td className="py-3 px-3 text-slate-400">{p.weight}g ({p.volume})</td>
                            <td className="py-3 px-3 text-center font-mono font-medium">{totalStock.toLocaleString()} 個</td>
                            <td className="py-3 px-3 text-center">
                              <span className={`text-[11px] font-mono font-bold ${recom && recom.recommendedQty > 0 ? 'text-indigo-400' : 'text-slate-500'}`}>
                                {recom ? recom.recommendedQty.toLocaleString() : 0} 個
                              </span>
                            </td>
                            <td className="py-2 px-4 text-right max-w-[130px] bg-indigo-950/10">
                              <input
                                type="number"
                                min="0"
                                value={qtyVal === 0 ? '' : qtyVal}
                                onChange={(e) => {
                                  const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setStep1Quantities(prev => ({ ...prev, [p.sku]: val }));
                                }}
                                placeholder="0"
                                className="w-full bg-slate-950 border border-indigo-950 text-indigo-300 font-mono font-bold text-right py-1.5 px-2.5 rounded text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-4 text-center">
                              <input
                                type="date"
                                value={dateVal}
                                onChange={(e) => {
                                  setStep1DeliveryDates(prev => ({ ...prev, [p.sku]: e.target.value }));
                                }}
                                className="bg-slate-950 border border-slate-850 text-slate-300 font-mono text-[11px] py-1.5 px-2 rounded focus:outline-none"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Progress buttons */}
              <div className="flex justify-end pt-4 gap-2">
                <button
                  onClick={() => {
                    const totalSelected = (Object.values(step1Quantities) as number[]).reduce((a, b: number) => a + b, 0);
                    if (totalSelected === 0) {
                      addToast('発注希望数量が何も入力されていません。', 'warning');
                      return;
                    }
                    setActiveStep(2);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span>ステップ2の統合集計へ進む</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}


          {/* -------------------------------------------------------------
              STEP 2 PANELS: CONSOLIDATE DATA SUMMARIES
             ------------------------------------------------------------- */}
          {activeStep === 2 && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-emerald-500 rounded-sm"></span>
                  <span>ステップ2：統合データ（一致原料グループ）による合計集計。</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  SKUは異なりますが、お茶の中身が一緒（`integrationCode` が共通）の商品をまとめて、原料として必要な総キロ数を換算した結果です。
                </p>
              </div>

              {/* Group summaries card display */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {step2ConsolidatedGroups.map(g => (
                  <div key={g.key} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3.5">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between pb-2.5 border-b border-slate-850">
                      <div>
                        <h4 className="text-sm font-bold text-slate-100">{g.name}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">統合コードキー: {g.key}</span>
                      </div>
                      <span className="bg-indigo-950/80 text-indigo-300 border border-indigo-900/60 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {g.items.length} 構成品種
                      </span>
                    </div>

                    {/* Meta info of suppliers */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-950/60 p-2.5 rounded-lg">
                      <div className="text-slate-400">
                        原料元: <span className="text-emerald-400 font-bold">{g.rawMaterialProducer}</span>
                      </div>
                      <div className="text-slate-400">
                        製造パック先: <span className="text-indigo-300 font-bold">{g.fillingParty}</span>
                      </div>
                    </div>

                    {/* Table of products */}
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">内訳品目数量リスト：</p>
                      {g.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-xs py-1 hover:bg-slate-850/20 px-1 rounded">
                          <span className="text-slate-350">{item.product.name} ({item.product.brand})</span>
                          <span className="font-mono text-slate-200 font-bold">{item.qty.toLocaleString()} 個</span>
                        </div>
                      ))}
                    </div>

                    {/* Weight summary calculations */}
                    <div className="border-t border-slate-850/85 pt-3 flex items-center justify-between text-xs leading-none">
                      <div className="text-slate-400">
                        総パック数: <span className="font-mono font-bold text-slate-200">{g.totalOriginalQty} 包</span>
                      </div>
                      <div className="bg-indigo-950 px-3 py-1.5 rounded-lg border border-indigo-900/40 text-right">
                        <span className="text-slate-400 block text-[9.5px]">必要乾燥茶葉重量</span>
                        <span className="font-mono text-xs font-extrabold text-indigo-300">{g.calculatedOriginalWeightKg.toFixed(2)} kg</span>
                      </div>
                    </div>

                  </div>
                ))}

                {step2ConsolidatedGroups.length === 0 && (
                  <div className="col-span-full bg-slate-900 border border-slate-850 rounded-xl py-12 text-center text-slate-500 text-xs">
                    発注対象に数量が選ばれているお茶銘柄がありません。
                  </div>
                )}
              </div>

              {/* Progress buttons */}
              <div className="flex justify-between pt-4 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(1)}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>ステップ1へ戻る</span>
                </button>
                <button
                  onClick={() => setActiveStep(3)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span>ステップ3のグラムロット調整へ進む</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}


          {/* -------------------------------------------------------------
              STEP 3 PANELS: CALIBRATE AND ADJUST BUY LOTS
             ------------------------------------------------------------- */}
          {activeStep === 3 && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center gap-3">
                <div className="p-2.5 bg-indigo-950 text-indigo-400 rounded-lg shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">ステップ3：原料の発注キロ数（最低ロット）の調節</h3>
                  <p className="text-slate-400 text-xs mt-0.5">
                    仕入れ先の販売単位（ロット、例：20kg、10kgなど）に合わせて、購入する乾燥茶葉重量を切り上げ調整してください。
                  </p>
                </div>
              </div>

              {/* Adjustments calibration table map */}
              <div className="bg-slate-900 border border-slate-850 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-350">
                  <thead>
                    <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 font-mono text-[10px] tracking-wider uppercase">
                      <th className="py-3 px-4">原料グループ（統合対象）</th>
                      <th className="py-3 px-3">原料メーカー（卸元）</th>
                      <th className="py-3 px-3">発注ロット単位 (kg)</th>
                      <th className="py-3 px-3 text-right">実要求必要量 (kg)</th>
                      <th className="py-3 px-4 text-center text-white font-bold bg-indigo-950/35 w-[190px]">調整後・購入キロ数 (kg) *</th>
                      <th className="py-3 px-3 text-right text-emerald-400">端数増幅バッファ</th>
                      <th className="py-3 px-4 text-center">クイックロット設定</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    {step2ConsolidatedGroups.map(g => {
                      const reqWeight = g.calculatedOriginalWeightKg;
                      const currentAdjusted = step3Weights[g.key] ?? reqWeight;
                      const lotUnit = step3LotUnits[g.key] || 20;

                      // Buffer discrepancy
                      const surplus = currentAdjusted - reqWeight;

                      return (
                        <tr key={g.key} className="hover:bg-slate-850/40">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-100">{g.name}</p>
                            <span className="font-mono text-[9.5px] text-slate-500">KEY: {g.key}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="bg-slate-950 px-2 py-1 rounded text-[10.5px] font-bold text-slate-300 border border-slate-850/60 font-sans">
                              🍃 {g.rawMaterialProducer}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <div className="flex items-center gap-1.5 justify-center">
                              <input
                                type="number"
                                min="1"
                                value={lotUnit}
                                onChange={(e) => {
                                  const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                  setStep3LotUnits(prev => ({ ...prev, [g.key]: val }));
                                  // Auto round weight
                                  setStep3Weights(prev => ({ ...prev, [g.key]: Math.ceil(reqWeight / val) * val }));
                                }}
                                className="w-12 bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] text-center p-1 rounded focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-500">kg</span>
                            </div>
                          </td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-slate-200">
                            {reqWeight.toFixed(2)} kg
                          </td>
                          <td className="py-2 px-4 text-center font-bold bg-indigo-950/10">
                            <div className="flex items-center gap-2 justify-center">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={currentAdjusted}
                                onChange={(e) => {
                                  const val = Math.max(0, parseFloat(e.target.value) || 0);
                                  setStep3Weights(prev => ({ ...prev, [g.key]: val }));
                                }}
                                className="w-24 bg-slate-950 border border-indigo-950 font-mono text-indigo-300 font-bold py-1 px-2 rounded text-xs text-right focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-500">kg</span>
                            </div>
                          </td>
                          <td className={`py-2 px-3 text-right font-mono font-bold ${surplus > 0 ? 'text-emerald-450' : surplus === 0 ? 'text-slate-500' : 'text-rose-400'}`}>
                            {surplus >= 0 ? `+${surplus.toFixed(2)}` : surplus.toFixed(2)} kg
                          </td>
                          <td className="py-2 px-4 text-center space-x-1">
                            {/* Round ceiling button */}
                            <button
                              type="button"
                              onClick={() => {
                                if (lotUnit > 0) {
                                  const ceiling = Math.ceil(reqWeight / lotUnit) * lotUnit;
                                  setStep3Weights(prev => ({ ...prev, [g.key]: ceiling }));
                                  addToast(`${g.key}をロット単位切り上げ（${ceiling}kg）に調整しました。`, 'success');
                                }
                              }}
                              className="bg-slate-950 hover:bg-slate-800 text-[10px] text-slate-350 px-2 py-1 rounded border border-slate-850 transition-colors"
                            >
                              端数切上
                            </button>
                            {/* Target original lock button */}
                            <button
                              type="button"
                              onClick={() => {
                                setStep3Weights(prev => ({ ...prev, [g.key]: reqWeight }));
                                addToast(`${g.key}を実要求（${reqWeight.toFixed(2)}kg）に一致させました。`, 'warning');
                              }}
                              className="bg-slate-950 hover:bg-slate-800 text-[10px] text-slate-500 px-2 py-1 rounded border border-slate-850 transition-colors"
                            >
                              調整なし
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Progress buttons */}
              <div className="flex justify-between pt-4 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(2)}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>ステップ2へ戻る</span>
                </button>
                <button
                  onClick={() => setActiveStep(4)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <span>ステップ4の比率逆算・再分配へ進む</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}


          {/* -------------------------------------------------------------
              STEP 4 PANELS: REDISTRIBUTE SURPLUS TO BRANDS
             ------------------------------------------------------------- */}
          {activeStep === 4 && (
            <div className="space-y-4">
              <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-indigo-500 rounded-sm"></span>
                  <span>ステップ4：増幅した原料キロ数に基づくブランド別数量の自動割り振り</span>
                </h3>
                <p className="text-slate-400 text-xs mt-1">
                  ステップ3で切り上げたキロ数に合わせて、茶葉重量から商品パック個数を自動逆算（比率分配）しました。
                  袋詰めの生産計画として、必要に応じて最終個数を微調整してください。
                </p>
              </div>

              {/* Distribute results view details */}
              <div className="bg-slate-900 border border-slate-880 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-350">
                    <thead>
                      <tr className="bg-slate-950 text-slate-400 border-b border-slate-850 font-mono text-[10px] tracking-wider uppercase">
                        <th className="py-3 px-4">商品名 (ブランド)</th>
                        <th className="py-3 px-3">製造委託工場先</th>
                        <th className="py-3 px-3 text-center">当初要望数量 (個)</th>
                        <th className="py-3 px-3 text-right">当初換算重量</th>
                        <th className="py-3 px-3 text-right text-emerald-450 bg-emerald-950/15">自動比例配分重量</th>
                        <th className="py-3 px-4 text-center text-white font-bold bg-indigo-950/30 w-[170px]">【要確認】確定発注個数 (個) *</th>
                        <th className="py-3 px-3 text-right bg-emerald-950/5">確定換算重量 (kg)</th>
                        <th className="py-3 px-3">配送希望日</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {step4ProportionedSummary.list.map(item => {
                        if (!item) return null;
                        const p = item.product;
                        const currentFinalValue = step4FinalQuantities[p.sku] ?? item.allocatedQty;
                        
                        // Derived weight in real time
                        const currentFinalWeight = (currentFinalValue * (p.weight || 160)) / 1000;

                        return (
                          <tr key={p.sku} className="hover:bg-slate-850/40">
                            <td className="py-3 px-4">
                              <p className="font-bold text-slate-100">{p.name}</p>
                              <span className="font-mono text-[9px] text-slate-500">SKU: {p.sku} | ブランド: {p.brand}</span>
                            </td>
                            <td className="py-2 px-3">
                              <span className="text-[11px] font-bold text-slate-300">
                                🏭 {p.fillingParty}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-center font-mono">{item.originalQty.toLocaleString()} 個</td>
                            <td className="py-2 px-3 text-right font-mono text-slate-400">
                              {((item.originalQty * (p.weight || 160)) / 1000).toFixed(2)} kg
                            </td>
                            <td className="py-2 px-3 text-right font-mono text-emerald-400 bg-emerald-950/5">
                              {item.allocatedWeightKg.toFixed(2)} kg
                            </td>
                            <td className="py-1 px-4 text-center bg-indigo-950/10">
                              <div className="flex items-center gap-1.5 justify-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={currentFinalValue === 0 ? '' : currentFinalValue}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                                    setStep4FinalQuantities(prev => ({ ...prev, [p.sku]: val }));
                                  }}
                                  className="w-24 bg-slate-950 border border-indigo-950 font-mono font-bold text-indigo-300 text-right py-1.5 px-2 rounded focus:outline-none"
                                />
                                <span className="text-[10px] text-slate-500">個</span>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-extrabold text-slate-200">
                              {currentFinalWeight.toFixed(2)} kg
                            </td>
                            <td className="py-2 px-3 text-slate-400 font-mono text-[10.5px]">
                              {item.deliveryDate || '指定なし'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Step 4 allocation validation discrepancy diagnostics */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-900 border border-slate-850 p-4 rounded-xl">
                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-2">⚖️ 原料調達重量との誤差チェック</h4>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">原料メーカー仕入側調整重量:</span>
                      <span className="font-mono font-bold text-slate-300">{step4ProportionedSummary.originalTotalKg.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">現在配分個数からの逆算重量:</span>
                      <span className="font-mono font-bold text-emerald-450">{step4ProportionedSummary.allocatedTotalKg.toFixed(2)} kg</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-850 pt-2 font-bold select-none">
                      <span className="text-slate-400">誤差 Discrepancy:</span>
                      {(() => {
                        const err = step4ProportionedSummary.allocatedTotalKg - step4ProportionedSummary.originalTotalKg;
                        return (
                          <span className={`font-mono ${Math.abs(err) < 0.1 ? 'text-emerald-400' : 'text-amber-450'}`}>
                            {err >= 0 ? `+${err.toFixed(2)}` : err.toFixed(2)} kg
                            {Math.abs(err) >= 0.1 ? ' (誤差微調整を推奨)' : ' (極めて良好)'}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* Additional inputs: PIC & Notes */}
                <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-slate-850 pt-3.5 md:pt-0 md:pl-4">
                  <h4 className="text-xs font-bold text-slate-300">🖊️ 発注確定用メタ情報入力</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <label className="text-slate-500">発注担当者</label>
                      <input
                        type="text"
                        value={assignedPIC}
                        onChange={(e) => setAssignedPIC(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 p-1.5 rounded text-slate-200"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-500">下書き伝票タイトル (任意)</label>
                      <input
                        type="text"
                        placeholder="例: 温活農園5月お茶"
                        value={poTitleCustom}
                        onChange={(e) => setPoTitleCustom(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 p-1.5 rounded text-slate-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 text-xs">
                    <label className="text-slate-500 block">特記メモ・工場への搬入資材指定等</label>
                    <textarea
                      placeholder="メーカーごとの注意指示：丸菱の原料はティーパック加工センターに指定。直接納品指示済。"
                      value={orderNotes}
                      onChange={(e) => setOrderNotes(e.target.value)}
                      rows={2}
                      className="w-full bg-slate-950 border border-slate-850 p-2 rounded text-slate-200 font-sans text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Progress buttons */}
              <div className="flex justify-between pt-4 gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep(3)}
                  className="bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>ステップ3へ戻る</span>
                </button>
                <button
                  onClick={handleRegisterPurchaseOrder}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black px-6 py-3 rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-600/10 cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>この調整内容で正式に発注・下書き伝票を登録する</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}


      {/* ---------------------------------------------------------
          VIEW B: ARCHIVED LEDGER LISTING & CONS CONTROL
         --------------------------------------------------------- */}
      {subTab === 'ledger' && (
        <div className="space-y-4">
          
          {/* Search bar controllers */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-850">
            <div className="relative w-full sm:max-w-xs">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="発注ID、伝票名、担当者名で検索..."
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850/80 self-stretch sm:self-auto">
              {(['all', '発注済', '検収中/入庫中', '入庫完了'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setLedgerStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex-grow sm:flex-none ${
                    ledgerStatusFilter === st
                      ? 'bg-indigo-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st === 'all' ? 'すべて台帳' : st}
                </button>
              ))}
            </div>
          </div>

          {/* Ledger Records Lists */}
          <div className="space-y-3.5">
            {filteredLedgerPOList.map((po) => {
              const isExpanded = expandedOrders[po.id];
              const resolvedTotalAllocatedKg = po.items.reduce((s, it) => s + (it.adjustedWeightKg || 0), 0);
              const resolvedTotalPacks = po.items.reduce((s, it) => s + (it.adjustedQty || it.requestedQty), 0);

              // Extract unique raw & manufacturing partners inside this particular PO
              const associatedSuppliers = Array.from(new Set(po.items.map(item => {
                const p = products.find(prod => prod.sku === item.sku);
                return p?.rawMaterialProducer;
              }).filter(Boolean))) as string[];

              const associatedProcessors = Array.from(new Set(po.items.map(item => {
                const p = products.find(prod => prod.sku === item.sku);
                return p?.fillingParty;
              }).filter(Boolean))) as string[];

              return (
                <div key={po.id} className="bg-slate-900 border border-slate-855 rounded-xl overflow-hidden transition-all">
                  
                  {/* Ledger Row summary block */}
                  <div className="p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-slate-900/60 border-b border-slate-850/60">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="bg-slate-950 border border-slate-800 font-mono text-[10.5px] font-bold text-indigo-400 px-2.5 py-0.5 rounded">
                          {po.id}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          po.status === '発注済' 
                            ? 'bg-blue-950/80 text-blue-400 border-blue-900/50' 
                            : po.status === '検収中/入庫中' 
                            ? 'bg-amber-950/80 text-amber-400 border-amber-900/50' 
                            : 'bg-emerald-950/80 text-emerald-400 border-emerald-955/50'
                        }`}>
                          {po.status}
                        </span>
                        <span className="text-slate-500 font-mono text-[10.5px] ml-2">発注日: {po.orderDate}</span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">{po.groupName}</h4>
                      <p className="text-[11px] text-slate-400">
                        担当：<span className="text-slate-300 font-medium">{po.assignedStaff}</span>
                        {po.scheduledDeliveryDate && <span className="ml-3">納期予定: <strong className="text-slate-300 font-mono">{po.scheduledDeliveryDate}</strong></span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono self-stretch lg:self-auto justify-between lg:justify-end border-t lg:border-t-0 border-slate-850/50 pt-3 lg:pt-0">
                      <div>
                        <span className="text-slate-500 block text-[9px] text-right font-sans">合計キロ数 (kg)</span>
                        <span className="text-slate-200 font-bold text-sm block text-right">{resolvedTotalAllocatedKg.toFixed(2)} kg</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] text-right font-sans">合計仕上パック (個)</span>
                        <span className="text-emerald-400 font-bold text-sm block text-right">{resolvedTotalPacks.toLocaleString()} 個</span>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => setExpandedOrders(prev => ({ ...prev, [po.id]: !isExpanded }))}
                          className="bg-slate-950 hover:bg-slate-800 border border-slate-850 text-slate-300 text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          {isExpanded ? '明細を閉じる ▲' : '明細を表示 ▼'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Expansion detail rows with PO print triggers */}
                  {isExpanded && (
                    <div className="p-5 bg-slate-950/30 space-y-4">
                      
                      {/* Interactive PDF Sheet Trigger blocks */}
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
                        <h5 className="text-xs font-bold text-emerald-450 flex items-center gap-1">
                          <Printer className="w-4 h-4 text-emerald-450" />
                          <span>お茶原料メーカー用・製造工場用 【公式発注書】のスピード発行・プレビュー</span>
                        </h5>
                        <p className="text-[10px] text-slate-450 leading-relaxed font-sans">
                          取引フロー仕様に基づいて、原料メーカー宛（ブランド合算）および製造メーカー宛（ブランド別の詳細伝票）の発注書をマスタの連絡先付きで瞬時に発行可能です。
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                          
                          {/* Vendor Raw PO links */}
                          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850 space-y-2">
                            <span className="text-[9.5px] uppercase font-bold text-emerald-400 block tracking-wider">🍃 【原料メーカーごと】発注書発行一覧 (ブランド合計丸め)</span>
                            <div className="flex flex-wrap gap-1.5">
                              {associatedSuppliers.map((sup, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => openPrintSheet(po, sup, '原料')}
                                  className="bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-900/60 text-[10.5px] font-bold px-2.5 py-1.5 rounded transition-colors flex items-center gap-1"
                                >
                                  <span>{sup} 宛発注書</span>
                                  <Printer className="w-3 h-3" />
                                </button>
                              ))}
                              {associatedSuppliers.length === 0 && (
                                <span className="text-[10.5px] text-slate-600 italic">該当原料メーカー未設定品目のみ</span>
                              )}
                            </div>
                          </div>

                          {/* Packing Processing PO links */}
                          <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-850 space-y-2">
                            <span className="text-[9.5px] uppercase font-bold text-indigo-400 block tracking-wider">🏭 【製造・充填メーカーごと】発注書発行 (ブランド個別伝票)</span>
                            <div className="space-y-2">
                              {associatedProcessors.map((proc, idx) => {
                                // Find which brands are processed by this processor inside this PO
                                const poBrandsProcessed = Array.from(new Set(po.items.filter(it => {
                                  const p = products.find(prod => prod.sku === it.sku);
                                  return p?.fillingParty === proc;
                                }).map(it => (it.brand || '') as string)));

                                return (
                                  <div key={idx} className="flex flex-col gap-1 b-t border-slate-850/50 pt-1">
                                    <span className="text-[9px] text-slate-500 font-bold font-mono">委託先: {proc}</span>
                                    <div className="flex flex-wrap gap-1">
                                      {/* Total Merged print option */}
                                      <button
                                        onClick={() => openPrintSheet(po, proc, '製造')}
                                        className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-900/60 text-[10px] px-2 py-1 rounded transition-colors flex items-center gap-1"
                                      >
                                        <span>全体統合書</span>
                                        <Printer className="w-3 h-3" />
                                      </button>
                                      {/* Specially segmented brand options */}
                                      {poBrandsProcessed.map((br, bIdx) => (
                                        <button
                                          key={bIdx}
                                          onClick={() => openPrintSheet(po, proc, '製造', br as string)}
                                          className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-[10px] px-2 py-1 rounded transition-colors flex items-center gap-1"
                                        >
                                          <span>{br as string}専用シート</span>
                                          <Printer className="w-2.5 h-2.5 text-slate-400" />
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
                              {associatedProcessors.length === 0 && (
                                <span className="text-[10.5px] text-slate-600 italic">該当製造メーカー未設定品目のみ</span>
                              )}
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Items table list view */}
                      <div className="bg-slate-900 border border-slate-850 rounded-lg overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-450">
                          <thead>
                            <tr className="bg-slate-950 text-slate-500 border-b border-slate-850 uppercase font-mono text-[9px]">
                              <th className="py-2.5 px-3">SKU</th>
                              <th className="py-2.5 px-3">商品名 / ブランド</th>
                              <th className="py-2.5 px-3 text-right">要求個数</th>
                              <th className="py-2.5 px-3 text-right">原料換算</th>
                              <th className="py-2.5 px-3 text-right text-indigo-400">最終仕入重量 (kg)</th>
                              <th className="py-2.5 px-3 text-right text-emerald-450">最終バック仕上がり個数 (個)</th>
                              <th className="py-2.5 px-3">希望納期</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-850">
                            {po.items.map((it, idx) => {
                              const p = products.find(prod => prod.sku === it.sku);
                              return (
                                <tr key={idx} className="hover:bg-slate-850/20">
                                  <td className="py-2.5 px-3 font-mono font-medium text-slate-300">{it.sku}</td>
                                  <td className="py-2.5 px-3">
                                    <p className="font-bold text-slate-200">{it.productName}</p>
                                    <span className="text-[10px] text-slate-500">{it.brand}</span>
                                    {p && (
                                      <div className="text-[9px] text-slate-600 mt-0.5 space-x-2">
                                        <span>原料: {p.rawMaterialProducer || '未設定'}</span>
                                        <span>充填: {p.fillingParty || '未設定'}</span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono">{it.requestedQty.toLocaleString()}</td>
                                  <td className="py-2.5 px-3 text-right font-mono">
                                    {((it.requestedQty * (it.weight || 160)) / 1000).toFixed(2)} kg
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-300">
                                    {(it.adjustedWeightKg || 0).toFixed(2)} kg
                                  </td>
                                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-450 bg-emerald-950/10">
                                    {(it.adjustedQty || it.requestedQty).toLocaleString()} 個
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-400">{it.deliveryDate || po.scheduledDeliveryDate || 'なし'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* State transition workflow panel */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 border border-slate-850 p-4 rounded-xl">
                        <div className="text-xs">
                          <span className="text-slate-400 block font-bold">🛠️ 入庫ライフサイクル更新</span>
                          <span className="text-slate-500 text-[11px] block mt-0.5">※ステータスを「入庫完了」に動かすと、国内ロジ在庫へ個数が直接加算されます。</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {po.status !== '入庫完了' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...po, status: '検収中/入庫中' as const };
                                  onUpdateOrder(updated);
                                  addToast(`伝票${po.id}は検収、搬入作業中に移行しました。`, 'warning');
                                }}
                                disabled={po.status === '検収中/入庫中'}
                                className="bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-900 px-3 py-1.5 rounded text-xs transition-all disabled:opacity-40 cursor-pointer"
                              >
                                🚛 倉庫で検収受けを開始
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = { ...po, status: '入庫完了' as const };
                                  onUpdateOrder(updated);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3 py-1.5 rounded text-xs transition-all cursor-pointer"
                              >
                                ✅ 検収終了/入庫完了にする（在庫加算）
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`発注履歴「${po.id}」を完全に削除してもよろしいですか？在庫の加算は行われません。`)) {
                                onDeleteOrder(po.id);
                                addToast(`伝票「${po.id}」を削除しました。`, 'error');
                              }
                            }}
                            className="text-rose-450 hover:text-rose-400 bg-slate-950 hover:bg-slate-900 p-1.5 rounded border border-slate-850 transition-colors cursor-pointer"
                            title="発注伝票の破棄"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}

            {filteredLedgerPOList.length === 0 && (
              <div className="bg-slate-900 border border-dashed border-slate-800 py-16 text-center text-slate-500 text-xs rounded-xl">
                発注伝票が1通もありません。
              </div>
            )}
          </div>

          {/* Core spreadsheet integration guidelines banner */}
          <div className="bg-slate-900/60 p-4 border border-slate-800 rounded-xl text-[11px] text-slate-400 gap-2 flex items-start">
            <FileSpreadsheet className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-200 mb-0.5">📖 お茶調達資材連携マニュアル</p>
              この発注システムは丸菱やファイナールより供給されるキロ原料、およびティーパック加工センターや食の天草にじ等で充填・パッケージ加工するまでのサプライチェーン業務全体に準拠しています。
              履歴が「入庫完了」に切り替わると、各お茶商品は自動的にFBAやRSL等の倉庫マスター在庫に引き継がれます。
            </div>
          </div>

        </div>
      )}


      {/* -------------------------------------------------------------
          --- PROFESSIONAL PDF / A4 PRINTABLE PO POPUP SHEET MODAL ---
         ------------------------------------------------------------- */}
      {activePOForDoc && selectedManufacturerDoc && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto font-sans text-slate-900">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col my-8 select-text">
            
            {/* Modal Controls Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10 text-white">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-950 text-indigo-400 border border-indigo-900 text-xs px-2.5 py-1 rounded font-mono font-bold">
                  {selectedManufacturerDoc.type === '原料' ? '🍃 原料仕入先用・合計発注書' : '🏭 製造加工充填先用・個別発注書'}
                </span>
                <span className="text-xs text-slate-400 font-mono">元伝票: {activePOForDoc.id}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-indigo-600 hover:bg-indigo-505 bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  🖨️ 画面印刷する / PDF保存
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const mInfo = getManufacturerInfo(selectedManufacturerDoc.manufacturerName, selectedManufacturerDoc.type);
                    let text = `【正式発注依頼】\n`;
                    text += `${selectedManufacturerDoc.manufacturerName} 御中\n`;
                    text += `担当: ${mInfo.contactName} 様\n`;
                    text += `TEL: ${mInfo.phone} | FAX: ${mInfo.fax}\n`;
                    text += `------------------------------------\n`;
                    text += `発注番号: ${activePOForDoc.id}\n`;
                    text += `発注日付: ${activePOForDoc.orderDate}\n`;
                    text += `希望納期: ${activePOForDoc.scheduledDeliveryDate || '商品枠を参照'}\n\n`;
                    
                    // Filtered item list
                    const itemsToFormat = activePOForDoc.items.filter(it => {
                      const p = products.find(prod => prod.sku === it.sku);
                      const mMatch = selectedManufacturerDoc.type === '原料' 
                        ? p?.rawMaterialProducer === selectedManufacturerDoc.manufacturerName
                        : p?.fillingParty === selectedManufacturerDoc.manufacturerName;
                      
                      const brandMatch = !selectedManufacturerDoc.brandFilter || it.brand === selectedManufacturerDoc.brandFilter;
                      return mMatch && brandMatch;
                    });

                    itemsToFormat.forEach((it, idx) => {
                      text += `■ 品目 ${idx + 1}\n`;
                      text += `  ・商品名: ${it.productName} （ブランド: ${it.brand}）\n`;
                      text += `  ・確定発注数: ${(it.adjustedQty || it.requestedQty).toLocaleString()} 個\n`;
                      text += `  ・乾燥茶葉キロ数: ${(it.adjustedWeightKg || 0).toFixed(2)} kg\n`;
                      text += `  ・納期希望: ${it.deliveryDate || activePOForDoc.scheduledDeliveryDate || '相談'}\n\n`;
                    });

                    text += `------------------------------------\n`;
                    if (activePOForDoc.notes) {
                      text += `特記指示事項:\n${activePOForDoc.notes}\n`;
                    }
                    text += `発注元: 株式会社ママセレクト / 温活農園\n`;
                    text += `担当者名: ${activePOForDoc.assignedStaff}\n`;

                    navigator.clipboard.writeText(text);
                    addToast('メーカー宛の発注テキストをクリップボードにコピーしました！', 'success');
                  }}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  📋 テキスト形式でコピー
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActivePOForDoc(null);
                    setSelectedManufacturerDoc(null);
                  }}
                  className="bg-slate-950 text-slate-400 hover:text-white border border-slate-800 text-xs px-2.5 py-1.5 rounded-lg cursor-pointer"
                >
                  [✕] 閉じる
                </button>
              </div>
            </div>

            {/* A4 Formatted Print Frame */}
            <div id="purchase-order-printable" className="p-8 md:p-12 bg-white text-slate-900 overflow-y-auto max-h-[70vh] rounded-b-2xl print:max-h-none print:p-0 print:m-0 print:shadow-none">
              
              {/* Document Stamp Header */}
              <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-900 pb-5 mb-8 gap-4 font-sans select-none">
                <div>
                  <h1 className="text-3xl font-black tracking-wider text-slate-900 mb-1">
                    {selectedManufacturerDoc.type === '原料' ? '原料 仕入発注書' : '製造・充填 加工委託書'}
                  </h1>
                  <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 block font-bold">
                    {selectedManufacturerDoc.type === '原料' ? 'RAW TEA MATERIAL PURCHASE ORDER' : 'PACKAGING & FILLING FACTORY ORDER'}
                  </span>
                </div>
                
                <div className="text-[11px] space-y-1 font-mono md:text-right text-slate-700">
                  <p><strong>伝票番号 (P.O. No):</strong> {activePOForDoc.id}</p>
                  <p><strong>発注日付 (Date):</strong> {activePOForDoc.orderDate}</p>
                  <p><strong>最終希望納期 (Delivery):</strong> {activePOForDoc.scheduledDeliveryDate || '商品枠に依存'}</p>
                  <p><strong>発注代表 (Prepared By):</strong> {activePOForDoc.assignedStaff}</p>
                </div>
              </div>

              {/* Vendor VS Client coordinates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 text-xs leading-relaxed font-sans">
                
                {/* Supplier address block */}
                {(() => {
                  const mInfo = getManufacturerInfo(selectedManufacturerDoc.manufacturerName, selectedManufacturerDoc.type);
                  return (
                    <div className="space-y-2 border-l-4 border-slate-900 pl-4 select-all">
                      <span className="text-[10px] font-bold text-slate-400 block uppercase font-mono tracking-widest">
                        発注宛先 (Supplier Address)
                      </span>
                      <p className="text-base font-black text-slate-900 border-b border-dashed pb-1.5 flex items-center gap-1.5">
                        <span>{mInfo.name} 御中</span>
                        {selectedManufacturerDoc.brandFilter && (
                          <span className="text-xs bg-indigo-100 text-indigo-850 px-1.5 py-0.5 rounded font-bold font-sans">
                            {selectedManufacturerDoc.brandFilter}専用シート
                          </span>
                        )}
                      </p>
                      <div className="space-y-1 text-slate-700">
                        <p><strong>ご担当窓口:</strong> <span className="font-bold text-slate-900">{mInfo.contactName || 'ご担当者様'}</span></p>
                        <p><strong>電話番号 (TEL):</strong> {mInfo.phone || '未登録'}</p>
                        {mInfo.email && <p><strong>メール (EMAIL):</strong> {mInfo.email}</p>}
                        <p><strong>FAX 番号:</strong> {mInfo.fax || '未登録'}</p>
                        {mInfo.notes && <p className="text-[10.5px] text-slate-450 italic py-1 bg-slate-50 rounded pl-2">メモ： {mInfo.notes}</p>}
                      </div>
                      <p className="text-slate-600 font-medium pt-3 text-[10.5px]">
                        貴社におかれましては、日頃より多大なるお力添えをいただき、心から感謝申し上げます。
                        {selectedManufacturerDoc.type === '原料' 
                          ? '下記原料をブランド共同合計数として一括で仕入発注いたします。納品調整の配慮のほどお願い申し上げます。' 
                          : '共同生産計画に基づき、該当ブランドに最適なティーパック加工および一貫充填をお願いいたします。'
                        }
                      </p>
                    </div>
                  );
                })()}

                {/* Buyer Client info */}
                <div className="space-y-2 bg-slate-50/70 p-4 border border-slate-200 rounded-xl">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block font-mono tracking-widest">発注主 (Buyer Information)</span>
                  <p className="text-sm font-black text-slate-900">株式会社ママセレクト / 温活農園</p>
                  <p className="text-slate-700 font-bold">健康お茶事業・物流共同仕入統括部</p>
                  <p className="text-slate-500 font-mono text-[10.5px]">〒675-0101 兵庫県加古川市平岡町新在家</p>
                  <div className="text-slate-500 text-[10.5px] border-t border-slate-200 pt-2 space-y-0.5">
                    <p><strong>統括連絡口 TEL:</strong> 079-422-0001</p>
                    <p><strong>代表 FAX:</strong> 079-422-0002</p>
                    <p><strong>発注手配担当:</strong> {activePOForDoc.assignedStaff}</p>
                  </div>
                </div>

              </div>

              {/* Purchase items table details grid */}
              <div className="mb-8 font-sans overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-700 font-bold uppercase text-[9px] tracking-wider font-mono">
                      <th className="py-2.5 px-2">品番 (SKU)</th>
                      <th className="py-2.5 px-3">品名</th>
                      {selectedManufacturerDoc.type === '製造' && <th className="py-2.5 px-2">仕向ブランド</th>}
                      <th className="py-2.5 px-2 text-center">原料ロット</th>
                      <th className="py-2.5 px-3 text-right">実損必要量 (kg)</th>
                      <th className="py-2.5 px-3 text-right text-indigo-700 bg-indigo-50 font-extrabold">⚖️ 仕入原料重量 (kg)</th>
                      <th className="py-2.5 px-2 text-right">内容パック質量</th>
                      <th className="py-2.5 px-3 text-right text-emerald-800 bg-emerald-50 font-black">📦 確定製造パック総数</th>
                      <th className="py-2.5 px-2 text-center">納入予定日</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {(() => {
                      // Filter items of PO that matching manufacturer name
                      const itemsToDisplay = activePOForDoc.items.filter(it => {
                        const p = products.find(prod => prod.sku === it.sku);
                        const mMatch = selectedManufacturerDoc.type === '原料' 
                          ? p?.rawMaterialProducer === selectedManufacturerDoc.manufacturerName
                          : p?.fillingParty === selectedManufacturerDoc.manufacturerName;
                        
                        const brandMatch = !selectedManufacturerDoc.brandFilter || it.brand === selectedManufacturerDoc.brandFilter;
                        return mMatch && brandMatch;
                      });

                      return itemsToDisplay.map((item, idx) => {
                        const sWeight = item.weight || 160;
                        const lot = item.orderUnitKg || 20;
                        const originalCalculatedKg = (item.requestedQty * sWeight) / 1000;
                        const finalWeightVal = item.adjustedWeightKg !== undefined ? item.adjustedWeightKg : (item.calculatedWeightKg || originalCalculatedKg);
                        const finalUnitsVal = item.adjustedQty !== undefined ? item.adjustedQty : item.requestedQty;

                        return (
                          <tr key={idx} className="text-slate-900 border-b border-slate-150 hover:bg-slate-50/50">
                            <td className="py-3 px-2 font-mono font-bold text-slate-800">{item.sku}</td>
                            <td className="py-3 px-3">
                              <p className="font-extrabold text-[12.5px] text-slate-950">{item.productName}</p>
                              {selectedManufacturerDoc.type === '原料' && <p className="text-[10px] text-slate-500">（充填充填先工場：{products.find(prod => prod.sku === item.sku)?.fillingParty || '未指定'}）</p>}
                            </td>
                            {selectedManufacturerDoc.type === '製造' && (
                              <td className="py-3 px-2 font-bold text-indigo-900 text-[11px]">{item.brand}</td>
                            )}
                            <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-650">{lot} kg単位</td>
                            <td className="py-3 px-3 text-right font-mono text-slate-500">
                              {originalCalculatedKg.toFixed(2)} kg
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-extrabold bg-indigo-50/40 text-indigo-900 text-[12px]">
                              {finalWeightVal.toFixed(2)} kg
                            </td>
                            <td className="py-3 px-2 text-right font-mono text-slate-500 text-[11px]">{sWeight}g/大麦</td>
                            <td className="py-3 px-3 text-right font-mono font-black bg-emerald-50/30 text-emerald-950 text-[14px]">
                              {finalUnitsVal.toLocaleString()} 個
                            </td>
                            <td className="py-3 px-2 text-center font-bold text-slate-800">
                              {item.deliveryDate || activePOForDoc.scheduledDeliveryDate || '最短手配'}
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>

              {/* Total Aggregate math block summary */}
              <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-4 text-xs font-sans leading-relaxed">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-800 max-w-sm w-full leading-normal">
                  <h4 className="font-bold text-slate-700 block mb-1">【搬入納品・資材の引当指示】</h4>
                  <ul className="list-disc pl-4 space-y-1 text-[10.5px]">
                    <li>原料商から製造工場へ、送り状伝票へ発注番号（ {activePOForDoc.id} ）を必ず明記して直接運搬してください。</li>
                    <li>ティーパック用資材（ロールフィルム、タグ糸など）は、弊社ブランド担当まで手配を申請してください。</li>
                  </ul>
                </div>

                {/* Mathematical summations column block */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 md:w-80 space-y-2 text-right select-all">
                  <h4 className="font-bold border-b text-left text-[11px] text-slate-750 font-sans pb-1 tracking-wider uppercase">仕向け・発注確定内訳</h4>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">本状発注品目数:</span>
                    <span className="font-mono font-bold">
                      {(() => {
                        const filterList = activePOForDoc.items.filter(it => {
                          const p = products.find(prod => prod.sku === it.sku);
                          const mMatch = selectedManufacturerDoc.type === '原料' 
                            ? p?.rawMaterialProducer === selectedManufacturerDoc.manufacturerName
                            : p?.fillingParty === selectedManufacturerDoc.manufacturerName;
                          
                          const brandMatch = !selectedManufacturerDoc.brandFilter || it.brand === selectedManufacturerDoc.brandFilter;
                          return mMatch && brandMatch;
                        });
                        return filterList.length;
                      })()} 品種
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-dashed pt-1 bg-indigo-50/20 px-1 py-0.5">
                    <span className="text-indigo-850 font-bold">仕入乾燥茶葉総重量:</span>
                    <span className="font-mono font-extrabold text-indigo-700 text-sm">
                      {(() => {
                        const filterList = activePOForDoc.items.filter(it => {
                          const p = products.find(prod => prod.sku === it.sku);
                          const mMatch = selectedManufacturerDoc.type === '原料' 
                            ? p?.rawMaterialProducer === selectedManufacturerDoc.manufacturerName
                            : p?.fillingParty === selectedManufacturerDoc.manufacturerName;
                          
                          const brandMatch = !selectedManufacturerDoc.brandFilter || it.brand === selectedManufacturerDoc.brandFilter;
                          return mMatch && brandMatch;
                        });
                        return filterList.reduce((acc, cur) => acc + (cur.adjustedWeightKg || 0), 0).toFixed(2);
                      })()} kg
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-350 pt-1.5 bg-emerald-50/35 px-1 py-0.5">
                    <span className="text-emerald-950 font-black">完成製造パック数:</span>
                    <span className="font-mono font-black text-emerald-850 text-base">
                      {(() => {
                        const filterList = activePOForDoc.items.filter(it => {
                          const p = products.find(prod => prod.sku === it.sku);
                          const mMatch = selectedManufacturerDoc.type === '原料' 
                            ? p?.rawMaterialProducer === selectedManufacturerDoc.manufacturerName
                            : p?.fillingParty === selectedManufacturerDoc.manufacturerName;
                          
                          const brandMatch = !selectedManufacturerDoc.brandFilter || it.brand === selectedManufacturerDoc.brandFilter;
                          return mMatch && brandMatch;
                        });
                        return filterList.reduce((acc, cur) => acc + (cur.adjustedQty || cur.requestedQty), 0).toLocaleString();
                      })()} 個
                    </span>
                  </div>
                </div>

              </div>

              {/* Special Instructions block */}
              {activePOForDoc.notes && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-800 font-sans select-all">
                  <span className="font-bold text-slate-700 block mb-1">【特記指示事項】</span>
                  <p className="whitespace-pre-wrap leading-relaxed">{activePOForDoc.notes}</p>
                </div>
              )}

              {/* Footer fine-grains directions */}
              <div className="mt-10 text-[10px] text-slate-400 border-t border-slate-200 pt-4 font-sans leading-relaxed space-y-1 select-none">
                <p>1. 納品時は、本発注書に記載されております「発注伝票番号 : {activePOForDoc.id}」をすべての送付証明書類・納品伝票へご明記願います。</p>
                <p>2. 原材料の供給状況等により納期遵守が困難な事象が発生しました場合は、速やかに左記発注者（ {activePOForDoc.assignedStaff} ）までご連絡調整お願いいたします。</p>
                <p>3. 搬入場所および荷卸しに関する特定ルールは、個別倉庫マニュアルに基づきます。</p>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}
