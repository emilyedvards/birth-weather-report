const GEOCODING_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
const ARCHIVE_API_URL = "https://archive-api.open-meteo.com/v1/archive";
const HOURLY_FIELDS = [
  "temperature_2m",
  "relative_humidity_2m",
  "precipitation",
  "rain",
  "snowfall",
  "cloud_cover",
  "wind_speed_10m",
  "weather_code"
];
const maritimeLines = {
  storm: [
    "The storm disrupted the status quo.",
    "A storm at arrival. Conditions shifted quickly."
  ],
  rain: [
    "The rain signaled a shift in conditions.",
    "The rain moved the air and reset the surface.",
    "The rain reset the air and the atmosphere around it."
  ],
  fog: [
    "Born into fog. Some paths take time to appear."
  ],
  wind: [
    "The wind set the direction.",
    "The wind moved everything that could be moved.",
    "The wind shifted what was settled.",
    "The wind decided the pace."
  ],
  overcast: [
    "The sky stayed sealed. Conditions endured.",
    "Born under cloud cover. The light stayed even.",
    "Born beneath a blanket of clouds. The day moved quietly."
  ],
  cloudy: [
    "The clouds moved in shifting layers.",
    "The sky suggested a change in motion.",
    "The clouds shifted as light shined through."
  ],
  clear: [
    "The air stood still.",
    "Calm held, briefly."
  ],
  snow: [
    "Snow quiets the surface.",
    "The cold slowed everything down.",
    "In snow, nothing moves without intention.",
    "Snow softens all edges.",
    "With snow, movement becomes deliberate."
  ]
};
const US_STATE_NAMES = {
  al: "Alabama",
  ak: "Alaska",
  az: "Arizona",
  ar: "Arkansas",
  ca: "California",
  co: "Colorado",
  ct: "Connecticut",
  de: "Delaware",
  fl: "Florida",
  ga: "Georgia",
  hi: "Hawaii",
  id: "Idaho",
  il: "Illinois",
  in: "Indiana",
  ia: "Iowa",
  ks: "Kansas",
  ky: "Kentucky",
  la: "Louisiana",
  me: "Maine",
  md: "Maryland",
  ma: "Massachusetts",
  mi: "Michigan",
  mn: "Minnesota",
  ms: "Mississippi",
  mo: "Missouri",
  mt: "Montana",
  ne: "Nebraska",
  nv: "Nevada",
  nh: "New Hampshire",
  nj: "New Jersey",
  nm: "New Mexico",
  ny: "New York",
  nc: "North Carolina",
  nd: "North Dakota",
  oh: "Ohio",
  ok: "Oklahoma",
  or: "Oregon",
  pa: "Pennsylvania",
  ri: "Rhode Island",
  sc: "South Carolina",
  sd: "South Dakota",
  tn: "Tennessee",
  tx: "Texas",
  ut: "Utah",
  vt: "Vermont",
  va: "Virginia",
  wa: "Washington",
  wv: "West Virginia",
  wi: "Wisconsin",
  wy: "Wyoming",
  dc: "District of Columbia"
};

const form = document.querySelector("#birthweather-form");
const inputDivider = document.querySelector("#input-divider");
const lookupTitle = document.querySelector("#lookup-title");
const progressSection = document.querySelector("#progress-section");
const progressLabel = document.querySelector("#progress-label");
const progressBar = document.querySelector("#progress-bar");
const resultSection = document.querySelector("#result");
const resultHeading = document.querySelector("#result-heading");
const resultStatus = document.querySelector("#result-status");
const weatherSummary = document.querySelector("#weather-summary");
const submitButton = document.querySelector(".submit-button");
const printButton = document.querySelector("#print-button");
const runAnotherButton = document.querySelector("#run-another-button");
const birthDateMask = document.querySelector("#birth-date-mask");
const birthTimeMask = document.querySelector("#birth-time-mask");
const meridiemButtons = [...document.querySelectorAll(".meridiem-button")];
let selectedMeridiem = "";
let progressTimer = null;
let progressValue = 0;
let currentReport = null;

const fields = {
  birthName: {
    input: document.querySelector("#birth-name"),
    error: document.querySelector("#birth-name-error"),
    label: "Name"
  },
  birthDate: {
    input: document.querySelector("#birth-date"),
    error: document.querySelector("#birth-date-error"),
    label: "Date of Birth"
  },
  birthTime: {
    input: document.querySelector("#birth-time"),
    error: document.querySelector("#birth-time-error"),
    label: "Time of Birth"
  },
  birthCity: {
    input: document.querySelector("#birth-city"),
    error: document.querySelector("#birth-city-error"),
    label: "City"
  },
  birthState: {
    input: document.querySelector("#birth-state"),
    error: document.querySelector("#birth-state-error"),
    label: "State"
  },
  birthCountry: {
    input: document.querySelector("#birth-country"),
    error: document.querySelector("#birth-country-error"),
    label: "Country"
  }
};

const summaryFields = {
  name: document.querySelector("#summary-name"),
  location: document.querySelector("#summary-location"),
  date: document.querySelector("#summary-date"),
  time: document.querySelector("#summary-time"),
  temperature: document.querySelector("#summary-temperature"),
  cloudCover: document.querySelector("#summary-cloud-cover"),
  humidity: document.querySelector("#summary-humidity"),
  windSpeed: document.querySelector("#summary-wind-speed"),
  precipitation: document.querySelector("#summary-precipitation"),
  maritimeLine: document.querySelector("#summary-maritime-line")
};

function getFormValues() {
  const values = Object.fromEntries(
    Object.entries(fields).map(([name, field]) => [name, field.input.value.trim()])
  );

  values.birthMeridiem = selectedMeridiem;
  values.birthTimeWithMeridiem = [values.birthTime, selectedMeridiem].filter(Boolean).join(" ");
  return values;
}

function convertDateToIso(dateValue) {
  const match = dateValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const month = Number(match[1]);
  const day = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseBirthTime(timeValue) {
  const match = timeValue.trim().match(/^(\d{1,2}):(\d{2})\s*([ap]m)?$/i);

  if (!match) {
    return null;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3] ? match[3].toLowerCase() : "";

  if (minute > 59) {
    return null;
  }

  if (meridiem) {
    if (hour > 12) {
      return null;
    }

    if (hour === 12) {
      hour = 0;
    }

    if (meridiem === "pm") {
      hour += 12;
    }
  } else if (hour > 23) {
    return null;
  }

  return {
    hour,
    minute,
    display: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
  };
}

function formatTimeInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  let formatted = digits;

  if (digits.length > 2) {
    formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
  }

  return formatted;
}

function formatDateInput(value) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  const parts = [];

  if (digits.length > 0) {
    parts.push(digits.slice(0, 2));
  }

  if (digits.length > 2) {
    parts.push(digits.slice(2, 4));
  }

  if (digits.length > 4) {
    parts.push(digits.slice(4, 8));
  }

  return parts.join("/");
}

function updateDateMask(value) {
  updateInputMask(birthDateMask, "MM/DD/YYYY", value);
}

function updateTimeMask(value) {
  const mask = "00:00";
  const visibleMask = mask
    .split("")
    .map((character, index) => {
      if (character === ":") {
        return ":";
      }

      return index < value.length ? " " : character;
    })
    .join("");

  birthTimeMask.textContent = visibleMask;
}

function updateInputMask(maskElement, mask, value) {
  const visibleMask = mask
    .split("")
    .map((character, index) => (index < value.length ? " " : character))
    .join("");

  maskElement.textContent = visibleMask;
}

function validate(values) {
  const errors = Object.fromEntries(
    Object.entries(fields).map(([name, field]) => {
      const value = values[name];
      const message = value ? "" : `Please enter ${fields[name].label}.`;
      return [name, message];
    })
  );

  if (values.birthDate && !convertDateToIso(values.birthDate)) {
    errors.birthDate = "Use MM/DD/YYYY.";
  }

  if (values.birthTime && !parseBirthTime(values.birthTimeWithMeridiem)) {
    errors.birthTime = "Use HH:MM AM/PM or 24-hour time.";
  }

  if (values.birthTime && !values.birthMeridiem) {
    errors.birthTime = "Choose AM or PM.";
  }

  return errors;
}

function showErrors(errors) {
  Object.entries(errors).forEach(([name, message]) => {
    fields[name].error.textContent = message;
    fields[name].input.setAttribute("aria-invalid", message ? "true" : "false");
  });
}

function hasErrors(errors) {
  return Object.values(errors).some(Boolean);
}

function focusFirstError(errors) {
  const firstErrorName = Object.keys(errors).find((name) => errors[name]);

  if (firstErrorName) {
    fields[firstErrorName].input.focus();
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "LOOKING UP..." : "RUN REPORT";
}

function setProgress(value) {
  progressValue = Math.max(0, Math.min(100, Math.round(value)));
  progressLabel.textContent = `GENERATING REPORT ${progressValue}%`;
  progressBar.style.width = `${progressValue}%`;
}

function startProgress() {
  inputDivider.hidden = true;
  lookupTitle.hidden = true;
  form.hidden = true;
  resultSection.hidden = true;
  progressSection.hidden = false;
  setProgress(0);

  window.clearInterval(progressTimer);
  progressTimer = window.setInterval(() => {
    if (progressValue < 92) {
      setProgress(progressValue + Math.max(1, Math.round((92 - progressValue) * 0.08)));
    }
  }, 180);
}

function finishProgress() {
  return new Promise((resolve) => {
    window.clearInterval(progressTimer);
    setProgress(100);
    window.setTimeout(() => {
      progressSection.hidden = true;
      resolve();
    }, 350);
  });
}

function stopProgress() {
  window.clearInterval(progressTimer);
  progressSection.hidden = true;
  inputDivider.hidden = false;
  lookupTitle.hidden = false;
  form.hidden = false;
}

function showStatus(heading, message, showList = false) {
  resultHeading.textContent = heading;
  resultStatus.textContent = message;
  weatherSummary.hidden = !showList;
  resultSection.hidden = false;
}

function buildLocationText(location) {
  return [location.name, location.admin1, location.country].filter(Boolean).join(", ");
}

function normalizeText(value) {
  return value.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

function normalizeRegion(value) {
  const normalized = normalizeText(value);
  return US_STATE_NAMES[normalized] ? normalizeText(US_STATE_NAMES[normalized]) : normalized;
}

function buildGeocodingUrl(locationName, count = "10") {
  const url = new URL(GEOCODING_API_URL);
  url.search = new URLSearchParams({
    name: locationName,
    count,
    language: "en",
    format: "json"
  }).toString();
  return url;
}

function getLocationSearch(values) {
  return {
    city: values.birthCity,
    region: values.birthState,
    country: values.birthCountry,
    terms: [
      [values.birthCity, values.birthState, values.birthCountry].filter(Boolean).join(", "),
      values.birthCity
    ]
  };
}

function buildArchiveUrl(location, isoDate) {
  const url = new URL(ARCHIVE_API_URL);
  url.search = new URLSearchParams({
    latitude: location.latitude,
    longitude: location.longitude,
    start_date: isoDate,
    end_date: isoDate,
    hourly: HOURLY_FIELDS.join(","),
    temperature_unit: "fahrenheit",
    wind_speed_unit: "mph",
    precipitation_unit: "inch",
    timezone: "auto"
  }).toString();
  return url;
}

async function fetchJson(url, fallbackMessage) {
  let response;

  try {
    response = await fetch(url);
  } catch (error) {
    throw new Error(`${fallbackMessage} Check your internet connection and reload the page.`);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.reason || fallbackMessage);
  }

  return data;
}

async function geocodeLocation(values) {
  const search = getLocationSearch(values);
  let results = [];

  for (const term of search.terms) {
    const data = await fetchJson(buildGeocodingUrl(term), "Location lookup failed.");

    if (data.results && data.results.length > 0) {
      results = data.results;
      break;
    }
  }

  if (results.length === 0) {
    throw new Error(`No matching location found for ${search.city}, ${search.region}, ${search.country}.`);
  }

  const requestedRegion = normalizeRegion(search.region);
  const requestedCountry = normalizeText(search.country);
  const countryMatches = requestedCountry
    ? results.filter((item) => normalizeText(item.country || "") === requestedCountry)
    : results;
  const searchableResults = countryMatches.length > 0 ? countryMatches : results;
  const result = requestedRegion
    ? searchableResults.find((item) => normalizeRegion(item.admin1 || "") === requestedRegion)
    : searchableResults[0];

  if (!result) {
    const availableRegions = results.map((item) => item.admin1).filter(Boolean).join(", ");
    throw new Error(`No ${search.city} result found in ${search.region}, ${search.country}. Found: ${availableRegions}.`);
  }

  return {
    latitude: result.latitude,
    longitude: result.longitude,
    name: result.name,
    admin1: result.admin1,
    country: result.country,
    timezone: result.timezone
  };
}

async function fetchHistoricalWeather(location, isoDate) {
  const data = await fetchJson(buildArchiveUrl(location, isoDate), "Weather lookup failed.");

  if (!data.hourly || !Array.isArray(data.hourly.time) || data.hourly.time.length === 0) {
    throw new Error("No hourly weather data found for that date.");
  }

  return data.hourly;
}

function getMinutesFromHourlyTime(hourlyTime) {
  const timePart = hourlyTime.split("T")[1] || "00:00";
  const [hour, minute] = timePart.split(":").map(Number);
  return hour * 60 + minute;
}

function findClosestHourlyRecord(hourly, birthTime) {
  const targetMinutes = birthTime.hour * 60 + birthTime.minute;
  let closestIndex = 0;
  let closestDifference = Infinity;

  hourly.time.forEach((time, index) => {
    const difference = Math.abs(getMinutesFromHourlyTime(time) - targetMinutes);

    if (difference < closestDifference) {
      closestIndex = index;
      closestDifference = difference;
    }
  });

  return {
    time: hourly.time[closestIndex],
    temperature: hourly.temperature_2m?.[closestIndex],
    humidity: hourly.relative_humidity_2m?.[closestIndex],
    precipitation: hourly.precipitation?.[closestIndex],
    rain: hourly.rain?.[closestIndex],
    snowfall: hourly.snowfall?.[closestIndex],
    cloudCover: hourly.cloud_cover?.[closestIndex],
    windSpeed: hourly.wind_speed_10m?.[closestIndex],
    weatherCode: hourly.weather_code?.[closestIndex]
  };
}

function formatWeatherTime(hourlyTime) {
  const timePart = hourlyTime.split("T")[1] || "";
  return timePart || "Unavailable";
}

function formatDisplayDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return new Intl.DateTimeFormat("en", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function formatDisplayTime(hourlyTime) {
  const timePart = formatWeatherTime(hourlyTime);
  const [hourValue, minuteValue] = timePart.split(":").map(Number);

  if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
    return "Unavailable";
  }

  const period = hourValue >= 12 ? "PM" : "AM";
  const hour = hourValue % 12 || 12;
  return `${hour}:${String(minuteValue).padStart(2, "0")} ${period}`;
}

function describeTemperature(value) {
  if (value === null || value === undefined) {
    return "Temperature unavailable";
  }

  if (value > 90) {
    return "Hot";
  }

  if (value >= 75) {
    return "Warm";
  }

  if (value >= 60) {
    return "Mild";
  }

  if (value >= 45) {
    return "Cool";
  }

  return "Cold";
}

function describeCloudCover(value) {
  if (value === null || value === undefined) {
    return "Sky cover unavailable";
  }

  if (value <= 20) {
    return "Clear skies";
  }

  if (value <= 50) {
    return "Partly cloudy skies";
  }

  if (value <= 80) {
    return "Mostly cloudy skies";
  }

  return "Overcast skies";
}

function describeHumidity(value) {
  if (value === null || value === undefined) {
    return "Humidity unavailable";
  }

  if (value > 85) {
    return "Very humid";
  }

  if (value >= 60) {
    return "Humid";
  }

  if (value >= 30) {
    return "Moderate humidity";
  }

  return "Dry air";
}

function describeWindSpeed(value) {
  if (value === null || value === undefined) {
    return "Wind unavailable";
  }

  if (value < 3) {
    return "Still air";
  }

  if (value <= 10) {
    return "Light wind";
  }

  if (value <= 20) {
    return "Steady wind";
  }

  return "Strong wind";
}

function describePrecipitation(record) {
  if (record.rain > 0) {
    return "Rain present";
  }

  if (record.snowfall > 0) {
    return "Snow present";
  }

  return "No precipitation recorded";
}

function isThunderstormCode(code) {
  return [95, 96, 99].includes(code);
}

function getMaritimeLine(weather) {
  let condition = "clear";

  if (weather.rain > 0) {
    condition = "rain";
  } else if (weather.snowfall > 0) {
    condition = "snow";
  } else if (isThunderstormCode(weather.weatherCode)) {
    condition = "storm";
  } else if (weather.windSpeed > 15) {
    condition = "wind";
  } else if (weather.cloudCover > 80) {
    condition = "overcast";
  } else if (weather.cloudCover >= 50 && weather.cloudCover <= 80) {
    condition = "cloudy";
  } else if (weather.cloudCover < 20) {
    condition = "clear";
  }

  const lines = maritimeLines[condition] || maritimeLines.clear;
  return lines[Math.floor(Math.random() * lines.length)];
}

function showWeatherResult({ values, location, isoDate, record, birthTime }) {
  const locationText = buildLocationText(location);
  const summaryTemperature =
    record.temperature === null || record.temperature === undefined
      ? "Temperature unavailable"
      : `${Math.round(Number(record.temperature))} F - ${describeTemperature(record.temperature)}`;
  const report = {
    title: "Birth Weather Report",
    name: values.birthName,
    location: locationText,
    date: formatDisplayDate(isoDate),
    time: formatDisplayTime(`${isoDate}T${birthTime.display}`),
    temperature: summaryTemperature,
    cloudCover: describeCloudCover(record.cloudCover),
    humidity: describeHumidity(record.humidity),
    windSpeed: describeWindSpeed(record.windSpeed),
    precipitation: describePrecipitation(record),
    maritimeLine: getMaritimeLine(record)
  };

  currentReport = report;
  summaryFields.name.textContent = report.name;
  summaryFields.location.textContent = report.location;
  summaryFields.date.textContent = report.date;
  summaryFields.time.textContent = report.time;
  summaryFields.temperature.textContent = report.temperature;
  summaryFields.cloudCover.textContent = report.cloudCover;
  summaryFields.humidity.textContent = report.humidity;
  summaryFields.windSpeed.textContent = report.windSpeed;
  summaryFields.precipitation.textContent = report.precipitation;
  summaryFields.maritimeLine.textContent = report.maritimeLine;

  showStatus("RESULT", "", true);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildPrintableReport(report) {
  const lines = [
    report.title,
    "",
    report.name,
    report.location,
    report.date,
    report.time,
    "",
    report.temperature,
    report.cloudCover,
    report.humidity,
    report.windSpeed,
    report.precipitation,
    "",
    report.maritimeLine
  ];

  return lines.map(escapeHtml).join("\n");
}

function printReport() {
  if (!currentReport) {
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    showStatus("ERROR", "Allow pop-ups to print the report.");
    return;
  }

  printWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Birthweather Report</title>
    <style>
      body {
        margin: 48px;
        color: #073bff;
        background: #ffffff;
        font-family: "Courier New", Courier, monospace;
        font-size: 12pt;
        line-height: 1.35;
      }

      pre {
        margin: 0;
        white-space: pre-wrap;
      }

      @media print {
        body {
          margin: 0.5in;
        }
      }
    </style>
  </head>
  <body>
    <pre>${buildPrintableReport(currentReport)}</pre>
    <script>
      window.addEventListener("load", () => {
        window.print();
      });
    <\/script>
  </body>
</html>`);
  printWindow.document.close();
}

function runAnother() {
  currentReport = null;
  resultSection.hidden = true;
  weatherSummary.hidden = true;
  resultStatus.textContent = "";
  inputDivider.hidden = false;
  lookupTitle.hidden = false;
  form.hidden = false;
  form.reset();
  selectedMeridiem = "";
  meridiemButtons.forEach((button) => {
    button.setAttribute("aria-pressed", "false");
  });
  Object.values(fields).forEach((field) => {
    field.error.textContent = "";
    field.input.setAttribute("aria-invalid", "false");
  });
  updateDateMask("");
  updateTimeMask("");
  fields.birthName.input.focus();
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const values = getFormValues();
  const errors = validate(values);

  showErrors(errors);

  if (hasErrors(errors)) {
    resultSection.hidden = true;
    focusFirstError(errors);
    return;
  }

  const isoDate = convertDateToIso(values.birthDate);
  const birthTime = parseBirthTime(values.birthTimeWithMeridiem);

  setLoading(true);
  startProgress();

  try {
    const location = await geocodeLocation(values);
    const hourly = await fetchHistoricalWeather(location, isoDate);
    const record = findClosestHourlyRecord(hourly, birthTime);

    await finishProgress();
    showWeatherResult({ values, location, isoDate, record, birthTime });
  } catch (error) {
    stopProgress();
    showStatus("ERROR", error.message || "Weather lookup failed.");
  } finally {
    setLoading(false);
  }
});

Object.entries(fields).forEach(([name, field]) => {
  if (name === "birthDate") {
    field.input.addEventListener("paste", (event) => {
      event.preventDefault();
      const pastedText = event.clipboardData.getData("text");
      field.input.value = formatDateInput(pastedText);
      field.input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  field.input.addEventListener("input", () => {
    if (name === "birthDate") {
      field.input.value = formatDateInput(field.input.value);
      updateDateMask(field.input.value);
    }

    if (name === "birthTime") {
      field.input.value = formatTimeInput(field.input.value);
      updateTimeMask(field.input.value);
    }

    const values = getFormValues();
    const errors = validate(values);

    if (field.input.getAttribute("aria-invalid") === "true" && !errors[name]) {
      field.error.textContent = "";
      field.input.setAttribute("aria-invalid", "false");
    }
  });
});

updateDateMask(fields.birthDate.input.value);
updateTimeMask(fields.birthTime.input.value);

meridiemButtons.forEach((button) => {
  button.addEventListener("click", () => {
    selectedMeridiem = button.dataset.meridiem;

    meridiemButtons.forEach((item) => {
      item.setAttribute("aria-pressed", item === button ? "true" : "false");
    });

    if (fields.birthTime.input.getAttribute("aria-invalid") === "true") {
      const values = getFormValues();
      const errors = validate(values);
      fields.birthTime.error.textContent = errors.birthTime;
      fields.birthTime.input.setAttribute("aria-invalid", errors.birthTime ? "true" : "false");
    }
  });
});

printButton.addEventListener("click", printReport);
runAnotherButton.addEventListener("click", runAnother);
