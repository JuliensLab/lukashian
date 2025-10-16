// lukashianExecute.js
// This file loads the precomputed JSON and uses it for calculations

let loadedData = null;

async function loadData() {
  try {
    const response = await fetch("lukashian_data.json?t=" + Date.now());
    if (!response.ok) throw new Error("File not found");
    const json = await response.json();
    loadedData = json;
    loadedData.yearEpochMilliseconds = loadedData.yearEpochMs.map(BigInt);
    loadedData.dayEpochMilliseconds = loadedData.dayEpochMs.map(BigInt);
    // console.log("Debug: loadedData loaded, dayEpochMs length =", loadedData.dayEpochMs.length);
    // console.log("Debug: dayEpochMs[0] =", loadedData.dayEpochMs[0]);
    // console.log("Debug: dayEpochMs[last] =", loadedData.dayEpochMs[loadedData.dayEpochMs.length - 1]);
  } catch (e) {
    console.warn("Failed to load precomputed data:", e.message);
    loadedData = null;
  }
}

function getYearForEpochMilliseconds(epochMilliseconds) {
  if (!loadedData) return null;
  const yearEpochMs = loadedData.yearEpochMilliseconds;
  const msBig = BigInt(epochMilliseconds);
  let index = binarySearch(yearEpochMs, msBig);
  let relYear = index >= 0 ? index + 1 : -index;
  let year = loadedData.minYear + relYear - 1;
  console.log("Debug: epochMilliseconds = ", epochMilliseconds.toString(), " index = ", index, "year =", year);
  if (year < loadedData.minYear || year > loadedData.maxYear) {
    console.log("Debug: Date outside supported range - year is out of range");
    return null;
  }
  return year;
}

function getEpochDayForEpochMilliseconds(epochMilliseconds) {
  if (!loadedData) return null;
  const dayEpochMs = loadedData.dayEpochMilliseconds;
  const msBig = BigInt(epochMilliseconds);
  let index = binarySearch(dayEpochMs, msBig);
  let relDay = index >= 0 ? index + 1 : -index;
  let epochDay = loadedData.minDay + relDay - 1;
  console.log("Debug: epochMilliseconds = ", epochMilliseconds.toString(), " index = ", index, "epochDay =", epochDay);
  if (msBig < dayEpochMs[0]) {
    console.log("Debug: Date outside supported range - msBig is before the range");
    // Graceful fallback: return null instead of throw
    return null;
  }
  return epochDay;
}

function getDayNumber(epochDay, year) {
  if (!loadedData || epochDay === null) return null;
  const jdeMillisAtStartOfCalendar = getJdeMillisAtEndOfYear(0);
  const epochMillisecondsAtStartOfYear = getJdeMillisAtEndOfYear(year - 1) - jdeMillisAtStartOfCalendar + 1n;
  const runningEpochDayAtStartOfYear = getEpochDayForEpochMilliseconds(epochMillisecondsAtStartOfYear);
  console.log(
    "Debug: jdeMillisAtStartOfCalendar =",
    jdeMillisAtStartOfCalendar.toString(),
    "epochMillisecondsAtStartOfYear =",
    epochMillisecondsAtStartOfYear.toString(),
    "runningEpochDayAtStartOfYear =",
    runningEpochDayAtStartOfYear
  );
  if (runningEpochDayAtStartOfYear === null) return null;
  const epochMillisecondsAtStartOfRunningDay =
    runningEpochDayAtStartOfYear === loadedData.minDay
      ? 1n
      : loadedData.dayEpochMilliseconds[runningEpochDayAtStartOfYear - loadedData.minDay - 1] + 1n;
  const firstEpochDayOfYear =
    epochMillisecondsAtStartOfRunningDay < epochMillisecondsAtStartOfYear ? runningEpochDayAtStartOfYear + 1 : runningEpochDayAtStartOfYear;
  return epochDay - firstEpochDayOfYear + 1;
}

function getProportionOfDay(epochMilliseconds, epochDay) {
  if (!loadedData || epochDay === null) return null;
  const dayEpochMs = loadedData.dayEpochMilliseconds;
  const relIndex = epochDay - loadedData.minDay;
  const millisecondsOfDay = relIndex === 0 ? dayEpochMs[0] : dayEpochMs[relIndex] - dayEpochMs[relIndex - 1];
  const millisecondsPassed = BigInt(epochMilliseconds) - (relIndex === 0 ? 1n : dayEpochMs[relIndex - 1] + 1n);
  return Number(millisecondsPassed) / Number(millisecondsOfDay);
}

function getBeeps(proportionOfDay) {
  return Math.floor(proportionOfDay * BEEPS_PER_DAY);
}

function format(year, day, beeps) {
  return `${String(beeps).padStart(4, "0")} ${String(day).padStart(3, "0")}-${year}`;
}

function getLukashianDatetime(unixEpoch) {
  console.log("");
  if (!loadedData) {
    return { year: 0, day: 0, beep: 0, formattedString: "No precomputed data available.", iterationCount: 0 };
  }
  const epochMs = getLukashianEpochMilliseconds(unixEpoch);
  console.log("Debug: getLukashianDatetime, epochMs =", epochMs.toString());
  const year = getYearForEpochMilliseconds(epochMs);
  const epochDay = getEpochDayForEpochMilliseconds(epochMs);
  console.log("Debug: epochMs =", epochMs.toString(), "year =", year, "epochDay =", epochDay);
  if (epochDay === null) {
    return { year: 0, day: 0, beep: 0, formattedString: "Date outside supported range.", iterationCount: loadedData.iterationCount };
  }
  const day = getDayNumber(epochDay, year);
  if (day === null) {
    return { year: 0, day: 0, beep: 0, formattedString: "Date outside supported range.", iterationCount: loadedData.iterationCount };
  }
  const proportionOfDay = getProportionOfDay(epochMs, epochDay);
  const beeps = getBeeps(proportionOfDay);
  const formattedString = format(year, day, beeps);

  return { year, day, beep: beeps, formattedString, iterationCount: loadedData.iterationCount };
}
