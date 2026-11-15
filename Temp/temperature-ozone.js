const DATA_URL = "../processed-data/global-temperature-annual.json";
const FALLBACK_OZONE = {
  years: [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024, 2025, 2026],
  ozone: { unit: "%", series: [2, 1, -3, -6, -8, -9, -7, -5, -4, -2, -1.5, -1], locations: [{name:"Arctic",lat:75,lng:15,value:-6},{name:"North America",lat:45,lng:-100,value:-4},{name:"Europe",lat:52,lng:15,value:-5},{name:"Asia",lat:38,lng:85,value:-4},{name:"Antarctica",lat:-78,lng:0,value:-18}] }
};
const FALLBACK_DATA = {
  years: [2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016],
  temperature: { unit: "°C", series: [14.925, 15.395, 15.314, 15.324, 15.312, 15.201, 15.326, 15.226, 15.554, 15.17, 15.423, 15.491, 15.632, 15.591, 16.107], locations: [{name:"Global Average",lat:0,lng:0,value:16.107},{name:"Europe",lat:50,lng:10,value:16.507},{name:"North America",lat:40,lng:-100,value:16.307},{name:"Asia",lat:35,lng:100,value:16.407},{name:"Africa",lat:0,lng:20,value:16.207},{name:"Australia",lat:-25,lng:135,value:16.307}] },
  ozone: FALLBACK_OZONE.ozone
};
const $ = (id) => document.getElementById(id);
const format = (value, unit) => `${value > 0 ? "+" : ""}${value.toFixed(2)}${unit}`;
const colors = (type, value) => type === "temperature" ? (value > 16 ? "#d95738" : value > 15.5 ? "#eb8b61" : value > 15 ? "#e5bd87" : "#62aaa1") : (value < -12 ? "#8d5b9b" : value < -6 ? "#b7779a" : value < -3 ? "#d2a78d" : "#8cc4b0");
const maps = {};
const charts = {};
const state = { data: null, tempSliderReady: false };

function computeDeltaSeries(series) {
  const first = series[0];
  return series.map((value) => Number((value - first).toFixed(3)));
}

function computeRollingAverage(series, windowSize = 3) {
  return series.map((_, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(series.length, index + Math.ceil(windowSize / 2));
    const slice = series.slice(start, end);
    return Number((slice.reduce((sum, value) => sum + value, 0) / slice.length).toFixed(3));
  });
}

function normalizeTemperatureData(rawData) {
  if (!rawData?.years?.length || !rawData?.signals?.temperature?.series) {
    throw new Error("Temperature dataset missing required years or temperature series.");
  }

  const tempSeries = rawData.signals.temperature.series.map((value) => Number(value));
  const normalized = {
    years: rawData.years.map(Number),
    temperature: {
      unit: rawData.signals.temperature.unit || "°C",
      series: tempSeries,
      locations: (rawData.signals.temperature.locations || [
        { name: "Global Average", lat: 0, lng: 0, value: tempSeries[tempSeries.length - 1] }
      ]).map((point) => ({
        name: point.name || "Global Average",
        lat: Number(point.lat),
        lng: Number(point.lng),
        value: Number(point.value)
      }))
    },
    ozone: FALLBACK_OZONE.ozone
  };

  return normalized;
}

async function loadData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Temperature data request failed (${response.status})`);
    return normalizeTemperatureData(await response.json());
  } catch (error) {
    console.warn("Using embedded temperature fallback data:", error.message);
    return FALLBACK_DATA;
  }
}

function createMap(id, type) {
  const map = L.map(id, { zoomControl: false, attributionControl: false, minZoom: 1.5, maxZoom: 4 }).setView([18, 8], 1.5);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", { maxZoom: 5 }).addTo(map);
  maps[type] = { map, markers: state.data[type].locations.map((point) => L.circleMarker([point.lat, point.lng], { radius: 11 + Math.abs(point.value) * .1, color: colors(type, point.value), fillColor: colors(type, point.value), fillOpacity: .72, weight: 1 }).addTo(map)) };
}

function createChart(id, type) {
  const color = type === "temperature" ? "#e45d3c" : "#167c79";
  charts[type] = new Chart($(id), {
    type: "line",
    data: {
      labels: state.data.years,
      datasets: [{ data: state.data[type].series, borderColor: color, backgroundColor: type === "temperature" ? "rgba(228,93,60,.1)" : "rgba(22,124,121,.1)", borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, fill: true, tension: .35 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        tooltip: { displayColors: false, callbacks: { label: (context) => ` ${format(context.raw, state.data[type].unit)}` } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } },
        y: { grid: { color: "#edf0eb" } }
      }
    }
  });
}

function createExtraCharts() {
  const deltaSeries = computeDeltaSeries(state.data.temperature.series);
  const rollingSeries = computeRollingAverage(state.data.temperature.series, 3);

  charts.delta = new Chart($("deltaChart"), {
    type: "bar",
    data: {
      labels: state.data.years,
      datasets: [{
        data: deltaSeries,
        backgroundColor: deltaSeries.map((value) => value >= 0 ? "rgba(228,93,60,0.8)" : "rgba(22,124,121,0.7)"),
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });

  charts.rolling = new Chart($("rollingChart"), {
    type: "line",
    data: {
      labels: state.data.years,
      datasets: [{
        data: rollingSeries,
        borderColor: "#167c79",
        backgroundColor: "rgba(22,124,121,0.08)",
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: .35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: { display: false }
      }
    }
  });
}

function setRangeInputs() {
  const tempYear = $("tempYear");
  const tempMin = state.data.years[0];
  const tempMax = state.data.years[state.data.years.length - 1];

  tempYear.min = String(tempMin);
  tempYear.max = String(tempMax);
  tempYear.value = String(tempMax);

  $("tempSliderYear").textContent = String(tempMax);
  $("tempMapYear").textContent = String(tempMax);
}

function setYear(type, year, prefix) {
  const index = state.data.years.reduce((closest, current, i) => Math.abs(current - year) < Math.abs(state.data.years[closest] - year) ? i : closest, 0);
  const value = state.data[type].series[index];
  const actualYear = state.data.years[index];

  $(`${prefix}Metric`).textContent = format(value, state.data[type].unit);
  $(`${prefix}ChartValue`).textContent = `${actualYear}  ${format(value, state.data[type].unit)}`;
  $(`${prefix}MapYear`).textContent = actualYear;
  $(`${prefix}SliderYear`).textContent = actualYear;

  if (charts[type]) {
    charts[type].setActiveElements([{ datasetIndex: 0, index }]);
    charts[type].update("none");
  }
}

function setTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  $("themeToggle").setAttribute("aria-pressed", String(isDark));
  localStorage.setItem("trend-detective-theme", isDark ? "dark" : "light");
  Object.values(maps).forEach(({ map }) => setTimeout(() => map.invalidateSize(), 50));
}

function bindEvents() {
  $("tempYear").addEventListener("input", (event) => setYear("temperature", Number(event.target.value), "temp"));
  $("ozoneYear").addEventListener("input", (event) => setYear("ozone", Number(event.target.value), "ozone"));
  $("themeToggle").addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
  $("backLink").addEventListener("click", (event) => {
    event.preventDefault();
    $("toast").textContent = "Landing page integration is not available yet";
    $("toast").classList.add("visible");
    setTimeout(() => $("toast").classList.remove("visible"), 3000);
  });
}

async function init() {
  state.data = await loadData();
  setRangeInputs();
  createMap("tempMap", "temperature");
  createMap("ozoneMap", "ozone");
  createChart("tempChart", "temperature");
  createChart("ozoneChart", "ozone");
  createExtraCharts();
  bindEvents();
  setYear("temperature", state.data.years[state.data.years.length - 1], "temp");
  setYear("ozone", FALLBACK_OZONE.years[FALLBACK_OZONE.years.length - 1], "ozone");
  setTheme(true);
}

init();
