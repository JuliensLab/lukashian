const BEEPS_PER_DAY = 10000;

const UNIX_EPOCH_OFFSET_MILLISECONDS = 185208761225352n;

const A = [485, 203, 199, 182, 156, 136, 77, 74, 70, 58, 52, 50, 45, 44, 29, 18, 17, 16, 14, 12, 12, 12, 9, 8];
const B = [
  324.96, 337.23, 342.08, 27.85, 73.14, 171.52, 222.54, 296.72, 243.58, 119.81, 297.17, 21.02, 247.54, 325.15, 60.93, 155.12, 288.79,
  198.04, 199.76, 95.39, 287.11, 320.81, 227.73, 15.45,
];
const C = [
  1934.136, 32964.467, 20.186, 445267.112, 45036.886, 22518.443, 65928.934, 3034.906, 9037.513, 33718.147, 150.678, 2281.226, 29929.562,
  31555.956, 4443.417, 67555.328, 4562.452, 62894.029, 31436.921, 14577.848, 31931.756, 34777.259, 1222.114, 16859.074,
];

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
  const result = unix + BigInt(numberOfLeapSeconds * 1000) + UNIX_EPOCH_OFFSET_MILLISECONDS;

  return result;
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
