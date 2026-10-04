/** Enveloppe / retire le style secret sur la sélection courante. */
export function toggleSecret(root: HTMLElement): void {
  const sel = getSelection();
  if (!sel || !sel.rangeCount) return;
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return;

  const el = range.commonAncestorContainer instanceof Element
    ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement;
  const existing = el?.closest('.secret');
  if (existing) { existing.replaceWith(...existing.childNodes); return; } // retire le masque
  if (range.collapsed) return;

  const span = document.createElement('span');
  span.className = 'secret';
  span.append(range.extractContents());
  range.insertNode(span);
  sel.removeAllRanges();
}

/** Syntaxe rapide : [[mot]] ou ~mot~ devient automatiquement un mot masqué. */
export function convertShortcuts(): void {
  const sel = getSelection();
  const node = sel?.anchorNode;
  if (!sel || !node || node.nodeType !== Node.TEXT_NODE) return;
  const text = node as Text;
  if (text.parentElement?.closest('.secret')) return;

  const m = /\[\[([^[\]]+)\]\]|~([^~]+)~/.exec(text.data);
  if (!m) return;

  const after = text.splitText(m.index + m[0].length);
  const target = text.splitText(m.index);
  target.data = m[1] ?? m[2] ?? '';
  const span = document.createElement('span');
  span.className = 'secret';
  target.replaceWith(span);
  span.append(target);

  const r = document.createRange(); // remet le curseur juste après le mot
  r.setStart(after, 0); r.collapse(true);
  sel.removeAllRanges(); sel.addRange(r);
}

const secrets = (root: HTMLElement) => root.querySelectorAll<HTMLElement>('.secret');

/** Bascule édition <-> révision. En révision tout est masqué et non éditable. */
export function setReview(root: HTMLElement, on: boolean): void {
  root.contentEditable = String(!on);
  root.classList.toggle('review', on);
  secrets(root).forEach(s => s.classList.toggle('hidden', on));
}

export const setAllHidden = (root: HTMLElement, hidden: boolean) =>
  secrets(root).forEach(s => s.classList.toggle('hidden', hidden));

/** Clic sur un bloc masqué : le révèle (re-clic : le recache). */
export function bindReveal(root: HTMLElement): void {
  root.addEventListener('click', e => {
    if (!root.classList.contains('review')) return;
    (e.target as HTMLElement).closest('.secret')?.classList.toggle('hidden');
  });
}
