// Build the contents list from the section headings
const tocList = document.getElementById("toc-list");
document.querySelectorAll("main section[id]").forEach(sec => {
  const heading = sec.querySelector("h2");
  if (!heading) return;
  const li = document.createElement("li");
  const link = document.createElement("a");
  link.href = "#" + sec.id;
  link.textContent = sec.dataset.toc || heading.textContent.replace(/^\d+\.\s*/, "");
  li.appendChild(link);
  tocList.appendChild(li);
});

// One line per chart: [div id, spec file]
const charts = [
  ["#vis_s1_map",        "js/specs/s1_map.vg.json"],
  ["#vis_s2_waffle",     "js/specs/s2_waffle.vg.json"],
  ["#vis_s2_activities", "js/specs/s2_activities.vg.json"],
  ["#vis_s3_map",     "js/specs/s3_map.vg.json"],
  ["#vis_s3_cooccur", "js/specs/s3_cooccur.vg.json"],
  ["#vis_s4_strip", "js/specs/s4_strip.vg.json"],
  ["#vis_s4_flags", "js/specs/s4_flags.vg.json"]
  // add the rest here as you build them
];

// actions:false hides the "..." / Open in Vega Editor menu (Week 9, Part 2)
charts.forEach(([div, spec]) => {
  vegaEmbed(div, spec, { actions: false }).catch(console.error);
});
