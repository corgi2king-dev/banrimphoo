export interface Room { id: string; name: string; type?: string; price?: number; capacity?: number; status?: string; note?: string }
export interface Entry { id: string; date: string; roomId: string; guest?: string; phone?: string; amount: number; paid?: boolean; deposit?: number; channel?: string; note?: string; group?: string }
export interface Expense { id: string; date: string; cat: string; amount: number; channel?: string; note?: string }
export interface Db { rooms: Room[]; entries: Entry[]; expenses: Expense[] }
export type Kind = keyof Db;
export interface HistoryRow { id: number; at: number; user: string | null; kind: 'entries' | 'expenses'; action: 'create' | 'update' | 'delete'; before: any; after: any }
export type Tab = 'today' | 'rooms' | 'calendar' | 'expenses' | 'summary' | 'history';
export type PayState = 'ok' | 'dep' | 'due';
