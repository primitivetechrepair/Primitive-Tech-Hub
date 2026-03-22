export function val(id) {
  const element = document.getElementById(id);
  if (element) {
    return element.value.trim();
  } else {
    console.error(`Element with id "${id}" not found`);
    return '';
  }
}

export function safeVal(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : '';
}