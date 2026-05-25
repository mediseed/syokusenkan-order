/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  CalendarDays,
  Clock, 
  Search, 
  Truck, 
  CheckCircle, 
  AlertTriangle, 
  User, 
  FileText, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  Edit3, 
  Plus, 
  Minus, 
  Check, 
  X,
  RefreshCw,
  TrendingDown,
  Inbox
} from 'lucide-react';
import { PurchaseOrder, PurchaseOrderItem } from '../types';

interface InboundManagementTabProps {
  orders: PurchaseOrder[];
  onUpdateOrder: (order: PurchaseOrder) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function InboundManagementTab({
  orders = [],
  onUpdateOrder,
  addToast
}: InboundManagementTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | '発注済' | '検収中/入庫中' | '入庫完了'>('all');
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  
  // Inline edit state for tracking PO ID and its scheduled delivery date
  const [editingPoId, setEditingPoId] = useState<string | null>(null);
  const [editDeliveryDate, setEditDeliveryDate] = useState<string>('');
  
  // Track individual item delivery date edits
  // Format: { "orderId-sku": "YYYY-MM-DD" }
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [editItemDate, setEditItemDate] = useState<string>('');

  // Toggle order expanded view
  const toggleExpand = (id: string) => {
    setExpandedOrders(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Helper to add days to a YYYY-MM-DD date string
  const adjustDateByDays = (dateStr: string, days: number): string => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    } catch (e) {
      return dateStr;
    }
  };

  // Handle PO Scheduled Delivery Date adjustments
  const handleUpdateScheduledDate = (order: PurchaseOrder, newDate: string) => {
    if (!newDate) {
      addToast('正しい日付を選択してください。', 'warning');
      return;
    }
    const updatedOrder: PurchaseOrder = {
      ...order,
      scheduledDeliveryDate: newDate
    };
    onUpdateOrder(updatedOrder);
    setEditingPoId(null);
    addToast(`伝票番号 ${order.id} の入庫予定日を ${newDate} に調整しました。`, 'success');
  };

  // Quick helper to adjust date of a PO directly by offset
  const handleQuickAdjustDate = (order: PurchaseOrder, daysOffset: number) => {
    const current = order.scheduledDeliveryDate || order.orderDate;
    const newDate = adjustDateByDays(current, daysOffset);
    const updatedOrder: PurchaseOrder = {
      ...order,
      scheduledDeliveryDate: newDate
    };
    onUpdateOrder(updatedOrder);
    addToast(`入庫予定日を ${daysOffset > 0 ? '+' : ''}${daysOffset}日調整し、${newDate} に更新しました。`, 'success');
  };

  // Update Status directly
  const handleStatusChange = (order: PurchaseOrder, newStatus: '発注済' | '検収中/入庫中' | '入庫完了') => {
    const updatedOrder: PurchaseOrder = {
      ...order,
      status: newStatus
    };
    onUpdateOrder(updatedOrder);
    addToast(`ステータスを「${newStatus}」に更新しました。`, 'success');
  };

  // Edit item-level expected delivery date
  const handleSaveItemDeliveryDate = (order: PurchaseOrder, itemSku: string, newDate: string) => {
    const updatedItems = order.items.map(item => {
      if (item.sku === itemSku) {
        return {
          ...item,
          deliveryDate: newDate
        };
      }
      return item;
    });

    const updatedOrder: PurchaseOrder = {
      ...order,
      items: updatedItems
    };

    onUpdateOrder(updatedOrder);
    setEditingItemKey(null);
    addToast('対象ユニットの分納・個別納期を調整しました。', 'success');
  };

  // Quick adjust for individual items
  const handleItemQuickAdjust = (order: PurchaseOrder, item: PurchaseOrderItem, daysOffset: number) => {
    const current = item.deliveryDate || order.scheduledDeliveryDate || order.orderDate;
    const newDate = adjustDateByDays(current, daysOffset);
    handleSaveItemDeliveryDate(order, item.sku, newDate);
  };

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      // 🕵️ Status filter
      if (statusFilter !== 'all' && o.status !== statusFilter) {
        return false;
      }
      
      // 🕵️ Search terms criteria
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      const matchId = o.id.toLowerCase().includes(term);
      const matchGroup = o.groupName.toLowerCase().includes(term);
      const matchStaff = o.assignedStaff.toLowerCase().includes(term);
      const matchItems = o.items.some(it => 
        it.productName.toLowerCase().includes(term) || 
        it.sku.toLowerCase().includes(term) ||
        it.brand.toLowerCase().includes(term)
      );

      return matchId || matchGroup || matchStaff || matchItems;
    });
  }, [orders, statusFilter, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    const inTransit = orders.filter(o => o.status === '発注済').length;
    const inspecting = orders.filter(o => o.status === '検収中/入庫中').length;
    const completed = orders.filter(o => o.status === '入庫完了').length;
    const totalItemsCount = orders.reduce((acc, o) => 
      acc + (o.status !== '入庫完了' ? o.items.reduce((s, item) => s + item.requestedQty, 0) : 0), 0
    );

    return { inTransit, inspecting, completed, totalItemsInTransit: totalItemsCount };
  }, [orders]);

  return (
    <div className="space-y-6">
      
      {/* Visual Section Header Banner */}
      <div className="bg-gradient-to-tr from-indigo-950/20 to-slate-900 border border-slate-800 p-6 rounded-2xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-indigo-950 text-indigo-400 border border-indigo-800 text-[10px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded-full">
                Delivery Schedule Control
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
              <Truck className="w-5 h-5 text-indigo-400" />
              入庫状況確認・予定日調整
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              仕入先メーカーからの出荷完了、倉庫への搬入・検収ステータスを監視し、
              リードタイムの変動や配送の遅延が発生した際に入庫予定日（納期）をクイックにドラッグ・調整できます。
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2.5">
            <div className="bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-xl min-w-[100px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">発注済(未入庫)</span>
              <span className="text-lg font-mono font-bold text-amber-400">{stats.inTransit} <span className="text-xs text-slate-400">件</span></span>
            </div>
            <div className="bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-xl min-w-[100px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">検収中/入庫中</span>
              <span className="text-lg font-mono font-bold text-indigo-400">{stats.inspecting} <span className="text-xs text-slate-400">件</span></span>
            </div>
            <div className="bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-xl min-w-[100px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">入庫完了済</span>
              <span className="text-lg font-mono font-bold text-emerald-400">{stats.completed} <span className="text-xs text-slate-400">件</span></span>
            </div>
            <div className="bg-slate-950 border border-slate-850 px-4 py-2.5 rounded-xl min-w-[140px] hidden sm:block">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500 block">未入庫トータル残数</span>
              <span className="text-lg font-mono font-bold text-slate-200">{stats.totalItemsInTransit.toLocaleString()} <span className="text-xs text-slate-400">個</span></span>
            </div>
          </div>
        </div>
      </div>

      {/* Database Filters & Custom Inbound Search Row */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-3 items-center justify-between shadow-md">
        
        {/* Search Input Box */}
        <div className="relative w-full md:w-96">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="伝票ID、名柄、ブランド、担当者で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-9 pr-4 py-2 text-xs font-semibold text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
          />
        </div>

        {/* Filter Status Selector */}
        <div className="flex items-center gap-1.5 w-full md:w-auto overflow-x-auto self-start md:self-auto py-1">
          <span className="text-xs text-slate-400 shrink-0 mr-1.5 font-bold">状況フィルター:</span>
          {(['all', '発注済', '検収中/入庫中', '入庫完了'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shrink-0 ${
                statusFilter === st
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/10'
                  : 'bg-slate-950 text-slate-400 border-slate-850 hover:text-slate-200 hover:bg-slate-905'
              }`}
            >
              {st === 'all' ? 'すべて' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Main List Layout */}
      {filteredOrders.length === 0 ? (
        <div className="bg-slate-900 border border-slate-850 p-12 rounded-xl text-center flex flex-col items-center justify-center">
          <Inbox className="w-10 h-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-300">該当する発注入庫データが見つかりませんでした。</h3>
          <p className="text-xs text-slate-500 mt-1">
            検索ワードやステータスフィルターの条件を変更してください。
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = !!expandedOrders[order.id];
            const isEditingDate = editingPoId === order.id;

            // Total quantity compute
            const totalQty = order.items.reduce((sum, item) => sum + item.requestedQty, 0);

            // Let's analyze status color-badges
            const statusStyle = {
              '発注済': 'bg-amber-950/40 text-amber-400 border-amber-600/30',
              '検収中/入庫中': 'bg-indigo-950/40 text-indigo-400 border-indigo-600/30',
              '入庫完了': 'bg-emerald-950/40 text-emerald-400 border-emerald-600/30',
            }[order.status] || 'bg-slate-950 text-slate-400 border-slate-850';

            return (
              <div 
                key={order.id} 
                className={`bg-slate-900 border rounded-xl overflow-hidden shadow-sm transition-all ${
                  isExpanded ? 'border-slate-750 ring-1 ring-slate-800' : 'border-slate-850 hover:border-slate-800'
                }`}
              >
                
                {/* Accordion Row Summary Block */}
                <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 select-none">
                  <div className="flex items-start gap-3.5">
                    {/* Expand Trigger Icon */}
                    <button
                      onClick={() => toggleExpand(order.id)}
                      className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors self-start mt-0.5"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-400 uppercase tracking-widest">
                          {order.id}
                        </span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded border ${statusStyle}`}>
                          {order.status}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          発注日: {order.orderDate}
                        </span>
                      </div>

                      <h3 className="text-sm font-bold text-slate-100 mt-1 flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                        {order.groupName}
                      </h3>

                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>担当者: <strong className="text-slate-300 font-semibold">{order.assignedStaff}</strong></span>
                        </div>
                        <div>
                          <span>商品数: <strong className="text-slate-300 font-semibold">{order.items.length} 種類</strong></span>
                          <span className="ml-2">({totalQty.toLocaleString()} 個)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scheduled Delivery Status & Manual Date Edit controls */}
                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 bg-slate-950/40 p-3 rounded-lg border border-slate-850/60 ml-2 lg:ml-0 lg:max-w-md w-full lg:w-auto">
                    
                    {/* Date Details Info */}
                    <div className="flex-1 w-full sm:w-auto">
                      <span className="text-[10px] text-slate-500 font-mono block uppercase">
                        入庫予定日 (配送スケジュール)
                      </span>
                      
                      {isEditingDate ? (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="date"
                            value={editDeliveryDate}
                            onChange={(e) => setEditDeliveryDate(e.target.value)}
                            className="bg-slate-900 border border-indigo-600 rounded text-xs px-2 py-1 text-slate-100 font-mono focus:outline-none"
                          />
                          <button
                            onClick={() => handleUpdateScheduledDate(order, editDeliveryDate)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white p-1 rounded transition-colors"
                            title="保存"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingPoId(null)}
                            className="bg-slate-850 hover:bg-slate-800 text-slate-400 p-1 rounded transition-colors"
                            title="キャンセル"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          <CalendarDays className="w-4 h-4 text-indigo-400" />
                          <span className="text-sm font-mono font-bold text-slate-100">
                            {order.scheduledDeliveryDate || '未設定'}
                          </span>
                          {order.status !== '入庫完了' && (
                            <button
                              onClick={() => {
                                setEditingPoId(order.id);
                                setEditDeliveryDate(order.scheduledDeliveryDate || order.orderDate);
                              }}
                              className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-850 transition-colors"
                              title="予定日をカレンダーで変更する"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quick Adjust Button offsets (only active if not yet completed) */}
                    {order.status !== '入庫完了' && !isEditingDate && (
                      <div className="flex flex-col gap-1 w-full sm:w-auto shrink-0 justify-center">
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleQuickAdjustDate(order, -3)}
                            className="flex-1 sm:flex-none text-[10px] font-mono bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 px-2.5 py-1.5 rounded font-bold transition-all"
                            title="3日前倒し"
                          >
                            -3日
                          </button>
                          <button
                            onClick={() => handleQuickAdjustDate(order, 3)}
                            className="flex-1 sm:flex-none text-[10px] font-mono bg-indigo-950/50 hover:bg-indigo-900/40 border border-indigo-900/60 text-indigo-300 hover:text-indigo-200 px-2.5 py-1.5 rounded font-bold transition-all flex items-center justify-center gap-0.5"
                            title="3日遅延 (ずれ込み調整)"
                          >
                            +3日
                          </button>
                          <button
                            onClick={() => handleQuickAdjustDate(order, 7)}
                            className="flex-1 sm:flex-none text-[10px] font-mono bg-indigo-950 hover:bg-indigo-900/70 border border-indigo-700/60 text-indigo-200 hover:text-white px-2.5 py-1.5 rounded font-bold transition-all flex items-center justify-center gap-0.5"
                            title="1週間遅延 (ずれ込み調整)"
                          >
                            +7日
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Quick status drop-down menu so they don't have to cycle back to order processing */}
                    <div className="shrink-0 w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-800/80 pl-0 sm:pl-3 flex flex-row sm:flex-col justify-between items-center gap-1.5">
                      <span className="text-[9px] font-bold text-slate-500 uppercase select-none block sm:self-start">
                        簡易状況更新
                      </span>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value as any)}
                        className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-[11px] font-bold text-slate-300 rounded px-1.5 py-1 focus:outline-none"
                      >
                        <option value="発注済">発注済</option>
                        <option value="検収中/入庫中">検収中/入庫中</option>
                        <option value="入庫完了">入庫完了</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* Expanded Details List Block for PO Items */}
                {isExpanded && (
                  <div className="border-t border-slate-850 bg-slate-950/30 p-4 space-y-4">
                    
                    {/* Header line */}
                    <div className="flex items-center justify-between border-b border-slate-850/80 pb-2">
                      <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-indigo-400" />
                        発注詳細 / 商品別の入庫状況と納期管理
                      </h4>
                      {order.notes && (
                        <p className="text-xs text-slate-400 italic">
                          <span className="font-bold text-slate-500 not-italic">備考: </span>{order.notes}
                        </p>
                      )}
                    </div>

                    {/* Table of items inside POS */}
                    <div className="overflow-x-auto rounded-lg border border-slate-850/80">
                      <table className="w-full text-left text-xs min-w-[650px]">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-850 text-slate-400 font-bold">
                            <th className="py-2.5 px-3">商品名 / SKU</th>
                            <th className="py-2.5 px-3">ブランド</th>
                            <th className="py-2.5 px-3 text-right">発注確定数量 (個)</th>
                            <th className="py-2.5 px-3 text-right">単価重量</th>
                            <th className="py-2.5 px-3 text-right">総重量</th>
                            <th className="py-2.5 px-4 text-center bg-indigo-950/25 border-l border-r border-indigo-900/30">商品別・分納個別予定日 (ずれ込み対応)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/60 bg-slate-950/15">
                          {order.items.map((item) => {
                            const itemKey = `${order.id}-${item.sku}`;
                            const isEditingItemDate = editingItemKey === itemKey;
                            
                            // Displays item-specific delivery date, falls back to parent PO scheduled delivery date
                            const displayItemDate = item.deliveryDate || order.scheduledDeliveryDate;

                            return (
                              <tr key={item.sku} className="hover:bg-slate-900/30 text-slate-300">
                                <td className="py-2.5 px-3">
                                  <div className="font-bold text-slate-200">{item.productName}</div>
                                  <div className="text-[10px] font-mono text-indigo-400">{item.sku}</div>
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="bg-slate-900 text-slate-400 font-medium px-2 py-0.5 rounded text-[11px] border border-slate-850">
                                    {item.brand}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold">
                                  {item.requestedQty.toLocaleString()}<span className="text-[10px] text-slate-500 ml-0.5">個</span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                                  {item.weight}g
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                                  {((item.requestedQty * item.weight) / 1000).toFixed(1)}kg
                                </td>
                                
                                {/* Dynamic date adjust on item level */}
                                <td className="py-2 px-3 text-center bg-indigo-950/10 border-l border-r border-indigo-900/10 max-w-[280px]">
                                  {order.status === '入庫完了' ? (
                                    <div className="flex items-center justify-center gap-1.5 text-emerald-400 text-[11px]">
                                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                      <span>{displayItemDate} (入庫済)</span>
                                    </div>
                                  ) : isEditingItemDate ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <input
                                        type="date"
                                        value={editItemDate}
                                        onChange={(e) => setEditItemDate(e.target.value)}
                                        className="bg-slate-900 border border-indigo-500 rounded text-xs px-2 py-1 text-slate-100 font-mono focus:outline-none"
                                      />
                                      <button
                                        onClick={() => handleSaveItemDeliveryDate(order, item.sku, editItemDate)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-1 rounded transition-colors"
                                        title="決定"
                                      >
                                        <Check className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => setEditingItemKey(null)}
                                        className="bg-slate-800 hover:bg-slate-750 text-slate-300 p-1 rounded transition-colors"
                                        title="閉じる"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-center gap-1.5">
                                      <span className={`font-mono text-xs font-bold leading-none ${item.deliveryDate ? 'text-indigo-300 underline underline-offset-2 decoration-indigo-400' : 'text-slate-400'}`}>
                                        {displayItemDate}
                                      </span>
                                      
                                      {/* Quick single-item delay or edit toggles */}
                                      <div className="flex items-center gap-0.5 ml-1">
                                        <button
                                          onClick={() => {
                                            setEditingItemKey(itemKey);
                                            setEditItemDate(displayItemDate);
                                          }}
                                          className="text-slate-500 hover:text-slate-300 hover:bg-slate-800 p-1 rounded transition-all"
                                          title="カレンダーで変更する"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => handleItemQuickAdjust(order, item, 3)}
                                          className="text-[10px] text-indigo-400 hover:text-indigo-200 bg-indigo-950/40 hover:bg-indigo-900/40 px-1 py-0.5 rounded border border-indigo-900/60 transition-all font-mono"
                                          title="この構成商品のみ3日送らせる"
                                        >
                                          +3日
                                        </button>
                                        <button
                                          onClick={() => handleItemQuickAdjust(order, item, 7)}
                                          className="text-[10px] text-indigo-300 hover:text-indigo-100 bg-indigo-950 hover:bg-indigo-900 px-1 py-0.5 rounded border border-indigo-800/80 transition-all font-mono"
                                          title="この構成商品のみ1週間送らせる"
                                        >
                                          +7日
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </td>

                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
              </div>
            );
          })}
        </div>
      )}

      {/* Responsive Visual Guide */}
      <div className="bg-slate-900 border border-slate-850/80 p-4 rounded-xl flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <h5 className="text-xs font-bold text-slate-300">💡 納期のずれ込みと在庫反映について</h5>
          <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
            国内流通倉庫「クラウドロジ」への荷役搬入スケジュールは、本画面での変更内容に基づき自動同期されます。
            各伝票のステータスを<strong>「入庫完了」</strong>へと移行した際、該当する商品のすべての発注数量がそのまま現在の<strong>「クラウドロジ(国内流通倉庫)在庫」</strong>として自動加算されます。
            各仕入先の急な配送遅延や、天候・製造トラブルによる納期のずれ込みが起きる際は、各伝票または個々の商品欄にある<strong>「+3日」「+7日」</strong>ボタンをタップすることで、簡単にリスケジュールを記録して社内に周知できます。
          </p>
        </div>
      </div>

    </div>
  );
}
