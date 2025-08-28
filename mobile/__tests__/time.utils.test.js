function nextAcrossWeek(now, events) {
  const weekdays = ['Su','M','T','W','Th','F','Sa'];
  for (let off = 0; off < 7; off += 1) {
    const d = new Date(now.getTime()); d.setDate(d.getDate() + off);
    const day = weekdays[d.getDay()];
    const todays = events.filter((e) => e.days.includes(day));
    if (todays.length === 0) continue;
    const nowStr = off === 0 ? `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : '00:00';
    const n = todays.map((e) => ({ ...e, startStr: e.start_time }))
      .filter((e) => e.startStr >= nowStr)
      .sort((a,b) => a.startStr.localeCompare(b.startStr))[0];
    if (n) return n;
  }
  return null;
}

describe('time utils', () => {
  test('Fri 23:58 -> Mon 12:01 edge', () => {
    const events = [
      { days: ['M'], start_time: '12:01' },
    ];
    const fri = new Date('2024-03-08T23:58:00-06:00');
    const next = nextAcrossWeek(fri, events);
    expect(next?.start_time).toBe('12:01');
  });

  test('DST spring forward boundary', () => {
    const events = [ { days: ['M','W','F'], start_time: '09:00' } ];
    // DST start 2024-03-10 in America/Chicago
    const sat = new Date('2024-03-09T12:00:00-06:00');
    const next = nextAcrossWeek(sat, events);
    expect(next?.start_time).toBe('09:00');
  });
}); 