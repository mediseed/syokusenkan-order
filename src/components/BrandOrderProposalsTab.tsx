import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Sparkles, 
  Check, 
  ShoppingCart, 
  ArrowRight, 
  AlertCircle, 
  AlertTriangle, 
  TrendingUp, 
  Info, 
  Search,
  ChevronDown,
  ChevronUp,
  Package,
  Calendar
} from 'lucide-react';
import { ProductMaster, InventoryData, SalesData, PurchaseOrder } from '../types';
import { findInventoryForProduct, calculateProductMonthlySales } from '../utils/calculations';

interface BrandOrderProposalsTabProps {
  products: ProductMaster[];
  inventoryList: InventoryData[];
  salesList: SalesData[];
  orders: PurchaseOrder[];
  onRegisterDraft: (target: string, quantities: Record<string, number>) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function BrandOrderProposalsTab({
  products,
  inventoryList,
  salesList,
  orders,
  onRegisterDraft,
  addToast
}: BrandOrderProposalsTabProps) {
  // Brand filtering & search states
  const [searchTerm, setSearchTerm] = useState('');
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  // Unique list of brands available in active products
  const brandsList = useMemo(() => {
    const brands = products
      .filter(p => p.isActive)
      .map(p => p.brand)
      .filter(Boolean);
    return Array.from(new Set(brands));
  }, [products]);

  // Expand all brands by default
  React.useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    brandsList.forEach(b => {
      initialExpanded[b] = true;
    });
    setExpandedBrands(initialExpanded);
  }, [brandsList]);

  // Compute stats and compile-time details for all active products
  const productCalculations = useMemo(() => {
    return products.map(product => {
      const inv = findInventoryForProduct(product, inventoryList, products);
      const totalStock = inv.fbaStock + inv.rslStock + inv.scStock + inv.logiStock;
      const monthlySales = calculateProductMonthlySales(product, salesList);

      const averageDailySales = monthlySales / 30;
      const leadTime = typeof product.leadTime === 'number' ? product.leadTime : 14;

      // Bundle exclusion
      const safetyStock = product.isBundle ? 0 : (typeof product.safetyStock === 'number' ? product.safetyStock : Math.round(averageDailySales * 7));
      const reorderPoint = product.isBundle ? 0 : Math.round((averageDailySales * leadTime) + safetyStock);

      let stockDays = 9999;
      if (!product.isBundle && monthlySales > 0) {
        stockDays = Math.round((totalStock / monthlySales) * 30);
      }

      // Calculate active inbound / pending quantities
      let pendingQty = 0;
      const activeOrders = orders.filter(o => o.status === '発注済' || o.status === '検収中/入庫中');
      activeOrders.forEach(order => {
        const item = order.items.find(it => it.sku.toLowerCase() === product.sku.toLowerCase());
        if (item) {
          pendingQty += item.requestedQty;
        }
      });

      // Default logic for proposed quantity:
      // If stock is below reorder point AND it's not a bundle, propose reorderPoint * 1.5 (rounded up to nearest 10)
      // Otherwise default proposal is 0.
      let defaultProposal = 0;
      if (!product.isBundle && totalStock <= reorderPoint && monthlySales > 0) {
        const baseProposal = reorderPoint * 1.5;
        // round to nearest 10, minimum of 50
        defaultProposal = Math.max(50, Math.ceil(baseProposal / 10) * 10);
      }

      const isCritical = !product.isBundle && totalStock <= reorderPoint && monthlySales > 0;

      return {
        product,
        totalStock,
        monthlySales,
        safetyStock,
        reorderPoint,
        pendingQty,
        stockDays,
        defaultProposal,
        isCritical
      };
    });
  }, [products, inventoryList, salesList, orders]);

  // State to store custom user overrides for proposed quantities
  // Structure: { [sku]: qty }
  const [proposedOverrides, setProposedOverrides] = useState<Record<string, number>>({});
  // Track custom manual selection checkmarks
  // By default, critical items with positive defaultProposal are selected.
  // Structure: { [sku]: boolean }
  const [selectedProductSKUs, setSelectedProductSKUs] = useState<Record<string, boolean>>({});

  // Initialize overrides and selections when product calculations load
  React.useEffect(() => {
    const defaultOverrides: Record<string, number> = {};
    const defaultSelections: Record<string, boolean> = {};

    productCalculations.forEach(calc => {
      // Put default proposal quantity in overrides
      defaultOverrides[calc.product.sku] = calc.defaultProposal;
      // Select automatically if it's in a critical state
      if (calc.isCritical && calc.defaultProposal > 0) {
        defaultSelections[calc.product.sku] = true;
      }
    });

    setProposedOverrides(defaultOverrides);
    setSelectedProductSKUs(defaultSelections);
  }, [productCalculations]);

  // Toggle brand accordion collapse state
  const toggleBrandExpand = (brand: string) => {
    setExpandedBrands(prev => ({
      ...prev,
      [brand]: !prev[brand]
    }));
  };

  // Handle manual checkbox selection toggle
  const handleToggleProductSelect = (sku: string) => {
    setSelectedProductSKUs(prev => {
      const isSelected = !prev[sku];
      // If selecting, make sure we have a quantity of at least default or 50 if it was 0
      if (isSelected && (proposedOverrides[sku] || 0) === 0) {
        setProposedOverrides(o => ({
          ...o,
          [sku]: 100 // friendly default to start ordering
        }));
      }
      return {
        ...prev,
        [sku]: isSelected
      };
    });
  };

  // Handle inline quantity edit
  const handleQuantityChange = (sku: string, value: number) => {
    const cleanVal = Math.max(0, value);
    setProposedOverrides(prev => ({
      ...prev,
      [sku]: cleanVal
    }));
    // Auto check if quantity is set to positive number, auto uncheck if set to 0
    setSelectedProductSKUs(prev => ({
      ...prev,
      [sku]: cleanVal > 0
    }));
  };

  // Calculate brand-aggregated statistics
  const brandAggregates = useMemo(() => {
    const list: Record<string, {
      brandName: string;
      totalActiveProducts: number;
      criticalCount: number;
      totalSales: number;
      proposedOrderItemsCount: number;
      proposedOrderTotalPacks: number;
      productsList: typeof productCalculations;
    }> = {};

    brandsList.forEach(brand => {
      const brandProducts = productCalculations.filter(c => c.product.brand === brand && c.product.isActive);
      
      // Filter based on search/filters
      const filteredProds = brandProducts.filter(c => {
        const matchesSearch = c.product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              c.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCritical = !showCriticalOnly || c.isCritical;
        return matchesSearch && matchesCritical;
      });

      const totalActiveProducts = brandProducts.length;
      const criticalCount = brandProducts.filter(c => c.isCritical).length;
      const totalSales = brandProducts.reduce((sum, c) => sum + c.monthlySales, 0);

      // Current proposal calculations for selected ones
      let proposedOrderItemsCount = 0;
      let proposedOrderTotalPacks = 0;

      brandProducts.forEach(c => {
        const sku = c.product.sku;
        const isSelected = !!selectedProductSKUs[sku];
        const qty = proposedOverrides[sku] || 0;
        
        if (isSelected && qty > 0) {
          proposedOrderItemsCount++;
          proposedOrderTotalPacks += qty;
        }
      });

      if (filteredProds.length > 0 || searchTerm === '') {
        list[brand] = {
          brandName: brand,
          totalActiveProducts,
          criticalCount,
          totalSales,
          proposedOrderItemsCount,
          proposedOrderTotalPacks,
          productsList: filteredProds
        };
      }
    });

    return Object.values(list);
  }, [brandsList, productCalculations, searchTerm, showCriticalOnly, selectedProductSKUs, proposedOverrides]);

  // Total summary across all brands
  const totalSummary = useMemo(() => {
    let totalCriticalAllBrands = 0;
    let totalProposedItemsAll = 0;
    let totalProposedPacksAll = 0;

    productCalculations.forEach(c => {
      if (c.isCritical) totalCriticalAllBrands++;
      
      const sku = c.product.sku;
      if (selectedProductSKUs[sku] && (proposedOverrides[sku] || 0) > 0) {
        totalProposedItemsAll++;
        totalProposedPacksAll += proposedOverrides[sku];
      }
    });

    return {
      totalCriticalAllBrands,
      totalProposedItemsAll,
      totalProposedPacksAll
    };
  }, [productCalculations, selectedProductSKUs, proposedOverrides]);

  // Click handler to register items for ONE brand into the order process screen
  const handleRegisterBrandOrder = (brandName: string) => {
    const brandData = brandAggregates.find(b => b.brandName === brandName);
    if (!brandData) return;

    // Gather selected products with quantities > 0
    const quantitiesToRegister: Record<string, number> = {};
    let itemCount = 0;

    brandData.productsList.forEach(c => {
      const sku = c.product.sku;
      const isSelected = !!selectedProductSKUs[sku];
      const qty = proposedOverrides[sku] || 0;

      if (isSelected && qty > 0) {
        quantitiesToRegister[sku] = qty;
        itemCount++;
      }
    });

    if (itemCount === 0) {
      addToast(`${brandName} の発注希望数量が登録されている商品がありません。チェックするか数量を入力してください。`, 'warning');
      return;
    }

    // Call callback to elevate state to App
    onRegisterDraft(brandName, quantitiesToRegister);
    addToast(`${brandName} の ${itemCount} 商品の発注希望数量を発注処理（計画）に登録しました！`, 'success');
  };

  // Click handler to register ALL tea brands consolidated into the order process screen
  const handleRegisterConsolidatedTeaOrder = () => {
    const quantitiesToRegister: Record<string, number> = {};
    let itemCount = 0;

    productCalculations.forEach(c => {
      // Only include tea category products
      if (c.product.category === 'お茶') {
        const sku = c.product.sku;
        const isSelected = !!selectedProductSKUs[sku];
        const qty = proposedOverrides[sku] || 0;

        if (isSelected && qty > 0) {
          quantitiesToRegister[sku] = qty;
          itemCount++;
        }
      }
    });

    if (itemCount === 0) {
      addToast('発注希望数量が登録されているお茶カテゴリーの商品がありません。', 'warning');
      return;
    }

    onRegisterDraft('tea_consolidated', quantitiesToRegister);
    addToast(`【合計均一お茶統合】の ${itemCount} 商品の発注計画を登録しました！`, 'success');
  };

  return (
    <div className="space-y-6">

      {/* Banner introduction with dynamic counters */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-950/60 rounded-xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="bg-indigo-900/60 text-indigo-400 text-[10px] font-mono tracking-widest px-2.5 py-0.5 rounded-full border border-indigo-800/50 inline-block uppercase font-bold">
              Proposed Order Queue
            </span>
            <h2 className="text-base font-bold text-white">ブランド別発注希望数量の登録・集計</h2>
            <p className="text-slate-400 text-xs max-w-2xl leading-relaxed">
              各安全在庫および発注チェック。在庫切れを予測したおすすめ発注案が初期セットされています。
              数量を調整したのち、<span className="text-indigo-300 font-semibold">「ワンクリックで発注処理（計画）に登録」</span>をクリックして4ステップの生産（キロロット調整）画面へ連携します。
            </p>
          </div>
          
          {/* Quick Stats Bento */}
          <div className="grid grid-cols-2 gap-3 min-w-[280px]">
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 text-[9px] block mb-0.5">要発注アイテム数</span>
              <span className="font-mono text-base font-bold text-rose-400">
                {totalSummary.totalCriticalAllBrands} <span className="text-[10px] text-slate-400 font-sans">件</span>
              </span>
            </div>
            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800 text-center">
              <span className="text-slate-500 text-[9px] block mb-0.5">登録予定商品数</span>
              <span className="font-mono text-base font-bold text-indigo-400">
                {totalSummary.totalProposedItemsAll} <span className="text-[10px] text-slate-400 font-sans">品目</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Control Actions & Filtering bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800/70">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {/* Search */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="SKU または商品名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Critical Only Toggle */}
          <button
            onClick={() => setShowCriticalOnly(!showCriticalOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              showCriticalOnly
                ? 'bg-rose-950/30 border-rose-800 text-rose-300'
                : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>要発注（在庫切迫）のみ表示</span>
          </button>
        </div>

        {/* Global Multi-Brand Consolidated Action */}
        <button
          onClick={handleRegisterConsolidatedTeaOrder}
          className="bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md shadow-emerald-950/40 cursor-pointer"
        >
          <ShoppingCart className="w-4 h-4" />
          <span>🍵 お茶全ブランドを合算して発注処理へ一括登録</span>
        </button>
      </div>

      {/* Brands Accordion List */}
      <div className="space-y-6">
        {brandAggregates.map(brand => {
          const isExpanded = !!expandedBrands[brand.brandName];
          return (
            <div key={brand.brandName} className="bg-slate-900 border border-slate-800/80 rounded-xl overflow-hidden shadow-lg">
              
              {/* Brand Header & Quick Summary details */}
              <div className="bg-slate-950 px-5 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-850">
                <div 
                  className="flex items-center gap-3 cursor-pointer select-none flex-1"
                  onClick={() => toggleBrandExpand(brand.brandName)}
                >
                  <div className="p-1.5 bg-slate-900 border border-slate-800 rounded">
                    <Building2 className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{brand.brandName}</span>
                      {brand.criticalCount > 0 && (
                        <span className="bg-rose-950 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-900/60 flex items-center gap-0.5">
                          要発注: {brand.criticalCount}
                        </span>
                      )}
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                      全 active 商品: {brand.totalActiveProducts}個 | 月間販売数: {brand.totalSales.toLocaleString()}
                    </p>
                  </div>
                  <div className="text-slate-500 ml-2">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>

                {/* Brand specific Registration Quick Action */}
                <div className="flex items-center gap-3 shrink-0">
                  {brand.proposedOrderItemsCount > 0 && (
                    <div className="text-right text-xs mr-1 hidden sm:block">
                      <span className="text-slate-400 text-[10px] block">選択中の発注予定</span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {brand.proposedOrderItemsCount}商品 / {brand.proposedOrderTotalPacks.toLocaleString()} 個
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => handleRegisterBrandOrder(brand.brandName)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-all border border-indigo-750"
                  >
                    <span>{brand.brandName} 単体を発注処理に登録</span>
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-200" />
                  </button>
                </div>
              </div>

              {/* Accordion Content (Products table) */}
              {isExpanded && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-850 text-slate-450 uppercase text-[10px] tracking-wider font-mono">
                        <th className="py-3 px-4 w-12 text-center select-none">選択</th>
                        <th className="py-3 px-3">商品名・SKU</th>
                        <th className="py-3 px-3 text-right">現在庫量</th>
                        <th className="py-3 px-3 text-right">月間販売数</th>
                        <th className="py-3 px-3 text-right">安全在庫</th>
                        <th className="py-3 px-3 text-right">発注点</th>
                        <th className="py-3 px-3 text-right text-indigo-400 hidden lg:table-cell">手配中</th>
                        <th className="py-3 px-3 text-center">在庫状況</th>
                        <th className="py-3 px-4 text-right bg-indigo-950/20 font-bold text-white w-[130px] border-l border-indigo-950/50">
                          発注希望数量 (個) *
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {brand.productsList.map(calc => {
                        const isSelected = !!selectedProductSKUs[calc.product.sku];
                        const qtyVal = proposedOverrides[calc.product.sku] ?? 0;

                        return (
                          <tr 
                            key={calc.product.sku}
                            className={`hover:bg-slate-850/30 transition-colors ${
                              isSelected ? 'bg-indigo-950/15' : ''
                            }`}
                          >
                            {/* Checkbox select */}
                            <td className="py-3 px-4 text-center">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleProductSelect(calc.product.sku)}
                                className="rounded border-slate-800 text-indigo-600 bg-slate-950 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5 cursor-pointer"
                              />
                            </td>

                            {/* Product Info */}
                            <td className="py-3 px-3 font-sans">
                              <p className="font-bold text-slate-100 text-xs">{calc.product.name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono text-[10px] text-slate-400">{calc.product.sku}</span>
                                {calc.product.isBundle && (
                                  <span className="bg-slate-950 text-amber-400 border border-amber-950 text-[9px] px-1 rounded font-bold">セット</span>
                                )}
                                {calc.product.integrationCode && (
                                  <span className="bg-indigo-950 text-indigo-300 text-[9px] px-1 rounded border border-indigo-900/40">統合: {calc.product.integrationCode}</span>
                                )}
                              </div>
                            </td>

                            {/* Stock Quantity */}
                            <td className="py-3 px-3 text-right font-mono text-slate-200">
                              {calc.totalStock.toLocaleString()}
                            </td>

                            {/* Monthly Sales */}
                            <td className="py-3 px-3 text-right font-mono text-slate-350">
                              {calc.monthlySales.toLocaleString()}
                            </td>

                            {/* Safety Stock */}
                            <td className="py-3 px-3 text-right font-mono text-slate-450">
                              {calc.product.isBundle ? '-' : calc.safetyStock.toLocaleString()}
                            </td>

                            {/* Reorder Point */}
                            <td className="py-3 px-3 text-right font-mono text-slate-450">
                              {calc.product.isBundle ? '-' : calc.reorderPoint.toLocaleString()}
                            </td>

                            {/* Inbound Pending */}
                            <td className="py-3 px-3 text-right font-mono text-indigo-300 hidden lg:table-cell">
                              {calc.pendingQty > 0 ? (
                                <span className="underline decoration-indigo-800 font-bold">+{calc.pendingQty.toLocaleString()}</span>
                              ) : (
                                <span className="text-slate-500 font-sans">-</span>
                              )}
                            </td>

                            {/* Stock Status */}
                            <td className="py-3 px-3 text-center">
                              {calc.product.isBundle ? (
                                <span className="text-xs text-slate-500 font-medium">-</span>
                              ) : calc.isCritical ? (
                                <span className="bg-rose-950/70 border border-rose-900/60 text-rose-450 text-[10px] px-2 py-0.5 rounded font-bold animate-pulse">
                                  要発注 ({calc.stockDays >= 9999 ? '即発注' : `${calc.stockDays}日分`})
                                </span>
                              ) : calc.monthlySales === 0 ? (
                                <span className="bg-slate-950 text-slate-500 text-[10px] px-2 py-0.5 rounded border border-slate-800 font-medium">
                                  実績なし
                                </span>
                              ) : (
                                <span className="bg-emerald-950/60 border border-emerald-900/50 text-emerald-450 text-[10px] px-2 py-0.5 rounded font-semibold">
                                  適正 ({calc.stockDays}日分)
                                </span>
                              )}
                            </td>

                            {/* Inline quantity input */}
                            <td className="py-1 px-4 text-right bg-indigo-950/10 border-l border-indigo-950/40">
                              <div className="flex items-center gap-1.5 justify-end">
                                <input
                                  type="number"
                                  min="0"
                                  step="10"
                                  placeholder="0"
                                  value={qtyVal === 0 ? '' : qtyVal}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10) || 0;
                                    handleQuantityChange(calc.product.sku, val);
                                  }}
                                  className="w-20 bg-slate-950 border border-indigo-900 text-indigo-400 font-mono font-bold text-right py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs"
                                />
                                <span className="text-[10px] text-slate-500 font-sans">個</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {brand.productsList.length === 0 && (
                <div className="py-8 text-center text-slate-500 text-xs bg-slate-900/40">
                  該当する商品がありません。
                </div>
              )}
            </div>
          );
        })}

        {brandAggregates.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl py-12 text-center text-slate-500 text-xs">
            一致するブランドまたは商品情報が見つかりませんでした。
          </div>
        )}
      </div>

      {/* Help Instructions Card */}
      <div className="bg-indigo-950/20 border border-indigo-950/50 rounded-xl p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-indigo-300">💡 提案数量の計算ロジックについて</h4>
          <p className="text-slate-400 text-[11px] leading-relaxed">
            現在庫が発注点（安全在庫 + リードタイム中の予想販売量）を下回った商品について、実績販売数の1.5倍に相当する数量（直近に近いキリの良い数）を自動的に仮推薦しています。<br />
            セット商品（お茶のコンビネーションなど）は、構成単品側の仕入れでまかなうため、ここでは自動発注対象外としています。
          </p>
        </div>
      </div>
    </div>
  );
}
