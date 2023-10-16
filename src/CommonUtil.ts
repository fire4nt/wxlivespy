export function pad2(n: number) {
  return n < 10 ? `0${n}` : n;
}
export function pad3(n: number) {
  if (n < 10) {
    return `00${n}`;
  }
  if (n < 100) {
    return `0${n}`;
  }
  return n;
}
function MY_LOG(level: string, msg: string) {
  const date = new Date();
  const year = date.getFullYear().toString();
  const mouth = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());
  const datestr = `${year}-${mouth}-${day} ${hour}:${minute}:${second}`;
  // eslint-disable-next-line no-console
  console.log(`${datestr} [${level}] ${msg}`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function DEBUG(msg: string) {
  // MY_LOG('DEBUG', msg);
}
export function INFO(msg: string) {
  MY_LOG('INFO', msg);
}
export function WARNING(msg: string) {
  MY_LOG('WARN', msg);
}
export function CONSOLELOG(msg: any) {
  // eslint-disable-next-line no-console
  console.log(msg);
}
export function timestamp() {
  const date = new Date();
  const year = date.getFullYear().toString();
  const mouth = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());
  const milliSeconds = pad3(date.getMilliseconds());
  const datestr = `${year}${mouth}${day}_${hour}${minute}${second}${milliSeconds}`;
  return datestr;
}
export function url2filename(url: string) {
  // remove url parameters
  const url2 = url.replace(/\?.*$/, '');
  const filename = url2.replace(/https?:\/\//, '').replace(/\//g, '_');
  return filename;
}
export function date2str(date: Date): string {
  const year = date.getFullYear().toString();
  const mouth = pad2(date.getMonth() + 1);
  const day = pad2(date.getDate());
  const hour = pad2(date.getHours());
  const minute = pad2(date.getMinutes());
  const second = pad2(date.getSeconds());
  const milliSeconds = pad3(date.getMilliseconds());
  return `${year}-${mouth}-${day} ${hour}:${minute}:${second}.${milliSeconds}`;
}

export function textToPrettyJson(text: string | null | undefined): string {
  if (text == null || text === undefined) {
    return '';
  }
  if (!text.startsWith('{')) {
    return text;
  }
  const obj = JSON.parse(text);
  return JSON.stringify(obj, null, 2);
}
export function stringmask(v: string, head: number, tail: number): string {
  return `${v.slice(0, head)}****${v.slice(-tail)}`;
}
