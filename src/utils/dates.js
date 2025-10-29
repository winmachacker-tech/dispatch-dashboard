// src/utils/dates.js
export const iso = (d) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());


export function startOfWeek(d = new Date()) {
const x = new Date(d);
const day = x.getDay(); // 0 Sun
const diff = (day + 6) % 7; // Monday as start
x.setHours(0, 0, 0, 0);
x.setDate(x.getDate() - diff);
return x;
}


export function endOfWeek(d = new Date()) {
const s = startOfWeek(d);
const e = new Date(s);
e.setDate(e.getDate() + 7);
return e; // exclusive
}