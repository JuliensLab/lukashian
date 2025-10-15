// lukashianExecute.js
// This file loads the precomputed JSON and uses it for calculations

let loadedData = null;

async function loadData() {
  try {
    const response = await fetch("lukashian_data.json");
    const json = await response.json();
    loadedData = json;
    loadedData.yearEpochMilliseconds = loadedData.yearEpochMs.map(BigInt);
    loadedData.dayEpochMilliseconds = loadedData.dayEpochMs.map(BigInt);
  } catch (e) {
    console.error("Failed to load precomputed data:", e);
    loadedData = null;
  }
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

function getYearForEpochMilliseconds(epochMilliseconds) {
  if (!loadedData) return null;
  const yearEpochMs = loadedData.yearEpochMilliseconds;
  let index = binarySearch(yearEpochMs, BigInt(epochMilliseconds));
  let relYear = index >= 0 ? index + 1 : -index;
  return loadedData.minYear + relYear - 1;
}

function getEpochDayForEpochMilliseconds(epochMilliseconds) {
  if (!loadedData) return null;
  const dayEpochMs = loadedData.dayEpochMilliseconds;
  let index = binarySearch(dayEpochMs, BigInt(epochMilliseconds));
  let relDay = index >= 0 ? index + 1 : -index;
  let epochDay = loadedData.minDay + relDay - 1;
  if (BigInt(epochMilliseconds) < dayEpochMs[0] || BigInt(epochMilliseconds) > dayEpochMs[dayEpochMs.length - 1]) {
    throw new Error("Date outside supported range");
  }
  return epochDay;
}

function getDayNumber(epochDay, year) {
  if (!loadedData) return null;
  const yearEpochMs = loadedData.yearEpochMilliseconds;
  const jdeMillisAtStartOfCalendar = getJdeMillisAtEndOfYear(0); // Still need this, but it's lightweight
  const epochMillisecondsAtStartOfYear = getJdeMillisAtEndOfYear(year - 1) - jdeMillisAtStartOfCalendar + 1n;
  const runningEpochDayAtStartOfYear = getEpochDayForEpochMilliseconds(epochMillisecondsAtStartOfYear);
  const epochMillisecondsAtStartOfRunningDay =
    runningEpochDayAtStartOfYear === loadedData.minDay
      ? 1n
      : loadedData.dayEpochMilliseconds[runningEpochDayAtStartOfYear - loadedData.minDay - 1] + 1n;
  const firstEpochDayOfYear =
    epochMillisecondsAtStartOfRunningDay < epochMillisecondsAtStartOfYear ? runningEpochDayAtStartOfYear + 1 : runningEpochDayAtStartOfYear;
  return epochDay - firstEpochDayOfYear + 1;
}

function getProportionOfDay(epochMilliseconds, epochDay) {
  if (!loadedData) return null;
  const dayEpochMs = loadedData.dayEpochMilliseconds;
  const millisecondsOfDay =
    epochDay === loadedData.minDay
      ? dayEpochMs[0]
      : dayEpochMs[epochDay - loadedData.minDay] - dayEpochMs[epochDay - loadedData.minDay - 1];
  const millisecondsPassed =
    BigInt(epochMilliseconds) - (epochDay === loadedData.minDay ? 1n : dayEpochMs[epochDay - loadedData.minDay - 1] + 1n);
  return Number(millisecondsPassed) / Number(millisecondsOfDay);
}

function getBeeps(proportionOfDay) {
  return Math.floor(proportionOfDay * BEEPS_PER_DAY);
}

function format(year, day, beeps) {
  return `${String(beeps).padStart(4, "0")} ${String(day).padStart(3, "0")}-${year}`;
}

function getLukashianDatetime(unixEpoch) {
  if (!loadedData) {
    return {
      year: 0,
      day: 0,
      beep: 0,
      formattedString: "No precomputed data available. Please precompute and save the JSON file.",
      iterationCount: 0,
    };
  }
  const epochMs = getLukashianEpochMilliseconds(unixEpoch);
  const year = getYearForEpochMilliseconds(epochMs);
  const epochDay = getEpochDayForEpochMilliseconds(epochMs);
  const day = getDayNumber(epochDay, year);
  const proportionOfDay = getProportionOfDay(epochMs, epochDay);
  const beeps = getBeeps(proportionOfDay);
  const formattedString = format(year, day, beeps);

  return { year, day, beep: beeps, formattedString, iterationCount: loadedData.iterationCount };
}

// Note: getJdeMillisAtEndOfYear is still needed for getDayNumber, but since it's called rarely and lightweight, it's kept here.
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

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

function toDegrees(radians) {
  return (radians * 180) / Math.PI;
}
