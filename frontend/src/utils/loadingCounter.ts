type Listener = (active: boolean) => void;

let count = 0;
const listeners = new Set<Listener>();

export function startLoading() {
  count++;
  listeners.forEach((l) => l(true));
}

export function endLoading() {
  count = Math.max(0, count - 1);
  listeners.forEach((l) => l(count > 0));
}

export function subscribeLoading(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
