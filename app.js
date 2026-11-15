const FALLBACK_DATA = {
  meta: { name: "Trend Detective sample dataset", updated: "2026-01-01", baseline: "1981-2010" },
  years: [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024, 2025, 2026],
  signals: {
    water: { unit: "%", series: [48, 51, 49, 53, 55, 52, 57, 59, 61, 64, 63, 66], locations: [{name:"North America",lat:45,lng:-100,value:62},{name:"South America",lat:-15,lng:-60,value:78},{name:"Europe",lat:52,lng:15,value:58},{name:"Africa",lat:5,lng:20,value:34},{name:"Asia",lat:38,lng:85,value:55},{name:"Australia",lat:-25,lng:135,value:41}] },
    vegetation: { unit: "%", series: [72, 70, 68, 66, 64, 62, 60, 58, 56, 55, 54, 53], locations: [{name:"Amazon",lat:-5,lng:-60,value:81},{name:"Congo Basin",lat:0,lng:23,value:76},{name:"Northern Europe",lat:58,lng:15,value:64},{name:"Southeast Asia",lat:5,lng:105,value:69},{name:"Australia",lat:-25,lng:135,value:38}] }
  }
};
const FOREST_AREA_DATA = {
  1980: 31.5, 1981: 29.5, 1982: 27, 1983: 33, 1984: 30, 1985: 33,
  1986: 32, 1987: 32.5, 1988: 27.7, 1989: 32.5, 1990: 32.5, 1991: 32.5,
  2024: 31, 2025: 32, 2026: 32
};

const state = { data: null, maps: {}, charts: {} };
const $ = (id) => document.getElementById(id);
const RAINFALL_API_URL = $("waterChart")?.dataset.rainfallApi;
const VEGETATION_API_URL = $("vegetationChart")?.dataset.vegetationApi;
const DATA_API_URL = RAINFALL_API_URL;
const domPrefix = { water: "water", vegetation: "vegetation" };
const formatValue = (value, unit) => `${unit === " mm" || unit === " m³/m³" || unit === " %" || unit === "" ? "" : value > 0 ? "+" : ""}${value.toFixed(2)}${unit}`;
function validateData(data) {
  if (!data?.years?.length || !data?.signals?.water?.series || !data?.signals?.vegetation?.series) {
    throw new Error("Dataset must include years and both water and vegetation series.");
  }
  return data;
}
async function loadData() {
  try {
    if (!DATA_API_URL || !VEGETATION_API_URL) throw new Error("Climate data APIs are not configured.");
    const currentDate = new Date();
    const currentYear = currentDate.getUTCFullYear();
    const latestAvailableDate = new Date(currentDate);
    latestAvailableDate.setUTCDate(latestAvailableDate.getUTCDate() - 1);
    const years = FALLBACK_DATA.years.filter((year) => year <= currentYear);
    const annualData = {};
    for (const year of years) {
      const request = new URLSearchParams({
        latitude: "20",
        longitude: "0",
        start_date: `${year}-01-01`,
        end_date: year === currentYear
          ? latestAvailableDate.toISOString().slice(0, 10)
          : `${year}-12-31`,
        daily: "precipitation_sum",
        timezone: "UTC"
      });
      const response = await fetch(`${DATA_API_URL}?${request}`);
      if (!response.ok) throw new Error(`Rainfall request failed (${response.status})`);
      const data = await response.json();
      const rainfallData = data;
      const rainfall = rainfallData?.daily?.precipitation_sum?.filter(Number.isFinite) || [];
      if (!rainfall.length) {
        throw new Error(`Rainfall response did not include ${year} data.`);
      }
      annualData[year] = {
        rainfall: rainfall.reduce((sum, amount) => sum + amount, 0)
      };
    }
    const annualRainfall = Object.fromEntries(Object.entries(annualData).map(([year, data]) => [year, data.rainfall]));
    const latestYear = Math.max(...Object.keys(annualRainfall).map(Number));
    const series = years.map((year) => {
      const total = annualRainfall[year] ?? annualRainfall[latestYear];
      return Number(total.toFixed(2));
    });
    let vegetationSeries = FALLBACK_DATA.years.map((year, index) => FOREST_AREA_DATA[year] ?? FALLBACK_DATA.signals.vegetation.series[index]);
    try {
      const response = await fetch(`${VEGETATION_API_URL}?format=json&date=1980%3A${currentYear}&per_page=100`);
      if (!response.ok) throw new Error(`Vegetation proxy request failed (${response.status})`);
      const vegetation = await response.json();
      vegetationSeries = FALLBACK_DATA.years.map((year) => {
        const record = vegetation[1]?.find((entry) => Number(entry.date) === year);
        if (Number.isFinite(record?.value)) return Number(record.value.toFixed(2));
        return FOREST_AREA_DATA[year] ?? null;
      });
    } catch (error) {
      console.warn("Using embedded vegetation data:", error.message);
    }

    return validateData({
      ...FALLBACK_DATA,
      meta: { ...FALLBACK_DATA.meta, updated: new Date().toISOString().slice(0, 10) },
      signals: {
        ...FALLBACK_DATA.signals,
        water: { ...FALLBACK_DATA.signals.water, unit: " mm", series },
        vegetation: { ...FALLBACK_DATA.signals.vegetation, unit: " %", series: vegetationSeries }
      }
    });
  } catch (error) {
    console.warn("Using embedded sample data:", error.message);
    showToast("Live dataset unavailable — showing sample data");
    return FALLBACK_DATA;
  }
}
function colorFor(type, value) {
  if (type === "water") return value > 70 ? "#167c79" : value > 50 ? "#62aaa1" : value > 35 ? "#e5bd87" : "#d95738";
  return value < 45 ? "#d95738" : value < 60 ? "#d2a78d" : value < 72 ? "#8cc4b0" : "#167c79";
}
function createMap(id, type, points) {
  const map = L.map(id, { zoomControl: false, attributionControl: false, minZoom: 1.5, maxZoom: 4 }).setView([18, 8], 1.5);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", { maxZoom: 5 }).addTo(map);
  const markers = points.map((point) => {
    const marker = L.circleMarker([point.lat, point.lng], { radius: 11 + Math.abs(point.value) * .8, color: colorFor(type, point.value), fillColor: colorFor(type, point.value), fillOpacity: .72, weight: 1 }).addTo(map);
    marker.bindPopup(`<strong>${point.name}</strong><br>${type === "water" ? "Water availability" : "Vegetation density"}: ${point.value}%`);
    return marker;
  });
  state.maps[type] = { map, markers };
}
function updateMap(type, index) {
  const mapState = state.maps[type];
  const signal = state.data.signals[type];
  const scale = signal.series[index] / signal.series[signal.series.length - 1];
  signal.locations.forEach((point, pointIndex) => {
    const value = point.value * scale;
    const color = colorFor(type, value);
    mapState.markers[pointIndex].setStyle({ radius: 11 + Math.abs(value) * .08, color, fillColor: color });
  });
}
function createChart(id, type) {
  const signal = state.data.signals[type];
  const color = type === "water" ? "#e45d3c" : "#167c79";
  const isRainfall = type === "water";
  state.charts[type] = new Chart($(id), {
    type: "line",
    data: {
      labels: state.data.years,
      datasets: [{
        data: signal.series,
        borderColor: color,
        backgroundColor: isRainfall ? "rgba(228,93,60,.1)" : "rgba(22,124,121,.1)",
        borderWidth: 2,
        borderRadius: 0,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHoverBackgroundColor: color,
        fill: true,
        tension: .35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      plugins: {
        legend: { display: false },
        tooltip: {
          displayColors: false,
          backgroundColor: "#12211e",
          padding: 9,
          titleFont: { family: "DM Mono", size: 9 },
          bodyFont: { family: "DM Sans", size: 11 },
          callbacks: { label: (context) => ` ${formatValue(context.raw, signal.unit)}` }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: "#89968f", font: { family: "DM Mono", size: 8 }, maxTicksLimit: 6 } },
        y: { beginAtZero: isRainfall, grid: { color: "#edf0eb" }, ticks: { color: "#89968f", font: { family: "DM Mono", size: 8 }, callback: (value) => `${signal.unit === " mm" || signal.unit === " m³/m³" || signal.unit === " %" || signal.unit === "" ? "" : value > 0 ? "+" : ""}${value}` } }
      }
    }
  });
}
function setYear(type, year) {
  const availableIndexes = state.data.signals[type].series
    .map((value, index) => value == null ? null : index)
    .filter((index) => index != null);
  const index = availableIndexes.reduce((closest, current) => Math.abs(state.data.years[current] - year) < Math.abs(state.data.years[closest] - year) ? current : closest, availableIndexes[0]);
  const actualYear = state.data.years[index];
  const signal = state.data.signals[type];
  const value = signal.series[index];
  const prefix = domPrefix[type];
  $(`${prefix}Metric`).textContent = formatValue(value, signal.unit);
  $(`${prefix}ChartValue`).textContent = `${actualYear}  ${formatValue(value, signal.unit)}`;
  $(`${prefix}MapYear`).textContent = year;
  $(`${prefix}SliderYear`).textContent = year;
  updateMap(type, index);
  const chart = state.charts[type];
  chart.setActiveElements([{ datasetIndex: 0, index }]);
  chart.tooltip.setActiveElements([{ datasetIndex: 0, index }], { x: 0, y: 0 });
  chart.update("none");
}
function bindSlider(type) {
  $(`${domPrefix[type]}Year`).addEventListener("input", (event) => setYear(type, Number(event.target.value)));
}
function showToast(message) { const toast = $("toast"); toast.textContent = message; toast.classList.add("visible"); setTimeout(() => toast.classList.remove("visible"), 3000); }
function setTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  const toggle = $("themeToggle");
  toggle.setAttribute("aria-pressed", String(isDark));
  toggle.setAttribute("aria-label", isDark ? "Switch to light contrast theme" : "Switch to dark contrast theme");
  localStorage.setItem("trend-detective-theme", isDark ? "dark" : "light");
  Object.values(state.maps).forEach(({ map }) => setTimeout(() => map.invalidateSize(), 50));
}
async function init() {
  state.data = await loadData();
  createChart("waterChart", "water"); createChart("vegetationChart", "vegetation");
  bindSlider("water"); bindSlider("vegetation");
  setYear("water", 2026); setYear("vegetation", 2026);
  const savedTheme = localStorage.getItem("trend-detective-theme");
  setTheme(savedTheme ? savedTheme === "dark" : true);
  $("themeToggle").addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
}
init();
