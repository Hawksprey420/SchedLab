// Display formatting. Numbers come from the core; this only rounds and groups them for reading.

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const twoDecimals = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** An integer number of ticks, with thousands separators. */
export function formatTicks(value: number): string {
  return grouped.format(value);
}

/** An average, to two decimal places. */
export function formatAverage(value: number): string {
  return twoDecimals.format(value);
}
