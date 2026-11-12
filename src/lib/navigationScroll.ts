export type ScrollPosition = { x: number; y: number };
export function navigationScrollPosition(type: string, saved: ScrollPosition | undefined, initial: boolean, documentNavigationType?: string): ScrollPosition {
  // React Router also calls initial loads/reloads POP; those aren't history restores.
  return type === 'POP' && (!initial || documentNavigationType === 'back_forward') && saved ? saved : { x: 0, y: 0 };
}
