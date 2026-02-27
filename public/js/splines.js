(function splinesModule() {
  const segmentSlider = document.getElementById("spline-segment-slider");
  const segmentValue = document.getElementById("spline-segment-value");
  const targetInputs = document.querySelectorAll('input[name="spline-target"]');
  const modeInputs = document.querySelectorAll('input[name="spline-mode"]');
  const continuityInputs = document.querySelectorAll(
    'input[name="spline-continuity"]',
  );
  const curvatureWrap = document.getElementById("spline-curvature-wrap");
  const supportText = document.getElementById("spline-local-support-text");

  if (
    !segmentSlider ||
    !segmentValue ||
    targetInputs.length === 0 ||
    modeInputs.length === 0 ||
    continuityInputs.length === 0 ||
    !curvatureWrap ||
    !supportText ||
    typeof d3 === "undefined"
  ) {
    return;
  }

  const state = {
    segments: Number(segmentSlider.value),
    target: "runge",
    mode: "global",
    continuity: "C1",
    showCurvature: false,
    activeSegment: 0,
  };

  const domain = [-1, 1];
  const sampleCount = 420;

  const mainSvg = d3.select("#spline-main-chart");
  const errorSvg = d3.select("#spline-error-chart");
  const curvatureSvg = d3.select("#spline-curvature-chart");

  const mainWidth = 760;
  const mainHeight = 360;
  const errorWidth = 760;
  const errorHeight = 190;
  const curvatureWidth = 760;
  const curvatureHeight = 190;

  const mainMargin = { top: 18, right: 20, bottom: 42, left: 56 };
  const errorMargin = { top: 16, right: 20, bottom: 34, left: 56 };
  const curvatureMargin = { top: 16, right: 20, bottom: 34, left: 56 };

  const mainInnerWidth = mainWidth - mainMargin.left - mainMargin.right;
  const mainInnerHeight = mainHeight - mainMargin.top - mainMargin.bottom;
  const errorInnerWidth = errorWidth - errorMargin.left - errorMargin.right;
  const errorInnerHeight = errorHeight - errorMargin.top - errorMargin.bottom;
  const curvatureInnerWidth =
    curvatureWidth - curvatureMargin.left - curvatureMargin.right;
  const curvatureInnerHeight =
    curvatureHeight - curvatureMargin.top - curvatureMargin.bottom;

  const mainG = mainSvg
    .append("g")
    .attr("transform", `translate(${mainMargin.left},${mainMargin.top})`);
  const errorG = errorSvg
    .append("g")
    .attr("transform", `translate(${errorMargin.left},${errorMargin.top})`);
  const curvatureG = curvatureSvg
    .append("g")
    .attr(
      "transform",
      `translate(${curvatureMargin.left},${curvatureMargin.top})`,
    );

  const mainGridG = mainG.append("g").attr("class", "spline-grid");
  const errorGridG = errorG.append("g").attr("class", "spline-grid");
  const curvatureGridG = curvatureG.append("g").attr("class", "spline-grid");

  const mainXAxisG = mainG
    .append("g")
    .attr("class", "spline-axis")
    .attr("transform", `translate(0,${mainInnerHeight})`);
  const mainYAxisG = mainG.append("g").attr("class", "spline-axis");

  const errorXAxisG = errorG
    .append("g")
    .attr("class", "spline-axis")
    .attr("transform", `translate(0,${errorInnerHeight})`);
  const errorYAxisG = errorG.append("g").attr("class", "spline-axis");

  const curvatureXAxisG = curvatureG
    .append("g")
    .attr("class", "spline-axis")
    .attr("transform", `translate(0,${curvatureInnerHeight})`);
  const curvatureYAxisG = curvatureG.append("g").attr("class", "spline-axis");

  mainG
    .append("text")
    .attr("class", "axis-label")
    .attr("x", mainInnerWidth / 2)
    .attr("y", mainInnerHeight + 34)
    .attr("text-anchor", "middle")
    .text("x");
  mainG
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -mainInnerHeight / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .text("y");

  errorG
    .append("text")
    .attr("class", "axis-label")
    .attr("x", errorInnerWidth / 2)
    .attr("y", errorInnerHeight + 30)
    .attr("text-anchor", "middle")
    .text("x");
  errorG
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -errorInnerHeight / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .text("error");

  curvatureG
    .append("text")
    .attr("class", "axis-label")
    .attr("x", curvatureInnerWidth / 2)
    .attr("y", curvatureInnerHeight + 30)
    .attr("text-anchor", "middle")
    .text("x");
  curvatureG
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -curvatureInnerHeight / 2)
    .attr("y", -42)
    .attr("text-anchor", "middle")
    .text("curvature");

  const supportBand = mainG.append("rect").attr("class", "spline-support-band");
  const mainTargetPath = mainG
    .append("path")
    .attr("class", "spline-target-line");
  const mainApproxPath = mainG.append("path").attr("class", "spline-main-line");
  const knotsG = mainG.append("g");

  const errorZeroLine = errorG
    .append("line")
    .attr("stroke", "#94a3b8")
    .attr("stroke-width", 1)
    .attr("stroke-dasharray", "4 4");
  const errorPath = errorG.append("path").attr("class", "spline-error-line");

  const curvatureTargetPath = curvatureG
    .append("path")
    .attr("class", "spline-curvature-target");
  const curvatureApproxPath = curvatureG
    .append("path")
    .attr("class", "spline-curvature-approx");

  const interactionRect = mainG
    .append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", mainInnerWidth)
    .attr("height", mainInnerHeight)
    .attr("fill", "transparent")
    .attr("pointer-events", "all");

  const xScaleMain = d3.scaleLinear().domain(domain).range([0, mainInnerWidth]);
  const xScaleError = d3
    .scaleLinear()
    .domain(domain)
    .range([0, errorInnerWidth]);
  const xScaleCurvature = d3
    .scaleLinear()
    .domain(domain)
    .range([0, curvatureInnerWidth]);

  const yScaleMain = d3.scaleLinear().range([mainInnerHeight, 0]);
  const yScaleError = d3.scaleLinear().range([errorInnerHeight, 0]);
  const yScaleCurvature = d3.scaleLinear().range([curvatureInnerHeight, 0]);

  const lineMain = d3
    .line()
    .x((d) => xScaleMain(d.x))
    .y((d) => yScaleMain(d.y));
  const lineError = d3
    .line()
    .x((d) => xScaleError(d.x))
    .y((d) => yScaleError(d.error));
  const lineCurvature = d3
    .line()
    .x((d) => xScaleCurvature(d.x))
    .y((d) => yScaleCurvature(d.kappa));

  function targetValue(x) {
    if (state.target === "spiral") {
      const t = 5.5 * x;
      return 0.22 * t * Math.cos(1.8 * t) + 0.12 * Math.sin(3.4 * t);
    }
    return 1 / (1 + 25 * x * x);
  }

  function uniformSamples(count) {
    return d3.range(count).map((i) => {
      const t = i / (count - 1);
      const x = domain[0] + t * (domain[1] - domain[0]);
      return { x, y: targetValue(x) };
    });
  }

  function knotData() {
    return d3.range(state.segments + 1).map((i) => {
      const x = domain[0] + (i / state.segments) * (domain[1] - domain[0]);
      return { x, y: targetValue(x), i };
    });
  }

  function barycentricWeights(nodes) {
    return nodes.map((xj, j) => {
      let w = 1;
      for (let k = 0; k < nodes.length; k += 1) {
        if (k !== j) {
          w *= xj - nodes[k];
        }
      }
      return 1 / w;
    });
  }

  function evaluateBarycentric(nodes, values, weights, x) {
    for (let j = 0; j < nodes.length; j += 1) {
      if (Math.abs(x - nodes[j]) < 1e-12) {
        return values[j];
      }
    }

    let numerator = 0;
    let denominator = 0;
    for (let j = 0; j < nodes.length; j += 1) {
      const term = weights[j] / (x - nodes[j]);
      numerator += term * values[j];
      denominator += term;
    }
    return numerator / denominator;
  }

  function segmentIndexFromX(x) {
    const clampedX = Math.max(domain[0], Math.min(domain[1], x));
    const scaled =
      ((clampedX - domain[0]) / (domain[1] - domain[0])) * state.segments;
    return Math.min(state.segments - 1, Math.max(0, Math.floor(scaled)));
  }

  function solveTridiagonal(a, b, c, d) {
    const n = b.length;
    const cp = new Array(n).fill(0);
    const dp = new Array(n).fill(0);

    cp[0] = c[0] / b[0];
    dp[0] = d[0] / b[0];

    for (let i = 1; i < n; i += 1) {
      const denom = b[i] - a[i] * cp[i - 1];
      cp[i] = i === n - 1 ? 0 : c[i] / denom;
      dp[i] = (d[i] - a[i] * dp[i - 1]) / denom;
    }

    const x = new Array(n).fill(0);
    x[n - 1] = dp[n - 1];
    for (let i = n - 2; i >= 0; i -= 1) {
      x[i] = dp[i] - cp[i] * x[i + 1];
    }
    return x;
  }

  function makeNaturalSplineEvaluator(knots) {
    const n = knots.length - 1;
    const xs = knots.map((p) => p.x);
    const ys = knots.map((p) => p.y);
    const h = d3.range(n).map((i) => xs[i + 1] - xs[i]);

    const a = new Array(n + 1).fill(0);
    const b = new Array(n + 1).fill(0);
    const c = new Array(n + 1).fill(0);
    const d = new Array(n + 1).fill(0);

    b[0] = 1;
    b[n] = 1;

    for (let i = 1; i < n; i += 1) {
      a[i] = h[i - 1];
      b[i] = 2 * (h[i - 1] + h[i]);
      c[i] = h[i];
      d[i] = 6 * ((ys[i + 1] - ys[i]) / h[i] - (ys[i] - ys[i - 1]) / h[i - 1]);
    }

    const m = solveTridiagonal(a, b, c, d);

    return function evaluate(x) {
      const idx = Math.max(
        0,
        Math.min(n - 1, d3.bisector((p) => p.x).right(knots, x) - 1),
      );
      const x0 = xs[idx];
      const x1 = xs[idx + 1];
      const hSeg = x1 - x0;
      const t0 = (x1 - x) / hSeg;
      const t1 = (x - x0) / hSeg;

      const part1 = (m[idx] * (x1 - x) ** 3) / (6 * hSeg);
      const part2 = (m[idx + 1] * (x - x0) ** 3) / (6 * hSeg);
      const part3 = (ys[idx] - (m[idx] * hSeg * hSeg) / 6) * t0;
      const part4 = (ys[idx + 1] - (m[idx + 1] * hSeg * hSeg) / 6) * t1;
      return part1 + part2 + part3 + part4;
    };
  }

  function makeHermiteEvaluator(knots) {
    const n = knots.length - 1;
    const xs = knots.map((p) => p.x);
    const ys = knots.map((p) => p.y);

    const slopes = new Array(n + 1).fill(0);
    for (let i = 1; i < n; i += 1) {
      slopes[i] = (ys[i + 1] - ys[i - 1]) / (xs[i + 1] - xs[i - 1]);
    }
    slopes[0] = (ys[1] - ys[0]) / (xs[1] - xs[0]);
    slopes[n] = (ys[n] - ys[n - 1]) / (xs[n] - xs[n - 1]);

    return function evaluate(x) {
      const idx = Math.max(
        0,
        Math.min(n - 1, d3.bisector((p) => p.x).right(knots, x) - 1),
      );
      const x0 = xs[idx];
      const x1 = xs[idx + 1];
      const y0 = ys[idx];
      const y1 = ys[idx + 1];
      const h = x1 - x0;
      const t = (x - x0) / h;

      const h00 = 2 * t ** 3 - 3 * t ** 2 + 1;
      const h10 = t ** 3 - 2 * t ** 2 + t;
      const h01 = -2 * t ** 3 + 3 * t ** 2;
      const h11 = t ** 3 - t ** 2;

      return (
        h00 * y0 + h10 * h * slopes[idx] + h01 * y1 + h11 * h * slopes[idx + 1]
      );
    };
  }

  function makeLinearEvaluator(knots) {
    const n = knots.length - 1;
    return function evaluate(x) {
      const idx = Math.max(
        0,
        Math.min(n - 1, d3.bisector((p) => p.x).right(knots, x) - 1),
      );
      const p0 = knots[idx];
      const p1 = knots[idx + 1];
      const t = (x - p0.x) / (p1.x - p0.x);
      return p0.y + t * (p1.y - p0.y);
    };
  }

  function buildApproximation(knots) {
    if (state.mode === "global") {
      const xs = knots.map((p) => p.x);
      const ys = knots.map((p) => p.y);
      const ws = barycentricWeights(xs);
      return (x) => evaluateBarycentric(xs, ys, ws, x);
    }

    if (state.continuity === "C0") {
      return makeLinearEvaluator(knots);
    }
    if (state.continuity === "C2") {
      return makeNaturalSplineEvaluator(knots);
    }
    return makeHermiteEvaluator(knots);
  }

  function finiteDifferenceDerivatives(values, deltaX) {
    const n = values.length;
    const first = new Array(n).fill(0);
    const second = new Array(n).fill(0);

    for (let i = 1; i < n - 1; i += 1) {
      first[i] = (values[i + 1] - values[i - 1]) / (2 * deltaX);
      second[i] = (values[i + 1] - 2 * values[i] + values[i - 1]) / deltaX ** 2;
    }

    first[0] = (values[1] - values[0]) / deltaX;
    first[n - 1] = (values[n - 1] - values[n - 2]) / deltaX;
    second[0] = second[1];
    second[n - 1] = second[n - 2];

    return { first, second };
  }

  function toCurvature(samples) {
    const deltaX = (domain[1] - domain[0]) / (samples.length - 1);
    const ys = samples.map((d) => d.y);
    const { first, second } = finiteDifferenceDerivatives(ys, deltaX);

    return samples.map((d, i) => {
      const denom = (1 + first[i] * first[i]) ** 1.5;
      return { x: d.x, kappa: second[i] / denom };
    });
  }

  function updateSupportBand(knots) {
    if (state.mode === "global") {
      supportBand
        .attr("x", 0)
        .attr("y", 0)
        .attr("width", mainInnerWidth)
        .attr("height", mainInnerHeight);
      supportText.textContent =
        "Global mode: every knot influences the full domain (no local support).";
      return;
    }

    const leftIndex =
      state.continuity === "C0"
        ? state.activeSegment
        : Math.max(0, state.activeSegment - 1);
    const rightIndex =
      state.continuity === "C0"
        ? state.activeSegment + 1
        : Math.min(knots.length - 1, state.activeSegment + 2);

    const x0 = knots[leftIndex].x;
    const x1 = knots[rightIndex].x;

    supportBand
      .attr("x", xScaleMain(x0))
      .attr("y", 0)
      .attr("width", Math.max(1, xScaleMain(x1) - xScaleMain(x0)))
      .attr("height", mainInnerHeight);

    supportText.textContent =
      "Spline mode: highlighted region shows local support around nearby knots.";
  }

  function render() {
    const targetSamples = uniformSamples(sampleCount);
    const knots = knotData();
    const approxFn = buildApproximation(knots);

    const approxSamples = targetSamples.map((d) => ({
      x: d.x,
      y: approxFn(d.x),
    }));

    const errorSamples = targetSamples.map((d, i) => ({
      x: d.x,
      error: approxSamples[i].y - d.y,
    }));

    yScaleMain.domain([-2, 2]);
    yScaleError.domain([-2, 2]);

    const mainGrid = d3
      .axisLeft(yScaleMain)
      .ticks(6)
      .tickSize(-mainInnerWidth)
      .tickFormat("");
    mainGridG.call(mainGrid);
    mainGridG.select("path").attr("stroke", "none");

    const errorGrid = d3
      .axisLeft(yScaleError)
      .ticks(4)
      .tickSize(-errorInnerWidth)
      .tickFormat("");
    errorGridG.call(errorGrid);
    errorGridG.select("path").attr("stroke", "none");

    mainXAxisG.call(d3.axisBottom(xScaleMain).ticks(8));
    mainYAxisG.call(d3.axisLeft(yScaleMain).ticks(6));
    errorXAxisG.call(d3.axisBottom(xScaleError).ticks(8));
    errorYAxisG.call(d3.axisLeft(yScaleError).ticks(4));

    mainTargetPath.datum(targetSamples).attr("d", lineMain);
    mainApproxPath.datum(approxSamples).attr("d", lineMain);
    errorPath.datum(errorSamples).attr("d", lineError);

    errorZeroLine
      .attr("x1", 0)
      .attr("x2", errorInnerWidth)
      .attr("y1", yScaleError(0))
      .attr("y2", yScaleError(0));

    knotsG
      .selectAll("circle")
      .data(knots)
      .join("circle")
      .attr("class", "spline-knot")
      .attr("r", 4)
      .attr("cx", (d) => xScaleMain(d.x))
      .attr("cy", (d) => yScaleMain(d.y));

    updateSupportBand(knots);

    if (state.showCurvature) {
      const targetCurvature = toCurvature(targetSamples);
      const approxCurvature = toCurvature(approxSamples);

      const cMin =
        d3.min([...targetCurvature, ...approxCurvature], (d) => d.kappa) ?? -1;
      const cMax =
        d3.max([...targetCurvature, ...approxCurvature], (d) => d.kappa) ?? 1;
      const cPad = 0.12 * (cMax - cMin || 1);
      yScaleCurvature.domain([cMin - cPad, cMax + cPad]);

      const curvatureGrid = d3
        .axisLeft(yScaleCurvature)
        .ticks(4)
        .tickSize(-curvatureInnerWidth)
        .tickFormat("");
      curvatureGridG.call(curvatureGrid);
      curvatureGridG.select("path").attr("stroke", "none");

      curvatureXAxisG.call(d3.axisBottom(xScaleCurvature).ticks(8));
      curvatureYAxisG.call(d3.axisLeft(yScaleCurvature).ticks(4));

      curvatureTargetPath.datum(targetCurvature).attr("d", lineCurvature);
      curvatureApproxPath.datum(approxCurvature).attr("d", lineCurvature);
    }
  }

  interactionRect.on("mousemove", (event) => {
    const [mx] = d3.pointer(event);
    const x = xScaleMain.invert(mx);
    state.activeSegment = segmentIndexFromX(x);
    render();
  });

  segmentSlider.addEventListener("input", (event) => {
    state.segments = Number(event.target.value);
    state.activeSegment = Math.min(state.activeSegment, state.segments - 1);
    segmentValue.textContent = String(state.segments);
    render();
  });

  targetInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      state.target = event.target.value;
      render();
    });
  });

  modeInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      state.mode = event.target.value;
      render();
    });
  });

  continuityInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      state.continuity = event.target.value;
      render();
    });
  });

  segmentValue.textContent = String(state.segments);
  render();
})();
