'use client';

import { GlucoseReading } from '@/lib/types';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { GLUCOSE_TARGET_HIGH, GLUCOSE_TARGET_LOW } from '@/lib/constants';

interface Props {
  readings: GlucoseReading[];
}

export function GlucoseChart({ readings }: Props) {
  const sorted = [...readings].sort((a, b) => {
    const ka = a.reading_date + a.reading_time;
    const kb = b.reading_date + b.reading_time;
    return ka.localeCompare(kb);
  });

  const data = sorted.map(r => ({
    label: `${r.reading_date.slice(5)} ${r.reading_time.slice(0, 5)}`,
    value: r.value,
  }));

  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center font-italic-display text-2xl text-muted">
        nada para exibir ainda.
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="glcGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.50 0.220 270)" stopOpacity={0.30} />
              <stop offset="100%" stopColor="oklch(0.50 0.220 270)" stopOpacity={0.00} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="oklch(0.92 0.008 75)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'oklch(0.52 0.014 65)', fontSize: 9, fontFamily: 'var(--font-jetbrains)' }}
            tickLine={false}
            axisLine={{ stroke: 'oklch(0.92 0.008 75)' }}
            interval="preserveStartEnd"
            minTickGap={32}
          />
          <YAxis
            domain={[40, 'auto']}
            tick={{ fill: 'oklch(0.52 0.014 65)', fontSize: 10, fontFamily: 'var(--font-jetbrains)' }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <ReferenceArea
            y1={GLUCOSE_TARGET_LOW}
            y2={GLUCOSE_TARGET_HIGH}
            fill="oklch(0.62 0.130 155)"
            fillOpacity={0.06}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--c-card)',
              border: '1px solid var(--c-border-hi)',
              borderRadius: 12,
              fontFamily: 'var(--font-jetbrains)',
              fontSize: 12,
            }}
            labelStyle={{ color: 'var(--c-muted)' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="oklch(0.50 0.220 270)"
            strokeWidth={2}
            fill="url(#glcGrad)"
            dot={{ r: 2.5, fill: 'oklch(0.50 0.220 270)' }}
            activeDot={{ r: 4 }}
            isAnimationActive
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
