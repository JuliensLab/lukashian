<?php
// lukashianPrecompute.php
// This file computes the data and outputs it as JSON

const BEEPS_PER_DAY = 10000;

const UNIX_EPOCH_OFFSET_MILLISECONDS = '185208761225352';

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
  '2287785600',
  '2303683200',
  '2335219200',
  '2366755200',
  '2398291200',
  '2429913600',
  '2461449600',
  '2492985600',
  '2524521600',
  '2571782400',
  '2603318400',
  '2634854400',
  '2698012800',
  '2776982400',
  '2840140800',
  '2871676800',
  '2918937600',
  '2950473600',
  '2982009600',
  '3029443200',
  '3076704000',
  '3124137600',
  '3345062400',
  '3439756800',
  '3550089600',
  '3644697600',
  '3692217600',
];

$UNIX_TIMESTAMPS_WITH_LEAP_SECOND = array_map(function($s) {
  return bcmul(bcsub($s, '2208988800'), '1000');
}, SECONDS_SINCE_1900_WITH_LEAP_SECOND);

function toRadians($degrees) {
  return ($degrees * pi()) / 180;
}

function toDegrees($radians) {
  return ($radians * 180) / pi();
}

function binarySearch($arr, $target) {
  $low = 0;
  $high = count($arr) - 1;
  while ($low <= $high) {
    $mid = floor(($low + $high) / 2);
    $cmp = bccomp($arr[$mid], $target);
    if ($cmp < 0) {
      $low = $mid + 1;
    } elseif ($cmp > 0) {
      $high = $mid - 1;
    } else {
      return $mid;
    }
  }
  return -($low + 1);
}

function getLukashianEpochMilliseconds($unixEpochMilliseconds) {
  global $UNIX_TIMESTAMPS_WITH_LEAP_SECOND;
  $unix = $unixEpochMilliseconds;
  $index = binarySearch($UNIX_TIMESTAMPS_WITH_LEAP_SECOND, $unix);
  $numberOfLeapSeconds = $index >= 0 ? $index + 1 : -$index - 1;
  $result = bcadd(bcadd($unix, bcmul($numberOfLeapSeconds, '1000')), UNIX_EPOCH_OFFSET_MILLISECONDS);
  return $result;
}

function getJdeMillisAtEndOfYear($year) {
  if ($year < 4900) {
    $y = ($year - 3900) / 1000;
    $jde0 = 1721414.39987 + 365242.88257 * $y - 0.00769 * $y * $y - 0.00933 * $y * $y * $y - 0.00006 * $y * $y * $y * $y;
  } else {
    $y = ($year - 5900) / 1000;
    $jde0 = 2451900.05952 + 365242.74049 * $y - 0.06223 * $y * $y - 0.00823 * $y * $y * $y + 0.00032 * $y * $y * $y * $y;
  }

  $t = ($jde0 - 2451545.0) / 36525;
  $w = $t * 35999.373 - 2.47;
  $dL = 0.0334 * cos(toRadians($w)) + 0.0007 * cos(toRadians(2 * $w)) + 1;

  $s = 0;
  for ($i = 0; $i < 24; $i++) {
    $s += A[$i] * cos(toRadians(B[$i] + C[$i] * $t));
  }

  $jde = $jde0 + (0.00001 * $s) / $dL;
  return bcmul((string)$jde, '86400000'); // 24*3600*1000
}

function getJdeMillisForBaryCenterPerihelion($year) {
  $k = round(0.99997 * ($year - 5900.01));
  $jde = 2451547.507 + 365.2596358 * $k + 0.0000000156 * $k * $k;
  return bcmul((string)$jde, '86400000'); // 24*3600*1000
}

function approxEpochDay($epochMs) {
  $centurialIncreaseInNanos = '1700000';
  $lengthOfMeanSolarDayAtYear5900InNanos = '86400002000000';
  $increaseBetweenEpochAndYear5900InNanos = bcmul($centurialIncreaseInNanos, '59');
  $lengthOfMeanSolarDayAtEpochInNanos = bcsub($lengthOfMeanSolarDayAtYear5900InNanos, $increaseBetweenEpochAndYear5900InNanos);
  $dailyIncreaseInNanos = bcdiv($centurialIncreaseInNanos, bcmul('100', '365.25'));

  $L0_s = bcdiv($lengthOfMeanSolarDayAtEpochInNanos, '1000000000');
  $d_s = bcdiv($dailyIncreaseInNanos, '1000000000');
  $target_s = bcdiv($epochMs, '1000');

  $m = bcdiv($target_s, $L0_s);
  for ($i = 0; $i < 5; $i++) {
    $m = bcdiv($target_s, bcadd($L0_s, bcdiv(bcmul($d_s, bcsub($m, '1')), '2')));
  }
  return floor((float)$m);
}

function computeCumNanos($minDay) {
  $centurialIncreaseInNanos = '1700000';
  $lengthOfMeanSolarDayAtYear5900InNanos = '86400002000000';
  $increaseBetweenEpochAndYear5900InNanos = bcmul($centurialIncreaseInNanos, '59');
  $lengthOfMeanSolarDayAtEpochInNanos = bcsub($lengthOfMeanSolarDayAtYear5900InNanos, $increaseBetweenEpochAndYear5900InNanos);
  $dailyIncreaseInNanos = bcdiv($centurialIncreaseInNanos, bcmul('100', '365.25'));

  $epochNanos = '0';
  for ($k = 1; $k < $minDay; $k++) {
    $length = bcadd($lengthOfMeanSolarDayAtEpochInNanos, bcmul($dailyIncreaseInNanos, (string)($k - 1)));
    $epochNanos = bcadd($epochNanos, $length); // since round(length)
  }
  return $epochNanos;
}

function precompute($unixStart, $unixEnd) {
  $epochStart = getLukashianEpochMilliseconds($unixStart);
  $epochEnd = getLukashianEpochMilliseconds($unixEnd);

  $jdeMillisAtStartOfCalendar = getJdeMillisAtEndOfYear(0);

  $tempMinYear = 5900;
  $tempMaxYear = 6000;
  $tempYearEpochMs = [];
  for ($year = 1; $year <= $tempMaxYear; $year++) {
    $tempYearEpochMs[] = bcsub(getJdeMillisAtEndOfYear($year), $jdeMillisAtStartOfCalendar);
  }

  $index = binarySearch($tempYearEpochMs, $epochStart);
  $startYear = $index >= 0 ? $index + 1 : -$index;

  $index = binarySearch($tempYearEpochMs, $epochEnd);
  $endYear = $index >= 0 ? $index + 1 : -$index;

  $bufferYear = 1;
  $MIN_YEAR = $startYear - $bufferYear;
  $MAX_YEAR = $endYear + $bufferYear;

  $yearEpochMs = array_slice($tempYearEpochMs, $MIN_YEAR - 1, $MAX_YEAR - $MIN_YEAR + 1);

  $bufferDay = 1;
  $minApproxDayFromStart = approxEpochDay($epochStart) - $bufferDay;
  $epochMsAtStartOfMinYear = bcadd(bcsub(getJdeMillisAtEndOfYear($MIN_YEAR - 1), $jdeMillisAtStartOfCalendar), '1');
  $minApproxDayFromYear = approxEpochDay($epochMsAtStartOfMinYear) - $bufferDay;
  $minApproxDay = min($minApproxDayFromStart, $minApproxDayFromYear);
  $maxApproxDayFromEnd = approxEpochDay($epochEnd) + $bufferDay;
  $maxApproxDay = $maxApproxDayFromEnd;
  $MIN_DAY = $minApproxDay;
  $MAX_DAY = $maxApproxDay;

  $PRELOADED_CUM_NANOS = computeCumNanos($MIN_DAY);

  $epochMsAtStartOfRequiredYear = bcadd(bcsub(getJdeMillisAtEndOfYear($startYear - 1), $jdeMillisAtStartOfCalendar), '1');

  $baryCenterPerihelionEpochMilliseconds = [];
  for ($year = $MIN_YEAR - 1; $year <= $MAX_YEAR + 1; $year++) {
    $baryCenterPerihelionEpochMilliseconds[] = bcsub(getJdeMillisForBaryCenterPerihelion($year), $jdeMillisAtStartOfCalendar);
  }

  $centurialIncreaseInNanos = '1700000';
  $lengthOfMeanSolarDayAtYear5900InNanos = '86400002000000';
  $increaseBetweenEpochAndYear5900InNanos = bcmul($centurialIncreaseInNanos, '59');
  $lengthOfMeanSolarDayAtEpochInNanos = bcsub($lengthOfMeanSolarDayAtYear5900InNanos, $increaseBetweenEpochAndYear5900InNanos);
  $dailyIncreaseInNanos = bcdiv($centurialIncreaseInNanos, bcmul('100', '365.25'));

  $dayEpochMs = [];
  $startOfYearDayEpochMs = [];
  $currentDay = $MIN_DAY;
  $startOfYearMinDay = $MIN_DAY;
  $epochNanosOfCurrentMeanSolarDay = $PRELOADED_CUM_NANOS;
  $iterationCount = 0;
  $skippedDays = 0;
  $zeroPushed = false;
  $startOfYearPushes = 0;
  while ($currentDay <= $MAX_DAY) {
    $iterationCount++;
    $lengthOfCurrentMeanSolarDayInNanos = bcadd($lengthOfMeanSolarDayAtEpochInNanos, bcmul($dailyIncreaseInNanos, (string)($currentDay - 1)));
    $epochNanosOfCurrentMeanSolarDay = bcadd($epochNanosOfCurrentMeanSolarDay, $lengthOfCurrentMeanSolarDayInNanos); // round
    $epochMillisOfCurrentMeanSolarDay = bcdiv($epochNanosOfCurrentMeanSolarDay, '1000000');

    $index = binarySearch($yearEpochMs, $epochMillisOfCurrentMeanSolarDay);
    $index = $index >= 0 ? $index : -$index - 2;
    $epochMillisOfMostRecentSolstice = $index < 0 ? '0' : $yearEpochMs[$index];

    $index = binarySearch($baryCenterPerihelionEpochMilliseconds, $epochMillisOfCurrentMeanSolarDay);
    $index = $index >= 0 ? $index : -$index - 2;
    $epochMillisOfMostRecentBaryCenterPerihelion = $baryCenterPerihelionEpochMilliseconds[$index];

    $millisSinceSolstice = bcsub($epochMillisOfCurrentMeanSolarDay, $epochMillisOfMostRecentSolstice);
    $millisSincePerihelion = bcsub($epochMillisOfCurrentMeanSolarDay, $epochMillisOfMostRecentBaryCenterPerihelion);

    $daysSinceSolstice = bcdiv($millisSinceSolstice, '86400000'); // 1000*3600*24
    $daysSincePerihelion = bcdiv($millisSincePerihelion, '86400000');

    $n = 360 / 365.24;
    $a = $n * (float)$daysSinceSolstice;
    $b = $a + 1.914 * sin(toRadians($n * (float)$daysSincePerihelion));
    $c = (toDegrees(atan(tan(toRadians($b)) / cos(toRadians(23.44)))) - $a) / 180;
    $eotMinutes = 720 * ((float)$c - round((float)$c));
    $eotMillis = round($eotMinutes * 60 * 1000);

    $epochMillisOfCurrentTrueSolarDay = bcsub($epochMillisOfCurrentMeanSolarDay, (string)$eotMillis);

    $dayValue = bccomp($epochMillisOfCurrentTrueSolarDay, $epochMsAtStartOfRequiredYear) < 0 ? '0' : $epochMillisOfCurrentTrueSolarDay;

    if ($dayValue !== '0') {
      $dayEpochMs[] = $dayValue;
      if ($startOfYearPushes < 2) {
        $startOfYearDayEpochMs[] = $dayValue;
        $startOfYearPushes++;
      }
    } elseif (!$zeroPushed) {
      $dayEpochMs[] = $dayValue;
      if ($startOfYearPushes < 2) {
        $startOfYearDayEpochMs[] = $dayValue;
        $startOfYearPushes++;
      }
      $zeroPushed = true;
    } else {
      $skippedDays++;
    }
    $currentDay++;
  }

  $data = [
    'gregStartDate' => date('c', $unixStart / 1000),
    'gregEndDate' => date('c', $unixEnd / 1000),
    'minYear' => $MIN_YEAR,
    'maxYear' => $MAX_YEAR,
    'minDay' => $MIN_DAY - 1,
    'startOfYearMinDay' => $startOfYearMinDay - 1,
    'maxDay' => $MAX_DAY,
    'yearEpochMs' => $yearEpochMs,
    'startOfYearDayEpochMs' => $startOfYearDayEpochMs,
    'iterationCount' => count($dayEpochMs),
    'dayEpochMs' => $dayEpochMs,
  ];

  return $data;
}

// Main execution
header('Content-Type: application/json');

// Sanitize inputs
$startDate = isset($_GET['start']) ? $_GET['start'] : date('Y-m-d', strtotime('-1 day'));
$days = isset($_GET['days']) ? (int)$_GET['days'] : 30;

// Validate start date
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
  $startDate = date('Y-m-d', strtotime('-1 day'));
}

// Validate days
if ($days <= 0 || $days > 365) {
  $days = 30;
}

// Create cache directory if it doesn't exist
$cacheDir = __DIR__ . '/cache';
if (!is_dir($cacheDir)) {
  mkdir($cacheDir, 0755, true);
}

// Generate cache filename
$cacheFile = $cacheDir . '/start_' . $startDate . '_days_' . $days . '.json';

// Check if cached file exists and is not too old (optional, but since we clean up, maybe not necessary)
if (file_exists($cacheFile)) {
  echo file_get_contents($cacheFile);
} else {
  $unixStart = strtotime($startDate . ' 00:00:00') * 1000;
  $unixEnd = strtotime($startDate . ' +' . $days . ' days 00:00:00') * 1000;

  $data = precompute((string)$unixStart, (string)$unixEnd);

  $json = json_encode($data);
  file_put_contents($cacheFile, $json);
  echo $json;
}

// Clean up old cache files (>10 days)
$files = glob($cacheDir . '/*.json');
foreach ($files as $file) {
  if (filemtime($file) < time() - (10 * 24 * 60 * 60)) {
    unlink($file);
  }
}
?>