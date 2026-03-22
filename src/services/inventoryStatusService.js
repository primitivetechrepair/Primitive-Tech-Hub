export function inventoryStatusByColorRule(qty) {
  if (qty < 1) return { status: 'Out of Stock', color: '#ff0000', className: 'stock-out' };
  if (qty < 5) return { status: 'Low Stock', color: '#ffd500', className: 'stock-low' };
  return { status: 'Healthy', color: '#00ff19', className: 'stock-healthy' };
}