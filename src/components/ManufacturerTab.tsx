import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Mail, Phone, FileText, Search, ShieldCheck, Tag, X, Check, Save, HardDrive, HelpCircle } from 'lucide-react';
import { Manufacturer } from '../types';

interface ManufacturerTabProps {
  manufacturers: Manufacturer[];
  onAddManufacturer: (m: Manufacturer) => void;
  onUpdateManufacturer: (m: Manufacturer) => void;
  onDeleteManufacturer: (id: string) => void;
  addToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

export default function ManufacturerTab({
  manufacturers,
  onAddManufacturer,
  onUpdateManufacturer,
  onDeleteManufacturer,
  addToast
}: ManufacturerTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'すべて' | '原料' | '製造'>('すべて');
  
  // Drawer / Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // New or Edited Manufacturer core form fields
  const [name, setName] = useState('');
  const [type, setType] = useState<'原料' | '製造'>('原料');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fax, setFax] = useState('');
  const [notes, setNotes] = useState('');

  // Reset form helper
  const resetForm = () => {
    setName('');
    setType('原料');
    setContactName('');
    setPhone('');
    setEmail('');
    setFax('');
    setNotes('');
    setEditingId(null);
    setIsFormOpen(false);
  };

  // Open Form for Adding
  const triggerNewForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  // Open Form for Editing
  const triggerEditForm = (m: Manufacturer) => {
    setEditingId(m.id);
    setName(m.name);
    setType(m.type);
    setContactName(m.contactName);
    setPhone(m.phone);
    setEmail(m.email);
    setFax(m.fax);
    setNotes(m.notes || '');
    setIsFormOpen(true);
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      addToast('メーカー名を入力してください。', 'error');
      return;
    }

    if (editingId) {
      // Update
      const updated: Manufacturer = {
        id: editingId,
        name: name.trim(),
        type,
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        fax: fax.trim(),
        notes: notes.trim() || undefined
      };
      onUpdateManufacturer(updated);
      addToast(`メーカー「${name}」を更新しました！`, 'success');
    } else {
      // Add
      const newM: Manufacturer = {
        id: `m-custom-${Date.now()}`,
        name: name.trim(),
        type,
        contactName: contactName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        fax: fax.trim(),
        notes: notes.trim() || undefined
      };
      onAddManufacturer(newM);
      addToast(`新規メーカー「${name}」を登録しました！`, 'success');
    }
    resetForm();
  };

  // Delete Handler
  const handleDelete = (m: Manufacturer) => {
    if (confirm(`メーカー「${m.name}」を削除してもよろしいですか？（※紐付く商品がある場合はお茶の発注処理時に影響するリスクがあります）`)) {
      onDeleteManufacturer(m.id);
      addToast(`メーカー「${m.name}」を削除しました。`, 'warning');
    }
  };

  // Filtered List
  const filteredManufacturers = useMemo(() => {
    return manufacturers.filter(m => {
      const matchSearch = 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.contactName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.notes || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchType = selectedType === 'すべて' || m.type === selectedType;
      return matchSearch && matchType;
    });
  }, [manufacturers, searchTerm, selectedType]);

  // Aggregate stats
  const stats = useMemo(() => {
    return {
      total: manufacturers.length,
      raw: manufacturers.filter(m => m.type === '原料').length,
      proc: manufacturers.filter(m => m.type === '製造').length,
    };
  }, [manufacturers]);

  return (
    <div className="space-y-6">
      
      {/* Tab Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="bg-emerald-950 text-emerald-400 text-[10px] uppercase font-mono tracking-widest px-2 py-0.5 rounded-full border border-emerald-950">
                Supply Chain Directory
              </span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">お茶原料・焙煎加工メーカーマスタ</h2>
            <p className="text-slate-400 text-xs mt-1">
              お茶ブランド共同統括で用いる原料取引サプライヤー、および三角ティーパック・個包装の製造工場・充填委託先を管理します。
            </p>
          </div>
          <button
            onClick={triggerNewForm}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
          >
            <Plus className="w-4 h-4" />
            <span>新規メーカー登録</span>
          </button>
        </div>
      </div>

      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-950 text-indigo-400 rounded-lg">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">登録メーカー総数</p>
            <h3 className="text-xl font-bold text-slate-150">{stats.total} <span className="text-xs text-slate-500 font-sans font-normal">社</span></h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-emerald-950 text-emerald-400 rounded-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">原料供給メーカー</p>
            <h3 className="text-xl font-bold text-emerald-400">{stats.raw} <span className="text-xs text-slate-500 font-sans font-normal">社</span></h3>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl flex items-center gap-4">
          <div className="p-3 bg-indigo-950/80 text-indigo-300 rounded-lg">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">充填・焙煎製造工場</p>
            <h3 className="text-xl font-bold text-indigo-300">{stats.proc} <span className="text-xs text-slate-500 font-sans font-normal">社</span></h3>
          </div>
        </div>
      </div>

      {/* List Controller and Search filter bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 p-4 rounded-xl border border-slate-850">
        <div className="relative w-full sm:max-w-xs">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="メーカー名、担当者、メモ内容で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 font-sans"
          />
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850/80 self-stretch sm:self-auto">
          {(['すべて', '原料', '製造'] as const).map((typeItem) => (
            <button
              key={typeItem}
              onClick={() => setSelectedType(typeItem)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all flex-1 sm:flex-none ${
                selectedType === typeItem
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {typeItem === 'すべて' ? 'すべて表示' : typeItem === '原料' ? '原料仕入れ先' : '製造・パック工場'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredManufacturers.map((m) => (
          <div 
            key={m.id} 
            className="bg-slate-900 border border-slate-850 rounded-xl p-5 hover:border-slate-800 transition-all flex flex-col justify-between"
          >
            <div>
              {/* Card Meta details */}
              <div className="flex items-center justify-between mb-3">
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                  m.type === '原料' 
                    ? 'bg-emerald-950/70 text-emerald-400 border-emerald-900/40' 
                    : 'bg-indigo-950/70 text-indigo-300 border-indigo-900/40'
                }`}>
                  {m.type === '原料' ? '🍃 原料供給' : '🏭 製造・パック充填'}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">#{m.id}</span>
              </div>

              {/* Title & rep representative */}
              <h4 className="text-sm font-bold text-slate-100 mb-1">{m.name}</h4>
              <p className="text-xs text-slate-400">
                担当：<span className="text-slate-200 font-medium">{m.contactName || '未設定'}</span>
              </p>

              {/* Contacts info sheet block */}
              <div className="mt-4 space-y-2 text-[11px] font-mono text-slate-350 border-t border-slate-850/60 pt-3">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>TEL: {m.phone || '未設定'}</span>
                </div>
                {m.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">EMAIL: {m.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>FAX: {m.fax || '未設定'}</span>
                </div>
              </div>

              {/* Memo block */}
              {m.notes && (
                <div className="mt-3.5 bg-slate-950 border border-slate-850/60 rounded-lg p-2.5 text-[10px] text-slate-400 italic">
                  <span>{m.notes}</span>
                </div>
              )}
            </div>

            {/* Editing and Deleting triggers */}
            <div className="flex items-center gap-2 mt-5 pt-3 border-t border-slate-850/40 justify-end">
              <button
                type="button"
                onClick={() => triggerEditForm(m)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded bg-slate-950 border border-slate-850 cursor-pointer transition-all"
                title="編集する"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(m)}
                className="p-1.5 text-rose-450 hover:text-rose-400 hover:bg-rose-950/20 rounded bg-slate-950 border border-slate-850 cursor-pointer transition-all"
                title="削除する"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filteredManufacturers.length === 0 && (
          <div className="col-span-full bg-slate-900 border border-dashed border-slate-800 py-12 px-4 rounded-xl text-center text-slate-500">
            <HelpCircle className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="text-xs">条件に合致するメーカー情報が見つかりません。</p>
          </div>
        )}
      </div>

      {/* Drawer / Edit Modal Form Popup */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
            
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{editingId ? '📝 メーカーマスタの編集' : '➕ 新規メーカーの登録'}</span>
              </h3>
              <button 
                onClick={resetForm}
                className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
              
              {/* Row 1: Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">
                  メーカー名 <span className="text-rose-450">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="例: 株式会社丸菱"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Row 2: Type select */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">メーカー区分</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(['原料', '製造'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setType(t)}
                      className={`py-2 px-3 text-xs font-medium border rounded transition-all flex items-center justify-center gap-1.5 ${
                        type === t
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {t === '原料' ? '🍃 原料仕入れ先 (丸菱、ハーブ提携など)' : '🏭 製造加工・パック詰 (ティーパック工場・にじなど)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Contact Representative Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">担当者名</label>
                <input
                  type="text"
                  placeholder="例: 山田 健一"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Grid TEL & FAX */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">電話番号</label>
                  <input
                    type="text"
                    placeholder="例: 06-1234-5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-300">FAX番号</label>
                  <input
                    type="text"
                    placeholder="例: 06-1234-5679"
                    value={fax}
                    onChange={(e) => setFax(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* EMAIL */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">メールアドレス</label>
                <input
                  type="email"
                  placeholder="例: contact@marubishi-tea.co.jp"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              {/* Note Memo */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-300">メモ（得意見積もりや資材配送手配ルール）</label>
                <textarea
                  placeholder="例: あずき茶原料の供給元で、リードタイム10日での配送が可能。10kg梱包対応。"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Footer controllers */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-950 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-white px-4 py-2 rounded text-xs transition-colors cursor-pointer"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 font-bold"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{editingId ? '変更を保存する' : '新しく登録する'}</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
