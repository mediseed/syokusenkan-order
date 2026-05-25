/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Check, AlertCircle, Info, Download } from 'lucide-react';
import { ProductMaster, InventoryData, SalesData } from '../types';
import { parseCSVText } from '../utils/calculations';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportProducts: (data: ProductMaster[]) => void;
  onImportInventory: (data: InventoryData[], subtype?: 'fba' | 'rsl' | 'sc' | 'logi' | 'all') => void;
  onImportSales: (data: SalesData[]) => void;
  existingSkus: string[];
  existingInventory: InventoryData[];
  existingProducts: ProductMaster[];
  uploadTimestamps?: Record<string, string>;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

type ImportType = 'products' | 'inventory' | 'sales';


export default function CSVImportModal({
  isOpen,
  onClose,
  onImportProducts,
  onImportInventory,
  onImportSales,
  existingSkus,
  existingInventory,
  existingProducts,
  uploadTimestamps,
  addToast
}: CSVImportModalProps) {
  const [activeTab, setActiveTab] = useState<ImportType>('products');
  const [inventorySubtype, setInventorySubtype] = useState<'fba' | 'rsl' | 'sc' | 'logi' | 'all'>('fba');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [parseResults, setParseResults] = useState<{
    success: boolean;
    message: string;
    count: number;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        let text = '';
        try {
          const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
          text = utf8Decoder.decode(buffer);
        } catch (err) {
          const sjisDecoder = new TextDecoder('shift-jis');
          text = sjisDecoder.decode(buffer);
        }
        handleParseCSV(text);
      }
    };
    reader.onerror = () => {
      setParseResults({
        success: false,
        message: 'ファイルの読み込みに失敗しました。',
        count: 0,
        errors: ['ファイル読み込みエラーが発生しました。'],
        warnings: []
      });
    };
    reader.readAsArrayBuffer(file);
  };

  const handleParseCSV = (csvText: string) => {
    try {
      const rows = parseCSVText(csvText);
      if (rows.length === 0) {
        setParseResults({
          success: false,
          message: 'CSVファイルが空か、正しい改行区切りではありません。',
          count: 0,
          errors: ['有効な行が見つかりませんでした。'],
          warnings: []
        });
        return;
      }

      // Determine header and skip if it matches expected formats
      let isHeader = false;
      const firstRowStr = rows[0].join(',').toLowerCase();
      if (
        firstRowStr.includes('sku') ||
        firstRowStr.includes('ブランド') ||
        firstRowStr.includes('商品名') ||
        firstRowStr.includes('fba') ||
        firstRowStr.includes('販売数量') ||
        firstRowStr.includes('商品コード') ||
        firstRowStr.includes('商品管理番号') ||
        firstRowStr.includes('コード') ||
        firstRowStr.includes('利用可能') ||
        firstRowStr.includes('可能在庫') ||
        firstRowStr.includes('在庫数') ||
        firstRowStr.includes('可能数量') ||
        firstRowStr.includes('数量') ||
        firstRowStr.includes('在庫id') ||
        firstRowStr.includes('フリー在庫') ||
        firstRowStr.includes('販売可能在庫数') ||
        firstRowStr.includes('紐付') ||
        firstRowStr.includes('ロジ') ||
        firstRowStr.includes('出荷可')
      ) {
        isHeader = true;
      }

      const dataRows = isHeader ? rows.slice(1) : rows;

      const errors: string[] = [];
      const warnings: string[] = [];

      if (activeTab === 'products') {
        const importedProducts: ProductMaster[] = [];
        const seenSkusInCsv = new Set<string>();

        dataRows.forEach((cols, idx) => {
          const rowNum = idx + (isHeader ? 2 : 1);
          if (cols.length < 3) {
            errors.push(`行 ${rowNum}: 列数が足りません (最低でもSKU, ブランド, 商品名が必要です)`);
            return;
          }

          const sku = cols[0]?.trim();
          const brand = cols[1]?.trim();
          const name = cols[2]?.trim();
          const volume = cols[3]?.trim() || '1個';
          const weight = parseFloat(cols[4]?.trim() || '0') || 0;
          const categoryRaw = cols[5]?.trim() || 'お茶';
          const fbaSku = cols[6]?.trim() || '';
          const rslSku = cols[7]?.trim() || '';
          const scCode = cols[8]?.trim() || '';
          const logiId = cols[9]?.trim() || '';
          const setQuantity = parseInt(cols[10]?.trim() || '1', 10) || 1;
          const rawMaterialProducer = cols[11]?.trim() || '';
          const fillingParty = cols[12]?.trim() || '';

          if (!sku) {
            errors.push(`行 ${rowNum}: SKUが空です。`);
            return;
          }
          if (!brand) {
            errors.push(`行 ${rowNum}: ブランドが空です。`);
            return;
          }
          if (!name) {
            errors.push(`行 ${rowNum}: 商品名が空です。`);
            return;
          }

          // Category validation
          let category: 'お茶' | '離乳食' | '化粧品' | 'その他' = 'その他';
          if (['お茶', '離乳食', '化粧品', 'その他'].includes(categoryRaw)) {
            category = categoryRaw as any;
          } else {
            warnings.push(`行 ${rowNum}: カテゴリ「${categoryRaw}」を「その他」に変換しました。`);
          }

          if (existingSkus.includes(sku)) {
            warnings.push(`行 ${rowNum}: SKU 「${sku}」 はすでに登録されています。インポートすると上書きされます。`);
          }

          if (seenSkusInCsv.has(sku)) {
            errors.push(`行 ${rowNum}: CSV内で重複するSKU「${sku}」があります。`);
            return;
          }
          seenSkusInCsv.add(sku);

          importedProducts.push({
            sku,
            brand,
            name,
            volume,
            weight,
            category,
            setQuantity,
            fbaSku,
            rslSku,
            scCode,
            logiId,
            rawMaterialProducer,
            fillingParty,
            isActive: true
          });
        });

        if (errors.length > 0) {
          setParseResults({
            success: false,
            message: `インポートに失敗しました。バリデーションエラーが ${errors.length} 件あります。`,
            count: 0,
            errors,
            warnings
          });
        } else {
          onImportProducts(importedProducts);
          addToast(`${importedProducts.length} 件の商品マスタをインポートしました`, 'success');
          setParseResults({
            success: true,
            message: `正常にインポートしました。`,
            count: importedProducts.length,
            errors: [],
            warnings
          });
        }

      } else if (activeTab === 'inventory') {
        const headers = isHeader ? rows[0] : [];
        
        // Populate inventoryMap from existingInventory, and pre-fill for existingProducts
        const inventoryMap = new Map<string, InventoryData>();
        
        existingProducts.forEach((p) => {
          const key = p.sku.toLowerCase();
          const matchExisting = existingInventory.find(i => i.sku.toLowerCase() === key);
          inventoryMap.set(key, matchExisting ? { ...matchExisting } : {
            sku: p.sku,
            fbaStock: 0,
            rslStock: 0,
            scStock: 0,
            logiStock: 0,
            status: '未登録'
          });
        });

        // Also add anything that's in existingInventory but not in existingProducts
        existingInventory.forEach((i) => {
          const key = i.sku.toLowerCase();
          if (!inventoryMap.has(key)) {
            inventoryMap.set(key, { ...i });
          }
        });

        let updatedCount = 0;

        if (inventorySubtype === 'fba') {
          let skuColIdx = headers.findIndex(h => h.includes('出品者SKU') || h.toLowerCase().includes('sku') || h.includes('商品コード'));
          let availColIdx = headers.findIndex(h => h.includes('Amazon宛出荷可能在庫(出荷可)') || h.includes('Amazon出荷在庫(出荷可)') || (h.includes('出荷可能在庫') && h.includes('出荷可')));
          let rsvColIdx = headers.findIndex(h => h.includes('Amazon宛出荷可能在庫(引当済み)') || h.includes('Amazon出荷在庫(引当済み)') || h.includes('引当済み'));
          let shipColIdx = headers.findIndex(h => h.includes('Amazon納品中(発送済み)') || h.includes('発送済み'));
          let recColIdx = headers.findIndex(h => h.includes('Amazon納品中(受領中)') || h.includes('受領中'));

          // Fallbacks for FBA CSV structure
          if (skuColIdx === -1) skuColIdx = 0;
          if (availColIdx === -1) {
            // Find any column pointing to available stock if exact matches fail
            availColIdx = headers.findIndex(h => h.includes('出荷可能') || h.includes('可能'));
          }

          dataRows.forEach((cols, idx) => {
            const rowNum = idx + (isHeader ? 2 : 1);
            if (cols.length < 1) return;

            let rowSku = cols[skuColIdx]?.trim();
            if (!rowSku) return;

            // Find matching product in master by fbaSku or sku
            const matchedProduct = existingProducts.find(
              p => (p.fbaSku && p.fbaSku.toLowerCase() === rowSku.toLowerCase()) ||
                   p.sku.toLowerCase() === rowSku.toLowerCase()
            );
            const targetSku = matchedProduct ? matchedProduct.sku : rowSku;

            let valAvailable = availColIdx !== -1 ? parseInt(cols[availColIdx]?.trim() || '0', 10) : 0;
            // Fallback for simple SKU, stock format
            if (availColIdx === -1 && cols.length >= 2) {
              valAvailable = parseInt(cols[1]?.trim() || '0', 10);
            }
            let valReserved = rsvColIdx !== -1 ? parseInt(cols[rsvColIdx]?.trim() || '0', 10) : 0;
            let valShipped = shipColIdx !== -1 ? parseInt(cols[shipColIdx]?.trim() || '0', 10) : 0;
            let valReceiving = recColIdx !== -1 ? parseInt(cols[recColIdx]?.trim() || '0', 10) : 0;

            if (isNaN(valAvailable)) valAvailable = 0;
            if (isNaN(valReserved)) valReserved = 0;
            if (isNaN(valShipped)) valShipped = 0;
            if (isNaN(valReceiving)) valReceiving = 0;

            // Formula: {有効在庫数} = {Amazon出荷在庫(出荷可)} + {Amazon出荷在庫(引当済みのうち一部)} + {Amazon納品数(発送済み・受領中)}
            const finalStock = valAvailable + valReserved + valShipped + valReceiving;

            const key = targetSku.toLowerCase();
            let currentRecord = inventoryMap.get(key);
            if (!currentRecord) {
              currentRecord = { sku: targetSku, fbaStock: 0, rslStock: 0, scStock: 0, logiStock: 0, status: '在庫あり' };
            }
            currentRecord.fbaStock = finalStock;
            currentRecord.status = '在庫あり';
            inventoryMap.set(key, currentRecord);
            updatedCount++;
          });

        } else if (inventorySubtype === 'rsl') {
          let skuColIdx = headers.findIndex(h => {
            const hClean = h.trim();
            return hClean.includes('紐付') ||
                   hClean.includes('紐付け') ||
                   hClean.includes('商品コード') ||
                   hClean.includes('商品管理番号') ||
                   hClean.includes('管理番号') ||
                   hClean.includes('店舗側商品コード') ||
                   hClean.toLowerCase().includes('sku');
          });
          let stockColIdx = headers.findIndex(h => {
            const hClean = h.trim();
            return hClean.includes('販売可能在庫数') ||
                   hClean.includes('販売可能数') ||
                   hClean.includes('利用可能数') ||
                   hClean.includes('可能在庫') ||
                   hClean.includes('在庫数') ||
                   hClean.includes('可能数量') ||
                   hClean.includes('数量');
          });

          if (skuColIdx === -1) skuColIdx = 0;
          if (stockColIdx === -1) stockColIdx = 1;

          dataRows.forEach((cols, idx) => {
            if (cols.length < 1) return;
            const rowSku = cols[skuColIdx]?.trim();
            if (!rowSku) return;

            const matchedProduct = existingProducts.find(
              p => (p.rslSku && p.rslSku.toLowerCase() === rowSku.toLowerCase()) ||
                   p.sku.toLowerCase() === rowSku.toLowerCase()
            );
            const targetSku = matchedProduct ? matchedProduct.sku : rowSku;

            let stockVal = parseInt(cols[stockColIdx]?.trim() || '0', 10);
            if (isNaN(stockVal)) stockVal = 0;

            const key = targetSku.toLowerCase();
            let currentRecord = inventoryMap.get(key);
            if (!currentRecord) {
              currentRecord = { sku: targetSku, fbaStock: 0, rslStock: 0, scStock: 0, logiStock: 0, status: '在庫あり' };
            }
            currentRecord.rslStock = stockVal;
            currentRecord.status = '在庫あり';
            inventoryMap.set(key, currentRecord);
            updatedCount++;
          });

        } else if (inventorySubtype === 'sc') {
          let skuColIdx = headers.findIndex(h => {
            const hClean = h.trim();
            return hClean.includes('商品コード') ||
                   hClean.includes('商品番号') ||
                   hClean.includes('SC') ||
                   hClean.includes('sc') ||
                   hClean.includes('コード') ||
                   hClean.toLowerCase().includes('sku');
          });
          let stockColIdx = headers.findIndex(h => {
            const hClean = h.trim();
            return hClean.includes('販売可能在庫数') ||
                   hClean.includes('販売可能数') ||
                   hClean.includes('フリー在庫') ||
                   hClean.includes('可能数量') ||
                   hClean.includes('利用可能') ||
                   hClean.includes('数量') ||
                   hClean.includes('在庫数') ||
                   hClean.includes('在庫') ||
                   hClean.includes('可能');
          });

          if (skuColIdx === -1) skuColIdx = 0;
          if (stockColIdx === -1) stockColIdx = 1;

          dataRows.forEach((cols, idx) => {
            if (cols.length < 1) return;
            const rowSku = cols[skuColIdx]?.trim();
            if (!rowSku) return;

            const matchedProduct = existingProducts.find(
              p => (p.scCode && p.scCode.toLowerCase() === rowSku.toLowerCase()) ||
                   p.sku.toLowerCase() === rowSku.toLowerCase()
            );
            const targetSku = matchedProduct ? matchedProduct.sku : rowSku;

            let stockVal = parseInt(cols[stockColIdx]?.trim() || '0', 10);
            if (isNaN(stockVal)) stockVal = 0;

            const key = targetSku.toLowerCase();
            let currentRecord = inventoryMap.get(key);
            if (!currentRecord) {
              currentRecord = { sku: targetSku, fbaStock: 0, rslStock: 0, scStock: 0, logiStock: 0, status: '在庫あり' };
            }
            currentRecord.scStock = stockVal;
            currentRecord.status = '在庫あり';
            inventoryMap.set(key, currentRecord);
            updatedCount++;
          });

        } else if (inventorySubtype === 'logi') {
          let skuColIdx = headers.findIndex(h => {
            const hClean = h.trim();
            return hClean.includes('LOGI') ||
                   hClean.includes('logi') ||
                   hClean.includes('ロジ') ||
                   hClean.includes('商品コード') ||
                   hClean.toLowerCase().includes('id') ||
                   hClean.toLowerCase().includes('sku') ||
                   hClean.includes('コード');
          });
          let stockColIdx = headers.findIndex(h => {
            const hClean = h.trim();
            return hClean.includes('販売可能在庫数') ||
                   hClean.includes('販売可能数') ||
                   hClean.includes('フリー在庫') ||
                   hClean.includes('可能数量') ||
                   hClean.includes('利用可能') ||
                   hClean.includes('数量') ||
                   hClean.includes('在庫数') ||
                   hClean.includes('在庫') ||
                   hClean.includes('可能');
          });

          if (skuColIdx === -1) skuColIdx = 0;
          if (stockColIdx === -1) stockColIdx = 1;

          dataRows.forEach((cols, idx) => {
            if (cols.length < 1) return;
            const rowSku = cols[skuColIdx]?.trim();
            if (!rowSku) return;

            const matchedProduct = existingProducts.find(
              p => (p.logiId && p.logiId.toLowerCase() === rowSku.toLowerCase()) ||
                   p.sku.toLowerCase() === rowSku.toLowerCase()
            );
            const targetSku = matchedProduct ? matchedProduct.sku : rowSku;

            let stockVal = parseInt(cols[stockColIdx]?.trim() || '0', 10);
            if (isNaN(stockVal)) stockVal = 0;

            const key = targetSku.toLowerCase();
            let currentRecord = inventoryMap.get(key);
            if (!currentRecord) {
              currentRecord = { sku: targetSku, fbaStock: 0, rslStock: 0, scStock: 0, logiStock: 0, status: '在庫あり' };
            }
            currentRecord.logiStock = stockVal;
            currentRecord.status = '在庫あり';
            inventoryMap.set(key, currentRecord);
            updatedCount++;
          });

        } else {
          // Classic All Combined
          dataRows.forEach((cols, idx) => {
            const rowNum = idx + (isHeader ? 2 : 1);
            if (cols.length < 1) return;

            const sku = cols[0]?.trim();
            const fbaStock = parseInt(cols[1]?.trim() || '0', 10);
            const rslStock = parseInt(cols[2]?.trim() || '0', 10);
            const scStock = parseInt(cols[3]?.trim() || '0', 10);
            const logiStock = parseInt(cols[4]?.trim() || '0', 10);
            const status = cols[5]?.trim() || '在庫あり';

            if (!sku) {
              errors.push(`行 ${rowNum}: SKUが空です。`);
              return;
            }

            if (isNaN(fbaStock) || isNaN(rslStock) || isNaN(scStock) || isNaN(logiStock)) {
              errors.push(`行 ${rowNum}: 在庫数には数値を入力してください。`);
              return;
            }

            const key = sku.toLowerCase();
            inventoryMap.set(key, {
              sku,
              fbaStock,
              rslStock,
              scStock,
              logiStock,
              status
            });
            updatedCount++;
          });
        }

        if (errors.length > 0) {
          setParseResults({
            success: false,
            message: `インポート失敗: バリデーションエラーが ${errors.length} 件あります。`,
            count: 0,
            errors,
            warnings
          });
        } else {
          const finalInventoryList = Array.from(inventoryMap.values());
          onImportInventory(finalInventoryList, inventorySubtype);
          addToast(`在庫データを ${updatedCount} 件処理・更新しました`, 'success');
          setParseResults({
            success: true,
            message: `在庫データを正常に読み込み更新しました（選択タイプ: ${
              inventorySubtype === 'fba' ? 'FBA' :
              inventorySubtype === 'rsl' ? 'RSL' :
              inventorySubtype === 'sc' ? 'SC' :
              inventorySubtype === 'logi' ? 'LOGI' : '一括形式'
            }）。`,
            count: updatedCount,
            errors: [],
            warnings
          });
        }

      } else if (activeTab === 'sales') {
        const importedSales: SalesData[] = [];
        dataRows.forEach((cols, idx) => {
          const rowNum = idx + (isHeader ? 2 : 1);
          if (cols.length < 2) {
            errors.push(`行 ${rowNum}: 販売データのフォーマットが不正です。`);
            return;
          }

          const sku = cols[0]?.trim();
          const quantity = parseInt(cols[1]?.trim() || '0', 10);
          const date = cols[2]?.trim() || new Date().toISOString().split('T')[0];

          if (!sku) {
            errors.push(`行 ${rowNum}: SKUが空です。`);
            return;
          }
          if (isNaN(quantity) || quantity <= 0) {
            errors.push(`行 ${rowNum}: 販売数量には1以上の数値を入力してください。`);
            return;
          }

          importedSales.push({
            sku,
            quantity,
            date
          });
        });

        if (errors.length > 0) {
          setParseResults({
            success: false,
            message: `インポート失敗: 販売実績データの検証エラーが ${errors.length} 件あります。`,
            count: 0,
            errors,
            warnings
          });
        } else {
          onImportSales(importedSales);
          addToast(`${importedSales.length} 件の販売実績データを追加しました`, 'success');
          setParseResults({
            success: true,
            message: `販売実績データを正常に追加しました。`,
            count: importedSales.length,
            errors: [],
            warnings
          });
        }
      }
    } catch (err: any) {
      setParseResults({
        success: false,
        message: 'CSVのパース中にエラーが発生しました。',
        count: 0,
        errors: [err.message || '不明なエラーです。'],
        warnings: []
      });
    }
  };

  const getTemplateText = () => {
    if (activeTab === 'products') {
      return `SKU,ブランド,商品名,内容量,重量,カテゴリ,FBA SKU,RSL SKU,SC商品コード,ロジID,セット数,原料原産地,充填者
azuki,敷島煎餅,あずき煎餅,12枚,180g,お茶,CL-AZUKI-001,RSL-AZ-99,SC-AZ-111,LOGI-AZ-222,1,愛知県,敷島工場
gobou,敷島煎餅,ごぼう煎餅,10枚,150,その他,CL-GOBOU-001,RSL-GB-88,SC-GB-222,LOGI-GB-333,2,北海道,敷島工場`;
    }
    if (activeTab === 'inventory') {
      if (inventorySubtype === 'fba') {
        return `出品者SKU,在庫あり,Amazon宛出荷可能在庫(出荷可),Amazon宛出荷可能在庫(引当済み),Amazon納品中(発送済み),Amazon納品中(受領中)
CL-AZUKI-001,1,500,10,20,5
CL-GOBOU-001,1,100,2,5,0`;
      }
      if (inventorySubtype === 'rsl') {
        return `商品コード,利用可能数
RSL-AZ-99,300
RSL-GB-88,50`;
      }
      if (inventorySubtype === 'sc') {
        return `SC商品コード,可能数量
SC-AZ-111,150
SC-GB-222,25`;
      }
      if (inventorySubtype === 'logi') {
        return `LOGI ID,可能数量
LOGI-AZ-222,200
LOGI-GB-333,30`;
      }
      return `SKU,FBA在庫,RSL在庫,SC在庫,ロジ在庫,ステータス
azuki,500,300,150,200,在庫あり
gobou,100,50,25,30,在庫あり`;
    }
    return `SKU,販売数量,日付
azuki,10,2026-05-12
gobou,5,2026-05-15`;
  };

  const copyTemplateToClipboard = () => {
    navigator.clipboard.writeText(getTemplateText());
    addToast('テンプレートをクリップボードにコピーしました！', 'success');
  };

  const downloadTemplate = () => {
    const text = getTemplateText();
    // Provide UTF-8 CSV with BOM for automatic Excel compatibility
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    let filename = 'template_products.csv';
    if (activeTab === 'inventory') {
      filename = `template_inventory_${inventorySubtype}.csv`;
    } else if (activeTab === 'sales') {
      filename = 'template_sales.csv';
    }

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast('テンプレートCSVファイルをダウンロードしました！', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm transition-opacity duration-200">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-xl overflow-hidden shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-semibold tracking-wide">CSVデータ一括インポート</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 p-1.5 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4">
          <button
            onClick={() => {
              setActiveTab('products');
              setParseResults(null);
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'products'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. 商品マスタ
          </button>
          <button
            onClick={() => {
              setActiveTab('inventory');
              setParseResults(null);
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'inventory'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. 在庫データ
          </button>
          <button
            onClick={() => {
              setActiveTab('sales');
              setParseResults(null);
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${
              activeTab === 'sales'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. 販売データ
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Sub-channel picker state overlay */}
          {activeTab === 'inventory' && (
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-4 space-y-3">
              <span className="text-xs font-semibold text-slate-300 block">
                インポート先の在庫チャネルを選択してください:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'fba', label: 'FBA 在庫' },
                  { id: 'rsl', label: 'RSL 在庫' },
                  { id: 'sc', label: 'SC 在庫' },
                  { id: 'logi', label: 'ロジ 在庫' },
                  { id: 'all', label: '一括 (全種)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setInventorySubtype(item.id as any);
                      setParseResults(null);
                    }}
                    className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                      inventorySubtype === item.id
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-400 font-bold shadow-md shadow-indigo-500/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-350 border-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-indigo-950/40 border border-indigo-900/60 rounded-lg p-4 text-xs leading-relaxed text-indigo-200 flex items-start space-x-3">
            <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-indigo-300 mb-1">
                {activeTab === 'products' && '商品マスタCSVのルール'}
                {activeTab === 'inventory' && `在庫データCSVのルール（選択中: ${
                  inventorySubtype === 'fba' ? 'Amazon FBA' :
                  inventorySubtype === 'rsl' ? '楽天RSL' :
                  inventorySubtype === 'sc' ? 'ショップチャンネルSC' :
                  inventorySubtype === 'logi' ? 'クラウドロジ' : '全種一括'
                }）`}
                {activeTab === 'sales' && '販売実績データCSVのルール'}
              </p>
              <ul className="list-disc list-inside space-y-1">
                {activeTab === 'products' && (
                  <>
                    <li>ヘッダー行は自動認識されます（スキップ可能）</li>
                    <li>必須列: <span className="text-white font-mono">SKU, ブランド, 商品名</span></li>
                    <li>セット数が空の場合は自動的に「1」として登録されます</li>
                  </>
                )}
                {activeTab === 'inventory' && (
                  <>
                    {inventorySubtype === 'fba' && (
                      <>
                        <li>Amazon FBAの週次/日次売上・在庫レポートをそのまま貼り付けてインポート可能です。</li>
                        <li>紐付け列: <span className="text-white font-mono">「出品者SKU」</span>（商品マスタのFBA SKUとマッチします）</li>
                        <li>有効在庫数計算公式: <span className="text-rose-300 font-mono font-bold animate-pulse">「出荷可 + 引当済み + 発送済み・受領中」</span></li>
                      </>
                    )}
                    {inventorySubtype === 'rsl' && (
                      <>
                        <li>楽天スーパーロジスティクス(RSL)のCSVデータ形式。</li>
                        <li>紐付け列: <span className="text-white font-mono">「商品コード/商品管理番号/SKU」</span>（RSL SKUとマッチします）</li>
                        <li>取り込み列: <span className="text-white font-mono">「利用可能数/可能在庫/在庫数」</span></li>
                      </>
                    )}
                    {inventorySubtype === 'sc' && (
                      <>
                        <li>ショップチャンネル商品連携(SC)のCSVデータ形式。</li>
                        <li>紐付け列: <span className="text-white font-mono">「SC商品コード/コード/SKU」</span>（SC商品コードとマッチします）</li>
                        <li>取り込み列: <span className="text-white font-mono">「可能数量/数量/在庫数」</span></li>
                      </>
                    )}
                    {inventorySubtype === 'logi' && (
                      <>
                        <li>クラウドロジ(LOGI)のCSVデータ形式。</li>
                        <li>紐付け列: <span className="text-white font-mono">「LOGI ID/ロジ/SKU」</span>（LOGI IDとマッチします）</li>
                        <li>取り込み列: <span className="text-white font-mono">「可能数量/数量/在庫数」</span></li>
                      </>
                    )}
                    {inventorySubtype === 'all' && (
                      <>
                        <li>すべての倉庫の在庫を一括で一度にアップデートできる形式です。</li>
                        <li>構成行: <span className="text-white font-mono">SKU, FBA在庫, RSL在庫, SC在庫, ロジ在庫, ステータス</span></li>
                      </>
                    )}
                  </>
                )}
                {activeTab === 'sales' && (
                  <>
                    <li>SKU/FBA SKU/Excel商品コードで紐付け、セット数を考虑して集計されます</li>
                    <li>形式: <span className="text-white font-mono">SKU, 販売数量, 日付(YYYY-MM-DD)</span></li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-indigo-400 bg-indigo-950/30'
                : 'border-slate-700 bg-slate-900 hover:border-slate-500 hover:bg-slate-850'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-200">
              CSVファイルをドラッグ＆ドロップ、または<span className="text-indigo-400">クリックしてアップロード</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">UTF-8 / Shift-JIS 自動判定</p>
          </div>

          {/* Template Download & Preview section */}
          <div className="bg-slate-950 rounded-lg border border-slate-800 p-4 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <span className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>CSVインポート用 テンプレート</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={downloadTemplate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>テンプレートをダウンロード</span>
                </button>
                <button
                  onClick={copyTemplateToClipboard}
                  className="text-xs bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  テキストをコピー
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-slate-500 font-medium font-sans">プレビュー:</span>
              <pre className="text-[10px] font-mono text-slate-400 bg-slate-900/40 border border-slate-850 p-2.5 rounded overflow-x-auto max-h-32">
                {getTemplateText()}
              </pre>
            </div>
          </div>

          {/* Progress / Failure state log display */}
          {parseResults && (
            <div
              className={`p-4 rounded-lg border text-sm ${
                parseResults.success
                  ? 'bg-emerald-950/40 border-emerald-900 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-900 text-rose-200'
              }`}
            >
              <div className="flex items-start space-x-2.5">
                {parseResults.success ? (
                  <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {parseResults.success ? 'アップロード成功' : 'アップロード失敗'}
                  </p>
                  <p className="text-xs mt-1 text-slate-300">{parseResults.message}</p>
                  {parseResults.count > 0 && (
                    <p className="text-xs font-semibold mt-1.5 text-emerald-300 font-mono">
                      合計インポート件数: {parseResults.count} 件
                    </p>
                  )}

                  {/* Errors display */}
                  {parseResults.errors.length > 0 && (
                    <div className="mt-3 bg-red-950/50 p-3 rounded border border-red-900/60 max-h-36 overflow-y-auto">
                      <p className="text-xs font-bold text-red-300 mb-1">エラー詳細 ({parseResults.errors.length}件):</p>
                      <ul className="list-disc list-inside text-[11px] font-mono space-y-1 text-rose-300">
                        {parseResults.errors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings display */}
                  {parseResults.warnings.length > 0 && (
                    <div className="mt-3 bg-yellow-950/50 p-3 rounded border border-yellow-900/60 max-h-36 overflow-y-auto">
                      <p className="text-xs font-bold text-yellow-300 mb-1">警告詳細 ({parseResults.warnings.length}件):</p>
                      <ul className="list-disc list-inside text-[11px] font-mono space-y-1 text-amber-300">
                        {parseResults.warnings.map((warn, i) => (
                          <li key={i}>{warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 px-6 py-4 border-t border-slate-800 bg-slate-950">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm font-medium text-slate-200 rounded-lg transition-colors border border-slate-700"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
