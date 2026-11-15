const DATA_URL = "aqi-pollution-data.json";
const AQI_API_URL = document.getElementById("aqiChart")?.dataset.aqiApi;
const POLLUTION_API_URL = document.getElementById("pollutionChart")?.dataset.pollutionApi;
const AQI_YEARS = Array.from({ length: 5 }, (_, index) => 2022 + index);
const POLLUTION_YEARS = AQI_YEARS;
const FALLBACK_DATA = { years: [2022, 2023, 2024, 2025, 2026], signals: { aqi: { unit: " AQI", series: [82, 78, 76, 72, 69], locations: [{name:"Los Angeles",lat:34,lng:-118,value:72},{name:"Delhi",lat:29,lng:77,value:168},{name:"London",lat:51,lng:-1,value:48},{name:"Beijing",lat:40,lng:116,value:142},{name:"Sydney",lat:-33,lng:151,value:39}] }, pollution: { unit: " µg/m³", series: [86, 84, 81, 78, 74], locations: [{name:"Los Angeles",lat:34,lng:-118,value:58},{name:"Delhi",lat:29,lng:77,value:154},{name:"London",lat:51,lng:-1,value:31},{name:"Beijing",lat:40,lng:116,value:128},{name:"Sydney",lat:-33,lng:151,value:22}] } } };
const $ = (id) => document.getElementById(id);
const maps = {}, charts = {};
const format = (value, unit) => `${value.toFixed(0)}${unit}`;
const colorFor = (type, value) => type === "aqi" ? (value > 150 ? "#d95738" : value > 100 ? "#eb8b61" : value > 50 ? "#f1c45d" : "#167c79") : (value > 100 ? "#8d5b9b" : value > 50 ? "#d95738" : value > 25 ? "#ecdfae" : "#8cc4b0");
const crosshairPlugin = { id: "aqiCrosshair", afterDraw(chart) { const active = chart.tooltip?.getActiveElements?.()[0]; if (!active) return; const x = chart.scales.x.getPixelForValue(active.index); const context = chart.ctx; context.save(); context.beginPath(); context.setLineDash([3, 3]); context.strokeStyle = "#aab4ae"; context.moveTo(x, chart.chartArea.top); context.lineTo(x, chart.chartArea.bottom); context.stroke(); context.restore(); } };
Chart.register(crosshairPlugin);
function validateData(data) { if (!data?.years?.length || !data?.signals?.aqi?.series || !data?.signals?.pollution?.series) throw new Error("Dataset must include years, AQI, and pollution series."); return data; }
async function loadData() {
  try {
    const datasetResponse = await fetch(DATA_URL);
    if (!datasetResponse.ok) throw new Error(`Dataset request failed (${datasetResponse.status})`);
    const data = validateData(await datasetResponse.json());
    if (!AQI_API_URL || !POLLUTION_API_URL) throw new Error("Air quality APIs are not configured.");
    const request = new URLSearchParams({
      latitude: "20.5937",
      longitude: "78.9629",
      hourly: "us_aqi,pm2_5",
      start_date: "2022-01-01",
      end_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      timezone: "UTC"
    });
    const response = await fetch(`${POLLUTION_API_URL}?${request}`);
    if (!response.ok) throw new Error(`Air quality request failed (${response.status})`);
    const airQuality = await response.json();
    const annualValues = airQuality.hourly.time.reduce((values, timestamp, index) => {
      const value = airQuality.hourly.pm2_5[index];
      if (Number.isFinite(value)) {
        const year = Number(timestamp.slice(0, 4));
        values[year] = values[year] || [];
        values[year].push(value);
      }
      return values;
    }, {});
    const annualAqiValues = airQuality.hourly.time.reduce((values, timestamp, index) => {
      const value = airQuality.hourly.us_aqi[index];
      if (Number.isFinite(value)) {
        const year = Number(timestamp.slice(0, 4));
        values[year] = values[year] || [];
        values[year].push(value);
      }
      return values;
    }, {});
    const aqiSeries = POLLUTION_YEARS.map((year) => {
      const values = annualAqiValues[year];
      return values?.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
    });
    const pollutionSeries = POLLUTION_YEARS.map((year) => {
      const values = annualValues[year];
      return values?.length ? Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)) : null;
    });
    return {
      ...data,
      years: POLLUTION_YEARS,
      signals: { ...data.signals, aqi: { ...data.signals.aqi, series: aqiSeries }, pollution: { ...data.signals.pollution, series: pollutionSeries } }
    };
  } catch (error) {
    console.warn("Using embedded AQI sample data:", error.message);
    return FALLBACK_DATA;
  }
}
function createMap(data, type) { const map = L.map(`${type}Map`, { zoomControl: false, attributionControl: false, minZoom: 1.5, maxZoom: 4 }).setView([18, 8], 1.5); L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png", { maxZoom: 5 }).addTo(map); maps[type] = { map, markers: data.signals[type].locations.map((point) => { const color = colorFor(type, point.value); const marker = L.circleMarker([point.lat, point.lng], { radius: 11 + point.value * .08, color, fillColor: color, fillOpacity: .72, weight: 1 }).addTo(map); marker.bindPopup(`<strong>${point.name}</strong><br>${type === "aqi" ? "AQI" : "PM2.5"}: ${point.value}`); return marker; }) }; }
function createChart(data, type) { const color = type === "aqi" ? "#d95738" : "#7b5a99"; charts[type] = new Chart($(`${type}Chart`), { type: "line", data: { labels: data.years, datasets: [{ data: data.signals[type].series, borderColor: color, backgroundColor: type === "aqi" ? "rgba(217,87,56,.1)" : "rgba(123,90,153,.1)", borderWidth: 2, pointRadius: 0, pointHoverRadius: 4, fill: true, tension: .35 }] }, options: { responsive: true, maintainAspectRatio: false, animation: { duration: 250 }, interaction: { mode: "index", intersect: false }, plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: (context) => ` ${format(context.raw, data.signals[type].unit)}` } } }, scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 6 } }, y: { grid: { color: "#edf0eb" } } } } }); }
function update(type, year, data) { const index = data.years.reduce((closest, current, i) => Math.abs(current - year) < Math.abs(data.years[closest] - year) ? i : closest, 0); const signal = data.signals[type]; const value = signal.series[index]; $(`${type}MapYear`).textContent = year; $(`${type}SliderYear`).textContent = year; if (!Number.isFinite(value)) { $(`${type}Metric`).textContent = "—"; $(`${type}ChartValue`).textContent = "—"; charts[type].setActiveElements([]); charts[type].update("none"); return; } $(`${type}Metric`).textContent = format(value, signal.unit); $(`${type}ChartValue`).textContent = `${data.years[index]}  ${format(value, signal.unit)}`; const scale = value / signal.series[signal.series.length - 1]; signal.locations.forEach((point, i) => { const current = point.value * scale; const color = colorFor(type, current); maps[type].markers[i].setStyle({ radius: 11 + current * .08, color, fillColor: color }); }); charts[type].setActiveElements([{ datasetIndex: 0, index }]); charts[type].update("none"); }
function setTheme(isDark) { document.body.classList.toggle("dark", isDark); $("themeToggle").setAttribute("aria-pressed", String(isDark)); localStorage.setItem("trend-detective-theme", isDark ? "dark" : "light"); Object.values(maps).forEach(({ map }) => setTimeout(() => map.invalidateSize(), 50)); }
(async function init() { const data = await loadData(); createMap(data, "aqi"); createMap(data, "pollution"); createChart(data, "aqi"); createChart(data, "pollution"); $("aqiYear").addEventListener("input", (event) => update("aqi", Number(event.target.value), data)); $("pollutionYear").addEventListener("input", (event) => update("pollution", Number(event.target.value), data)); update("aqi", 2026, data); update("pollution", 2026, data); setTheme(true); $("themeToggle").addEventListener("click", () => setTheme(!document.body.classList.contains("dark"))); document.querySelector(".back-link").addEventListener("click", (event) => { event.preventDefault(); $("toast").textContent = "Landing page integration is not available yet"; $("toast").classList.add("visible"); setTimeout(() => $("toast").classList.remove("visible"), 3000); }); })();
