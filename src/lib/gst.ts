// GST is included in the amount: split it into the taxable value and equal CGST / SGST halves.
export function gstBreakdown(amount: number, rate: number) {
  const r = Number(rate) || 0;
  const taxable = r > 0 ? Math.round((amount / (1 + r / 100)) * 100) / 100 : amount;
  const tax = Math.round((amount - taxable) * 100) / 100;
  const cgst = Math.round((tax / 2) * 100) / 100;
  return { rate: r, half: r / 2, taxable, cgst, sgst: Math.round((tax - cgst) * 100) / 100, tax };
}
