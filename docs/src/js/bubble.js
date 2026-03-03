const CSV_PATH = "../src/data/environment_LPoly.csv";

// Color stops keyed to approximate season midpoints (day of year)
// Winter peak ~Jan 15 (14), Spring ~Apr 15 (105), Summer ~Jul 15 (196), Fall ~Oct 15 (288)
const SEASON_STOPS = [
  { day:   0, r: 120, g: 180, b: 230 }, // Winter
  { day: 105, r: 144, g: 200, b: 120 }, // Spring
  { day: 196, r: 255, g: 185, b:  60 }, // Summer
  { day: 288, r: 200, g: 120, b:  50 }, // Fall
  { day: 365, r: 120, g: 180, b: 230 }, // Winter (wrap)
];

function getSeasonColor(date, opacity = 0.08) {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  const doy  = Math.floor((date - jan1) / 86400000); // day of year 0-364
  let i = 0;
  while (i < SEASON_STOPS.length - 2 && doy >= SEASON_STOPS[i + 1].day) i++;
  const a = SEASON_STOPS[i], b = SEASON_STOPS[i + 1];
  const t = (doy - a.day) / (b.day - a.day);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const gv = Math.round(a.g + (b.g - a.g) * t);
  const bv = Math.round(a.b + (b.b - a.b) * t);
  return `rgba(${r},${gv},${bv},${opacity})`;
}

function getSeasonName(date) {
  const m = date.getMonth();
  if (m >= 2 && m <= 4) return "Spring";
  if (m >= 5 && m <= 7) return "Summer";
  if (m >= 8 && m <= 10) return "Fall";
  return "Winter";
}

const WIDTH  = 760;
const HEIGHT = 460;
const MARGIN = { top: 20, right: 30, bottom: 55, left: 60 };

const INNER_W = WIDTH  - MARGIN.left - MARGIN.right;
const INNER_H = HEIGHT - MARGIN.top  - MARGIN.bottom;

const TRAIL_LENGTH = 14;

// ── SVG setup ────────────────────────────────────────────────────────────────
const svg = d3.select("#chart-container")
  .append("svg")
  .attr("width",  WIDTH)
  .attr("height", HEIGHT);

// Light chart background
svg.append("rect")
  .attr("width", WIDTH).attr("height", HEIGHT)
  .attr("fill", "#fdfdfd");

const g = svg.append("g")
  .attr("transform", `translate(${MARGIN.left},${MARGIN.top})`);

let xScale, yScale, rScale, colorScale;

// ── Load & clean data ─────────────────────────────────────────────────────────
d3.csv(CSV_PATH, row => {
  const temp = +row["sea_water_temperature_ctd"];
  const ph   = +row["sea_water_ph_reported_on_total_scale_seaphox_external"];
  const ml   = +row["Lpoly_expected_ml"];
  const chl  = +row["mass_concentration_of_chlorophyll_in_sea_water_ctd"];
  const dateStr = row["date"];

  if (!temp || !dateStr || ph < 7.5 || ph > 8.9) return null;

  const y = +dateStr.slice(0, 4);
  const m = +dateStr.slice(4, 6) - 1;
  const d = +dateStr.slice(6, 8);

  return {
    date: new Date(y, m, d),
    dateStr,
    temp,
    ph,
    ml:  isNaN(ml)  ? 0 : Math.max(0, ml),
    chl: isNaN(chl) ? 0 : Math.max(0, chl),
  };
}).then(rawData => {

  const data = rawData.filter(Boolean).sort((a, b) => a.date - b.date);

  // ── Scales ───────────────────────────────────────────────────────────────────
  xScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.temp)).nice()
    .range([0, INNER_W]);

  yScale = d3.scaleLinear()
    .domain(d3.extent(data, d => d.ph)).nice()
    .range([INNER_H, 0]);

  const maxMl = d3.max(data, d => d.ml);
  rScale = d3.scaleSqrt()
    .domain([0, maxMl])
    .range([3, 28]);

  // ── Size legend (built from actual data range) ────────────────────────────
  // Fixed meaningful values; rScale gives the exact pixel radius used in the chart
  const legendVals = [1, 10, 25, 50, Math.round(maxMl)];
  document.getElementById("legend-size-row").innerHTML = legendVals.map(v => {
    const d = rScale(v) * 2;
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:2px">
      <div class="legend-bubble" style="width:${d}px;height:${d}px"></div>
      <span>~${v}</span></div>`;
  }).join("");

  colorScale = d3.scaleSequential()
    .domain([0, d3.max(data, d => d.chl)])
    .interpolator(d3.interpolateGreens);

  // ── Grid lines ────────────────────────────────────────────────────────────────
  g.append("g").attr("class", "grid")
    .attr("transform", `translate(0,${INNER_H})`)
    .call(d3.axisBottom(xScale).ticks(8).tickSize(-INNER_H).tickFormat(""));

  g.append("g").attr("class", "grid")
    .call(d3.axisLeft(yScale).ticks(6).tickSize(-INNER_W).tickFormat(""));

  // ── Axes ─────────────────────────────────────────────────────────────────────
  g.append("g").attr("class", "axis")
    .attr("transform", `translate(0,${INNER_H})`)
    .call(d3.axisBottom(xScale).ticks(8).tickFormat(d => `${d}°C`));

  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(yScale).ticks(6));

  g.append("text").attr("class", "axis-label")
    .attr("x", INNER_W / 2).attr("y", INNER_H + 44)
    .attr("text-anchor", "middle")
    .text("Sea Water Temperature (°C)");

  g.append("text").attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -INNER_H / 2).attr("y", -46)
    .attr("text-anchor", "middle")
    .text("Sea Water pH");

  // ── Bloom zone annotation ─────────────────────────────────────────────────────
  g.append("rect")
    .attr("x", xScale(17)).attr("y", 0)
    .attr("width", xScale(22) - xScale(17))
    .attr("height", INNER_H)
    .attr("fill", "rgba(47, 143, 157, 0.07)")
    .attr("pointer-events", "none");

  g.append("text")
    .attr("x", xScale(19.5)).attr("y", 12)
    .attr("text-anchor", "middle")
    .attr("fill", "rgba(31, 78, 95, 0.5)")
    .attr("font-size", "10px")
    .text("Typical bloom temp range");

  // ── Season background (inserted behind grid lines) ────────────────────────────
  const seasonRect = g.insert("rect", ":first-child")
    .attr("x", 0).attr("y", 0)
    .attr("width", INNER_W).attr("height", INNER_H)
    .attr("fill", "transparent")
    .attr("pointer-events", "none");

  // ── Year badge ────────────────────────────────────────────────────────────────
  const yearBadge = g.append("text")
    .attr("x", INNER_W).attr("y", INNER_H + 42)
    .attr("text-anchor", "end")
    .attr("font-size", 22).attr("font-weight", "400")
    .attr("fill", "#999")
    .attr("pointer-events", "none")
    .text("");

  // ── Bubble layer ──────────────────────────────────────────────────────────────
  const bubblesG = g.append("g").attr("class", "bubbles");

  // ── Tooltip ───────────────────────────────────────────────────────────────────
  const tooltip = d3.select("#tooltip");

  function showTip(event, d) {
    const bloomClass = d.ml > 20 ? "high" : d.ml > 5 ? "med" : "low";
    tooltip
      .style("opacity", 1)
      .html(`
        <div class="tip-date">${d.date.toLocaleDateString("en-US", {year:"numeric",month:"short",day:"numeric"})}</div>
        <div class="bloom ${bloomClass}">Bloom: ${d.ml.toFixed(2)} mL</div>
        Temp: ${d.temp.toFixed(2)}°C<br>
        pH: ${d.ph.toFixed(3)}<br>
        Chlorophyll: ${d.chl.toFixed(2)} µg/L
      `);
    moveTip(event);
  }

  function moveTip(event) {
    const [mx, my] = d3.pointer(event, document.getElementById("chart-container"));
    tooltip
      .style("left", `${mx + 14}px`)
      .style("top",  `${my - 10}px`);
  }

  // ── Bloom event detection ─────────────────────────────────────────────────────
  const BLOOM_THRESHOLD = 5; // mL
  const bloomEvents = [];
  let ei = 0;
  while (ei < data.length) {
    if (data[ei].ml >= BLOOM_THRESHOLD) {
      let ej = ei;
      let peak = 0;
      while (ej < data.length && data[ej].ml >= BLOOM_THRESHOLD) {
        if (data[ej].ml > peak) peak = data[ej].ml;
        ej++;
      }
      bloomEvents.push({
        startDate: data[ei].date,
        endDate:   data[ej - 1].date,
        startIdx:  ei,
        duration:  ej - ei,
        peak,
      });
      ei = ej;
    } else {
      ei++;
    }
  }

  // ── Timeline SVG ──────────────────────────────────────────────────────────────
  const TL_W  = WIDTH;
  const TL_H  = 110;
  const TL_M  = { top: 16, right: 30, bottom: 28, left: 60 };
  const TL_IW = TL_W - TL_M.left - TL_M.right;
  const TL_IH = TL_H - TL_M.top  - TL_M.bottom;
  const BAR_H = TL_IH; // event rects fill inner height

  const tlSvg = d3.select("#timeline-container")
    .append("svg")
    .attr("width",  TL_W)
    .attr("height", TL_H);

  tlSvg.append("rect")
    .attr("width", TL_W).attr("height", TL_H)
    .attr("fill", "#fdfdfd");

  const tg = tlSvg.append("g")
    .attr("transform", `translate(${TL_M.left},${TL_M.top})`);

  const tlX = d3.scaleTime()
    .domain(d3.extent(data, d => d.date))
    .range([0, TL_IW]);

  // Baseline track
  tg.append("rect")
    .attr("x", 0).attr("y", TL_IH / 2 - 2)
    .attr("width", TL_IW).attr("height", 4)
    .attr("fill", "#e5e5e5").attr("rx", 2);

  // Color scale: light lavender → dark purple by peak bloom
  const maxPeak = d3.max(bloomEvents, e => e.peak);

  // ── Stat bar ──────────────────────────────────────────────────────────────────
  const longestEvent = d3.max(bloomEvents, e => e.duration);
  const yearBloomDays = {};
  data.forEach(d => {
    if (d.ml >= BLOOM_THRESHOLD) {
      const yr = d.date.getFullYear();
      yearBloomDays[yr] = (yearBloomDays[yr] || 0) + 1;
    }
  });
  const mostActiveYear = Object.entries(yearBloomDays).sort((a, b) => b[1] - a[1])[0][0];
  document.getElementById("bloom-stats").innerHTML = `
    <div class="stat-item"><span class="stat-value">${bloomEvents.length}</span><span class="stat-label">bloom events</span></div>
    <div class="stat-item"><span class="stat-value">${longestEvent}</span><span class="stat-label">longest (days)</span></div>
    <div class="stat-item"><span class="stat-value">${maxPeak.toFixed(1)}</span><span class="stat-label">peak mL</span></div>
    <div class="stat-item"><span class="stat-value">${mostActiveYear}</span><span class="stat-label">most active year</span></div>
  `;

  const eventColor = d3.scaleSequential()
    .domain([0, maxPeak])
    .interpolator(d3.interpolate("#A8DCE0", "#1F4E5F"));

  const tlTip = d3.select("#timeline-tip");

  // Event rectangles
  tg.selectAll("rect.event-rect")
    .data(bloomEvents)
    .join("rect")
    .attr("class", "event-rect")
    .attr("x",      e => tlX(e.startDate))
    .attr("y",      0)
    .attr("width",  e => Math.max(3, tlX(e.endDate) - tlX(e.startDate)))
    .attr("height", BAR_H)
    .attr("rx", 2)
    .attr("fill",    e => eventColor(e.peak))
    .attr("opacity", 0.85)
    .on("mouseover", (event, e) => {
      tlTip.style("opacity", 1).html(`
        <div class="tip-peak">Peak: ${e.peak.toFixed(1)} mL</div>
        ${e.startDate.toLocaleDateString("en-US", {month:"short", day:"numeric", year:"numeric"})}<br>
        Duration: ${e.duration} day${e.duration > 1 ? "s" : ""}
      `);
    })
    .on("mousemove", event => {
      tlTip
        .style("left", `${event.clientX + 12}px`)
        .style("top",  `${event.clientY - 36}px`);
    })
    .on("mouseleave", () => tlTip.style("opacity", 0))
    .on("click", (event, e) => {
      stopPlay();
      currentIdx = e.startIdx;
      renderFrame(currentIdx);
    });

  // X axis — year ticks only
  tg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${TL_IH})`)
    .call(
      d3.axisBottom(tlX)
        .ticks(d3.timeYear.every(1))
        .tickFormat(d3.timeFormat("%Y"))
    );

  // Cursor line (moves with animation)
  let timelineCursor = tg.append("line")
    .attr("x1", 0).attr("x2", 0)
    .attr("y1", -4).attr("y2", TL_IH + 4)
    .attr("stroke", "#2F8F9D")
    .attr("stroke-width", 1.5)
    .attr("stroke-dasharray", "3,2")
    .attr("pointer-events", "none");

  // ── Animation state ───────────────────────────────────────────────────────────
  let currentIdx = 0;
  let playing = false;
  let timer = null;

  const slider    = document.getElementById("date-slider");
  const dateLabel = document.getElementById("date-label");
  const playBtn   = document.getElementById("play-btn");
  const speedSel  = document.getElementById("speed-select");

  slider.max = data.length - 1;

  function renderFrame(idx) {
    const trailStart = Math.max(0, idx - TRAIL_LENGTH + 1);
    const visible = data.slice(trailStart, idx + 1);

    const circles = bubblesG.selectAll("circle.bubble")
      .data(visible, d => d.dateStr);

    circles.enter()
      .append("circle")
      .attr("class", "bubble")
      .attr("cx", d => xScale(d.temp))
      .attr("cy", d => yScale(d.ph))
      .attr("r",  0)
      .merge(circles)
      .attr("cx", d => xScale(d.temp))
      .attr("cy", d => yScale(d.ph))
      .attr("fill",   d => colorScale(d.chl))
      .attr("opacity", (d, i) => {
        const age = visible.length - 1 - i;
        return age === 0 ? 0.95 : Math.max(0.2, 0.65 - age * (0.65 / TRAIL_LENGTH));
      })
      .transition().duration(100)
      .attr("r", d => rScale(d.ml));

    circles.exit()
      .transition().duration(200)
      .attr("r", 0)
      .remove();

    bubblesG.selectAll("circle.bubble")
      .on("mouseover", showTip)
      .on("mousemove", moveTip)
      .on("mouseleave", () => tooltip.style("opacity", 0));

    const d = data[idx];
    dateLabel.textContent = d.date.toLocaleDateString("en-US", {
      year: "numeric", month: "short", day: "numeric"
    });
    slider.value = idx;

    // Move timeline cursor
    timelineCursor.attr("x1", tlX(d.date)).attr("x2", tlX(d.date));

    // Season badge
    yearBadge.text(getSeasonName(d.date))
      .attr("fill", getSeasonColor(d.date, 0.65));

    // Season background (smoothly interpolated)
    seasonRect.attr("fill", getSeasonColor(d.date));

    // Active event highlight on timeline
    tg.selectAll("rect.event-rect")
      .attr("stroke", e => (d.date >= e.startDate && d.date <= e.endDate) ? "#4B365F" : "none")
      .attr("stroke-width", 2);
  }

  function step() {
    if (currentIdx >= data.length - 1) { stopPlay(); return; }
    currentIdx++;
    renderFrame(currentIdx);
  }

  function startPlay() {
    playing = true;
    playBtn.textContent = "⏸ Pause";
    timer = setInterval(step, +speedSel.value);
  }

  function stopPlay() {
    playing = false;
    playBtn.textContent = "▶ Play";
    clearInterval(timer);
    timer = null;
  }

  playBtn.addEventListener("click", () => {
    if (playing) { stopPlay(); }
    else {
      if (currentIdx >= data.length - 1) currentIdx = 0;
      startPlay();
    }
  });

  slider.addEventListener("input", () => {
    stopPlay();
    currentIdx = +slider.value;
    renderFrame(currentIdx);
  });

  speedSel.addEventListener("change", () => {
    if (playing) { stopPlay(); startPlay(); }
  });

  renderFrame(0);
});