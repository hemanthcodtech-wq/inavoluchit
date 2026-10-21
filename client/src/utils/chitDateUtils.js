/**
 * Utilities for formatting Chit Fund Month and Year based on scheme start dates
 */

/**
 * Returns a Date object for a given month number (1-indexed) of a chit scheme.
 * Month 1 is the starting month of the scheme (startDate or createdAt).
 */
export const getChitMonthDate = (chit, monthNumber) => {
  if (!chit) return null;
  const raw = chit.startDate || chit.createdAt;
  const base = raw ? new Date(raw) : new Date();
  if (isNaN(base.getTime())) return null;

  const mNum = Math.max(1, Number(monthNumber) || 1);
  return new Date(base.getFullYear(), base.getMonth() + (mNum - 1), 1);
};

/**
 * Short month & year (e.g. "Oct 2026", "Nov 2026", "Jan 2027")
 */
export const formatChitMonthYear = (chit, monthNumber) => {
  const d = getChitMonthDate(chit, monthNumber);
  if (!d) return `Month ${monthNumber}`;
  return d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
};

/**
 * Full month & year (e.g. "October 2026", "November 2026", "January 2027")
 */
export const formatChitMonthFull = (chit, monthNumber) => {
  const d = getChitMonthDate(chit, monthNumber);
  if (!d) return `Month ${monthNumber}`;
  return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

/**
 * Full month & year with Month number (e.g. "October 2026 (Month 1)")
 */
export const formatChitMonthWithNum = (chit, monthNumber) => {
  const d = getChitMonthDate(chit, monthNumber);
  if (!d) return `Month ${monthNumber}`;
  const full = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  return `${full} (Month ${monthNumber})`;
};

/**
 * Short month & year with Month number (e.g. "Oct 2026 (M1)")
 */
export const formatChitMonthShortWithNum = (chit, monthNumber) => {
  const d = getChitMonthDate(chit, monthNumber);
  if (!d) return `Month ${monthNumber}`;
  const short = d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  return `${short} (M${monthNumber})`;
};
