/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductMaster, InventoryData, SalesData, RecommendedOrder } from '../types';

export const findInventoryForProduct = (
  product: ProductMaster,
  inventoryList: InventoryData[],
  allProducts?: ProductMaster[],
  visitedSkus: Set<string> = new Set()
): InventoryData => {
  // If the product is a bundle and has constituent items
  if (product.isBundle && product.bundleItems && product.bundleItems.length > 0 && allProducts) {
    // Avoid infinite recursion in case of circular definitions
    if (visitedSkus.has(product.sku.toLowerCase())) {
      return {
        sku: product.sku,
        fbaStock: 0,
        rslStock: 0,
        scStock: 0,
        logiStock: 0,
        status: '循環参照エラー',
      };
    }
    const newVisited = new Set(visitedSkus);
    newVisited.add(product.sku.toLowerCase());

    const calculatedStocks = {
      fbaStock: 999999,
      rslStock: 999999,
      scStock: 999999,
      logiStock: 999999,
    };

    let hasConstituents = false;
    product.bundleItems.forEach((item) => {
      const childProd = allProducts.find((p) => p.sku === item.sku);
      if (childProd) {
        hasConstituents = true;
        const childInv = findInventoryForProduct(childProd, inventoryList, allProducts, newVisited);
        calculatedStocks.fbaStock = Math.min(calculatedStocks.fbaStock, Math.floor(childInv.fbaStock / item.quantity));
        calculatedStocks.rslStock = Math.min(calculatedStocks.rslStock, Math.floor(childInv.rslStock / item.quantity));
        calculatedStocks.scStock = Math.min(calculatedStocks.scStock, Math.floor(childInv.scStock / item.quantity));
        calculatedStocks.logiStock = Math.min(calculatedStocks.logiStock, Math.floor(childInv.logiStock / item.quantity));
      }
    });

    if (hasConstituents) {
      return {
        sku: product.sku,
        fbaStock: calculatedStocks.fbaStock === 999999 ? 0 : calculatedStocks.fbaStock,
        rslStock: calculatedStocks.rslStock === 999999 ? 0 : calculatedStocks.rslStock,
        scStock: calculatedStocks.scStock === 999999 ? 0 : calculatedStocks.scStock,
        logiStock: calculatedStocks.logiStock === 999999 ? 0 : calculatedStocks.logiStock,
        status: '構成品から自動計算',
      };
    }
  }

  const inv = inventoryList.find(
    (i) =>
      i.sku === product.sku ||
      (product.fbaSku && i.sku === product.fbaSku) ||
      (product.rslSku && i.sku === product.rslSku) ||
      (product.scCode && i.sku === product.scCode) ||
      (product.logiId && i.sku === product.logiId)
  );

  return inv || {
    sku: product.sku,
    fbaStock: 0,
    rslStock: 0,
    scStock: 0,
    logiStock: 0,
    status: '未登録',
  };
};

export const findSalesForProduct = (
  product: ProductMaster,
  salesList: SalesData[]
): SalesData[] => {
  return salesList.filter(
    (s) =>
      s.sku === product.sku ||
      (product.fbaSku && s.sku === product.fbaSku) ||
      (product.rslSku && s.sku === product.rslSku) ||
      (product.scCode && s.sku === product.scCode) ||
      (product.logiId && s.sku === product.logiId)
  );
};

export const calculateProductMonthlySales = (
  product: ProductMaster,
  salesList: SalesData[],
  salesOverrides?: Record<string, number>
): number => {
  if (salesOverrides && typeof salesOverrides[product.sku] === 'number') {
    return salesOverrides[product.sku];
  }
  const matchedSales = findSalesForProduct(product, salesList);
  const totalQty = matchedSales.reduce((sum, sale) => sum + Number(sale.quantity), 0);
  return totalQty * product.setQuantity;
};

export const computeRecommendations = (
  products: ProductMaster[],
  inventoryList: InventoryData[],
  salesList: SalesData[],
  currentDateStr: string = '2026-05-25',
  salesOverrides?: Record<string, number>
): RecommendedOrder[] => {
  return products.map((product) => {
    const inv = findInventoryForProduct(product, inventoryList, products);
    const totalStock = inv.fbaStock + inv.rslStock + inv.scStock + inv.logiStock;
    const monthlySales = calculateProductMonthlySales(product, salesList, salesOverrides);

    const averageDailySales = monthlySales / 30;
    const leadTime = typeof product.leadTime === 'number' ? product.leadTime : 14;
    
    // セット商品の場合は安全在庫と発注点を計算しない (0とする)
    const safetyStock = product.isBundle ? 0 : (typeof product.safetyStock === 'number' ? product.safetyStock : Math.round(averageDailySales * 7));
    const reorderPoint = product.isBundle ? 0 : Math.round((averageDailySales * leadTime) + safetyStock);

    let stockDays = 9999;
    if (!product.isBundle && monthlySales > 0) {
      stockDays = Math.round((totalStock / monthlySales) * 30);
    }

    let recommendedQty = 0;
    if (!product.isBundle && totalStock <= reorderPoint && monthlySales > 0) {
      recommendedQty = Math.round(reorderPoint * 1.5);
    }

    let priority: '高' | '中' | '低' = '低';
    if (!product.isBundle) {
      if (stockDays < 15) {
        priority = '高';
      } else if (stockDays < 30) {
        priority = '中';
      }
    }

    let estimatedOutDate = product.isBundle ? '対象外' : '安定 / 実績なし';
    if (!product.isBundle && monthlySales > 0) {
      const date = new Date(currentDateStr);
      date.setDate(date.getDate() + stockDays);
      estimatedOutDate = date.toISOString().split('T')[0];
    }

    return {
      product,
      fbaStock: inv.fbaStock,
      rslStock: inv.rslStock,
      scStock: inv.scStock,
      logiStock: inv.logiStock,
      totalStock,
      monthlySales,
      safetyStock,
      reorderPoint,
      stockDays,
      recommendedQty,
      priority,
      estimatedOutDate,
    };
  });
};

/**
 * Utility to parse CSV into JSON lines. Includes fallback/forgiving parser
 * that handles quoted commas, and strips BOM signatures.
 */
export const parseCSVText = (text: string): string[][] => {
  const cleanText = text.replace(/^\uFEFF/, '').trim(); // Remove BOM
  if (!cleanText) return [];

  const lines: string[][] = [];
  const rows = cleanText.split(/\r?\n/);

  for (const row of rows) {
    if (!row.trim()) continue;
    
    // Quick CSV cell split that honors quotes
    const cells: string[] = [];
    let insideQuote = false;
    let currentCell = '';

    for (let i = 0; i < row.length; i++) {
      const char = row[i];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        cells.push(currentCell.replace(/^"|"$/g, '').trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.replace(/^"|"$/g, '').trim());
    lines.push(cells);
  }

  return lines;
};

/**
 * Exports data into formatted CSV content with UTF-8 BOM
 */
export const exportToCSV = (headers: string[], rows: string[][], filename: string) => {
  const csvContent = [headers.join(','), ...rows.map(r => r.map(cell => {
    const str = String(cell || '').replace(/"/g, '""');
    return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
  }).join(','))].join('\n');

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
