(function aliasingModule() {
  const nSlider = document.getElementById("aliasing-n-slider");
  const nValue = document.getElementById("aliasing-n-value");
  const freqReadout = document.getElementById("aliasing-freq-readout");

  if (
    !nSlider ||
    !nValue ||
    !freqReadout ||
    typeof d3 === "undefined"
  ) {
    return;
  }

  const state = { N: Number(nSlider.value) };

  const domain = [0, 1];
  const sampleCount = 800;

  const svg = d3.select("#aliasing-chart");
  const width = 760;
  const height = 360;
  const margin = { top: 20, right: 20, bottom: 42, left: 58 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const chartG = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().domain(domain).range([0, innerWidth]);
  const yScale = d3.scaleLinear().domain([-1.35, 1.35]).range([innerHeight, 0]);

  const gridG = chartG.append("g").attr("class", "aliasing-grid");
  const xAxisG = chartG
    .append("g")
    .attr("class", "aliasing-axis")
    .attr("transform", `translate(0,${innerHeight})`);
  const yAxisG = chartG.append("g").attr("class", "aliasing-axis");

  chartG
    .append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 34)
    .attr("text-anchor", "middle")
    .text("x");

  chartG
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .text("y");

  const truePath = chartG.append("path").attr("class", "aliasing-true-line");
  const aliasPath = chartG.append("path").attr("class", "aliasing-alias-line");
  const samplesG = chartG.append("g");

  const line = d3
    .line()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  function trueSignal(x) {
    return Math.sin(2 * Math.PI * x);
  }

  function aliasSignal(x, N) {
    return Math.sin(2 * Math.PI * (1 + N) * x);
  }

  function buildCurve(fn) {
    return d3.range(sampleCount).map((i) => {
      const x = domain[0] + (i / (sampleCount - 1)) * (domain[1] - domain[0]);
      return { x, y: fn(x) };
    });
  }

  function render() {
    const N = state.N;

    const yGrid = d3
      .axisLeft(yScale)
      .ticks(6)
      .tickSize(-innerWidth)
      .tickFormat("");
    gridG.call(yGrid);
    gridG.selectAll("line").attr("stroke", "#e5e7eb").attr("opacity", 0.8);
    gridG.select("path").attr("stroke", "none");

    xAxisG.call(d3.axisBottom(xScale).ticks(10));
    yAxisG.call(d3.axisLeft(yScale).ticks(6));

    truePath.datum(buildCurve(trueSignal)).attr("d", line);
    aliasPath.datum(buildCurve((x) => aliasSignal(x, N))).attr("d", line);

    const samplePoints = d3.range(N).map((k) => ({
      x: k / N,
      y: trueSignal(k / N),
    }));

    samplesG
      .selectAll("circle")
      .data(samplePoints)
      .join("circle")
      .attr("class", "aliasing-sample-dot")
      .attr("r", 4)
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y));

    freqReadout.innerHTML = `True: sin(2&pi;x) &nbsp;&middot;&nbsp; Alias: sin(2&pi;&middot;${1 + N}x)`;
  }

  nSlider.addEventListener("input", (event) => {
    state.N = Number(event.target.value);
    nValue.textContent = String(state.N);
    render();
  });

  nValue.textContent = String(state.N);
  render();
})();
