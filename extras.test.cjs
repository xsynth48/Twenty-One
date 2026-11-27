'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseIcs, nextStart, occurrences, icsDate } = require('../extras-main.cjs');

const ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT', 'SUMMARY:Wiskunde\\, toets', 'DTSTART:20261009T083000Z', 'DTEND:20261009T093000Z', 'END:VEVENT',
  'BEGIN:VEVENT', 'SUMMARY:Voetbal', 'DTSTART;TZID=Europe/Amsterdam:20261001T180000', 'DTEND;TZID=Europe/Amsterdam:20261001T193000',
  'RRULE:FREQ=WEEKLY;UNTIL=20261231T000000Z', 'END:VEVENT',
  'BEGIN:VEVENT', 'SUMMARY:Verjaardag', 'DTSTART;VALUE=DATE:20261012', 'END:VEVENT',
  'BEGIN:VEVENT', 'SUMMARY:Lange titel die', ' doorloopt', 'DTSTART:20261020T120000Z', 'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');

test('calendar: reads titles, times, all-day events and folded lines', () => {
  const events = parseIcs(ICS);
  assert.equal(events.length, 4);
  assert.equal(events[0].title, 'Wiskunde, toets');
  assert.equal(events[0].start, Date.UTC(2026, 9, 9, 8, 30));
  assert.equal(events[0].duration, 3600000);
  assert.equal(events[2].allDay, true);
  assert.equal(events[3].title, 'Lange titel diedoorloopt');
});

test('calendar: weekly repeats give the next date, and stop after UNTIL', () => {
  const football = parseIcs(ICS)[1];
  const now = new Date(2026, 9, 8, 12, 0).getTime(); // Thursday 8 Oct, 12:00
  assert.equal(nextStart(football, now), Date.UTC(2026, 9, 8, 16, 0)); // 18:00 in Amsterdam
  assert.equal(nextStart(football, new Date(2027, 0, 5).getTime()), null);
  assert.equal(icsDate('nonsense'), null);
});

const event = (...lines) => ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', ...lines, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
const local = (...a) => new Date(...a).getTime(), DAY = 864e5;
const dates = (e, from, days) => occurrences(e, from, from + days * DAY).map(t => { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()}`; });

test('calendar: an event in another time zone is at the right moment', () => {
  const [e] = parseIcs(event('SUMMARY:Call', 'DTSTART;TZID=America/New_York:20261105T090000', 'DTEND;TZID=America/New_York:20261105T100000'));
  assert.equal(e.start, Date.UTC(2026, 10, 5, 14, 0));
  assert.equal(e.duration, 3600000);
});

test('calendar: every Monday, Wednesday and Friday gives all three days', () => {
  const [e] = parseIcs(event('SUMMARY:Sport', 'DTSTART:20261102T170000', 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR'));
  assert.deepEqual(dates(e, local(2026, 10, 3), 7), ['11/4', '11/6', '11/9']);
});

test('calendar: COUNT stops a repeat, and it counts from the first date', () => {
  const [e] = parseIcs(event('SUMMARY:Cursus', 'DTSTART:20261002T100000', 'RRULE:FREQ=DAILY;COUNT=5'));
  assert.deepEqual(dates(e, local(2026, 9, 4), 30), ['10/4', '10/5', '10/6']);
});

test('calendar: monthly by date, by "second Monday" and by "last Friday"; yearly; no 31 November', () => {
  const by = rule => parseIcs(event('SUMMARY:x', 'DTSTART:20260112T090000', 'RRULE:' + rule))[0];
  assert.deepEqual(dates(by('FREQ=MONTHLY'), local(2026, 9, 20), 40), ['11/12']);
  assert.deepEqual(dates(by('FREQ=MONTHLY;BYDAY=2MO'), local(2026, 9, 20), 60), ['11/9', '12/14']);
  assert.deepEqual(dates(parseIcs(event('SUMMARY:x', 'DTSTART:20260130T090000', 'RRULE:FREQ=MONTHLY;BYDAY=-1FR'))[0], local(2026, 9, 20), 45), ['10/30', '11/27']);
  assert.deepEqual(dates(by('FREQ=YEARLY'), local(2026, 11, 1), 60), ['1/12']);
  assert.deepEqual(dates(parseIcs(event('SUMMARY:x', 'DTSTART:20260131T090000', 'RRULE:FREQ=MONTHLY'))[0], local(2026, 9, 20), 50), ['10/31']);
});

test('calendar: a cancelled date, a moved date and a cancelled event', () => {
  const ics = ['BEGIN:VCALENDAR',
    'BEGIN:VEVENT', 'UID:a', 'SUMMARY:Les', 'DTSTART:20261102T100000', 'RRULE:FREQ=WEEKLY', 'EXDATE:20261109T100000', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:a', 'SUMMARY:Les (verplaatst)', 'RECURRENCE-ID:20261116T100000', 'DTSTART:20261117T140000', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:a', 'STATUS:CANCELLED', 'SUMMARY:Les', 'RECURRENCE-ID:20261123T100000', 'DTSTART:20261123T100000', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:b', 'STATUS:CANCELLED', 'SUMMARY:Weg', 'DTSTART:20261104T100000', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const events = parseIcs(ics);
  assert.deepEqual(events.map(e => e.title), ['Les', 'Les (verplaatst)']);
  assert.deepEqual(dates(events[0], local(2026, 10, 3), 30), ['11/30']);
  assert.deepEqual(dates(events[1], local(2026, 10, 3), 30), ['11/17']);
});

test('calendar: an event still going on counts, one that is over does not', () => {
  const [e] = parseIcs(event('SUMMARY:Lang', 'DTSTART:20261104T100000', 'DTEND:20261104T120000'));
  assert.deepEqual(occurrences(e, local(2026, 10, 4, 11), local(2026, 10, 5)), [e.start]);
  assert.deepEqual(occurrences(e, local(2026, 10, 4, 13), local(2026, 10, 5)), []);
});
