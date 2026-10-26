/* main.js: builds the contents list, loads the charts, and wires the interactions. */

/* 1. Contents list, built from each section's <h2> */
const tocList = document.getElementById("toc-list");

document.querySelectorAll("main section[id]").forEach(sec => {
  const heading = sec.querySelector("h2");
  if (!heading) return;

  const li = document.createElement("li");
  const link = document.createElement("a");

  link.href = "#" + sec.id;

  // If the heading has a numbered badge (<span class="h2-num">), use only the
  // text that comes after it. Otherwise fall back to stripping a leading "1. ".
  const badge = heading.querySelector(".h2-num");
  link.textContent = badge
    ? heading.textContent.slice(badge.textContent.length).trim()
    : heading.textContent.replace(/^\d+\.\s*/, "");

  li.appendChild(link);
  tocList.appendChild(li);
});


/* 2. Chart registry: [div id, spec file] */
const charts = [
  ["#vis_s1_map",        "js/specs/s1_map.vg.json"],
  ["#vis_s2_waffle",     "js/specs/s2_waffle.vg.json"],
  ["#vis_s2_activities", "js/specs/s2_activities.vg.json"],
  ["#vis_s3_map",        "js/specs/s3_map.vg.json"],
  ["#vis_s3_hist",       "js/specs/s3_hist.vg.json"],
  ["#vis_s3_cooccur",    "js/specs/s3_cooccur.vg.json"],
  ["#vis_s4_strip",      "js/specs/s4_strip.vg.json"],
  ["#vis_s4_flags",      "js/specs/s4_flags.vg.json"],
  ["#vis_s5_map",        "js/specs/s5_map.vg.json"],
  ["#vis_s5_regions",    "js/specs/s5_regions.vg.json"],
  ["#vis_s5_trend",      "js/specs/s5_trend.vg.json"],
  ["#vis_s6_cartogram",  "js/specs/s6_cartogram.vg.json"],
  ["#vis_s6_funnel", "js/specs/s6_funnel.vg.json"]
];


/* 3. Load the charts */
const views = {};            // div id -> live Vega view
let gradeLinked = false;     // the grade link is attached only once

charts.forEach(([div, spec]) => {
  vegaEmbed(div, spec, { actions: false })
    .then(result => {
      views[div] = result.view;

      if (div === "#vis_s3_map") setupFacilityRange(result.view);

      linkGradeSelection();   // does nothing until both Section 5 charts exist
    })
    .catch(console.error);
});


/* 4. Link the Section 5 map legend to the regions chart */
function linkGradeSelection() {
  const map = views["#vis_s5_map"];
  const bars = views["#vis_s5_regions"];
  if (gradeLinked || !map || !bars) return;
  gradeLinked = true;

  map.addSignalListener("gradeSel", (name, value) => {
    const g = value && value.grade;
    const grades = Array.isArray(g) ? g : (g != null ? [g] : []);
    bars.signal("selGrades", grades).run();
  });
}


/* 5. Two-handle facilities slider (Section 3 map) */
function setupFacilityRange(view) {
  const minEl = document.getElementById("fac-min");
  const maxEl = document.getElementById("fac-max");
  const label = document.getElementById("fac-label");
  const fill  = document.getElementById("fac-fill");

  const MAX = 13;     // facilities per beach
  const THUMB = 20;   // handle width in px

  function update(changed) {
    let lo = +minEl.value, hi = +maxEl.value;

    // The handles can't cross: the dragged one pushes the other along
    if (lo > hi) {
      if (changed === minEl) { hi = lo; maxEl.value = hi; }
      else                   { lo = hi; minEl.value = lo; }
    }

    minEl.style.zIndex = (lo === hi && lo >= 7) ? 3 : 1;

    label.textContent = lo === hi
      ? `exactly ${lo} ${lo === 1 ? "facility" : "facilities"}`
      : `${lo} to ${hi} facilities`;

    fill.style.left  = `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${lo / MAX})`;
    fill.style.right = `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${1 - hi / MAX})`;

    view.signal("minFac", lo).signal("maxFac", hi).run();
  }

  minEl.addEventListener("input", () => update(minEl));
  maxEl.addEventListener("input", () => update(maxEl));

  update();
}
