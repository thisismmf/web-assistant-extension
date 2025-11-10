const GREGORIAN_DAYS_IN_MONTH = [
  31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
];
const JALALI_DAYS_IN_MONTH = [
  31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29,
];

export const jalaliMonthNames = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export const gregorianMonthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const jalaliWeekdays = ["ی", "د", "س", "چ", "پ", "ج", "ش"];
export const gregorianWeekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function toJalali(date) {
  const gYear = date.getFullYear();
  const gMonth = date.getMonth() + 1;
  const gDay = date.getDate();

  let gy = gYear - 1600;
  let gm = gMonth - 1;
  let gd = gDay - 1;

  let gDayNo =
    365 * gy +
    Math.floor((gy + 3) / 4) -
    Math.floor((gy + 99) / 100) +
    Math.floor((gy + 399) / 400);

  for (let i = 0; i < gm; ++i) {
    gDayNo += GREGORIAN_DAYS_IN_MONTH[i];
  }
  if (gm > 1 && isGregorianLeap(gYear)) {
    gDayNo += 1;
  }
  gDayNo += gd;

  let jDayNo = gDayNo - 79;

  const jNp = Math.floor(jDayNo / 12053);
  jDayNo %= 12053;

  let jy = 979 + 33 * jNp + 4 * Math.floor(jDayNo / 1461);
  jDayNo %= 1461;

  if (jDayNo >= 366) {
    jy += Math.floor((jDayNo - 1) / 365);
    jDayNo = (jDayNo - 1) % 365;
  }

  let jm = 0;
  for (; jm < 11 && jDayNo >= JALALI_DAYS_IN_MONTH[jm]; ++jm) {
    jDayNo -= JALALI_DAYS_IN_MONTH[jm];
  }
  const jd = jDayNo + 1;

  return { year: jy, month: jm + 1, day: jd };
}

export function fromJalali(jy, jm, jd) {
  jy -= 979;
  jm -= 1;
  jd -= 1;

  let jDayNo =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4);

  for (let i = 0; i < jm; ++i) {
    jDayNo += JALALI_DAYS_IN_MONTH[i];
  }
  jDayNo += jd;

  let gDayNo = jDayNo + 79;

  let gy =
    1600 +
    400 * Math.floor(gDayNo / 146097);
  gDayNo %= 146097;

  let leap = true;
  if (gDayNo >= 36525) {
    gDayNo -= 1;
    gy += 100 * Math.floor(gDayNo / 36524);
    gDayNo %= 36524;
    if (gDayNo >= 365) {
      gDayNo += 1;
    } else {
      leap = false;
    }
  }

  gy += 4 * Math.floor(gDayNo / 1461);
  gDayNo %= 1461;

  if (gDayNo >= 366) {
    leap = false;
    gDayNo -= 1;
    gy += Math.floor(gDayNo / 365);
    gDayNo %= 365;
  }

  let gm = 0;
  for (; gm < 11 && gDayNo >= GREGORIAN_DAYS_IN_MONTH[gm]; gm++) {
    if (gm === 1 && leap) {
      if (gDayNo < 29) break;
      gDayNo -= 29;
    } else {
      gDayNo -= GREGORIAN_DAYS_IN_MONTH[gm];
    }
  }

  const gd = gDayNo + 1;
  return new Date(Date.UTC(gy, gm, gd));
}

export function formatJalali(date) {
  const { year, month, day } = toJalali(date);
  return `${day} ${jalaliMonthNames[month - 1]} ${year}`;
}

export function isGregorianLeap(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function jalaliDaysInMonth(year, month) {
  if (month < 1 || month > 12) {
    throw new RangeError("ماه جلالی نامعتبر است");
  }
  const start = fromJalali(year, month, 1);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  const nextStart = fromJalali(nextYear, nextMonth, 1);
  return Math.round((nextStart - start) / MS_PER_DAY);
}

export function isJalaliLeap(year) {
  return jalaliDaysInMonth(year, 12) === 30;
}
