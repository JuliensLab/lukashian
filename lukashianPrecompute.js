// lukashianPrecompute.js
// This file computes the data and returns it as an object for JSON serialization

function getJdeMillisAtEndOfYear(year) {
  let jde0;
  if (year < 4900) {
    const y = (year - 3900) / 1000;
    jde0 = 1721414.39987 + 365242.88257 * y - 0.00769 * y * y - 0.00933 * y * y * y - 0.00006 * y * y * y * y;
  } else {
    const y = (year - 5900) / 1000;
    jde0 = 2451900.05952 + 365242.74049 * y - 0.06223 * y * y - 0.00823 * y * y * y + 0.00032 * y * y * y * y;
  }

  const t = (jde0 - 2451545.0) / 36525;
  const w = t * 35999.373 - 2.47;
  const dL = 0.0334 * Math.cos(toRadians(w)) + 0.0007 * Math.cos(toRadians(2 * w)) + 1;

  let s = 0;
  for (let i = 0; i < 24; i++) {
    s += A[i] * Math.cos(toRadians(B[i] + C[i] * t));
  }

  const jde = jde0 + (0.00001 * s) / dL;
  return BigInt(Math.round(jde * 24 * 3600 * 1000));
}

function getJdeMillisForBaryCenterPerihelion(year) {
  const k = Math.round(0.99997 * (year - 5900.01));
  const jde = 2451547.507 + 365.2596358 * k + 0.0000000156 * k * k;
  return BigInt(Math.round(jde * 24 * 3600 * 1000));
}

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}

function binarySearch(arr, target) {
  let low = 0;
  let high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] < target) {
      low = mid + 1;
    } else if (arr[mid] > target) {
      high = mid - 1;
    } else {
      return mid;
    }
  }
  return -(low + 1);
}

function getLukashianEpochMilliseconds(unixEpochMilliseconds) {
  const unix = BigInt(unixEpochMilliseconds);
  let index = binarySearch(UNIX_TIMESTAMPS_WITH_LEAP_SECOND, unix);
  const numberOfLeapSeconds = index >= 0 ? index + 1 : -index - 1;
  return unix + BigInt(numberOfLeapSeconds * 1000) + UNIX_EPOCH_OFFSET_MILLISECONDS;
}

function approxEpochDay(epochMs) {
  const centurialIncreaseInNanos = 1700000n;
  const lengthOfMeanSolarDayAtYear5900InNanos = 86400002000000n;
  const increaseBetweenEpochAndYear5900InNanos = centurialIncreaseInNanos * 59n;
  const lengthOfMeanSolarDayAtEpochInNanos = lengthOfMeanSolarDayAtYear5900InNanos - increaseBetweenEpochAndYear5900InNanos;
  const dailyIncreaseInNanos = Number(centurialIncreaseInNanos) / (100 * 365.25);

  const L0_s = Number(lengthOfMeanSolarDayAtEpochInNanos) / 1_000_000_000;
  const d_s = dailyIncreaseInNanos / 1_000_000_000;
  let target_s = Number(epochMs) / 1000;

  let m = target_s / L0_s;
  for (let i = 0; i < 5; i++) {
    m = target_s / (L0_s + (d_s * (m - 1)) / 2);
  }
  return Math.floor(m);
}

function computeCumNanos(minDay) {
  const centurialIncreaseInNanos = 1700000n;
  const lengthOfMeanSolarDayAtYear5900InNanos = 86400002000000n;
  const increaseBetweenEpochAndYear5900InNanos = centurialIncreaseInNanos * 59n;
  const lengthOfMeanSolarDayAtEpochInNanos = lengthOfMeanSolarDayAtYear5900InNanos - increaseBetweenEpochAndYear5900InNanos;
  const dailyIncreaseInNanos = Number(centurialIncreaseInNanos) / (100 * 365.25);

  let epochNanos = 0n;
  for (let k = 1; k < minDay; k++) {
    const length = Number(lengthOfMeanSolarDayAtEpochInNanos) + dailyIncreaseInNanos * (k - 1);
    epochNanos += BigInt(Math.round(length));
  }
  return epochNanos;
}

function precompute(unixStart, unixEnd) {
  const epochStart = getLukashianEpochMilliseconds(unixStart);
  const epochEnd = getLukashianEpochMilliseconds(unixEnd);

  const jdeMillisAtStartOfCalendar = getJdeMillisAtEndOfYear(0);

  const tempMinYear = 5900;
  const tempMaxYear = 6000;
  const tempYearEpochMs = [];
  for (let year = 1; year <= tempMaxYear; year++) {
    tempYearEpochMs.push(getJdeMillisAtEndOfYear(year) - jdeMillisAtStartOfCalendar);
  }

  let index = binarySearch(tempYearEpochMs, epochStart);
  let startYear = index >= 0 ? index + 1 : -index;

  index = binarySearch(tempYearEpochMs, epochEnd);
  let endYear = index >= 0 ? index + 1 : -index;

  const bufferYear = 1;
  const MIN_YEAR = startYear - bufferYear;
  const MAX_YEAR = endYear + bufferYear;

  const yearEpochMs = tempYearEpochMs.slice(MIN_YEAR - 1, MAX_YEAR);

  const bufferDay = 1;
  const minApproxDayFromStart = approxEpochDay(epochStart) - bufferDay;
  const epochMsAtStartOfMinYear = getJdeMillisAtEndOfYear(MIN_YEAR - 1) - jdeMillisAtStartOfCalendar + 1n;
  const minApproxDayFromYear = approxEpochDay(epochMsAtStartOfMinYear) - bufferDay;
  const minApproxDay = Math.min(minApproxDayFromStart, minApproxDayFromYear);
  const maxApproxDayFromEnd = approxEpochDay(epochEnd) + bufferDay;
  const maxApproxDay = maxApproxDayFromEnd;
  const MIN_DAY = minApproxDay;
  const MAX_DAY = maxApproxDay;

  const PRELOADED_CUM_NANOS = computeCumNanos(MIN_DAY);

  const epochMsAtStartOfRequiredYear = getJdeMillisAtEndOfYear(startYear - 1) - jdeMillisAtStartOfCalendar + 1n;

  const baryCenterPerihelionEpochMilliseconds = [];
  for (let year = MIN_YEAR - 1; year <= MAX_YEAR + 1; year++) {
    baryCenterPerihelionEpochMilliseconds.push(getJdeMillisForBaryCenterPerihelion(year) - jdeMillisAtStartOfCalendar);
  }

  const centurialIncreaseInNanos = 1700000n;
  const lengthOfMeanSolarDayAtYear5900InNanos = 86400002000000n;
  const increaseBetweenEpochAndYear5900InNanos = centurialIncreaseInNanos * 59n;
  const lengthOfMeanSolarDayAtEpochInNanos = lengthOfMeanSolarDayAtYear5900InNanos - increaseBetweenEpochAndYear5900InNanos;
  const dailyIncreaseInNanos = Number(centurialIncreaseInNanos) / (100 * 365.25);

  const dayEpochMs = [];
  let currentDay = MIN_DAY;
  let epochNanosOfCurrentMeanSolarDay = PRELOADED_CUM_NANOS;
  let iterationCount = 0;
  let skippedDays = 0;
  let zeroPushed = false;
  while (currentDay <= MAX_DAY) {
    iterationCount++;
    const lengthOfCurrentMeanSolarDayInNanos = Number(lengthOfMeanSolarDayAtEpochInNanos) + dailyIncreaseInNanos * (currentDay - 1);
    epochNanosOfCurrentMeanSolarDay += BigInt(Math.round(lengthOfCurrentMeanSolarDayInNanos));
    const epochMillisOfCurrentMeanSolarDay = epochNanosOfCurrentMeanSolarDay / 1000000n;

    let index = binarySearch(yearEpochMs, epochMillisOfCurrentMeanSolarDay);
    index = index >= 0 ? index : -index - 2;
    const epochMillisOfMostRecentSolstice = index < 0 ? 0n : yearEpochMs[index];

    index = binarySearch(baryCenterPerihelionEpochMilliseconds, epochMillisOfCurrentMeanSolarDay);
    index = index >= 0 ? index : -index - 2;
    const epochMillisOfMostRecentBaryCenterPerihelion = baryCenterPerihelionEpochMilliseconds[index];

    const millisSinceSolstice = Number(epochMillisOfCurrentMeanSolarDay - epochMillisOfMostRecentSolstice);
    const millisSincePerihelion = Number(epochMillisOfCurrentMeanSolarDay - epochMillisOfMostRecentBaryCenterPerihelion);

    const daysSinceSolstice = millisSinceSolstice / (1000 * 3600 * 24);
    const daysSincePerihelion = millisSincePerihelion / (1000 * 3600 * 24);

    const n = 360 / 365.24;
    const a = n * daysSinceSolstice;
    const b = a + 1.914 * Math.sin(toRadians(n * daysSincePerihelion));
    const c = (a - toDegrees(Math.atan(Math.tan(toRadians(b)) / Math.cos(toRadians(23.44))))) / 180;
    const eotMinutes = 720 * (c - Math.round(c));
    const eotMillis = Math.round(eotMinutes * 60 * 1000);

    const epochMillisOfCurrentTrueSolarDay = epochMillisOfCurrentMeanSolarDay - BigInt(eotMillis);

    let dayValue;
    if (epochMillisOfCurrentTrueSolarDay < epochMsAtStartOfRequiredYear) {
      dayValue = 0n;
    } else {
      dayValue = epochMillisOfCurrentTrueSolarDay;
    }

    if (dayValue !== 0n) {
      dayEpochMs.push(dayValue);
    } else if (!zeroPushed) {
      dayEpochMs.push(dayValue);
      zeroPushed = true;
    } else {
      skippedDays++;
    }
    currentDay++;
  }

  const data = {
    gregStartDate: new Date(unixStart).toISOString(),
    gregEndDate: new Date(unixEnd).toISOString(),
    minYear: MIN_YEAR,
    maxYear: MAX_YEAR,
    minDay: MIN_DAY - 1,
    maxDay: MAX_DAY,
    yearEpochMs: yearEpochMs.map((b) => b.toString()),
    dayEpochMs: dayEpochMs.map((b) => b.toString()),
    iterationCount: dayEpochMs.length,
  };

  return data;
}

if (typeof window !== "undefined") {
  window.precompute = precompute;
}
