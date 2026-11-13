export function indiaDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function indiaDayRange(date: Date) {
  const start = new Date(`${indiaDay(date)}T00:00:00+05:30`);
  return { start, end: new Date(start.getTime() + 86400000) };
}
