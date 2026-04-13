'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Wallet, Receipt, ChevronLeft, ChevronRight,
  ArrowUpRight, ArrowDownRight, RefreshCw, Settings, Plus, Pencil, Trash2,
  X, Search, Filter, ChevronDown, Check, Download,
} from 'lucide-react';
import { MONTHS, type Category } from '@/types';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────
interface TransactionItem {
  id: string;
  type: 'expense' | 'income';
  description: string;
  amount: number;
  category_id: string | null;
  category: { id?: string; name: string; emoji: string } | null;
  payment_method: string | null;
  date: string;
  month_label?: string;
  created_at?: string;
}

interface SummaryData {
  totalGastos: number;
  totalEntradas: number;
  saldo: number;
  qtdTransacoes: number;
}

interface CategoryData {
  name: string;
  value: number;
  emoji?: string;
  count: number;
  transactions: TransactionItem[];
}

interface Filters {
  category: string | null;
  minValue: string;
  maxValue: string;
  startDate: string;
  endDate: string;
  search: string;
  paymentMethod: string | null;
}

type SyncStatus = 'synced' | 'syncing' | 'error' | 'offline';
type CardView = 'expenses' | 'income' | 'balance' | 'all' | null;

// ─── Constants ────────────────────────────────────────────
const CATEGORY_COLORS = [
  '#2D6A4F', '#E76F51', '#457B9D', '#C1121F',
  '#6A0572', '#1D3557', '#40916C', '#7F5539',
  '#264653', '#E9C46A', '#F4A261', '#2A9D8F',
];
const PAYMENT_METHODS = ['Pix', 'Crédito', 'Débito', 'Dinheiro'];
const EMPTY_FILTERS: Filters = { category: null, minValue: '', maxValue: '', startDate: '', endDate: '', search: '', paymentMethod: null };

// ─── Helpers ──────────────────────────────────────────────
function fmtCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
}

function fmtDateFull(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDateISO(date: Date): string {
  return date.toISOString().split('T')[0];
}

function timeSince(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 5) return 'agora';
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h`;
}

// ─── Sync Indicator ───────────────────────────────────────
function SyncIndicator({ status, lastSync, onRefresh }: {
  status: SyncStatus; lastSync: Date | null; onRefresh: () => void;
}) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(i);
  }, []);

  const colors: Record<SyncStatus, string> = {
    synced: 'bg-green-500', syncing: 'bg-yellow-500 animate-pulse',
    error: 'bg-red-500', offline: 'bg-red-500',
  };
  const labels: Record<SyncStatus, string> = {
    synced: lastSync ? `Sync ${timeSince(lastSync)}` : 'Sincronizado',
    syncing: 'Atualizando...', error: 'Erro de sync', offline: 'Offline',
  };

  return (
    <button onClick={onRefresh} className="flex items-center gap-2 text-xs text-caixa-muted hover:text-caixa-text transition-colors" title="Atualizar dados">
      <span className={`w-2 h-2 rounded-full ${colors[status]}`} />
      <span>{labels[status]}</span>
      <RefreshCw size={14} className={status === 'syncing' ? 'animate-spin' : ''} />
    </button>
  );
}

// ─── Month Selector ───────────────────────────────────────
function MonthSelector({ currentMonth, onPrev, onNext }: {
  currentMonth: string; onPrev: () => void; onNext: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onPrev} className="btn-icon-primary" aria-label="Mes anterior">
        <ChevronLeft size={20} />
      </button>
      <h2 className="text-xl font-semibold text-caixa-text min-w-28 text-center">{currentMonth}</h2>
      <button onClick={onNext} className="btn-icon-primary" aria-label="Proximo mes">
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

// ─── Summary Card (clickable) ─────────────────────────────
function SummaryCard({ icon, label, value, isNegative, onClick, active }: {
  icon: React.ReactNode; label: string; value: string;
  isNegative?: boolean; onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`card card-hover w-full text-left transition-all ${active ? 'ring-2 ring-caixa-green border-caixa-green/50' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-caixa-muted text-sm mb-2">{label}</p>
          <p className={`text-2xl font-bold ${isNegative ? 'text-caixa-red' : 'text-caixa-green'}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${isNegative ? 'bg-caixa-red/10 text-caixa-red' : 'bg-caixa-green/10 text-caixa-green'}`}>
          {icon}
        </div>
      </div>
    </button>
  );
}

// ─── Filter Bar ───────────────────────────────────────────
function FilterBar({ filters, onFiltersChange, categories, activeCount, totalCount }: {
  filters: Filters; onFiltersChange: (f: Filters) => void;
  categories: CategoryData[]; activeCount: number; totalCount: number;
}) {
  const [open, setOpen] = useState(false);
  const hasFilters = filters.category || filters.minValue || filters.maxValue || filters.startDate || filters.endDate || filters.search || filters.paymentMethod;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(!open)} className="flex items-center gap-2 text-sm text-caixa-muted hover:text-caixa-text transition-colors">
          <Filter size={16} />
          <span>Filtros</span>
          {hasFilters && <span className="bg-caixa-green/20 text-caixa-green px-2 py-0.5 rounded-full text-xs">ativo</span>}
          <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button onClick={() => onFiltersChange(EMPTY_FILTERS)} className="text-xs text-caixa-red hover:text-caixa-red/80 transition-colors">
              Limpar filtros
            </button>
          )}
          <span className="text-xs text-caixa-muted">{activeCount} de {totalCount} transacoes</span>
        </div>
      </div>
      {open && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-4 bg-caixa-card/50 rounded-lg border border-caixa-border">
          {/* Search */}
          <div className="col-span-2 sm:col-span-3 lg:col-span-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-caixa-muted" />
              <input
                type="text" placeholder="Buscar descricao..."
                value={filters.search} onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                className="w-full bg-caixa-bg border border-caixa-border rounded-lg pl-9 pr-3 py-2 text-sm text-caixa-text placeholder-caixa-muted focus:outline-none focus:border-caixa-green/50"
              />
            </div>
          </div>
          {/* Category */}
          <select
            value={filters.category || ''} onChange={(e) => onFiltersChange({ ...filters, category: e.target.value || null })}
            className="bg-caixa-bg border border-caixa-border rounded-lg px-3 py-2 text-sm text-caixa-text focus:outline-none focus:border-caixa-green/50"
          >
            <option value="">Todas categorias</option>
            {categories.map((c) => <option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
          </select>
          {/* Payment Method */}
          <select
            value={filters.paymentMethod || ''} onChange={(e) => onFiltersChange({ ...filters, paymentMethod: e.target.value || null })}
            className="bg-caixa-bg border border-caixa-border rounded-lg px-3 py-2 text-sm text-caixa-text focus:outline-none focus:border-caixa-green/50"
          >
            <option value="">Forma de pgto</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          {/* Min/Max Value */}
          <input
            type="number" placeholder="Valor min" min="0" step="0.01"
            value={filters.minValue} onChange={(e) => onFiltersChange({ ...filters, minValue: e.target.value })}
            className="bg-caixa-bg border border-caixa-border rounded-lg px-3 py-2 text-sm text-caixa-text placeholder-caixa-muted focus:outline-none focus:border-caixa-green/50"
          />
          <input
            type="number" placeholder="Valor max" min="0" step="0.01"
            value={filters.maxValue} onChange={(e) => onFiltersChange({ ...filters, maxValue: e.target.value })}
            className="bg-caixa-bg border border-caixa-border rounded-lg px-3 py-2 text-sm text-caixa-text placeholder-caixa-muted focus:outline-none focus:border-caixa-green/50"
          />
        </div>
      )}
    </div>
  );
}

// ─── Modal Wrapper ────────────────────────────────────────
function Modal({ open, onClose, title, children }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-caixa-card border border-caixa-border rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-caixa-text">{title}</h3>
          <button onClick={onClose} className="btn-icon-primary"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Add Transaction Modal ────────────────────────────────
function AddTransactionModal({ open, onClose, onAdd, categoriesList, currentMonth }: {
  open: boolean; onClose: () => void;
  onAdd: (tx: any) => Promise<void>;
  categoriesList: Category[]; currentMonth: string;
}) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState(fmtDateISO(new Date()));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!description || !amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      await onAdd({
        type, description: description.trim(), amount: Number(amount),
        category_id: categoryId || null, payment_method: paymentMethod || null,
        date, month_label: currentMonth,
      });
      setDescription(''); setAmount(''); setCategoryId(''); setPaymentMethod('');
      setDate(fmtDateISO(new Date())); setType('expense');
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo Registro">
      <div className="space-y-4">
        {/* Type Toggle */}
        <div className="flex rounded-lg overflow-hidden border border-caixa-border">
          <button
            onClick={() => setType('expense')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${type === 'expense' ? 'bg-caixa-red/20 text-caixa-red' : 'text-caixa-muted hover:text-caixa-text'}`}
          >Despesa</button>
          <button
            onClick={() => setType('income')}
            className={`flex-1 py-2.5 text-sm font-medium transition-colors ${type === 'income' ? 'bg-caixa-green/20 text-caixa-green' : 'text-caixa-muted hover:text-caixa-text'}`}
          >Entrada</button>
        </div>
        {/* Amount */}
        <div>
          <label className="block text-xs text-caixa-muted mb-1.5">Valor (R$)</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00"
            className="w-full bg-caixa-bg border border-caixa-border rounded-lg px-4 py-2.5 text-lg text-caixa-text focus:outline-none focus:border-caixa-green/50"
          />
        </div>
        {/* Description */}
        <div>
          <label className="block text-xs text-caixa-muted mb-1.5">Descricao</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Acai na praia"
            className="w-full bg-caixa-bg border border-caixa-border rounded-lg px-4 py-2.5 text-sm text-caixa-text focus:outline-none focus:border-caixa-green/50"
          />
        </div>
        {/* Category */}
        <div>
          <label className="block text-xs text-caixa-muted mb-1.5">Categoria</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-caixa-bg border border-caixa-border rounded-lg px-4 py-2.5 text-sm text-caixa-text focus:outline-none focus:border-caixa-green/50"
          >
            <option value="">Selecionar...</option>
            {categoriesList.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
        </div>
        {/* Date */}
        <div>
          <label className="block text-xs text-caixa-muted mb-1.5">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-caixa-bg border border-caixa-border rounded-lg px-4 py-2.5 text-sm text-caixa-text focus:outline-none focus:border-caixa-green/50"
          />
        </div>
        {/* Payment Method */}
        <div>
          <label className="block text-xs text-caixa-muted mb-1.5">Forma de Pagamento</label>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button key={m} onClick={() => setPaymentMethod(paymentMethod === m ? '' : m)}
                className={`py-2 text-xs rounded-lg border transition-colors ${paymentMethod === m ? 'border-caixa-green bg-caixa-green/10 text-caixa-green' : 'border-caixa-border text-caixa-muted hover:text-caixa-text'}`}
              >{m}</button>
            ))}
          </div>
        </div>
        {/* Submit */}
        <button onClick={handleSubmit} disabled={saving || !description || !amount}
          className="w-full py-3 rounded-lg font-medium transition-colors bg-caixa-green text-white hover:bg-caixa-green/80 disabled:opacity-40 disabled:cursor-not-allowed"
        >{saving ? 'Salvando...' : 'Salvar'}</button>
      </div>
    </Modal>
  );
}

// ─── Edit Transaction Modal ───────────────────────────────
function EditTransactionModal({ transaction, onClose, onSave, categoriesList }: {
  transaction: TransactionItem | null; onClose: () => void;
  onSave: (id: string, data: any) => Promise<void>;
  categoriesList: Category[];
}) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(String(transaction.amount));
      setCategoryId(transaction.category_id || '');
      setPaymentMethod(transaction.payment_method || '');
      setDate(transaction.date);
    }
  }, [transaction]);

  if (!transaction) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(transaction.id, {
        description: description.trim(), amount: Number(amount),
        category_id: categoryId || null, payment_method: paymentMethod || null, date,
      });
      onClose();
    } finally { setSaving(false); }
  };

  return (
    <Modal open={!!transaction} onClose={onClose} title="Editar Transacao">
      <div className="space-y-4">
        <div>
          <label className="block text-xs text-caixa-muted mb-1.5">Valor (R$)</label>
          <input type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-caixa-bg border border-caixa-border rounded-lg px-4 py-2.5 text-lg text-caixa-text focus:outline-none focus:border-caixa-green/50"
          />
        </div>
        <div>
          <label className="block text-xs text-caixa-muted mb-1.5">Descricao</label>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-caixa-bg border border-caixa-border rounded-lg px-4 py-2.5 text-sm text-caixa-text focus:outline-none focus:border-caixa-green/50"
          />
        </div>
        <div>
          <label className="block text-xs text-caixa-muted mb-1.5">Categoria</label>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="w-full bg-caixa-bg border border-caixa-border rounded-lg px-4 py-2.5 text-sm text-caixa-text focus:outline-none focus:border-caixa-green/50"
          >
            <option value="">Sem categoria</option>
            {categoriesList.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-caixa-muted mb-1.5">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="w-full bg-caixa-bg border border-caixa-border rounded-lg px-4 py-2.5 text-sm text-caixa-text focus:outline-none focus:border-caixa-green/50"
          />
        </div>
        <div>
          <label className="block text-xs text-caixa-muted mb-1.5">Forma de Pagamento</label>
          <div className="grid grid-cols-4 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button key={m} onClick={() => setPaymentMethod(paymentMethod === m ? '' : m)}
                className={`py-2 text-xs rounded-lg border transition-colors ${paymentMethod === m ? 'border-caixa-green bg-caixa-green/10 text-caixa-green' : 'border-caixa-border text-caixa-muted hover:text-caixa-text'}`}
              >{m}</button>
            ))}
          </div>
        </div>
        <button onClick={handleSave} disabled={saving || !description || !amount}
          className="w-full py-3 rounded-lg font-medium transition-colors bg-caixa-green text-white hover:bg-caixa-green/80 disabled:opacity-40 disabled:cursor-not-allowed"
        >{saving ? 'Salvando...' : 'Salvar alteracoes'}</button>
      </div>
    </Modal>
  );
}

// ─── Delete Confirm ───────────────────────────────────────
function DeleteConfirm({ transaction, onClose, onConfirm }: {
  transaction: TransactionItem | null; onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
}) {
  const [deleting, setDeleting] = useState(false);
  if (!transaction) return null;

  const handleDelete = async () => {
    setDeleting(true);
    try { await onConfirm(transaction.id); onClose(); }
    finally { setDeleting(false); }
  };

  return (
    <Modal open={!!transaction} onClose={onClose} title="Apagar transacao?">
      <p className="text-caixa-muted text-sm mb-6">
        Apagar <span className="text-caixa-text font-medium">{transaction.description}</span>{' '}
        <span className="text-caixa-red">{fmtCurrency(transaction.amount)}</span>{' '}
        do dia {fmtDate(transaction.date)}?
      </p>
      <div className="flex gap-3">
        <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-caixa-border text-sm text-caixa-muted hover:text-caixa-text transition-colors">
          Cancelar
        </button>
        <button onClick={handleDelete} disabled={deleting}
          className="flex-1 py-2.5 rounded-lg bg-caixa-red text-white text-sm font-medium hover:bg-caixa-red/80 disabled:opacity-40 transition-colors"
        >{deleting ? 'Apagando...' : 'Apagar'}</button>
      </div>
    </Modal>
  );
}

// ─── Drill-Down Modal ─────────────────────────────────────
function DrillDownModal({ category, onClose, onEdit, onDelete }: {
  category: CategoryData | null; onClose: () => void;
  onEdit: (tx: TransactionItem) => void; onDelete: (tx: TransactionItem) => void;
}) {
  if (!category) return null;
  const sorted = [...category.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <Modal open={!!category} onClose={onClose} title={`${category.emoji} ${category.name}`}>
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-caixa-border">
        <span className="text-sm text-caixa-muted">{category.count} transacoes</span>
        <span className="text-lg font-bold text-caixa-red">{fmtCurrency(category.value)}</span>
      </div>
      <div className="space-y-2 max-h-[50vh] overflow-y-auto">
        {sorted.map((tx) => (
          <div key={tx.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-caixa-bg transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm text-caixa-text truncate">{tx.description}</p>
              <p className="text-xs text-caixa-muted">{fmtDate(tx.date)} {tx.payment_method ? `· ${tx.payment_method}` : ''}</p>
            </div>
            <div className="flex items-center gap-2 ml-2">
              <span className={`text-sm font-semibold ${tx.type === 'income' ? 'text-caixa-green' : 'text-caixa-text'}`}>
                {tx.type === 'income' ? '+' : '-'}{fmtCurrency(tx.amount).replace('R$\u00a0', '')}
              </span>
              <div className="hidden group-hover:flex items-center gap-1">
                <button onClick={() => onEdit(tx)} className="p-1 text-caixa-muted hover:text-caixa-green transition-colors"><Pencil size={14} /></button>
                <button onClick={() => onDelete(tx)} className="p-1 text-caixa-muted hover:text-caixa-red transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ─── Balance Breakdown Modal ──────────────────────────────
function BalanceModal({ open, onClose, expenses, income }: {
  open: boolean; onClose: () => void; expenses: number; income: number;
}) {
  if (!open) return null;
  const max = Math.max(expenses, income, 1);
  return (
    <Modal open={open} onClose={onClose} title="Balanco do mes">
      <div className="space-y-6">
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-caixa-green">Entradas</span>
            <span className="text-sm font-semibold text-caixa-green">{fmtCurrency(income)}</span>
          </div>
          <div className="w-full h-4 bg-caixa-border rounded-full overflow-hidden">
            <div className="h-full bg-caixa-green rounded-full transition-all" style={{ width: `${(income / max) * 100}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-caixa-red">Despesas</span>
            <span className="text-sm font-semibold text-caixa-red">{fmtCurrency(expenses)}</span>
          </div>
          <div className="w-full h-4 bg-caixa-border rounded-full overflow-hidden">
            <div className="h-full bg-caixa-red rounded-full transition-all" style={{ width: `${(expenses / max) * 100}%` }} />
          </div>
        </div>
        <div className="pt-4 border-t border-caixa-border flex justify-between">
          <span className="text-sm text-caixa-muted">Saldo</span>
          <span className={`text-lg font-bold ${income - expenses >= 0 ? 'text-caixa-green' : 'text-caixa-red'}`}>
            {fmtCurrency(income - expenses)}
          </span>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════
//  MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════
export default function Dashboard() {
  // ── Core state ──────────────────────────────────────────
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => new Date().getMonth() + 1);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [evolution, setEvolution] = useState<{ dia: number; cumulative: number }[]>([]);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── UI state ────────────────────────────────────────────
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [cardView, setCardView] = useState<CardView>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);
  const [deletingTx, setDeletingTx] = useState<TransactionItem | null>(null);
  const [drillCategory, setDrillCategory] = useState<CategoryData | null>(null);
  const [showBalance, setShowBalance] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('synced');
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const currentMonth = MONTHS[currentMonthIndex] || 'Janeiro';

  // ── Data fetching ───────────────────────────────────────
  const fetchAll = useCallback(async (month: string) => {
    setSyncStatus('syncing');
    try {
      const [sumRes, evoRes, txRes, catRes] = await Promise.all([
        fetch(`/api/summary?month=${encodeURIComponent(month)}`),
        fetch(`/api/evolution?month=${encodeURIComponent(month)}`),
        fetch(`/api/transactions?month=${encodeURIComponent(month)}`),
        fetch('/api/categories'),
      ]);

      if (!sumRes.ok || !txRes.ok) throw new Error('Erro ao carregar dados');

      const [sumData, evoData, txData, catData] = await Promise.all([
        sumRes.json(), evoRes.json(), txRes.json(), catRes.json(),
      ]);

      setSummary(sumData);
      setEvolution(evoData.evolution || []);
      setTransactions(txData.transactions || []);
      setCategoriesList(catData.categories || []);

      // Build category data from transactions
      const catMap = new Map<string, CategoryData>();
      for (const tx of (txData.transactions || []) as TransactionItem[]) {
        if (tx.type !== 'expense') continue;
        const catName = tx.category?.name || 'Sem Categoria';
        const catEmoji = tx.category?.emoji || '';
        if (!catMap.has(catName)) catMap.set(catName, { name: catName, emoji: catEmoji, value: 0, count: 0, transactions: [] });
        const cat = catMap.get(catName)!;
        cat.value += tx.amount;
        cat.count++;
        cat.transactions.push(tx);
      }
      setCategoryData(Array.from(catMap.values()).sort((a, b) => b.value - a.value));

      setSyncStatus('synced');
      setLastSync(new Date());
      setError(null);
    } catch (err) {
      console.error(err);
      setSyncStatus('error');
      setError('Erro ao carregar dados. Tente novamente.');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setFilters(EMPTY_FILTERS);
    setCardView(null);
    fetchAll(currentMonth).finally(() => setLoading(false));
  }, [currentMonth, fetchAll]);

  // Auto-refresh every 60s
  useEffect(() => {
    const interval = setInterval(() => fetchAll(currentMonth), 60000);
    return () => clearInterval(interval);
  }, [currentMonth, fetchAll]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => { setSyncStatus('synced'); fetchAll(currentMonth); };
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) setSyncStatus('offline');
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, [currentMonth, fetchAll]);

  // ── CRUD operations ─────────────────────────────────────
  const addTransaction = async (data: any) => {
    const res = await fetch('/api/transactions/add', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao salvar');
    await fetchAll(currentMonth);
  };

  const updateTransaction = async (id: string, data: any) => {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Falha ao atualizar');
    await fetchAll(currentMonth);
  };

  const deleteTransaction = async (id: string) => {
    const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Falha ao apagar');
    await fetchAll(currentMonth);
  };

  const exportCSV = async () => {
    const res = await fetch('/api/config/export');
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'caixinha-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  // ── Filtering logic ─────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    let list = [...transactions];

    // Card view filter
    if (cardView === 'expenses') list = list.filter((t) => t.type === 'expense');
    else if (cardView === 'income') list = list.filter((t) => t.type === 'income');

    // Category filter
    if (filters.category) list = list.filter((t) => (t.category?.name || 'Sem Categoria') === filters.category);

    // Payment method
    if (filters.paymentMethod) list = list.filter((t) => t.payment_method === filters.paymentMethod);

    // Value range
    if (filters.minValue) list = list.filter((t) => t.amount >= Number(filters.minValue));
    if (filters.maxValue) list = list.filter((t) => t.amount <= Number(filters.maxValue));

    // Date range
    if (filters.startDate) list = list.filter((t) => t.date >= filters.startDate);
    if (filters.endDate) list = list.filter((t) => t.date <= filters.endDate);

    // Text search
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter((t) => t.description.toLowerCase().includes(q));
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, filters, cardView]);

  // ── Payment methods breakdown ───────────────────────────
  const paymentMethods = useMemo(() => {
    const map: Record<string, number> = {};
    for (const tx of transactions) {
      if (tx.payment_method && tx.type === 'expense') {
        map[tx.payment_method] = (map[tx.payment_method] || 0) + tx.amount;
      }
    }
    return Object.entries(map).map(([method, amount]) => ({ method, amount })).sort((a, b) => b.amount - a.amount);
  }, [transactions]);
  const maxPaymentAmount = Math.max(...paymentMethods.map((m) => m.amount), 1);

  // ── Navigation ──────────────────────────────────────────
  const handlePrevMonth = () => setCurrentMonthIndex((p) => (p === 1 ? 12 : p - 1));
  const handleNextMonth = () => setCurrentMonthIndex((p) => (p === 12 ? 1 : p + 1));

  const handleCardClick = (view: CardView) => {
    if (cardView === view) { setCardView(null); return; }
    if (view === 'balance') { setShowBalance(true); return; }
    setCardView(view);
  };

  // ── Loading screen ──────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-caixa-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-caixa-border border-t-caixa-green" />
          <p className="mt-4 text-caixa-muted">Carregando dados...</p>
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-caixa-bg pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* ─── Header ──────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-caixa-text">Caixinha</h1>
            <p className="text-sm text-caixa-muted mt-0.5">Dashboard Financeiro</p>
          </div>
          <div className="flex items-center gap-4">
            <SyncIndicator status={syncStatus} lastSync={lastSync} onRefresh={() => fetchAll(currentMonth)} />
            <button onClick={exportCSV} className="btn-icon-primary" title="Exportar CSV"><Download size={18} /></button>
            <Link href="/config" className="btn-icon-primary" title="Configuracoes"><Settings size={18} /></Link>
          </div>
        </div>

        {/* ─── Month Selector ──────────────────────────── */}
        <div className="flex items-center justify-center mb-6">
          <MonthSelector currentMonth={currentMonth} onPrev={handlePrevMonth} onNext={handleNextMonth} />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-caixa-red/10 border border-caixa-red/30 rounded-lg text-caixa-red text-sm">{error}</div>
        )}

        {/* ─── Summary Cards (clickable) ───────────────── */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard icon={<TrendingDown size={22} />} label="Total Gastos" value={fmtCurrency(summary.totalGastos)} isNegative
              onClick={() => handleCardClick('expenses')} active={cardView === 'expenses'} />
            <SummaryCard icon={<TrendingUp size={22} />} label="Total Entradas" value={fmtCurrency(summary.totalEntradas)}
              onClick={() => handleCardClick('income')} active={cardView === 'income'} />
            <SummaryCard icon={<Wallet size={22} />} label="Saldo" value={fmtCurrency(summary.saldo)} isNegative={summary.saldo < 0}
              onClick={() => handleCardClick('balance')} active={false} />
            <SummaryCard icon={<Receipt size={22} />} label="Qtd Transacoes" value={summary.qtdTransacoes.toString()}
              onClick={() => handleCardClick('all')} active={cardView === 'all'} />
          </div>
        )}

        {/* ─── Charts Row ──────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Donut Chart */}
          <div className="lg:col-span-1">
            <div className="card h-full flex flex-col">
              <h3 className="text-base font-semibold mb-4 text-caixa-text">Gastos por Categoria</h3>
              {categoryData.length > 0 ? (
                <div className="flex-1 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                        paddingAngle={2} dataKey="value" style={{ cursor: 'pointer' }}
                        onClick={(entry) => {
                          const cat = categoryData.find((c) => c.name === entry.name);
                          if (cat) setDrillCategory(cat);
                        }}
                      >
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#141414', border: '1px solid #1f1f1f', borderRadius: '8px', fontSize: '13px' }}
                        formatter={(value: number) => fmtCurrency(value)}
                        labelFormatter={(label) => {
                          const cat = categoryData.find((c) => c.name === label);
                          if (!cat) return label;
                          const total = categoryData.reduce((s, c) => s + c.value, 0);
                          return `${cat.emoji} ${cat.name} (${((cat.value / total) * 100).toFixed(0)}%)`;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center"><p className="text-caixa-muted text-sm">Sem dados</p></div>
              )}
              {/* Category Legend */}
              <div className="mt-3 space-y-1.5 max-h-32 overflow-y-auto">
                {categoryData.slice(0, 6).map((cat, i) => (
                  <button key={cat.name} onClick={() => setDrillCategory(cat)}
                    className="flex items-center justify-between w-full text-xs hover:bg-caixa-border/30 rounded px-2 py-1 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                      <span className="text-caixa-text">{cat.emoji} {cat.name}</span>
                    </div>
                    <span className="text-caixa-muted">{fmtCurrency(cat.value)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Evolution Chart */}
          <div className="lg:col-span-2">
            <div className="card h-full flex flex-col">
              <h3 className="text-base font-semibold mb-4 text-caixa-text">Evolucao do Mes</h3>
              {evolution.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={evolution}>
                    <defs>
                      <linearGradient id="colorCumul" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="dia" stroke="#737373" style={{ fontSize: '11px' }} />
                    <YAxis stroke="#737373" style={{ fontSize: '11px' }} tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#141414', border: '1px solid #1f1f1f', borderRadius: '8px', fontSize: '13px' }}
                      formatter={(value: number) => fmtCurrency(value)} labelFormatter={(l) => `Dia ${l}`}
                    />
                    <Area type="monotone" dataKey="cumulative" stroke="#2D6A4F" strokeWidth={2} fillOpacity={1} fill="url(#colorCumul)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex-1 flex items-center justify-center"><p className="text-caixa-muted text-sm">Sem dados</p></div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Transactions Section ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-caixa-text">
                  {cardView === 'expenses' ? 'Despesas' : cardView === 'income' ? 'Entradas' : cardView === 'all' ? 'Todas as Transacoes' : 'Transacoes Recentes'}
                </h3>
                {cardView && (
                  <button onClick={() => setCardView(null)} className="text-xs text-caixa-green hover:text-caixa-green/80 transition-colors">
                    Limpar
                  </button>
                )}
              </div>

              {/* Filter Bar */}
              <FilterBar filters={filters} onFiltersChange={setFilters} categories={categoryData}
                activeCount={filteredTransactions.length} totalCount={transactions.length} />

              {/* Transaction List */}
              <div className="mt-4 space-y-1 max-h-[500px] overflow-y-auto">
                {filteredTransactions.length > 0 ? (
                  filteredTransactions.map((tx) => (
                    <div key={tx.id} className="group flex items-center justify-between p-3 rounded-lg hover:bg-caixa-border/30 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-lg flex-shrink-0">{tx.category?.emoji || ''}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-caixa-text truncate">{tx.description}</p>
                          <p className="text-xs text-caixa-muted">
                            {fmtDate(tx.date)}
                            {tx.category?.name ? ` · ${tx.category.name}` : ''}
                            {tx.payment_method ? ` · ${tx.payment_method}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {tx.type === 'income' ? <ArrowUpRight size={14} className="text-caixa-green" /> : <ArrowDownRight size={14} className="text-caixa-red" />}
                        <span className={`text-sm font-semibold tabular-nums ${tx.type === 'income' ? 'text-caixa-green' : 'text-caixa-text'}`}>
                          {tx.type === 'income' ? '+' : '-'}{fmtCurrency(tx.amount).replace('R$\u00a0', '')}
                        </span>
                        {/* Actions — visible on hover (desktop) / always on mobile */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingTx(tx)} className="p-1.5 text-caixa-muted hover:text-caixa-green transition-colors" title="Editar"><Pencil size={14} /></button>
                          <button onClick={() => setDeletingTx(tx)} className="p-1.5 text-caixa-muted hover:text-caixa-red transition-colors" title="Apagar"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10">
                    <p className="text-caixa-muted text-sm">Nenhuma transacao encontrada</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─── Payment Methods ────────────────────────── */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="text-base font-semibold mb-4 text-caixa-text">Formas de Pagamento</h3>
              <div className="space-y-4">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((pm) => (
                    <div key={pm.method}>
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm text-caixa-text">{pm.method}</p>
                        <p className="text-sm text-caixa-muted tabular-nums">{fmtCurrency(pm.amount)}</p>
                      </div>
                      <div className="w-full h-2 bg-caixa-border rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-caixa-green to-caixa-blue rounded-full transition-all duration-500"
                          style={{ width: `${(pm.amount / maxPaymentAmount) * 100}%` }} />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-caixa-muted text-sm py-4">Sem dados</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── FAB: Novo Gasto ───────────────────────────── */}
      <button onClick={() => setShowAddModal(true)} title="Novo registro"
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-caixa-green text-white shadow-lg shadow-caixa-green/30 flex items-center justify-center hover:bg-caixa-green/80 transition-all hover:scale-105 active:scale-95 z-40"
      >
        <Plus size={24} />
      </button>

      {/* ─── Modals ────────────────────────────────────── */}
      <AddTransactionModal open={showAddModal} onClose={() => setShowAddModal(false)}
        onAdd={addTransaction} categoriesList={categoriesList} currentMonth={currentMonth} />
      <EditTransactionModal transaction={editingTx} onClose={() => setEditingTx(null)}
        onSave={updateTransaction} categoriesList={categoriesList} />
      <DeleteConfirm transaction={deletingTx} onClose={() => setDeletingTx(null)} onConfirm={deleteTransaction} />
      <DrillDownModal category={drillCategory} onClose={() => setDrillCategory(null)}
        onEdit={(tx) => { setDrillCategory(null); setEditingTx(tx); }}
        onDelete={(tx) => { setDrillCategory(null); setDeletingTx(tx); }} />
      <BalanceModal open={showBalance} onClose={() => setShowBalance(false)}
        expenses={summary?.totalGastos || 0} income={summary?.totalEntradas || 0} />
    </main>
  );
}
