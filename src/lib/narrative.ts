import { fmtValor, monthLabel } from './formatter';
import { Category } from '@/types';

export interface WeeklyStats {
  totalThisWeek: number;
  totalLastWeek: number;
  topCategories: Array<{ name: string; emoji: string; total: number; count: number }>;
  mostExpensive: { description: string; amount: number; date: string };
  highestDay: { date: string; total: number };
}

export interface MonthlyStats {
  totalThisMonth: number;
  totalLastMonth: number;
  totalIncomeThisMonth: number;
  totalIncomeLastMonth: number;
  balance: number;
  topCategories: Array<{ name: string; emoji: string; total: number }>;
  avgDailySpend: number;
  highestDay: { date: string; total: number };
  lowestDay: { date: string; total: number };
}

export interface AnomalyAlertData {
  type: 'high_amount' | 'category_limit' | 'frequency' | 'pace';
  category?: { name: string; emoji: string };
  amount?: number;
  categoryAvg?: number;
  categoryLimit?: number;
  categoryTotal?: number;
  transactionCount?: number;
  projectedMonth?: number;
  monthBudget?: number;
}

export function buildWeeklyNarrative(data: WeeklyStats): string {
  const lines: string[] = [];

  lines.push('SEMANA RESUMIDA');
  lines.push('');

  // Spend comparison
  const pct = data.totalLastWeek > 0 ? ((data.totalThisWeek - data.totalLastWeek) / data.totalLastWeek) * 100 : 0;
  const pctText = pct > 0 ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`;
  const comparison = data.totalThisWeek > data.totalLastWeek ? 'pior' : 'melhor';
  lines.push(`Gastou ${fmtValor(data.totalThisWeek)} (${comparison} que a semana passada: ${pctText})`);
  lines.push('');

  // Top 3 categories with drilldown
  lines.push('Campeões:');
  for (let i = 0; i < Math.min(3, data.topCategories.length); i++) {
    const cat = data.topCategories[i];
    lines.push(`${cat.emoji} ${cat.name} dominou - ${fmtValor(cat.total)} em ${cat.count} ${cat.count === 1 ? 'pedido' : 'pedidos'}`);
  }
  lines.push('');

  // Most expensive
  lines.push(`Maior gasto: ${fmtValor(data.mostExpensive.amount)} em ${data.mostExpensive.description}`);
  lines.push('');

  // Highest spending day
  lines.push(`Dia mais caro: ${data.highestDay.date} com ${fmtValor(data.highestDay.total)}`);

  return lines.join('\n');
}

export function buildMonthlyNarrative(data: MonthlyStats): string {
  const lines: string[] = [];

  const month = monthLabel();
  lines.push(`MÊS DE ${month.toUpperCase()}`);
  lines.push('');

  // Spend comparison
  const pct = data.totalLastMonth > 0 ? ((data.totalThisMonth - data.totalLastMonth) / data.totalLastMonth) * 100 : 0;
  const pctText = pct > 0 ? `+${pct.toFixed(0)}%` : `${pct.toFixed(0)}%`;
  const comparison = data.totalThisMonth > data.totalLastMonth ? 'pior' : 'melhor';
  lines.push(`Gasto: ${fmtValor(data.totalThisMonth)} (${comparison} que mês passado: ${pctText})`);
  lines.push('');

  // Income
  const incomePct = data.totalIncomeLastMonth > 0 ? ((data.totalIncomeThisMonth - data.totalIncomeLastMonth) / data.totalIncomeLastMonth) * 100 : 0;
  const incomePctText = incomePct > 0 ? `+${incomePct.toFixed(0)}%` : `${incomePct.toFixed(0)}%`;
  lines.push(`Renda: ${fmtValor(data.totalIncomeThisMonth)} (${incomePctText} vs mês passado)`);
  lines.push('');

  // Balance
  const balanceLabel = data.balance >= 0 ? 'Sobrou' : 'Faltou';
  lines.push(`${balanceLabel}: ${fmtValor(Math.abs(data.balance))}`);
  lines.push('');

  // Top 5 categories
  lines.push('Top 5:');
  for (let i = 0; i < Math.min(5, data.topCategories.length); i++) {
    const cat = data.topCategories[i];
    lines.push(`${cat.emoji} ${cat.name}: ${fmtValor(cat.total)}`);
  }
  lines.push('');

  // Average daily
  lines.push(`Média diária: ${fmtValor(data.avgDailySpend)}`);
  lines.push('');

  // Highest and lowest days
  lines.push(`Dia mais caro: ${data.highestDay.date} com ${fmtValor(data.highestDay.total)}`);
  lines.push(`Dia mais tranquilo: ${data.lowestDay.date} com ${fmtValor(data.lowestDay.total)}`);

  return lines.join('\n');
}

export function buildAnomalyAlert(data: AnomalyAlertData): string {
  switch (data.type) {
    case 'high_amount':
      return `⚠️ Alerta: esse gasto tá ${(((data.amount || 0) / (data.categoryAvg || 1)) * 100).toFixed(0)}% acima da média de ${data.category?.name || 'categoria'} ${data.category?.emoji || ''} (média: ${fmtValor(data.categoryAvg || 0)})`;

    case 'category_limit':
      const pctOfLimit = (((data.categoryTotal || 0) / (data.categoryLimit || 1)) * 100).toFixed(0);
      return `⚠️ Alerta: ${data.category?.emoji || ''} ${data.category?.name || 'categoria'} já chegou em ${pctOfLimit}% do limite (${fmtValor(data.categoryTotal || 0)} de ${fmtValor(data.categoryLimit || 0)})`;

    case 'frequency':
      return `⚠️ Alerta: ${data.transactionCount} gasto${(data.transactionCount || 0) > 1 ? 's' : ''} em ${data.category?.name || 'categoria'} nas últimas 24h. Tá em loop.`;

    case 'pace':
      const paceOverage = (((data.projectedMonth || 0) / (data.monthBudget || 1)) * 100 - 100).toFixed(0);
      return `⚠️ Alerta: no ritmo atual, o mês vai dar ${fmtValor(data.projectedMonth || 0)} (${paceOverage}% acima do orçamento de mês passado)`;

    default:
      return '';
  }
}
