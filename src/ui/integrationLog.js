export function setIntegrationLog(el, text) {
  el.integrationLog.textContent = `${text} (${new Date().toLocaleTimeString()})`;
}