'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { MONTHS, Transaction, Category } from '@/types';

// Constants
const CATEGORY_COLORS = [
  '#2D6A4F',
  '#E76F51',
  '#457B9D',
  '#C1121F',
  '#6A0572',
  '#1D3557',
  '#40916C',
  '#7F5539',
];

interface SummaryData {
  totalGastos: number;
  totalEntradas: number;
  saldo: number;
  qtdTransacoes: number;
}

interface EvolutionDataPoint {
  dia: number;
  cumulative: number;
}

interface CategoryData {
  name: string;
  value: number;
  emoji?: string;
  transactions: Transaction[];
}

// Format currency to Brazilian standard
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// Format date to dd/mm
function formatDate(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(date);
}

// Month selector component
function MonthSelector({
  currentMonth,
  onPrevMonth,
  onNextMonth,
}: {
  currentMonth: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrevMonth}
        className="btn-icon-primary"
        aria-label="Mês anterior"
      >
        <ChevronLeft size={20} />
      </button>
      <h2 className="text-2xl font-semibold text-caixa-text min-w-32 text-center">
        {currentMonth}
      </h2>
      <button
        onClick={onNextMonth}
        className="btn-icon-primary"
        aria-label="Próximo mês"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}

// Summary card component
function SummaryCard({
  icon: Icon,
  label,
  value,
  isNegative = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  isNegative?: boolean;
}) {
  return (
    <div className="card card-hover">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-caixa-muted text-sm mb-2">{label}</p>
          <p
            className={`text-2xl font-bold ${
              isNegative ? 'text-caixa-red' : 'text-caixa-green'
            }`}
          >
            {value}
          </p>
        </div>
        <div
          className={`p-3 rounded-lg ${
            isNegative
              ? 'bg-caixa-red/10 text-caixa-red'
              : 'bg-caixa-green/10 text-caixa-green'
          }`}
        >
          {Icon}
        </div>
      </div>
    </div>
  );
}

// Main dashboard component
export default function Dashboard() {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => {
    const now = new Date();
    return now.getMonth() + 1;
  });

  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [evolution, setEvolution] = useState<EvolutionDataPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentMonth = MONTHS[currentMonthIndex] || 'Janeiro';

  // Fetch summary data
  const fetchSummary = useCallback(async (month: string) => {
    try {
      const res = await fetch(`/api/summary?month=${encodeURIComponent(month)}`);
      if (!res.ok) throw new Error('Erro ao carregar resumo');
      const data = await res.json();
      setSummary(data);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError('Erro ao carregar dados do resumo');
    }
  }, []);

  // Fetch evolution data
  const fetchEvolution = useCallback(async (month: string) => {
    try {
      const res = await fetch(`/api/evolution?month=${encodeURIComponent(month)}`);
      if (!res.ok) throw new Error('Erro ao carregar evolução');
      const data = await res.json();
      setEvolution(data.evolution || []);
    } catch (err) {
      console.error('Error fetching evolution:', err);
      setError('Erro ao carregar gráfico de evolução');
    }
  }, []);

  // Fetch transactions
  const fetchTransactions = useCallback(async (month: string) => {
    try {
      const res = await fetch(
        `/api/transactions?month=${encodeURIComponent(month)}`
      );
      if (!res.ok) throw new Error('Erro ao carregar transações');
      const data = await res.json();
      setTransactions(data.transactions || []);
      setCategories(data.categories || []);

      // Build category data
      const catMap = new Map<string, CategoryData>();
      for (const tx of data.transactions || []) {
        const catName = tx.category?.name || 'Sem Categoria';
        const catEmoji = tx.category?.emoji || '📌';

        if (!catMap.has(catName)) {
          catMap.set(catName, {
            name: catName,
            emoji: catEmoji,
            value: 0,
            transactions: [],
          });
        }

        const cat = catMap.get(catName)!;
        if (tx.type === 'expense') {
          cat.value += tx.amount;
        }
        cat.transactions.push(tx);
      }

      const sortedCats = Array.from(catMap.values()).sort(
        (a, b) => b.value - a.value
      );
      setCategoryData(sortedCats);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Erro ao carregar transações');
    }
  }, []);

  // Load data on mount and month change
  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedCategory(null);

    Promise.all([
      fetchSummary(currentMonth),
      fetchEvolution(currentMonth),
      fetchTransactions(currentMonth),
    ]).finally(() => setLoading(false));
  }, [currentMonth, fetchSummary, fetchEvolution, fetchTransactions]);

  const handlePrevMonth = () => {
    setCurrentMonthIndex((prev) => (prev === 1 ? 12 : prev - 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthIndex((prev) => (prev === 12 ? 1 : prev + 1));
  };

  // Get payment method breakdown
  const paymentMethodBreakdown = transactions.reduce(
    (acc, tx) => {
      if (tx.payment_method && tx.type === 'expense') {
        acc[tx.payment_method] = (acc[tx.payment_method] || 0) + tx.amount;
      }
      return acc;
    },
    {} as Record<string, number>
  );

  const paymentMethods = Object.entries(paymentMethodBreakdown)
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const maxPaymentAmount = Math.max(...paymentMethods.map((m) => m.amount), 1);

  // Get filtered transactions for selected category
  const filteredTransactions =
    selectedCategory && categoryData.length > 0
      ? categoryData.find((c) => c.name === selectedCategory)?.transactions || []
      : transactions.slice(0, 10);

  const sortedFilteredTransactions = [...filteredTransactions]
    .sort(
      (a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .slice(0, 10);

  if (loading) {
    return (
      <div className="min-h-screen bg-caixa-bg flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-caixa-border border-t-caixa-green"></div>
          <p className="mt-4 text-caixa-muted">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-caixa-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-caixa-text mb-2">Caixinha</h1>
          <p className="text-caixa-muted">Gerencie suas finanças com inteligência</p>
        </div>

        {/* Month Selector */}
        <div className="mb-8">
          <MonthSelector
            currentMonth={currentMonth}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
          />
        </div>

        {error && (
          <div className="mb-6 p-4 bg-caixa-red/10 border border-caixa-red/30 rounded-lg text-caixa-red">
            {error}
          </div>
        )}

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <SummaryCard
              icon={<TrendingDown size={24} />}
              label="Total Gastos"
              value={formatCurrency(summary.totalGastos)}
              isNegative
            />
            <SummaryCard
              icon={<TrendingUp size={24} />}
              label="Total Entradas"
              value={formatCurrency(summary.totalEntradas)}
            />
            <SummaryCard
              icon={<Wallet size={24} />}
              label="Saldo"
              value={formatCurrency(summary.saldo)}
              isNegative={summary.saldo < 0}
            />
            <SummaryCard
              icon={<Receipt size={24} />}
              label="Qtd Transações"
              value={summary.qtdTransacoes.toString()}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Donut Chart */}
          <div className="lg:col-span-1">
            <div className="card h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-6 text-caixa-text">
                Gastos por Categoria
              </h3>
              {categoryData.length > 0 ? (
                <>
                  <div className="flex-1 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={2}
                          dataKey="value"
                          onClick={(entry) => {
                            setSelectedCategory(
                              selectedCategory === entry.name
                                ? null
                                : entry.name
                            );
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          {categoryData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                              opacity={
                                selectedCategory === null ||
                                selectedCategory === entry.name
                                  ? 1
                                  : 0.3
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#141414',
                            border: '1px solid #1f1f1f',
                            borderRadius: '8px',
                          }}
                          formatter={(value: number) => formatCurrency(value)}
                          labelFormatter={(label) => {
                            const cat = categoryData.find(
                              (c) => c.name === label
                            );
                            if (cat) {
                              const total = categoryData.reduce(
                                (acc, c) => acc + c.value,
                                0
                              );
                              const pct = ((cat.value / total) * 100).toFixed(1);
                              return `${cat.emoji} ${cat.name} (${pct}%)`;
                            }
                            return label;
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory(null)}
                      className="mt-4 text-sm text-caixa-green hover:text-caixa-green/80 transition-colors"
                    >
                      ← Voltar
                    </button>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-caixa-muted">Sem dados de gastos</p>
                </div>
              )}
            </div>
          </div>

          {/* Evolution Chart */}
          <div className="lg:col-span-2">
            <div className="card h-full flex flex-col">
              <h3 className="text-lg font-semibold mb-6 text-caixa-text">
                Evolução do Mês
              </h3>
              {evolution.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={evolution}>
                    <defs>
                      <linearGradient
                        id="colorCumulative"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#2D6A4F" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2D6A4F" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="dia"
                      stroke="#737373"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis
                      stroke="#737373"
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) =>
                        `R$ ${(value / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#141414',
                        border: '1px solid #1f1f1f',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                      labelFormatter={(label) => `Dia ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#2D6A4F"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCumulative)"
                      isAnimationActive={true}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-caixa-muted">Sem dados de evolução</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Transactions List */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-caixa-text">
                  {selectedCategory
                    ? `Transações - ${selectedCategory}`
                    : 'Transações Recentes'}
                </h3>
                {selectedCategory && (
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-caixa-green hover:text-caixa-green/80 transition-colors"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {sortedFilteredTransactions.length > 0 ? (
                  sortedFilteredTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-caixa-border/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-xl flex-shrink-0">
                          {tx.category?.emoji || '📌'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-caixa-text truncate">
                            {tx.description}
                          </p>
                          <p className="text-xs text-caixa-muted">
                            {formatDate(tx.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        {tx.type === 'income' ? (
                          <ArrowUpRight size={16} className="text-caixa-green" />
                        ) : (
                          <ArrowDownRight size={16} className="text-caixa-red" />
                        )}
                        <span
                          className={`text-sm font-semibold ${
                            tx.type === 'income'
                              ? 'text-caixa-green'
                              : 'text-caixa-text'
                          }`}
                        >
                          {tx.type === 'income' ? '+' : '-'}
                          {formatCurrency(tx.amount).replace('R$ ', '')}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-caixa-muted">
                      {selectedCategory
                        ? 'Nenhuma transação nesta categoria'
                        : 'Nenhuma transação neste mês'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="lg:col-span-1">
            <div className="card">
              <h3 className="text-lg font-semibold mb-6 text-caixa-text">
                Métodos de Pagamento
              </h3>

              <div className="space-y-4">
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((pm) => {
                    const percentage = (pm.amount / maxPaymentAmount) * 100;
                    return (
                      <div key={pm.method}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-caixa-text font-medium truncate">
                            {pm.method}
                          </p>
                          <p className="text-sm text-caixa-muted">
                            {formatCurrency(pm.amount).replace('R$ ', '')}
                          </p>
                        </div>
                        <div className="w-full h-2 bg-caixa-border rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-caixa-green to-caixa-blue transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-center text-caixa-muted py-4">
                    Sem dados de pagamento
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
