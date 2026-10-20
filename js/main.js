/* ==========================================================================
   main.js: wires the page together.
   It does three things:
   1. Builds the clickable contents list in the hero from the section headings.
   2. Loads every Vega-Lite chart into its <div> with vega-embed.
   3. Connects interactions that Vega-Lite can't do on its own across charts
      (the two-handle facilities slider, and the grade link between charts).
   ========================================================================== */


/* --------------------------------------------------------------------------
   1. CONTENTS LIST
   Rather than hand-writing a link for each section, this reads the page and
   builds the list, so a new section appears in the contents automatically.
   -------------------------------------------------------------------------- */

// The empty <ol id="toc-list"> in the hero that we fill with links
const tocList = document.getElementById("toc-list");

// Find every <section> inside <main> that has an id (s1, s2, ...)
document.querySelectorAll("main section[id]").forEach(sec => {
  const heading = sec.querySelector("h2");   // each section's title
  if (!heading) return;                      // skip a section with no <h2>

  const li = document.createElement("li");
  const link = document.createElement("a");

  link.href = "#" + sec.id;                  // clicking jumps to the section (smooth scroll is set in CSS)

  // Use a short name from a data-toc="..." attribute if the section has one;
  // otherwise use the heading text with its leading "1. " number stripped,
  // because the CSS list numbers itself.
  link.textContent =
    sec.dataset.toc || heading.textContent.replace(/^\d+\.\s*/, "");

  li.appendChild(link);
  tocList.appendChild(li);
});


/* --------------------------------------------------------------------------
   2. CHART REGISTRY
   One entry per chart: [the id of the <div> to draw into, the spec file].
   Adding a chart means writing its spec file and adding one line here.
   -------------------------------------------------------------------------- */
const charts = [
  ["#vis_s1_map",        "js/specs/s1_map.vg.json"],        // Section 1: coastline choropleth + top 10 beaches
  ["#vis_s2_waffle",     "js/specs/s2_waffle.vg.json"],     // Section 2: waffle chart of beach visits
  ["#vis_s2_activities", "js/specs/s2_activities.vg.json"], // Section 2: activities by frequency
  ["#vis_s3_map",        "js/specs/s3_map.vg.json"],        // Section 3: Victorian beaches by facility count
  ["#vis_s3_hist",       "js/specs/s3_hist.vg.json"],       // Section 3: beaches per facility band
  ["#vis_s3_cooccur",    "js/specs/s3_cooccur.vg.json"],    // Section 3: which facilities occur together
  ["#vis_s4_strip",      "js/specs/s4_strip.vg.json"],      // Section 4: facilities vs hazard rating
  ["#vis_s4_flags",      "js/specs/s4_flags.vg.json"],      // Section 4: physical features by hazard rating
  ["#vis_s5_map",        "js/specs/s5_map.vg.json"],        // Section 5: Sydney water-quality map
  ["#vis_s5_regions",    "js/specs/s5_regions.vg.json"],    // Section 5: grades by region
  ["#vis_s6_cartogram",  "js/specs/s6_cartogram.vg.json"]   // Section 6: coastal drowning cartogram
  // add the rest here as you build them
];


/* --------------------------------------------------------------------------
   3. LOADING THE CHARTS
   vegaEmbed(target, spec, options) draws a Vega-Lite spec into a <div> and
   returns a Promise. When it finishes, result.view is a handle to the live
   chart, which we keep so other code can talk to it later.
   -------------------------------------------------------------------------- */

// actions:false hides the "..." / Open in Vega Editor menu (Week 9, Part 2)
const views = {};            // div id -> live Vega view, filled in as charts load
let gradeLinked = false;     // makes sure we only attach the grade link once

charts.forEach(([div, spec]) => {
  vegaEmbed(div, spec, { actions: false })
    .then(result => {
      views[div] = result.view;            // remember this chart's view

      // The facilities slider is plain HTML, so it can only be hooked up
      // once the Victorian map exists.
      if (div === "#vis_s3_map") setupFacilityRange(result.view);

      // Charts load independently and in any order. After each one loads we
      // try to link the two Section 5 charts; the function does nothing
      // until both are ready.
      linkGradeSelection();
    })
    .catch(console.error);                 // show a bad spec or missing file in the console
});


/* --------------------------------------------------------------------------
   4. LINKING TWO CHARTS (Section 5)
   Vega-Lite selections only work inside one chart, but the Sydney map and the
   regions bar chart are separate specs. So we listen for changes to the map's
   legend selection and pass the chosen grades into the bar chart.

   How the two specs cooperate:
   - s5_map.vg.json defines a selection called "gradeSel", bound to its legend
   - s5_regions.vg.json defines a parameter called "selGrades" (an empty list)
     and fades any bar segment whose grade isn't in that list
   -------------------------------------------------------------------------- */
function linkGradeSelection() {
  const map = views["#vis_s5_map"];
  const bars = views["#vis_s5_regions"];

  // Wait until both charts have loaded; only link once
  if (gradeLinked || !map || !bars) return;
  gradeLinked = true;

  // Runs every time the user clicks a grade in the map's legend
  map.addSignalListener("gradeSel", (name, value) => {
    const g = value && value.grade;       // the selected grade(s), or undefined if cleared

    // Normalise to an array: a list stays a list, a single value is wrapped,
    // and nothing selected becomes an empty list (which means "show all").
    const grades = Array.isArray(g) ? g : (g != null ? [g] : []);

    // Push the list into the bar chart's parameter, then redraw it
    bars.signal("selGrades", grades).run();
  });
}


/* --------------------------------------------------------------------------
   5. TWO-HANDLE FACILITIES SLIDER (Section 3 map)
   Vega-Lite only offers single-handle sliders, so this one is built from two
   overlapping <input type="range"> elements in the HTML. Whenever either
   moves, we update the label, the blue bar between the handles, and the map's
   two filter values (minFac / maxFac) so the dots filter live.
   -------------------------------------------------------------------------- */
function setupFacilityRange(view) {
  // The HTML elements for the slider (ids come from index.html)
  const minEl = document.getElementById("fac-min");     // left handle
  const maxEl = document.getElementById("fac-max");     // right handle
  const label = document.getElementById("fac-label");   // text like "3 to 8 facilities"
  const fill  = document.getElementById("fac-fill");    // the blue bar between handles

  const MAX = 13;     // beaches have 0 to 13 facilities
  const THUMB = 20;   // handle width in px, used to line the blue bar up with the handles

  // Called whenever a handle moves. `changed` is the handle being dragged.
  function update(changed) {
    // + turns the input's string value into a number
    let lo = +minEl.value, hi = +maxEl.value;

    // The handles can't cross: if the dragged one passes the other, it pushes
    // the other along with it.
    if (lo > hi) {
      if (changed === minEl) { hi = lo; maxEl.value = hi; }
      else                   { lo = hi; minEl.value = lo; }
    }

    // When both handles sit together near the top end, put the left handle on
    // top so it can still be grabbed and dragged back down.
    minEl.style.zIndex = (lo === hi && lo >= 7) ? 3 : 1;

    // Plain-English label, with different wording for a single value
    label.textContent = lo === hi
      ? `exactly ${lo} ${lo === 1 ? "facility" : "facilities"}`
      : `${lo} to ${hi} facilities`;

    // Position the blue bar. A range input's handle travels across the track
    // width minus its own width, so we offset by half a handle at each end.
    fill.style.left  = `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${lo / MAX})`;
    fill.style.right = `calc(${THUMB / 2}px + (100% - ${THUMB}px) * ${1 - hi / MAX})`;

    // Send the values to the map. signal() sets a parameter defined in the spec
    // and run() makes Vega re-filter and redraw.
    view.signal("minFac", lo).signal("maxFac", hi).run();
  }

  // "input" fires continuously while dragging, so the map updates live
  minEl.addEventListener("input", () => update(minEl));
  maxEl.addEventListener("input", () => update(maxEl));

  update();   // run once now so the label, bar and map start in sync
}