// Lukashian Calendar JavaScript Implementation (Optimized for 2025–2035)

/*
 * Copyright (c) 2018-2025 (5918-5925 in Lukashian years)
 * All rights reserved.
 *
 * The Lukashian Calendar and The Lukashian Calendar Mechanism are registered
 * at the Benelux Office for Intellectual Property, registration number 120712.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright
 *    notice, the above registration notice, this list of conditions
 *    and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, the above registration notice, this list of conditions
 *    and the following disclaimer in the documentation and/or other materials
 *    provided with the distribution.
 * 3. All materials mentioning features or use of this software,
 *    the Lukashian Calendar or the underlying Lukashian Calendar Mechanism,
 *    with or without modification, must refer to the Calendar as "The
 *    Lukashian Calendar" and to the Calendar Mechanism as "The Lukashian
 *    Calendar Mechanism".
 * 4. Renaming of source code, binary form, the Lukashian Calendar or the
 *    Lukashian Calendar Mechanism, with or without modification, is explicitly
 *    disallowed. Any copies, extracts, code excerpts, forks, redistributions
 *    or translations into other languages of source code, binary form,
 *    the functional behaviour of the Lukashian Calendar as defined by source code or
 *    the functional behaviour of the Lukashian Calendar Mechanism as defined by source
 *    code, with or without modification, must refer to the Calendar
 *    as "The Lukashian Calendar" and to the Calendar Mechanism as "The
 *    Lukashian Calendar Mechanism".
 * 5. Any copies, extracts, code excerpts, forks, redistributions
 *    or translations into other languages of source code, binary form,
 *    the functional behaviour of the Lukashian Calendar as defined by source code or
 *    the functional behaviour of the Lukashian Calendar Mechanism as defined by source
 *    code, with or without modification, may not include modifications that
 *    change the functional behaviour of the Lukashian Calendar Mechanism as
 *    implemented by source code.
 *
 * THIS SOFTWARE IS PROVIDED BY COPYRIGHT HOLDER ''AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL COPYRIGHT HOLDER BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Constants for limited range
const MIN_YEAR = 5920;
const MAX_YEAR = 5940;
const MIN_DAY = 2163000;
const MAX_DAY = 2168000;
const PRELOADED_CUM_NANOS = 186883009855449753847n; // Cumulative nanos up to end of day (MIN_DAY - 1)

const BEEPS_PER_DAY = 10000;

const A = [485, 203, 199, 182, 156, 136, 77, 74, 70, 58, 52, 50, 45, 44, 29, 18, 17, 16, 14, 12, 12, 12, 9, 8];
const B = [
  324.96, 337.23, 342.08, 27.85, 73.14, 171.52, 222.54, 296.72, 243.58, 119.81, 297.17, 21.02, 247.54, 325.15, 60.93, 155.12, 288.79,
  198.04, 199.76, 95.39, 287.11, 320.81, 227.73, 15.45,
];
const C = [
  1934.136, 32964.467, 20.186, 445267.112, 45036.886, 22518.443, 65928.934, 3034.906, 9037.513, 33718.147, 150.678, 2281.226, 29929.562,
  31555.956, 4443.417, 67555.328, 4562.452, 62894.029, 31436.921, 14577.848, 31931.756, 34777.259, 1222.114, 16859.074,
];

const UNIX_EPOCH_OFFSET_MILLISECONDS = 185208761225352n;

const SECONDS_SINCE_1900_WITH_LEAP_SECOND = [
  2287785600n,
  2303683200n,
  2335219200n,
  2366755200n,
  2398291200n,
  2429913600n,
  2461449600n,
  2492985600n,
  2524521600n,
  2571782400n,
  2603318400n,
  2634854400n,
  2698012800n,
  2776982400n,
  2840140800n,
  2871676800n,
  2918937600n,
  2950473600n,
  2982009600n,
  3029443200n,
  3076704000n,
  3124137600n,
  3345062400n,
  3439756800n,
  3550089600n,
  3644697600n,
  3692217600n,
];

const UNIX_TIMESTAMPS_WITH_LEAP_SECOND = SECONDS_SINCE_1900_WITH_LEAP_SECOND.map((s) => (s - 2208988800n) * 1000n);

let yearEpochMilliseconds = null;
let dayEpochMilliseconds = null;
let lastIterationCount = 0;

function loadYearEpochMilliseconds() {
  if (yearEpochMilliseconds) return yearEpochMilliseconds;
  const jdeMillisAtStartOfCalendar = getJdeMillisAtEndOfYear(0);
  yearEpochMilliseconds = [];
  for (let year = MIN_YEAR; year <= MAX_YEAR; year++) {
    yearEpochMilliseconds.push(getJdeMillisAtEndOfYear(year) - jdeMillisAtStartOfCalendar);
  }
  return yearEpochMilliseconds;
}

function loadDayEpochMilliseconds() {
  if (dayEpochMilliseconds) return dayEpochMilliseconds;
  const yearEpochMs = loadYearEpochMilliseconds();
  const jdeMillisAtStartOfCalendar = getJdeMillisAtEndOfYear(0);
  const baryCenterPerihelionEpochMilliseconds = [];
  for (let year = MIN_YEAR - 2; year <= MAX_YEAR + 2; year++) {
    // Small buffer for safety
    baryCenterPerihelionEpochMilliseconds.push(getJdeMillisForBaryCenterPerihelion(year) - jdeMillisAtStartOfCalendar);
  }

  const centurialIncreaseInNanos = 1700000n;
  const dailyIncreaseInNanos = Number(centurialIncreaseInNanos) / (100 * 365.25);
  const lengthOfMeanSolarDayAtYear5900InNanos = 86400002000000n;
  const increaseBetweenEpochAndYear5900InNanos = centurialIncreaseInNanos * 59n;
  const lengthOfMeanSolarDayAtEpochInNanos = lengthOfMeanSolarDayAtYear5900InNanos - increaseBetweenEpochAndYear5900InNanos;

  const dayEpochMs = [];
  let currentDay = MIN_DAY;
  let epochNanosOfCurrentMeanSolarDay = PRELOADED_CUM_NANOS;
  const epochMillisOfEndOfFinalYear = yearEpochMs[yearEpochMs.length - 1];
  let iterationCount = 0;
  while (currentDay <= MAX_DAY) {
    // Limited loop (only ~5,000 iterations)
    iterationCount++;
    if (iterationCount % 1000 === 0) {
      console.log(`Processing day ${currentDay}, iteration ${iterationCount}`);
    }
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

    dayEpochMs.push(epochMillisOfCurrentTrueSolarDay);
    currentDay++;
  }
  lastIterationCount = iterationCount;
  dayEpochMilliseconds = dayEpochMs.map(BigInt);
  return dayEpochMilliseconds;
}

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

// Adjust for range offsets in key functions
function getYearForEpochMilliseconds(epochMilliseconds) {
  const yearEpochMs = loadYearEpochMilliseconds();
  let index = binarySearch(yearEpochMs, BigInt(epochMilliseconds));
  let relYear = index >= 0 ? index + 1 : -index;
  return MIN_YEAR + relYear - 1;
}

function getEpochDayForEpochMilliseconds(epochMilliseconds) {
  const dayEpochMs = loadDayEpochMilliseconds();
  let index = binarySearch(dayEpochMs, BigInt(epochMilliseconds));
  let relDay = index >= 0 ? index + 1 : -index;
  let epochDay = MIN_DAY + relDay - 1;
  // Optional: Bounds check
  if (BigInt(epochMilliseconds) < dayEpochMs[0] || BigInt(epochMilliseconds) > dayEpochMs[dayEpochMs.length - 1]) {
    throw new Error("Date outside supported range (2025–2035)");
  }
  return epochDay;
}

function getDayNumber(epochDay, year) {
  const yearEpochMs = loadYearEpochMilliseconds();
  const jdeMillisAtStartOfCalendar = getJdeMillisAtEndOfYear(0);
  const epochMillisecondsAtStartOfYear = getJdeMillisAtEndOfYear(year - 1) - jdeMillisAtStartOfCalendar + 1n;
  const runningEpochDayAtStartOfYear = getEpochDayForEpochMilliseconds(epochMillisecondsAtStartOfYear);
  const epochMillisecondsAtStartOfRunningDay =
    runningEpochDayAtStartOfYear === MIN_DAY ? 1n : dayEpochMilliseconds[runningEpochDayAtStartOfYear - MIN_DAY - 1] + 1n;
  const firstEpochDayOfYear =
    epochMillisecondsAtStartOfRunningDay < epochMillisecondsAtStartOfYear ? runningEpochDayAtStartOfYear + 1 : runningEpochDayAtStartOfYear;
  return epochDay - firstEpochDayOfYear + 1;
}

function getProportionOfDay(epochMilliseconds, epochDay) {
  const dayEpochMs = loadDayEpochMilliseconds();
  const millisecondsOfDay = epochDay === MIN_DAY ? dayEpochMs[0] : dayEpochMs[epochDay - MIN_DAY] - dayEpochMs[epochDay - MIN_DAY - 1];
  const millisecondsPassed = BigInt(epochMilliseconds) - (epochDay === MIN_DAY ? 1n : dayEpochMs[epochDay - MIN_DAY - 1] + 1n);
  return Number(millisecondsPassed) / Number(millisecondsOfDay);
}

function getBeeps(proportionOfDay) {
  return Math.floor(proportionOfDay * BEEPS_PER_DAY);
}

function format(year, day, beeps) {
  return `${String(beeps).padStart(4, "0")} ${String(day).padStart(3, "0")}-${year}`;
}

function getLukashianDatetime(unixEpoch) {
  const epochMs = getLukashianEpochMilliseconds(unixEpoch);
  const year = getYearForEpochMilliseconds(epochMs);
  const epochDay = getEpochDayForEpochMilliseconds(epochMs);
  const day = getDayNumber(epochDay, year);
  const proportionOfDay = getProportionOfDay(epochMs, epochDay);
  const beeps = getBeeps(proportionOfDay);
  const formattedString = format(year, day, beeps);

  // console.log("yearEpochMilliseconds", yearEpochMilliseconds, "dayEpochMilliseconds", dayEpochMilliseconds, "lastIterationCount", lastIterationCount);

  return { year, day, beep: beeps, formattedString, iterationCount: lastIterationCount };
}
