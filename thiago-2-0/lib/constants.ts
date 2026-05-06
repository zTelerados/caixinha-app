export const TARGET_DATE = new Date('2027-06-01T12:00:00');
export const START_HBA1C = 11.0;
export const TARGET_HBA1C = 7.5;
export const START_WEIGHT = 91;
export const TARGET_WEIGHT = 85;
export const STREAK_THRESHOLD = 60;

export type QuestGroup = 'crítico' | 'monitor' | 'físico';

export interface Quest {
  id: string;
  label: string;
  xp: number;
  group: QuestGroup;
}

export const QUESTS: Quest[] = [
  { id: 'ins_m', label: 'Insulina manhã',         xp: 10, group: 'crítico' },
  { id: 'ins_a', label: 'Insulina tarde',         xp: 10, group: 'crítico' },
  { id: 'ins_n', label: 'Insulina noite',         xp: 10, group: 'crítico' },
  { id: 'gli_1', label: 'Glicemia em jejum',      xp:  5, group: 'monitor' },
  { id: 'gli_2', label: 'Glicemia antes almoço',  xp:  5, group: 'monitor' },
  { id: 'gli_3', label: 'Glicemia antes jantar',  xp:  5, group: 'monitor' },
  { id: 'gli_4', label: 'Glicemia antes dormir',  xp:  5, group: 'monitor' },
  { id: 'treino',label: 'Treino do dia',          xp: 25, group: 'físico'  },
  { id: 'agua',  label: '2L de água',             xp: 10, group: 'físico'  },
  { id: 'dieta', label: 'Refeições limpas',       xp: 20, group: 'físico'  },
  { id: 'sono',  label: '7h de sono',             xp: 15, group: 'físico'  },
];

export const QUEST_GROUP_META: Record<QuestGroup, { label: string; sigil: string; tone: string }> = {
  'crítico':  { label: 'crítico',  sigil: '◆', tone: 'coral'   },
  'monitor':  { label: 'monitor',  sigil: '○', tone: 'indigo'  },
  'físico':   { label: 'físico',   sigil: '△', tone: 'emerald' },
};

export interface SplitDay {
  tag: string;
  desc: string;
}

export const SPLIT: Record<number, SplitDay> = {
  0: { tag: 'descanso', desc: 'Caminhada na orla, 40 min' },
  1: { tag: 'push',     desc: 'Peito, ombro, tríceps' },
  2: { tag: 'pull',     desc: 'Costas, bíceps' },
  3: { tag: 'legs',     desc: 'Pernas, glúteo, core' },
  4: { tag: 'push II',  desc: 'Ombro, peito superior' },
  5: { tag: 'pull II',  desc: 'Costas, braço, cardio 20 min' },
  6: { tag: 'cardio',   desc: 'Bike, corrida ou mobilidade' },
};

export interface Milestone {
  id: string;
  month: number;
  title: string;
  xp: number;
}

export const MILESTONES: Milestone[] = [
  { id: 'm1', month: 1, title: 'Glicemia em jejum estável < 130',  xp: 100 },
  { id: 'm3', month: 3, title: 'Glicada na zona de 9.5%',          xp: 250 },
  { id: 'm6', month: 6, title: 'Glicada < 8%, cirurgia liberada',  xp: 500 },
];

export const GLUCOSE_CONTEXTS = [
  { value: 'jejum',         label: 'em jejum' },
  { value: 'pre_almoco',    label: 'antes do almoço' },
  { value: 'pos_almoco',    label: 'depois do almoço' },
  { value: 'pre_jantar',    label: 'antes do jantar' },
  { value: 'pos_jantar',    label: 'depois do jantar' },
  { value: 'antes_dormir',  label: 'antes de dormir' },
  { value: 'madrugada',     label: 'madrugada' },
];

export const GLUCOSE_TARGET_LOW = 70;
export const GLUCOSE_TARGET_HIGH = 180;

export const REMINDER_TYPES = [
  { id: 'ins_m',  label: 'Insulina manhã',         defaultHour: 7,  defaultMinute: 0 },
  { id: 'ins_a',  label: 'Insulina tarde',         defaultHour: 13, defaultMinute: 0 },
  { id: 'ins_n',  label: 'Insulina noite',         defaultHour: 22, defaultMinute: 0 },
  { id: 'gli_1',  label: 'Glicemia em jejum',      defaultHour: 7,  defaultMinute: 30 },
  { id: 'gli_2',  label: 'Glicemia antes almoço',  defaultHour: 12, defaultMinute: 0 },
  { id: 'gli_3',  label: 'Glicemia antes jantar',  defaultHour: 19, defaultMinute: 0 },
  { id: 'gli_4',  label: 'Glicemia antes dormir',  defaultHour: 22, defaultMinute: 30 },
];

export function levelFromXp(xp: number): { level: number; current: number; needed: number; pct: number } {
  // curva suave: 100, 150, 220, 320, 460, 660...
  let lv = 1;
  let acc = 0;
  let cost = 100;
  while (acc + cost <= xp) {
    acc += cost;
    lv += 1;
    cost = Math.round(cost * 1.45);
  }
  const current = xp - acc;
  return { level: lv, current, needed: cost, pct: (current / cost) * 100 };
}

export function totalXpForToday(completedIds: Set<string>): number {
  return QUESTS.filter(q => completedIds.has(q.id)).reduce((s, q) => s + q.xp, 0);
}

export const MAX_DAILY_XP = QUESTS.reduce((s, q) => s + q.xp, 0);
