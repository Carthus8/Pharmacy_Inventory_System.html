/* ============================================================
   PHARMACY INVENTORY DASHBOARD — script.js
   ============================================================ */

"use strict";

/* ── Colour constants ─────────────────────────────────────── */
const COLORS = {
  blue:    "#2a78d6",
  aqua:    "#1baf7a",
  yellow:  "#eda100",
  red:     "#e34948",
  violet:  "#4a3aa7",
  orange:  "#eb6834",
  magenta: "#e87ba4",
  green:   "#008300",
};

const DEMAND_COLORS = {
  acute:            "#eda100",
  chronic:          "#4a3aa7",
  acute_holiday:    "#e34948",
  seasonal_allergy: "#1baf7a",
  steady_otc:       "#2a78d6",
  acute_summer:     "#eb6834",
};

/* Active Chart.js instances (so we can destroy before re-rendering) */
const activeCharts = {};


/* ── Formatting helpers ───────────────────────────────────── */
function fmt(n) {
  return Number(n).toLocaleString("en-PH");
}

function fmtMoney(n) {
  return "PHP " + fmt(Math.round(n));
}


/* ── Chart helpers ────────────────────────────────────────── */

/**
 * Destroy a Chart.js instance by canvas ID (if it exists) and remove
 * it from the registry, so we can safely re-create it.
 */
function destroyChart(id) {
  if (activeCharts[id]) {
    activeCharts[id].destroy();
    delete activeCharts[id];
  }
}

/**
 * Build a Chart.js line chart on a <canvas> element.
 *
 * @param {string}   canvasId  - ID of the target <canvas>
 * @param {string[]} labels    - X-axis labels
 * @param {number[]} values    - Y-axis data
 * @param {string}   color     - Line/fill colour (hex)
 */
function buildLineChart(canvasId, labels, values, color) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext("2d");
  activeCharts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: color,
        backgroundColor: color + "22",   // ~13 % opacity fill
        pointBackgroundColor: color,
        pointBorderColor: "#ffffff",
        pointBorderWidth: 1.5,
        pointRadius: 3,
        fill: true,
        tension: 0.3,
        borderWidth: 2,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (t) => t[0].label,
            label: (c) => "Units: " + fmt(c.raw),
          },
        },
      },
      scales: {
        x: {
          ticks: { font: { size: 9 }, color: "#898781", maxRotation: 45, autoSkip: true, maxTicksLimit: 10 },
          grid:  { display: false },
        },
        y: {
          ticks: {
            font: { size: 9 },
            color: "#898781",
            callback: (v) => v >= 1000 ? (v / 1000).toFixed(0) + "k" : v,
          },
          grid: { color: "#e1e0d9" },
        },
      },
    },
  });
}

/**
 * Build a Chart.js area chart (cumulative lost sales).
 *
 * @param {string}   canvasId
 * @param {string[]} labels
 * @param {number[]} values
 * @param {string}   color
 */
function buildAreaChart(canvasId, labels, values, color) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext("2d");
  activeCharts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        data: values,
        borderColor: color,
        backgroundColor: color + "55",   // ~33 % opacity fill
        fill: true,
        tension: 0.2,
        borderWidth: 2,
        pointRadius: 0,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (c) => "PHP " + (c.raw / 1_000_000).toFixed(4) + "M",
          },
        },
      },
      scales: {
        x: {
          ticks: { font: { size: 9 }, color: "#898781", maxTicksLimit: 6 },
          grid:  { display: false },
        },
        y: {
          ticks: {
            font: { size: 9 },
            color: "#898781",
            callback: (v) => "PHP " + (v / 1_000_000).toFixed(2) + "M",
          },
          grid: { color: "#e1e0d9" },
        },
      },
    },
  });
}

/**
 * Build a Chart.js vertical bar chart (daily stockout rolling average).
 *
 * @param {string}   canvasId
 * @param {number[]} values
 * @param {string}   color
 */
function buildRollingChart(canvasId, values, color) {
  destroyChart(canvasId);
  const ctx = document.getElementById(canvasId).getContext("2d");
  activeCharts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: values.map((_, i) => ""),
      datasets: [{
        data: values,
        backgroundColor: color + "bb",
        borderWidth: 0,
        barThickness: "flex",
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          ticks: { font: { size: 9 }, color: "#898781" },
          grid:  { color: "#e1e0d9" },
        },
      },
    },
  });
}


/* ── Inline horizontal bar charts ─────────────────────────── */

/**
 * Render a series of horizontal bar rows into a container element.
 *
 * @param {string}   containerId - ID of the target <div>
 * @param {{ label: string, value: number }[]} data
 * @param {string}   color       - Bar fill colour (hex)
 */
function renderBarRows(containerId, data, color) {
  const el = document.getElementById(containerId);
  if (!el) return;

  const max = Math.max(...data.map((d) => d.value), 1);

  el.innerHTML = data.map((d) => `
    <div class="bar-row">
      <span class="bar-label" title="${d.label}">${d.label}</span>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(d.value / max) * 100}%;background:${color}"></div>
      </div>
      <span class="bar-value">${d.value.toFixed(1)}</span>
    </div>
  `).join("");
}


/* ── Demand class legend ──────────────────────────────────── */

function renderLegend() {
  const el = document.getElementById("legend");
  if (!el) return;

  el.innerHTML = Object.entries(DEMAND_COLORS).map(([key, color]) => `
    <div class="legend-item">
      <div class="legend-swatch" style="background:${color}"></div>
      ${key.replace(/_/g, " ")}
    </div>
  `).join("");
}


/* ── Data processing ──────────────────────────────────────── */

/**
 * Crunch the raw rows from the "Daily Demand Data" sheet into all the
 * aggregations the dashboard needs.
 *
 * @param  {object[]} daily  - Rows from the Daily Demand Data sheet
 * @param  {object[]} items  - Rows from the Item Master sheet
 * @returns {object}          Aggregated metrics and chart-ready arrays
 */
function aggregateData(daily, items) {
  /* Accumulators */
  let totalLostSales  = 0;
  let totalUnitsSold  = 0;
  let totalExpiredVal = 0;
  const criticalDays  = new Set();

  const monthMap    = {};   // "YYYY-MM" → units sold
  const dayLostMap  = {};   // "YYYY-MM-DD" → lost sales value
  const daySoMap    = {};   // "YYYY-MM-DD" → stockout count
  const demandMap   = {};   // demand class → lost sales value
  const categoryMap = {};   // category → lost sales value
  const itemLostMap = {};   // item name → lost sales value
  const itemSoMap   = {};   // item name → stockout count
  const itemDaysMap = {};   // item name → total day rows

  daily.forEach((row) => {
    const lost    = parseFloat(row["Lost Sales Value (PHP)"]) || 0;
    const sold    = parseFloat(row["Units Sold"])             || 0;
    const expired = parseFloat(row["Units Expired"])          || 0;
    const price   = parseFloat(row["Unit Price (PHP)"])       || 0;
    const so      = parseInt(row["Stockout Flag"])            || 0;
    const isCrit  = String(row["Is Chronic Critical"]).toLowerCase() === "true";
    const name    = row["Generic Name"] || row["Item ID"] || "Unknown";
    const cat     = row["Category"]    || "Unknown";
    const dc      = row["Demand Class"] || "unknown";
    const dateStr = row["Date"] || "";

    /* Running totals */
    totalLostSales  += lost;
    totalUnitsSold  += sold;
    totalExpiredVal += expired * price;

    /* Parse date */
    const d = new Date(dateStr);
    if (!isNaN(d)) {
      /* Critical stockout days */
      if (so && isCrit) criticalDays.add(dateStr);

      /* Monthly units sold */
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthMap[monthKey] = (monthMap[monthKey] || 0) + sold;

      /* Daily lost sales (for cumulative chart) */
      const dayKey = d.toISOString().slice(0, 10);
      dayLostMap[dayKey] = (dayLostMap[dayKey] || 0) + lost;

      /* Daily stockouts (for rolling avg chart) */
      daySoMap[dayKey] = (daySoMap[dayKey] || 0) + so;
    }

    /* By demand class */
    demandMap[dc] = (demandMap[dc] || 0) + lost;

    /* By category */
    categoryMap[cat] = (categoryMap[cat] || 0) + lost;

    /* Per-item stats */
    itemLostMap[name]  = (itemLostMap[name]  || 0) + lost;
    itemSoMap[name]    = (itemSoMap[name]    || 0) + so;
    itemDaysMap[name]  = (itemDaysMap[name]  || 0) + 1;
  });

  /* ── Build chart-ready arrays ─────────────────────────── */

  /* Monthly units sold (sorted chronologically) */
  const monthlySold = Object.entries(monthMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, y]) => ({ label, y }));

  /* Cumulative lost sales by day */
  const sortedDayLost = Object.entries(dayLostMap).sort(([a], [b]) => a.localeCompare(b));
  let runningTotal = 0;
  const cumulativeLost = sortedDayLost.map(([, v], i) => {
    runningTotal += v;
    return { label: "Day " + i, y: runningTotal };
  });

  /* 7-day rolling average of daily stockouts */
  const sortedDaySo = Object.entries(daySoMap).sort(([a], [b]) => a.localeCompare(b));
  const rollingAvg = sortedDaySo.map(([, , i], , arr) => {
    /* recalculated below for clarity */
    return 0;
  });
  const rollingValues = sortedDaySo.map((_, i, arr) => {
    const window = arr.slice(Math.max(0, i - 6), i + 1).map(([, v]) => v);
    return window.reduce((a, b) => a + b, 0) / window.length;
  });

  /* Down-sample rolling values to ≤ 200 points for performance */
  const rStep      = Math.max(1, Math.floor(rollingValues.length / 200));
  const rollingSmall = rollingValues.filter((_, i) => i % rStep === 0);

  /* Lost sales by demand class (top 6, PHP K) */
  const lostByDemand = Object.entries(demandMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([label, v]) => ({ label, value: v / 1000 }));

  /* Lost sales by category (top 10, PHP K) */
  const lostByCategory = Object.entries(categoryMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([label, v]) => ({
      label: label.length > 24 ? label.slice(0, 24) + "…" : label,
      value: v / 1000,
    }));

  /* Top 10 items by lost sales (PHP K) */
  const top10Lost = Object.entries(itemLostMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([label, v]) => ({ label, value: v / 1000 }));

  /* Top 10 items by stockout rate (%) */
  const top10Stockout = Object.keys(itemDaysMap)
    .map((name) => ({
      label: name,
      value: (itemSoMap[name] / itemDaysMap[name]) * 100,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  /* Date range string */
  const allDays    = sortedDayLost.map(([k]) => k);
  const dateRange  = allDays.length
    ? allDays[0] + " to " + allDays[allDays.length - 1]
    : "N/A";

  const totalItems   = items.length || new Set(daily.map((r) => r["Item ID"])).size;
  const totalRecords = daily.length;

  return {
    /* KPIs */
    totalLostSales,
    totalUnitsSold,
    totalExpiredVal,
    criticalStockoutDays: criticalDays.size,

    /* Chart data */
    monthlySold,
    cumulativeLost,
    rollingSmall,

    /* Bar chart data */
    lostByDemand,
    lostByCategory,
    top10Lost,
    top10Stockout,

    /* Meta */
    totalItems,
    totalRecords,
    dateRange,
  };
}


/* ── Render dashboard from aggregated data ────────────────── */

function renderDashboard(data) {
  /* ── KPI cards ─────────────────────────────────────────── */
  document.getElementById("kpi-lost").textContent  = fmtMoney(data.totalLostSales);
  document.getElementById("kpi-sold").textContent  = fmt(data.totalUnitsSold);
  document.getElementById("kpi-exp").textContent   = fmtMoney(data.totalExpiredVal);
  document.getElementById("kpi-crit").textContent  = data.criticalStockoutDays;

  /* ── Sub-header ────────────────────────────────────────── */
  document.getElementById("hdr-sub").textContent =
    `EDA Report · ${data.totalItems} items · ${fmt(data.totalRecords)} records · ${data.dateRange}`;

  /* ── Monthly units sold (line chart) ───────────────────── */
  buildLineChart(
    "chart-monthly",
    data.monthlySold.map((d) => d.label),
    data.monthlySold.map((d) => d.y),
    COLORS.blue
  );

  /* ── Cumulative lost sales (area chart) ─────────────────── */
  const cumStep   = Math.max(1, Math.floor(data.cumulativeLost.length / 200));
  const cumSampled = data.cumulativeLost.filter((_, i) => i % cumStep === 0);
  buildAreaChart(
    "chart-cum",
    cumSampled.map((d) => d.label),
    cumSampled.map((d) => d.y),
    COLORS.red
  );

  /* ── Daily stockouts rolling avg (bar chart) ────────────── */
  buildRollingChart("chart-rolling", data.rollingSmall, COLORS.violet);

  /* ── Horizontal bar charts ──────────────────────────────── */
  renderBarRows("bar-demand",    data.lostByDemand,   COLORS.aqua);
  renderBarRows("bar-cat",       data.lostByCategory, COLORS.violet);
  renderBarRows("bar-top10lost", data.top10Lost,      COLORS.orange);
  renderBarRows("bar-stockout",  data.top10Stockout,  COLORS.blue);

  /* ── Legend ─────────────────────────────────────────────── */
  renderLegend();

  /* ── Show dashboard, hide empty state ───────────────────── */
  document.getElementById("empty-state").hidden = true;
  document.getElementById("dashboard").hidden   = false;
}


/* ── File upload handler ──────────────────────────────────── */

/**
 * Parse an XLSX workbook object and kick off the full render pipeline.
 *
 * @param {object} workbook  - SheetJS workbook
 * @param {string} fileName  - Original file name (for the UI label)
 */
function processWorkbook(workbook, fileName) {
  /* Update file-name label */
  document.getElementById("file-name").textContent = fileName;

  /* Hide any previous error */
  const errorBox = document.getElementById("error-box");
  errorBox.hidden = true;

  /* Locate the two required sheets (fall back to sheet index) */
  const dailySheet = workbook.Sheets["Daily Demand Data"] || workbook.Sheets[workbook.SheetNames[1]];
  const itemSheet  = workbook.Sheets["Item Master"]       || workbook.Sheets[workbook.SheetNames[0]];

  if (!dailySheet) {
    errorBox.textContent =
      "Could not find the "Daily Demand Data" sheet. "
      + "Sheets found: " + workbook.SheetNames.join(", ");
    errorBox.hidden = false;
    return;
  }

  /* Parse rows */
  const daily = XLSX.utils.sheet_to_json(dailySheet, { raw: false });
  const items = itemSheet ? XLSX.utils.sheet_to_json(itemSheet) : [];

  /* Aggregate and render */
  const data = aggregateData(daily, items);
  renderDashboard(data);
}

/* Wire up the hidden file input */
document.getElementById("file-input").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (ev) {
    try {
      const workbook = XLSX.read(ev.target.result, { type: "array", cellDates: true });
      processWorkbook(workbook, file.name);
    } catch (err) {
      const errorBox = document.getElementById("error-box");
      errorBox.textContent = "Error reading file: " + err.message;
      errorBox.hidden = false;
    }
  };
  reader.readAsArrayBuffer(file);

  /* Reset so the same file can be re-uploaded */
  e.target.value = "";
});
