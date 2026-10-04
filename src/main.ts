import './style.css';
import { registerSW } from 'virtual:pwa-register';
import { getAll, save, remove, type Item, type Kind } from './db';
import * as ed from './editor';

registerSW({ immediate: true }); // enregistre le Service Worker

const $ = <T extends HTMLElement>(s: string) => document.querySelector(s) as T;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

const childKind: Record<Kind, Kind | null> = { subject: 'chapter', chapter: 'synthesis', synthesis: null };
const label: Record<Kind, string> = { subject: 'Matière', chapter: 'Chapitre', synthesis: 'Synthèse' };
const icon: Record<Kind, string> = { subject: '📚', chapter: '📁', synthesis: '📝' };

let items: Item[] = [];
let current: Item | null = null;
let review = false;
let query = '';
const expanded = new Set<string>();

const editor = $<HTMLDivElement>('#editor');
const kids = (id: string | null) =>
  items.filter(i => i.parentId === id).sort((a, b) => a.title.localeCompare(b.title, 'fr'));
const plain = (i: Item) => (i.title + ' ' + i.html.replace(/<[^>]+>/g, ' ')).toLowerCase();

// ---------- Rendu de l'arborescence ----------
function row(i: Item, depth: number, recurse: boolean): string {
  const ck = childKind[i.kind];
  const add = ck ? `<button data-act="add" data-id="${i.id}" title="Ajouter : ${label[ck]}">＋</button>` : '';
  const self = `<div class="row ${current?.id === i.id ? 'active' : ''}" style="padding-left:${8 + depth * 14}px"
    data-act="open" data-id="${i.id}"><span>${icon[i.kind]} ${esc(i.title)}</span>${add}
    <button data-act="del" data-id="${i.id}" title="Supprimer">🗑</button></div>`;
  return self + (recurse && expanded.has(i.id) ? kids(i.id).map(k => row(k, depth + 1, true)).join('') : '');
}

function renderTree(): void {
  const q = query.trim().toLowerCase();
  $('#tree').innerHTML = q
    ? items.filter(i => plain(i).includes(q)).map(i => row(i, 0, false)).join('') || '<p class="hint">Aucun résultat</p>'
    : kids(null).map(i => row(i, 0, true)).join('');
}

// ---------- Sélection / sauvegarde ----------
let timer = 0;
function flush(): void {
  clearTimeout(timer);
  if (!current || review) return; // en révision on ne sauvegarde jamais (les .hidden sont temporaires)
  current.html = editor.innerHTML;
  current.updatedAt = Date.now();
  void save(current);
}

function select(i: Item | null): void {
  flush();
  current = i;
  $('#doc').hidden = !i;
  $('#empty').hidden = !!i;
  $<HTMLInputElement>('#title').value = i?.title ?? '';
  editor.innerHTML = i?.html ?? '';
  setReview(false);
  document.body.classList.remove('open');
  renderTree();
}

function setReview(on: boolean): void {
  if (on) flush();
  review = on;
  ed.setReview(editor, on);
  $('#modeEdit').classList.toggle('on', !on);
  $('#modeRev').classList.toggle('on', on);
  $('#editTools').hidden = on;
  $('#revTools').hidden = !on;
}

// ---------- Événements ----------
async function add(parentId: string | null, kind: Kind): Promise<void> {
  const title = prompt(`Nom de la ${label[kind].toLowerCase()} :`)?.trim();
  if (!title) return;
  const item: Item = { id: crypto.randomUUID(), parentId, kind, title, html: '', updatedAt: Date.now() };
  items.push(item);
  await save(item);
  if (parentId) expanded.add(parentId);
  kind === 'synthesis' ? select(item) : renderTree();
}

$('#addRoot').onclick = () => void add(null, 'subject');
$('#search').addEventListener('input', e => { query = (e.target as HTMLInputElement).value; renderTree(); });

$('#tree').addEventListener('click', async e => {
  const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
  const item = items.find(i => i.id === btn?.dataset.id);
  if (!btn || !item) return;
  if (btn.dataset.act === 'add') await add(item.id, childKind[item.kind]!);
  else if (btn.dataset.act === 'del') {
    if (!confirm(`Supprimer « ${item.title} » et tout son contenu ?`)) return;
    const ids = new Set([item.id]);
    for (let grew = true; grew;) { // collecte les descendants
      grew = false;
      items.forEach(i => { if (i.parentId && ids.has(i.parentId) && !ids.has(i.id)) { ids.add(i.id); grew = true; } });
    }
    await remove([...ids]);
    items = items.filter(i => !ids.has(i.id));
    if (current && ids.has(current.id)) select(null); else renderTree();
  } else if (item.kind === 'synthesis') select(item);
  else { expanded.has(item.id) ? expanded.delete(item.id) : expanded.add(item.id); renderTree(); }
});

$<HTMLInputElement>('#title').addEventListener('input', e => {
  if (!current) return;
  current.title = (e.target as HTMLInputElement).value;
  void save(current); renderTree();
});

editor.addEventListener('input', () => {
  ed.convertShortcuts();
  clearTimeout(timer);
  timer = window.setTimeout(flush, 400); // sauvegarde différée (debounce)
});
editor.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'm') { e.preventDefault(); ed.toggleSecret(editor); flush(); }
});
ed.bindReveal(editor);

$('#secret').onclick = () => { ed.toggleSecret(editor); flush(); };
document.querySelectorAll<HTMLElement>('[data-cmd]').forEach(b => {
  b.onmousedown = e => e.preventDefault(); // garde la sélection
  b.onclick = () => { document.execCommand(b.dataset.cmd!); flush(); };
});
$('#modeEdit').onclick = () => setReview(false);
$('#modeRev').onclick = () => setReview(true);
$('#hideAll').onclick = () => ed.setAllHidden(editor, true);
$('#showAll').onclick = () => ed.setAllHidden(editor, false);

// Menu mobile + thème clair/sombre
$('#menu').onclick = () => document.body.classList.toggle('open');
$('#backdrop').onclick = () => document.body.classList.remove('open');
const applyTheme = (t: string) => { document.documentElement.dataset.theme = t; localStorage.setItem('theme', t); };
applyTheme(localStorage.getItem('theme') ?? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
$('#theme').onclick = () => applyTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');
addEventListener('pagehide', flush);

// ---------- Démarrage ----------
getAll().then(all => { items = all; renderTree(); });
