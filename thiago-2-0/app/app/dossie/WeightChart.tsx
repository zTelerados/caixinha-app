'use client';

import { WeightLogRow } from '@/lib/types';
import {
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts';
import { TARGET_WEIGHT } from '@/lib/constants';

interface Props {
  weights: WeightLogRow[];
}

export function WeightChart({ weights }: Props) {
  const data = weights.map(w => ({ date: w.date.slice(5), weight: Number(w.weight) }));

  if (data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center font-italic-display text-2xl text-muted">
        nada para exibir ainda.
      </div>
    );
  }

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid stroke="oklch(0.92 0.008 75)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: 'oklch(0.52 0.014 65)', fontSize: 10, fontFamily: 'var(--font-jetbrains)' }}
            tickLine={false}
            axisLine={{ stroke: 'oklch(0.92 0.008 75)' }}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            domain={['auto', 'auto']}
            tick={{ fill: 'oklch(0.52 0.014 65)', fontSize: 10, fontFamily: 'var(--font-jetbrains)' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ReferenceLine
            y={TARGET_WEIGHT}
            stroke="oklch(0.62 0.130 155)"
            strokeDasharray="3 3"
            label={{ value: `meta ${TARGET_WEIGHT}`, fill: 'oklch(0.62 0.130 155)', fontSize: 10, fontFamily: 'var(--font-jetbrains)', position: 'right' }}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--c-card)',
              border: '1px solid var(--c-border-hi)',
              borderRadius: 12,
              fontFamily: 'var(--font-jetbrains)',
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="weight"
            stroke="oklch(0.50 0.220 270)"
            strokeWidth={2}
            dot={{ r: 3, fill: 'oklch(0.50 0.220 270)' }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
