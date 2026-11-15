const DATA_URL = "../processed-data/global-temperature-ozone-annual.json";
const DISTRICT_API_URL = "http://localhost:8001/api/district-analysis";
const DISTRICT_PRESETS = ["Hyderabad", "Delhi", "Bengaluru", "Mumbai", "Chennai", "Paris", "Tokyo", "Global"];
const DISTRICT_LIBRARY = [
  "Hyderabad", "Delhi", "Bengaluru", "Mumbai", "Chennai", "Pune", "Visakhapatnam", "Jaipur", "Lucknow", "Kolkata",
  "Ahmedabad", "Patna", "Bhopal", "Nagpur", "Chandigarh", "Thiruvananthapuram", "Coimbatore", "Mysuru", "Shimla",
  "Paris", "London", "Berlin", "Rome", "Madrid", "Lisbon", "Copenhagen", "Stockholm", "Oslo", "Helsinki", "Istanbul",
  "Tokyo", "Seoul", "Osaka", "Bangkok", "Singapore", "Kuala Lumpur", "Jakarta", "Manila", "Beijing", "Shanghai",
  "Cape Town", "Nairobi", "Johannesburg", "Cairo", "Dubai", "Doha", "Riyadh", "Tehran", "Karachi", "Lahore",
  "New York", "Chicago", "Los Angeles", "San Francisco", "Toronto", "Vancouver", "Mexico City", "Bogotá", "Lima",
  "Buenos Aires", "Santiago", "Rio de Janeiro", "Brasília", "Sydney", "Melbourne", "Auckland", "Honolulu", "Anchorage"
];
const CLIMATE_CAUSES = [
  { title: "Greenhouse gases", type: "warming", detail: "Carbon dioxide and methane trap outgoing heat, shifting the balance toward warmer surface temperatures and stronger heat extremes." },
  { title: "Cloud cover and albedo", type: "cooling", detail: "More reflective cloud and bright surfaces can reduce incoming sunlight and temporarily cool a region, even while global warming continues." },
  { title: "Urban heat islands", type: "warming", detail: "Concrete, asphalt, and dense buildings absorb and store daytime heat, keeping city temperatures elevated overnight." },
  { title: "Ocean cycles", type: "neutral", detail: "Ocean temperature shifts can amplify or dampen regional climate patterns by changing moisture, cloud formation, and circulation." },
  { title: "Land-use change", type: "warming", detail: "Deforestation and land conversion reduce natural cooling, increase heat retention, and alter local rainfall and evapotranspiration." },
  { title: "Ozone chemistry", type: "cooling", detail: "Changes in ozone and reactive gases can alter radiation balance, with some regions cooling while others warm depending on altitude and chemistry." }
];
const FALLBACK_DATA = {
  meta: {
    name: "Global annual temperature and ozone overview",
    source: "NASA + processed fallback",
    updated: "2026-11-15",
    baseline: "2002-2016 annual mean"
  },
  years: [2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016],
  signals: {
    temperature: {
      unit: "°C",
      series: [14.925, 15.395, 15.314, 15.324, 15.312, 15.201, 15.326, 15.226, 15.554, 15.17, 15.423, 15.491, 15.632, 15.591, 16.107],
      locations: [
        { name: "Global Average", lat: 0, lng: 0, value: 16.107 },
        { name: "Europe", lat: 50, lng: 10, value: 16.507 },
        { name: "North America", lat: 40, lng: -100, value: 16.307 },
        { name: "Asia", lat: 35, lng: 100, value: 16.407 },
        { name: "Africa", lat: 0, lng: 20, value: 16.207 },
        { name: "Australia", lat: -25, lng: 135, value: 16.307 }
      ]
    },
    ozone: {
      unit: "%",
      series: [2.4, 1.8, 0.7, -1.0, -2.8, -4.3, -5.9, -7.1, -6.2, -5.0, -6.5, -7.7, -8.2, -8.9, -7.8],
      locations: [
        { name: "Arctic", lat: 75, lng: 15, value: -8.9 },
        { name: "North America", lat: 45, lng: -100, value: -6.5 },
        { name: "Europe", lat: 52, lng: 15, value: -7.2 },
        { name: "Asia", lat: 38, lng: 85, value: -6.1 },
        { name: "Antarctica", lat: -78, lng: 0, value: -11.4 }
      ]
    }
  }
};

const $ = (id) => document.getElementById(id);
const format = (value, unit) => `${value > 0 ? "+" : ""}${value.toFixed(2)}${unit}`;
const colors = (type, value) => type === "temperature"
  ? (value > 16 ? "#d95738" : value > 15.5 ? "#eb8b61" : value > 15 ? "#e5bd87" : "#62aaa1")
  : (value < -10 ? "#8d5b9b" : value < -6 ? "#b7779a" : value < -3 ? "#d2a78d" : "#8cc4b0");

const maps = {};
const charts = {};
const state = { data: null, districtData: null, districtLayers: {} };

function asNumberSeries(values) {
  return (values || []).map((value) => Number(value));
}

function normalizeSignal(signal, fallback, label) {
  const series = asNumberSeries((signal && signal.series) || (fallback && fallback.series) || []);
  const locations = ((signal && signal.locations) || (fallback && fallback.locations) || []).map((point) => ({
    name: point.name || label,
    lat: Number(point.lat),
    lng: Number(point.lng),
    value: Number(point.value)
  }));

  return {
    unit: (signal && signal.unit) || (fallback && fallback.unit) || "",
    series,
    locations
  };
}

function normalizeDashboardData(rawData) {
  const fallback = FALLBACK_DATA;
  const years = Array.isArray(rawData?.years) ? rawData.years.map(Number) : fallback.years.slice();
  const signals = rawData?.signals || fallback.signals;
  const temperatureBase = normalizeSignal(signals.temperature, fallback.signals.temperature, "Global Average");
  const ozone = normalizeSignal(signals.ozone, fallback.signals.ozone, "Ozone band");
  const daySeries = asNumberSeries((signals.temperature && signals.temperature.day) || (signals.temperature && signals.temperature.daySeries) || null);
  const nightSeries = asNumberSeries((signals.temperature && signals.temperature.night) || (signals.temperature && signals.temperature.nightSeries) || null);
  const resolvedDaySeries = daySeries.length ? daySeries : temperatureBase.series.map((value, index) => Number((value + 0.9 + index * 0.025).toFixed(3)));
  const resolvedNightSeries = nightSeries.length ? nightSeries : temperatureBase.series.map((value) => Number((value - 3.6).toFixed(3)));

  const temperature = {
    ...temperatureBase,
    series: resolvedDaySeries,
    daySeries: resolvedDaySeries,
    nightSeries: resolvedNightSeries,
    causes: CLIMATE_CAUSES
  };

  return {
    meta: { ...(rawData?.meta || fallback.meta), sources: ["NASA climate archive", "district analysis API", "fallback climate reasoning"], causes: CLIMATE_CAUSES },
    years,
    temperature,
    ozone,
    signals: { temperature, ozone }
  };
}

function renderCauseCards() {
  const grid = $("climateCauseGrid");
  if (!grid) return;
  grid.innerHTML = CLIMATE_CAUSES.map((cause) => `
    <div class="reason-card reason-${cause.type}">
      <span class="reason-badge reason-${cause.type}">${cause.type}</span>
      <h4>${cause.title}</h4>
      <p>${cause.detail}</p>
    </div>
  `).join("");
}

function getDistrictSuggestions(value) {
  const query = (value || "").trim().toLowerCase();
  if (!query) {
    return DISTRICT_PRESETS.slice(0, 6);
  }

  const allDistricts = [...new Set([...DISTRICT_PRESETS, ...DISTRICT_LIBRARY])];
  return allDistricts.filter((district) => district.toLowerCase().startsWith(query) || district.toLowerCase().includes(query)).slice(0, 8);
}

function renderSuggestions(value) {
  const panel = $("districtSuggestions");
  const suggestions = getDistrictSuggestions(value);

  if (!panel) return;
  panel.classList.toggle("visible", suggestions.length > 0 && (value || "").trim().length > 0);
  panel.innerHTML = suggestions.map((district) => `<button type="button" class="suggestion-item" data-value="${district}">${district}</button>`).join("");

  panel.querySelectorAll(".suggestion-item").forEach((button) => {
    button.addEventListener("click", () => {
      $("districtInput").value = button.dataset.value;
      panel.classList.remove("visible");
      loadDistrictAnalysis(button.dataset.value);
    });
  });
}

function computeDeltaSeries(series) {
  if (!series.length) return [];
  const first = series[0];
  return series.map((value) => Number((value - first).toFixed(3)));
}

function computeRollingAverage(series, windowSize = 3) {
  if (!series.length) return [];
  return series.map((_, index) => {
    const start = Math.max(0, index - Math.floor(windowSize / 2));
    const end = Math.min(series.length, index + Math.ceil(windowSize / 2));
    const slice = series.slice(start, end);
    return Number((slice.reduce((sum, value) => sum + value, 0) / slice.length).toFixed(3));
  });
}

function getNearestIndex(year, values) {
  return values.reduce((closest, current, index) => {
    const currentDistance = Math.abs(current - year);
    const bestDistance = Math.abs(values[closest] - year);
    return currentDistance < bestDistance ? index : closest;
  }, 0);
}

async function loadData() {
  try {
    const response = await fetch(DATA_URL);
    if (!response.ok) throw new Error(`Temperature/ozone request failed (${response.status})`);
    const json = await response.json();
    return normalizeDashboardData(json);
  } catch (error) {
    console.warn("Using embedded temperature/ozone fallback data:", error.message);
    return normalizeDashboardData(FALLBACK_DATA);
  }
}

function createMap(id, type) {
  const targetData = state.data[type];
  const map = L.map(id, {
    zoomControl: false,
    attributionControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    boxZoom: false,
    keyboard: false,
    touchZoom: false,
    tap: false,
    minZoom: 1,
    maxZoom: 1,
    worldCopyJump: false
  }).setView([20, 0], 1);

  const imageUrl = type === "temperature" ? "../day-temp.png" : "../Ozone-worldmap.png";
  const mapImage = L.imageOverlay(imageUrl, [[-90, -180], [90, 180]], {
    opacity: 1,
    zIndex: 1
  }).addTo(map);

  map.fitBounds([[-90, -180], [90, 180]]);

  const markers = (targetData.locations || []).map((point) => L.circleMarker([point.lat, point.lng], {
    radius: 11 + Math.abs(point.value) * 0.25,
    color: colors(type, point.value),
    fillColor: colors(type, point.value),
    fillOpacity: 0.72,
    weight: 1,
    zIndexOffset: 10
  }).addTo(map));

  maps[type] = { map, markers, mapImage, mode: "day" };

  map.on("click", async (event) => {
    const { lat, lng } = event.latlng;
    try {
      const reverseUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
      const response = await fetch(reverseUrl, { headers: { "User-Agent": "TrendDetective-Map/1.0" } });
      const result = await response.json();
      const placeName = result?.address?.city || result?.address?.town || result?.address?.village || result?.address?.state_district || result?.display_name?.split(",")[0] || `Lat ${lat.toFixed(2)}, Lon ${lng.toFixed(2)}`;

      $("districtInput").value = placeName;
      loadDistrictAnalysis(placeName);
    } catch (error) {
      console.warn("Unable to reverse geocode clicked map point:", error);
    }
  });

  setTimeout(() => map.invalidateSize(), 250);
}

function createChart(id, type) {
  const color = type === "temperature" ? "#e45d3c" : "#167c79";
  charts[type] = new Chart($(id), {
    type: "line",
    data: {
      labels: state.data.years,
      datasets: [{
        data: state.data[type].series,
        borderColor: color,
        backgroundColor: type === "temperature" ? "rgba(228,93,60,.1)" : "rgba(22,124,121,.1)",
        borderWidth: 2,
        pointRadius: 0,
        pointHoverRadius: 4,
        fill: true,
        tension: 0.35
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
          callbacks: {
            label: (context) => ` ${format(context.raw, state.data[type].unit)}`
          }
        }
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
  const daySeries = state.data.temperature.daySeries || state.data.temperature.series;
  const nightSeries = state.data.temperature.nightSeries || state.data.temperature.series.map((value) => Number((value - 3.5).toFixed(3)));
  const ozoneTrend = state.data.ozone.series.map((value, index) => Number((value + (state.data.years[index] - state.data.years[0]) * 0.08).toFixed(3)));

  charts.dayNight = new Chart($("dayNightChart"), {
    type: "line",
    data: {
      labels: state.data.years,
      datasets: [
        {
          label: "Day mean",
          data: daySeries,
          borderColor: "#d95738",
          backgroundColor: "rgba(217,87,56,0.10)",
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        },
        {
          label: "Night mean",
          data: nightSeries,
          borderColor: "#167c79",
          backgroundColor: "rgba(22,124,121,0.08)",
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.35
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });

  charts.driverImpact = new Chart($("warmingDriversChart"), {
    type: "bar",
    data: {
      labels: ["Greenhouse", "Ocean cycle", "Clouds", "Urban heat", "Land use", "Ozone shift"],
      datasets: [{
        data: [68, 36, 22, 40, 52, 31],
        backgroundColor: ["#d95738", "#167c79", "#d4b15a", "#ec8d69", "#726c8f", "#7fa9ae"],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });

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
      scales: { x: { display: false }, y: { display: false } }
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
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });

  charts.ozoneTrend = new Chart($("ozoneTrendChart"), {
    type: "line",
    data: {
      labels: state.data.years,
      datasets: [{
        data: ozoneTrend,
        borderColor: "#7b5a99",
        backgroundColor: "rgba(123,90,153,0.10)",
        borderWidth: 2,
        pointRadius: 0,
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } }
    }
  });

  charts.combinedHeat = new Chart($("combinedSignalChart"), {
    type: "line",
    data: {
      labels: state.data.years,
      datasets: [
        {
          data: state.data.temperature.series,
          borderColor: "#d95738",
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.25,
          yAxisID: "yTemp"
        },
        {
          data: state.data.ozone.series,
          borderColor: "#167c79",
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          tension: 0.25,
          yAxisID: "yOzone"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        yTemp: {
          display: false,
          position: "left"
        },
        yOzone: {
          display: false,
          position: "right"
        }
      }
    }
  });
}

function setRangeInputs() {
  const tempYear = $("tempYear");
  const ozoneYear = $("ozoneYear");
  const min = state.data.years[0];
  const max = state.data.years[state.data.years.length - 1];

  tempYear.min = String(min);
  tempYear.max = String(max);
  tempYear.value = String(max);

  ozoneYear.min = String(min);
  ozoneYear.max = String(max);
  ozoneYear.value = String(max);

  $("tempSliderYear").textContent = String(max);
  $("tempMapYear").textContent = String(max);
  $("ozoneSliderYear").textContent = String(max);
  $("ozoneMapYear").textContent = String(max);
}

function setYear(type, year, prefix) {
  const index = getNearestIndex(year, state.data.years);
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

function formatTrendDirectionLabel(direction) {
  if (!direction) return "stable";
  return direction.toLowerCase();
}

function renderDistrictMetrics(payload) {
  if (!payload) {
    $("warmestYearValue").textContent = "—";
    $("anomalyValue").textContent = "—";
    $("trendValue").textContent = "—";
    $("compareValue").textContent = "—";
    $("districtInsightList").innerHTML = "";
    return;
  }

  const series = payload.analysis?.series || [];
  const years = payload.analysis?.years || [];
  const trend = payload.analysis?.trend || {};
  const anomaly = payload.analysis?.anomaly || {};
  const globalLast = state.data?.temperature?.series?.[state.data.temperature.series.length - 1] ?? 0;
  const districtLast = series[series.length - 1] ?? 0;
  const compareDelta = districtLast - globalLast;

  const warmestIndex = series.reduce((bestIndex, value, index, arr) => (
    value > arr[bestIndex] ? index : bestIndex
  ), 0);

  $("warmestYearValue").textContent = years[warmestIndex] ? `${years[warmestIndex]} · ${series[warmestIndex].toFixed(2)}°C` : "—";
  $("anomalyValue").textContent = anomaly.latest_zscore != null ? `${anomaly.latest_zscore.toFixed(2)} z-score` : "—";
  $("trendValue").textContent = trend.slope_per_year != null ? `${trend.slope_per_year.toFixed(3)}°C/yr` : "—";
  $("compareValue").textContent = `${compareDelta >= 0 ? "+" : ""}${compareDelta.toFixed(2)}°C`;

  const insightItems = payload.analysis?.insights || [];
  $("districtInsightList").innerHTML = insightItems.map((item) => `<li>${item}</li>`).join("");
}

function renderDistrictSummary(payload) {
  if (!payload) {
    $("districtSummary").textContent = "Global baseline view. Select a district to drill into local trend, anomalies, and map focus.";
    renderDistrictMetrics(null);
    return;
  }

  const district = payload.district || "District";
  const insights = payload.analysis?.insights || [];
  const trend = payload.analysis?.trend || {};
  const message = insights[0] || `District view for ${district} is available.`;
  $("districtSummary").innerHTML = `<strong>${district}</strong><span> · ${formatTrendDirectionLabel(trend.direction)} trend · ${message}</span>`;
  renderDistrictMetrics(payload);
}

function highlightDistrictOnMaps(payload) {
  const centroid = payload?.geography?.centroid;
  if (!centroid) return;

  Object.values(maps).forEach(({ map }) => {
    const mapId = map._leaflet_id;
    if (state.districtLayers[mapId]) {
      map.removeLayer(state.districtLayers[mapId]);
    }

    const marker = L.circleMarker([centroid.lat, centroid.lon], {
      radius: 12,
      color: "#f7d14a",
      fillColor: "#f7d14a",
      fillOpacity: 0.9,
      weight: 3
    }).addTo(map);

    marker.bindPopup(`<strong>${payload.district}</strong><br>${payload.analysis?.signal || "district"} insights<br>${(payload.analysis?.insights || ["Trend analysis available"])[0]}`);
    state.districtLayers[mapId] = marker;
    map.setView([0, 0], 1);
  });
}

async function loadDistrictAnalysis(districtName = "Hyderabad") {
  const cleanDistrict = (districtName || "Hyderabad").trim() || "Hyderabad";
  const query = new URLSearchParams({
    district: cleanDistrict,
    keyword: "temperature",
    start: "2002-01-01",
    end: "2024-12-31"
  });

  const cachedKey = `district-analysis:${cleanDistrict.toLowerCase()}`;

  try {
    const cachedPayload = localStorage.getItem(cachedKey);
    if (cachedPayload) {
      const payload = JSON.parse(cachedPayload);
      state.districtData = payload;
      renderDistrictSummary(payload);
      highlightDistrictOnMaps(payload);
      return payload;
    }

    const response = await fetch(`${DISTRICT_API_URL}?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`District API request failed (${response.status})`);
    }

    const payload = await response.json();
    localStorage.setItem(cachedKey, JSON.stringify(payload));
    state.districtData = payload;
    renderDistrictSummary(payload);
    highlightDistrictOnMaps(payload);
    $("toast").textContent = `District drill-down active for ${payload.district}.`;
    $("toast").classList.add("visible");
    setTimeout(() => $("toast").classList.remove("visible"), 2400);
    return payload;
  } catch (error) {
    state.districtData = null;
    renderDistrictSummary(null);
    $("toast").textContent = `Backend unavailable for ${cleanDistrict}; showing global map.`;
    $("toast").classList.add("visible");
    setTimeout(() => $("toast").classList.remove("visible"), 2400);
    console.warn("District analysis backend unavailable:", error.message);
    return null;
  }
}

function bindEvents() {
  $("tempYear").addEventListener("input", (event) => setYear("temperature", Number(event.target.value), "temp"));
  $("ozoneYear").addEventListener("input", (event) => setYear("ozone", Number(event.target.value), "ozone"));
  $("themeToggle").addEventListener("click", () => setTheme(!document.body.classList.contains("dark")));
  $("districtApplyBtn").addEventListener("click", () => {
    const districtName = $("districtInput").value || "Hyderabad";
    loadDistrictAnalysis(districtName);
  });
  $("districtInput").addEventListener("input", (event) => renderSuggestions(event.target.value));
  $("districtInput").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      $("districtApplyBtn").click();
    }
  });
  $("districtSuggestions").addEventListener("click", (event) => {
    const button = event.target.closest(".suggestion-item");
    if (!button) return;
    $("districtInput").value = button.dataset.value;
    $("districtSuggestions").classList.remove("visible");
    loadDistrictAnalysis(button.dataset.value);
  });
  $("tempMapModeToggle")?.addEventListener("click", () => {
    const temperatureMap = maps.temperature;
    if (!temperatureMap) return;

    const nextMode = temperatureMap.mode === "day" ? "night" : "day";
    temperatureMap.mode = nextMode;
    temperatureMap.mapImage.setUrl(nextMode === "day" ? "../day-temp.png" : "../Night-temp.png");
    $("tempMapModeToggle").textContent = nextMode === "day" ? "Night view" : "Day view";
  });
  $("backLink").addEventListener("click", (event) => {
    event.preventDefault();
    $("toast").textContent = "Landing page integration is not available yet";
    $("toast").classList.add("visible");
    setTimeout(() => $("toast").classList.remove("visible"), 3000);
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".suggestion-item") && !event.target.closest("#districtInput")) {
      $("districtSuggestions").classList.remove("visible");
    }
  });
}

async function init() {
  state.data = await loadData();
  renderCauseCards();
  setRangeInputs();
  createMap("tempMap", "temperature");
  createMap("ozoneMap", "ozone");
  createChart("tempChart", "temperature");
  createChart("ozoneChart", "ozone");
  createExtraCharts();
  bindEvents();
  renderSuggestions("Hy");
  setYear("temperature", state.data.years[state.data.years.length - 1], "temp");
  setYear("ozone", state.data.years[state.data.years.length - 1], "ozone");
  setTheme(true);
  loadDistrictAnalysis("Hyderabad");
}

init();
