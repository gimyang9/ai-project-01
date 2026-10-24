'use strict';

// Calendar-day arithmetic: no storage access and no elapsed-hour/DST rounding.
function countStudyStreak(recordDates, today = new Date()) {
  const dayNumber = (year, month, day) => {
    const date = new Date(Date.UTC(year, month - 1, day));
    return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
      ? Math.floor(date.getTime() / 86400000) : null;
  };
  const currentDay = dayNumber(today.getFullYear(), today.getMonth() + 1, today.getDate());
  const days = new Set(recordDates.map(value => {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    return match ? dayNumber(Number(match[1]), Number(match[2]), Number(match[3])) : null;
  }).filter(day => day !== null && day <= currentDay));
  const studiedToday = days.has(currentDay);
  let cursor = studiedToday ? currentDay : currentDay - 1;
  let count = 0;
  while (days.has(cursor)) { count++; cursor--; }
  return {count, studiedToday};
}
