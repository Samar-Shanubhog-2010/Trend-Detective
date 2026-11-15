/* Expected external JSON shape is documented in sample-data.json. Set DATA_URL to your API endpoint. */
const DATA_URL = "sample-data.json";
const FALLBACK_DATA = {
  meta: { name: "Trend Detective sample dataset", updated: "2026-01-01", baseline: "1981-2010" },
  years: [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024, 2025, 2026],
  signals: {
    water: { unit: "%", series: [48, 51, 49, 53, 55, 52, 57, 59, 61, 64, 63, 66], locations: [{name:"North America",lat:45,lng:-100,value:62},{name:"South America",lat:-15,lng:-60,value:78},{name:"Europe",lat:52,lng:15,value:58},{name:"Africa",lat:5,lng:20,value:34},{name:"Asia",lat:38,lng:85,value:55},{name:"Australia",lat:-25,lng:135,value:41}] },
    vegetation: { unit: "%", series: [72, 70, 68, 66, 64, 62, 60, 58, 56, 55, 54, 53], locations: [{name:"Amazon",lat:-5,lng:-60,value:81},{name:"Congo Basin",lat:0,lng:23,value:76},{name:"Northern Europe",lat:58,lng:15,value:64},{name:"Southeast Asia",lat:5,lng:105,value:69},{name:"Australia",lat:-25,lng:135,value:38}] }
  }
};

const state = { data: null, maps: {}, charts: {} };
const $ = (id) => document.getElementById(id);
const domPrefix = { water: "water", vegetation: "vegetation" };
const formatValue = (value, unit) => `${value > 0 ? "+" : ""}${value.toFixed(2)}${unit}`;
function validateData(data) {
  if (!data?.years?.length || !data?.signals?.water?.series || !data?.signals?.vegetation?.series) {
    throw new Error("Dataset must include years and both water and vegetation series.");
  }
  return data;
}
async function loadData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Dataset request failed (${response.status})`);
    return validateData(await response.json());
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
  state.charts[type] = new Chart($(id), { type: "line", data: { labels: state.data.years, datasets: [{ data: signal.series, borderColor: color, backgroundColor: type === "water" ? "rgba(228,93,60,.1)" : "rgba(22,124,121,.1)", borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, pointHoverBackgroundColor: color, fill: true, tension: .35 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, plugins: { legend: { display: false }, tooltip: { displayColors: false, backgroundColor: "#12211e", padding: 9, titleFont: { family: "DM Mono", size: 9 }, bodyFont: { family: "DM Sans", size: 11 }, callbacks: { label: (context) => ` ${formatValue(context.raw, signal.unit)}` } } }, scales: { x: { grid: { display: false }, ticks: { color: "#89968f", font: { family: "DM Mono", size: 8 }, maxTicksLimit: 6 } }, y: { grid: { color: "#edf0eb" }, ticks: { color: "#89968f", font: { family: "DM Mono", size: 8 }, callback: (value) => `${value > 0 ? "+" : ""}${value}` } } } } });
}
function setYear(type, year) {
  const index = state.data.years.reduce((closest, current, i) => Math.abs(current - year) < Math.abs(state.data.years[closest] - year) ? i : closest, 0);
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
  createMap("waterMap", "water", state.data.signals.water.locations);
  createMap("vegetationMap", "vegetation", state.data.signals.vegetation.locations);
  createChart("waterChart", "water"); createChart("vegetationChart", "vegetation");
  bindSlider("water"); bindSlider("vegetation");
  setYear("water", 2026); setYear("vegetation", 2026);
  setTheme(true);
  $("themeToggle").addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
  $("backLink").addEventListener("click", (event) => { event.preventDefault(); showToast("Landing page integration is not available yet"); });
}
init();
