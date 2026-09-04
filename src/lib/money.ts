export function paiseToRupees(paise: number): number {
  return Math.round(paise) / 100;
}

export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(paiseToRupees(paise));
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}
