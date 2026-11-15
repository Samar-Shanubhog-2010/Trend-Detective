const data = {
  years: [1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2024, 2025, 2026],
  temperature: { unit: "°C", series: [0.18, 0.12, 0.44, 0.38, 0.42, 0.68, 0.72, 0.91, 1.02, 1.26, 1.31, 1.35], locations: [{name:"North America",lat:45,lng:-100,value:1.5},{name:"South America",lat:-15,lng:-60,value:1.1},{name:"Europe",lat:52,lng:15,value:1.8},{name:"Africa",lat:5,lng:20,value:1.2},{name:"Asia",lat:38,lng:85,value:1.7},{name:"Australia",lat:-25,lng:135,value:1.3}] },
  ozone: { unit: "%", series: [2, 1, -3, -6, -8, -9, -7, -5, -4, -2, -1.5, -1], locations: [{name:"Arctic",lat:75,lng:15,value:-6},{name:"North America",lat:45,lng:-100,value:-4},{name:"Europe",lat:52,lng:15,value:-5},{name:"Asia",lat:38,lng:85,value:-4},{name:"Antarctica",lat:-78,lng:0,value:-18}] }
};
const $ = (id) => document.getElementById(id);
const format = (value, unit) => `${value > 0 ? "+" : ""}${value.toFixed(2)}${unit}`;
const colors = (type, value) => type === "temperature" ? (value > 1.4 ? "#d95738" : value > 1 ? "#eb8b61" : value > .6 ? "#e5bd87" : "#62aaa1") : (value < -12 ? "#8d5b9b" : value < -6 ? "#b7779a" : value < -3 ? "#d2a78d" : "#8cc4b0");
const maps = {};
const charts = {};
function createMap(id, type) {
  const map = L.map(id, { zoomControl: false, attributionControl: false, minZoom: 1.5, maxZoom: 4 }).setView([18, 8], 1.5);
  L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", { maxZoom: 5 }).addTo(map);
  maps[type] = { map, markers: data[type].locations.map((point) => L.circleMarker([point.lat, point.lng], { radius: 11 + Math.abs(point.value) * .8, color: colors(type, point.value), fillColor: colors(type, point.value), fillOpacity: .72, weight: 1 }).addTo(map)) };
}
function createChart(id, type) {
  const color = type === "temperature" ? "#e45d3c" : "#167c79";
  charts[type] = new Chart($(id), { type: "line", data: { labels: data.years, datasets: [{ data: data[type].series, borderColor: color, backgroundColor: type === "temperature" ? "rgba(228,93,60,.1)" : "rgba(22,124,121,.1)", borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, fill: true, tension: .35 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: (context) => ` ${format(context.raw, data[type].unit)}` } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } }, y: { grid: { color: "#edf0eb" } } } } });
}
function setYear(type, year, prefix) {
  const index = data.years.reduce((closest, current, i) => Math.abs(current - year) < Math.abs(data.years[closest] - year) ? i : closest, 0);
  const value = data[type].series[index];
  $(`${prefix}Metric`).textContent = format(value, data[type].unit);
  $(`${prefix}ChartValue`).textContent = `${data.years[index]}  ${format(value, data[type].unit)}`;
  $(`${prefix}MapYear`).textContent = year;
  $(`${prefix}SliderYear`).textContent = year;
  charts[type].setActiveElements([{ datasetIndex: 0, index }]); charts[type].update("none");
}
function setTheme(isDark) {
  document.body.classList.toggle("dark", isDark);
  $("themeToggle").setAttribute("aria-pressed", String(isDark));
  localStorage.setItem("trend-detective-theme", isDark ? "dark" : "light");
  Object.values(maps).forEach(({ map }) => setTimeout(() => map.invalidateSize(), 50));
}
createChart("tempChart", "temperature"); createChart("ozoneChart", "ozone");
$("tempYear").addEventListener("input", (event) => setYear("temperature", Number(event.target.value), "temp"));
$("ozoneYear").addEventListener("input", (event) => setYear("ozone", Number(event.target.value), "ozone"));
setYear("temperature", 2026, "temp"); setYear("ozone", 2026, "ozone");
setTheme(true);
$("themeToggle").addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
$("backLink").addEventListener("click", (event) => { event.preventDefault(); $("toast").textContent = "Landing page integration is not available yet"; $("toast").classList.add("visible"); setTimeout(() => $("toast").classList.remove("visible"), 3000); });
