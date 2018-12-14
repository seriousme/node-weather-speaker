const MAXLAG = 30 * 60 * 1000; //30 mins

function isCurrent(time) {
  const now = new Date();
  const date = new Date(time);
  console.log({ time, now, date });
  return now - date < MAXLAG;
}

const now = new Date().valueOf();
const ok = new Date(now - MAXLAG + 5 * 60 * 1000).toISOString();
const fail = new Date(now - MAXLAG - 5 * 60 * 1000).toISOString();
console.log({ now, ok, fail });

console.log(ok, isCurrent(ok));
console.log(fail, isCurrent(fail));
