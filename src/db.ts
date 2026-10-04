import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

export type Kind = 'subject' | 'chapter' | 'synthesis';

/** Un seul store pour toute l'arborescence : Matière > Chapitre > Synthèse. */
export interface Item {
  id: string;
  parentId: string | null;
  kind: Kind;
  title: string;
  html: string; // contenu (uniquement pour les synthèses)
  updatedAt: number;
}

interface Schema extends DBSchema {
  items: { key: string; value: Item };
}

let dbp: Promise<IDBPDatabase<Schema>> | undefined;
const db = () => (dbp ??= openDB<Schema>('revision-masquee', 1, {
  upgrade(d) { d.createObjectStore('items', { keyPath: 'id' }); }
}));

export const getAll = async () => (await db()).getAll('items');
export const save = async (i: Item) => { await (await db()).put('items', i); };
export const remove = async (ids: string[]) => {
  const tx = (await db()).transaction('items', 'readwrite');
  await Promise.all([...ids.map(id => tx.store.delete(id)), tx.done]);
};
