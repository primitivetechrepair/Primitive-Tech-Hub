export function makeId(prefix = "inv") {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
