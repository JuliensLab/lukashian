This is a quick and dirty JS implementation of The Lukashian Calendar [lukashian.org](https://www.lukashian.org)

lukashianPrecompute.js computes the year and day values based on input date range
index.html lets the user select a date range to precompute. lukashian_data.json is created, and needs to be saved alongside lukashianExecute.js for further use.
index.html loads lukashian_data.json, and if available, computes the current date using lukashianExecute.js
lukashianExecute.js uses precomputed year/day values to compute the date given an UNIX epoch
