(function approximateInfiniteModule() {
  const segmentSlider = document.getElementById("infinite-segment-slider");
  const segmentValue = document.getElementById("infinite-segment-value");
  const zoomSlider = document.getElementById("infinite-zoom-slider");
  const zoomValue = document.getElementById("infinite-zoom-value");
  const showExactInput = document.getElementById("infinite-show-exact");
  const showCubicInput = document.getElementById("infinite-show-cubic");
  const showPolyInput = document.getElementById("infinite-show-poly");
  const overlayInput = document.getElementById("infinite-overlay-toggle");
  const heatmapInput = document.getElementById("infinite-heatmap-toggle");
  const curvatureInput = document.getElementById("infinite-curvature-toggle");
  const selfSimilarityInput = document.getElementById(
    "infinite-self-sim-toggle",
  );
  const errorGraphInput = document.getElementById(
    "infinite-error-graph-toggle",
  );
  const metricsText = document.getElementById("infinite-metrics");
  const heatmapWrap = document.getElementById("infinite-heatmap-wrap");
  const curvatureWrap = document.getElementById("infinite-curvature-wrap");
  const errorGraphWrap = document.getElementById("infinite-error-graph-wrap");

  if (
    !segmentSlider ||
    !segmentValue ||
    !zoomSlider ||
    !zoomValue ||
    !showExactInput ||
    !showCubicInput ||
    !showPolyInput ||
    !overlayInput ||
    !heatmapInput ||
    !curvatureInput ||
    !selfSimilarityInput ||
    !errorGraphInput ||
    !metricsText ||
    !heatmapWrap ||
    !curvatureWrap ||
    !errorGraphWrap ||
    typeof d3 === "undefined"
  ) {
    return;
  }

  const state = {
    segments: Number(segmentSlider.value),
    zoomRaw: Number(zoomSlider.value),
    showExact: showExactInput.checked,
    showCubic: showCubicInput.checked,
    showPoly: showPolyInput.checked,
    overlay: overlayInput.checked,
    showHeatmap: heatmapInput.checked,
    showCurvature: curvatureInput.checked,
    showSelfSimilarity: selfSimilarityInput.checked,
    showErrorGraph: errorGraphInput.checked,
  };

  const spiralA = 0.14;
  const spiralB = 0.21;
  const thetaCenter = 4 * Math.PI;
  const baseThetaSpan = 6 * Math.PI;
  const sampleCount = 720;

  const mainWidth = 760;
  const mainHeight = 380;
  const mainMargin = { top: 18, right: 20, bottom: 42, left: 54 };
  const mainInnerWidth = mainWidth - mainMargin.left - mainMargin.right;
  const mainInnerHeight = mainHeight - mainMargin.top - mainMargin.bottom;

  const heatWidth = 760;
  const heatHeight = 90;
  const heatMargin = { top: 10, right: 20, bottom: 28, left: 54 };
  const heatInnerWidth = heatWidth - heatMargin.left - heatMargin.right;
  const heatInnerHeight = heatHeight - heatMargin.top - heatMargin.bottom;

  const curvatureWidth = 760;
  const curvatureHeight = 190;
  const curvatureMargin = { top: 14, right: 20, bottom: 34, left: 54 };
  const curvatureInnerWidth =
    curvatureWidth - curvatureMargin.left - curvatureMargin.right;
  const curvatureInnerHeight =
    curvatureHeight - curvatureMargin.top - curvatureMargin.bottom;

  const errorWidth = 760;
  const errorHeight = 190;
  const errorMargin = { top: 14, right: 20, bottom: 34, left: 54 };
  const errorInnerWidth = errorWidth - errorMargin.left - errorMargin.right;
  const errorInnerHeight = errorHeight - errorMargin.top - errorMargin.bottom;

  const mainSvg = d3.select("#infinite-main-chart");
  const heatSvg = d3.select("#infinite-heatmap-chart");
  const curvatureSvg = d3.select("#infinite-curvature-chart");
  const errorSvg = d3.select("#infinite-error-graph");

  const mainG = mainSvg
    .append("g")
    .attr("transform", `translate(${mainMargin.left},${mainMargin.top})`);
  const heatG = heatSvg
    .append("g")
    .attr("transform", `translate(${heatMargin.left},${heatMargin.top})`);
  const curvatureG = curvatureSvg
    .append("g")
    .attr(
      "transform",
      `translate(${curvatureMargin.left},${curvatureMargin.top})`,
    );
  const errorG = errorSvg
    .append("g")
    .attr("transform", `translate(${errorMargin.left},${errorMargin.top})`);

  const mainGridG = mainG.append("g").attr("class", "infinite-grid");
  const mainXAxisG = mainG
    .append("g")
    .attr("class", "infinite-axis")
    .attr("transform", `translate(0,${mainInnerHeight})`);
  const mainYAxisG = mainG.append("g").attr("class", "infinite-axis");

  const heatXAxisG = heatG
    .append("g")
    .attr("class", "infinite-axis")
    .attr("transform", `translate(0,${heatInnerHeight})`);

  const curvatureGridG = curvatureG.append("g").attr("class", "infinite-grid");
  const curvatureXAxisG = curvatureG
    .append("g")
    .attr("class", "infinite-axis")
    .attr("transform", `translate(0,${curvatureInnerHeight})`);
  const curvatureYAxisG = curvatureG.append("g").attr("class", "infinite-axis");

  const errorGridG = errorG.append("g").attr("class", "infinite-grid");
  const errorXAxisG = errorG
    .append("g")
    .attr("class", "infinite-axis")
    .attr("transform", `translate(0,${errorInnerHeight})`);
  const errorYAxisG = errorG.append("g").attr("class", "infinite-axis");

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
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("y");

  heatG
    .append("text")
    .attr("class", "axis-label")
    .attr("x", heatInnerWidth / 2)
    .attr("y", heatInnerHeight + 24)
    .attr("text-anchor", "middle")
    .text("θ");

  curvatureG
    .append("text")
    .attr("class", "axis-label")
    .attr("x", curvatureInnerWidth / 2)
    .attr("y", curvatureInnerHeight + 30)
    .attr("text-anchor", "middle")
    .text("θ");
  curvatureG
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -curvatureInnerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("curvature");

  errorG
    .append("text")
    .attr("class", "axis-label")
    .attr("x", errorInnerWidth / 2)
    .attr("y", errorInnerHeight + 30)
    .attr("text-anchor", "middle")
    .text("segments");
  errorG
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -errorInnerHeight / 2)
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("RMS error");

  const exactPath = mainG.append("path").attr("class", "infinite-exact-line");
  const cubicPath = mainG.append("path").attr("class", "infinite-cubic-line");
  const polyPath = mainG.append("path").attr("class", "infinite-poly-line");
  const selfSimPath = mainG
    .append("path")
    .attr("class", "infinite-self-sim-line");

  const heatCellsG = heatG.append("g");

  const curvatureExactPath = curvatureG
    .append("path")
    .attr("class", "infinite-curvature-exact");
  const curvatureApproxPath = curvatureG
    .append("path")
    .attr("class", "infinite-curvature-approx");

  const errorPath = errorG.append("path").attr("class", "infinite-error-line");

  const xScaleMain = d3.scaleLinear().range([0, mainInnerWidth]);
  const yScaleMain = d3.scaleLinear().range([mainInnerHeight, 0]);
  const thetaScaleHeat = d3.scaleLinear().range([0, heatInnerWidth]);
  const thetaScaleCurvature = d3.scaleLinear().range([0, curvatureInnerWidth]);
  const curvatureScale = d3.scaleLinear().range([curvatureInnerHeight, 0]);
  const segmentScale = d3.scaleLinear().range([0, errorInnerWidth]);
  const errorScale = d3.scaleLinear().range([errorInnerHeight, 0]);

  const lineMain = d3
    .line()
    .x((d) => xScaleMain(d.x))
    .y((d) => yScaleMain(d.y));
  const lineCurvature = d3
    .line()
    .x((d) => thetaScaleCurvature(d.theta))
    .y((d) => curvatureScale(d.kappa));
  const lineError = d3
    .line()
    .x((d) => segmentScale(d.segments))
    .y((d) => errorScale(d.rms));

  function zoomFactor(rawZoom) {
    return Math.pow(2, rawZoom / 20);
  }

  function thetaDomain() {
    const zoom = zoomFactor(state.zoomRaw);
    const span = Math.max(0.24, baseThetaSpan / zoom);
    return [Math.max(0.12, thetaCenter - span / 2), thetaCenter + span / 2];
  }

  function spiralPoint(theta) {
    const radius = spiralA * Math.exp(spiralB * theta);
    return {
      theta,
      x: radius * Math.cos(theta),
      y: radius * Math.sin(theta),
    };
  }

  function uniformThetas(thetaMin, thetaMax, count) {
    return d3.range(count).map((index) => {
      const t = index / (count - 1);
      return thetaMin + t * (thetaMax - thetaMin);
    });
  }

  function knotThetas(thetaMin, thetaMax, count) {
    return d3
      .range(count + 1)
      .map((index) => thetaMin + (index / count) * (thetaMax - thetaMin));
  }

  function solveLinearSystem(matrix, vector) {
    const n = vector.length;
    const a = matrix.map((row) => row.slice());
    const b = vector.slice();

    for (let i = 0; i < n; i += 1) {
      let pivot = i;
      for (let r = i + 1; r < n; r += 1) {
        if (Math.abs(a[r][i]) > Math.abs(a[pivot][i])) {
          pivot = r;
        }
      }

      if (Math.abs(a[pivot][i]) < 1e-12) {
        return new Array(n).fill(0);
      }

      if (pivot !== i) {
        const rowTemp = a[i];
        a[i] = a[pivot];
        a[pivot] = rowTemp;

        const bTemp = b[i];
        b[i] = b[pivot];
        b[pivot] = bTemp;
      }

      const diag = a[i][i];
      for (let c = i; c < n; c += 1) {
        a[i][c] /= diag;
      }
      b[i] /= diag;

      for (let r = 0; r < n; r += 1) {
        if (r === i) {
          continue;
        }
        const factor = a[r][i];
        if (Math.abs(factor) < 1e-14) {
          continue;
        }
        for (let c = i; c < n; c += 1) {
          a[r][c] -= factor * a[i][c];
        }
        b[r] -= factor * b[i];
      }
    }

    return b;
  }

  function leastSquaresPolynomial(thetas, values, degree, thetaMin, thetaMax) {
    const n = degree + 1;
    const ata = Array.from({ length: n }, () => new Array(n).fill(0));
    const atb = new Array(n).fill(0);

    for (let i = 0; i < thetas.length; i += 1) {
      const theta = thetas[i];
      const y = values[i];
      const tNorm =
        ((theta - thetaMin) / (thetaMax - thetaMin || 1e-9)) * 2 - 1;
      const powers = new Array(n).fill(1);
      for (let p = 1; p < n; p += 1) {
        powers[p] = powers[p - 1] * tNorm;
      }

      for (let r = 0; r < n; r += 1) {
        atb[r] += powers[r] * y;
        for (let c = 0; c < n; c += 1) {
          ata[r][c] += powers[r] * powers[c];
        }
      }
    }

    return solveLinearSystem(ata, atb);
  }

  function evaluatePolynomial(coefficients, theta, thetaMin, thetaMax) {
    const tNorm = ((theta - thetaMin) / (thetaMax - thetaMin || 1e-9)) * 2 - 1;
    let value = 0;
    let power = 1;
    for (let i = 0; i < coefficients.length; i += 1) {
      value += coefficients[i] * power;
      power *= tNorm;
    }
    return value;
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

  function makeNaturalSplineEvaluator(xs, ys) {
    const n = xs.length - 1;
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

    const secondDerivatives = solveTridiagonal(a, b, c, d);

    return function evaluate(x) {
      const i = Math.max(0, Math.min(n - 1, d3.bisectRight(xs, x) - 1));
      const x0 = xs[i];
      const x1 = xs[i + 1];
      const hSeg = x1 - x0;
      const t0 = (x1 - x) / hSeg;
      const t1 = (x - x0) / hSeg;

      const part1 = (secondDerivatives[i] * (x1 - x) ** 3) / (6 * hSeg);
      const part2 = (secondDerivatives[i + 1] * (x - x0) ** 3) / (6 * hSeg);
      const part3 = (ys[i] - (secondDerivatives[i] * hSeg * hSeg) / 6) * t0;
      const part4 =
        (ys[i + 1] - (secondDerivatives[i + 1] * hSeg * hSeg) / 6) * t1;

      return part1 + part2 + part3 + part4;
    };
  }

  function buildApproximations(thetaValues, thetaMin, thetaMax) {
    const knots = knotThetas(thetaMin, thetaMax, state.segments);
    const knotPoints = knots.map(spiralPoint);

    const splineX = makeNaturalSplineEvaluator(
      knotPoints.map((point) => point.theta),
      knotPoints.map((point) => point.x),
    );
    const splineY = makeNaturalSplineEvaluator(
      knotPoints.map((point) => point.theta),
      knotPoints.map((point) => point.y),
    );

    const cubic = thetaValues.map((theta) => ({
      theta,
      x: splineX(theta),
      y: splineY(theta),
    }));

    const degree = Math.min(
      12,
      Math.max(3, Math.floor(state.segments / 2) + 1),
    );
    const polyXCoefficients = leastSquaresPolynomial(
      knots,
      knotPoints.map((point) => point.x),
      degree,
      thetaMin,
      thetaMax,
    );
    const polyYCoefficients = leastSquaresPolynomial(
      knots,
      knotPoints.map((point) => point.y),
      degree,
      thetaMin,
      thetaMax,
    );

    const polynomial = thetaValues.map((theta) => ({
      theta,
      x: evaluatePolynomial(polyXCoefficients, theta, thetaMin, thetaMax),
      y: evaluatePolynomial(polyYCoefficients, theta, thetaMin, thetaMax),
    }));

    return { cubic, polynomial };
  }

  function pairwiseError(exactPoints, approxPoints) {
    return exactPoints.map((exactPoint, index) => {
      const approxPoint = approxPoints[index];
      const dx = exactPoint.x - approxPoint.x;
      const dy = exactPoint.y - approxPoint.y;
      return {
        theta: exactPoint.theta,
        e: Math.hypot(dx, dy),
      };
    });
  }

  function curvatureSeries(points) {
    if (points.length < 3) {
      return [];
    }

    const series = [];
    for (let i = 1; i < points.length - 1; i += 1) {
      const prev = points[i - 1];
      const current = points[i];
      const next = points[i + 1];

      const h = (next.theta - prev.theta) / 2;
      const xPrime = (next.x - prev.x) / (2 * h);
      const yPrime = (next.y - prev.y) / (2 * h);
      const xSecond = (next.x - 2 * current.x + prev.x) / (h * h);
      const ySecond = (next.y - 2 * current.y + prev.y) / (h * h);
      const numerator = Math.abs(xPrime * ySecond - yPrime * xSecond);
      const denominator =
        Math.pow(xPrime * xPrime + yPrime * yPrime, 1.5) + 1e-9;

      series.push({
        theta: current.theta,
        kappa: numerator / denominator,
      });
    }

    return series;
  }

  function selfSimilarityTrace(points) {
    const delta = Math.PI / 2;
    const scale = Math.exp(-spiralB * delta);
    const cos = Math.cos(-delta);
    const sin = Math.sin(-delta);

    return points.map((point) => ({
      theta: point.theta,
      x: scale * (point.x * cos - point.y * sin),
      y: scale * (point.x * sin + point.y * cos),
    }));
  }

  function selectDiagnosticApproximation(cubic, polynomial) {
    if (state.showCubic) {
      return { name: "cubic", points: cubic };
    }
    if (state.showPoly) {
      return { name: "poly", points: polynomial };
    }
    return null;
  }

  function errorBySegments(thetaValues, thetaMin, thetaMax) {
    const segmentValues = d3.range(4, 49, 2);
    const diagnosticMode =
      state.showCubic || !state.showPoly ? "cubic" : "poly";

    return segmentValues.map((segments) => {
      const previousSegments = state.segments;
      state.segments = segments;
      const approximations = buildApproximations(
        thetaValues,
        thetaMin,
        thetaMax,
      );
      state.segments = previousSegments;

      const exact = thetaValues.map(spiralPoint);
      const approxPoints =
        diagnosticMode === "cubic"
          ? approximations.cubic
          : approximations.polynomial;
      const errors = pairwiseError(exact, approxPoints);
      const rms = Math.sqrt(d3.mean(errors, (d) => d.e * d.e) || 0);

      return { segments, rms };
    });
  }

  function drawMainGrid() {
    mainGridG
      .selectAll("line.grid-x")
      .data(xScaleMain.ticks(8))
      .join("line")
      .attr("class", "grid-x")
      .attr("x1", (d) => xScaleMain(d))
      .attr("x2", (d) => xScaleMain(d))
      .attr("y1", 0)
      .attr("y2", mainInnerHeight);

    mainGridG
      .selectAll("line.grid-y")
      .data(yScaleMain.ticks(8))
      .join("line")
      .attr("class", "grid-y")
      .attr("x1", 0)
      .attr("x2", mainInnerWidth)
      .attr("y1", (d) => yScaleMain(d))
      .attr("y2", (d) => yScaleMain(d));
  }

  function update() {
    const [thetaMin, thetaMax] = thetaDomain();
    const thetaValues = uniformThetas(thetaMin, thetaMax, sampleCount);

    const exactPoints = thetaValues.map(spiralPoint);
    const { cubic, polynomial } = buildApproximations(
      thetaValues,
      thetaMin,
      thetaMax,
    );
    const diagnostic = selectDiagnosticApproximation(cubic, polynomial);

    const hasApproximation = state.showCubic || state.showPoly;
    const showExactPath =
      state.showExact && (state.overlay || !hasApproximation);

    const allVisiblePoints = [];
    if (showExactPath) {
      allVisiblePoints.push(...exactPoints);
    }
    if (state.showCubic) {
      allVisiblePoints.push(...cubic);
    }
    if (state.showPoly) {
      allVisiblePoints.push(...polynomial);
    }
    if (state.showSelfSimilarity && showExactPath) {
      allVisiblePoints.push(...selfSimilarityTrace(exactPoints));
    }

    const xExtent = d3.extent(allVisiblePoints, (d) => d.x);
    const yExtent = d3.extent(allVisiblePoints, (d) => d.y);
    const xPad = ((xExtent[1] || 0) - (xExtent[0] || 0)) * 0.1 + 1e-3;
    const yPad = ((yExtent[1] || 0) - (yExtent[0] || 0)) * 0.1 + 1e-3;

    xScaleMain.domain([(xExtent[0] || 0) - xPad, (xExtent[1] || 0) + xPad]);
    yScaleMain.domain([(yExtent[0] || 0) - yPad, (yExtent[1] || 0) + yPad]);

    drawMainGrid();
    mainXAxisG.call(d3.axisBottom(xScaleMain).ticks(8));
    mainYAxisG.call(d3.axisLeft(yScaleMain).ticks(8));

    exactPath
      .attr("d", lineMain(exactPoints))
      .attr("display", showExactPath ? null : "none");
    cubicPath
      .attr("d", lineMain(cubic))
      .attr("display", state.showCubic ? null : "none");
    polyPath
      .attr("d", lineMain(polynomial))
      .attr("display", state.showPoly ? null : "none");

    const selfSimilar = selfSimilarityTrace(exactPoints);
    selfSimPath
      .attr("d", lineMain(selfSimilar))
      .attr(
        "display",
        state.showSelfSimilarity && showExactPath ? null : "none",
      );

    let errorSeries = [];
    if (diagnostic) {
      errorSeries = pairwiseError(exactPoints, diagnostic.points);
    }

    const rms = Math.sqrt(d3.mean(errorSeries, (d) => d.e * d.e) || 0);
    const maxError = d3.max(errorSeries, (d) => d.e) || 0;
    metricsText.textContent = `RMS error: ${rms.toFixed(6)} | max error: ${maxError.toFixed(6)}`;

    heatmapWrap.classList.toggle("d-none", !state.showHeatmap || !diagnostic);
    if (state.showHeatmap && diagnostic) {
      thetaScaleHeat.domain([thetaMin, thetaMax]);
      heatXAxisG.call(d3.axisBottom(thetaScaleHeat).ticks(6));

      const maxHeat = d3.max(errorSeries, (d) => d.e) || 1e-9;
      const colorScale = d3
        .scaleSequential(d3.interpolateTurbo)
        .domain([0, maxHeat]);

      const cellWidth = heatInnerWidth / errorSeries.length;
      heatCellsG
        .selectAll("rect")
        .data(errorSeries)
        .join("rect")
        .attr("class", "infinite-heat-cell")
        .attr("x", (d) => thetaScaleHeat(d.theta) - cellWidth / 2)
        .attr("y", 0)
        .attr("width", Math.max(1, cellWidth + 0.5))
        .attr("height", heatInnerHeight)
        .attr("fill", (d) => colorScale(d.e));
    }

    curvatureWrap.classList.toggle(
      "d-none",
      !state.showCurvature || !diagnostic,
    );
    if (state.showCurvature && diagnostic) {
      const exactCurvature = curvatureSeries(exactPoints);
      const approxCurvature = curvatureSeries(diagnostic.points);
      const maxKappa =
        Math.max(
          d3.max(exactCurvature, (d) => d.kappa) || 0,
          d3.max(approxCurvature, (d) => d.kappa) || 0,
        ) *
          1.05 +
        1e-6;

      thetaScaleCurvature.domain([thetaMin, thetaMax]);
      curvatureScale.domain([0, maxKappa]);

      curvatureGridG
        .selectAll("line.grid-y")
        .data(curvatureScale.ticks(5))
        .join("line")
        .attr("class", "grid-y")
        .attr("x1", 0)
        .attr("x2", curvatureInnerWidth)
        .attr("y1", (d) => curvatureScale(d))
        .attr("y2", (d) => curvatureScale(d));

      curvatureXAxisG.call(d3.axisBottom(thetaScaleCurvature).ticks(6));
      curvatureYAxisG.call(d3.axisLeft(curvatureScale).ticks(5));
      curvatureExactPath.attr("d", lineCurvature(exactCurvature));
      curvatureApproxPath.attr("d", lineCurvature(approxCurvature));
    }

    errorGraphWrap.classList.toggle(
      "d-none",
      !state.showErrorGraph || !diagnostic,
    );
    if (state.showErrorGraph && diagnostic) {
      const graphData = errorBySegments(thetaValues, thetaMin, thetaMax);
      const rmsMax = d3.max(graphData, (d) => d.rms) || 1e-8;

      segmentScale.domain([4, 48]);
      errorScale.domain([0, rmsMax * 1.08]);

      errorGridG
        .selectAll("line.grid-y")
        .data(errorScale.ticks(5))
        .join("line")
        .attr("class", "grid-y")
        .attr("x1", 0)
        .attr("x2", errorInnerWidth)
        .attr("y1", (d) => errorScale(d))
        .attr("y2", (d) => errorScale(d));

      errorXAxisG.call(d3.axisBottom(segmentScale).ticks(10));
      errorYAxisG.call(d3.axisLeft(errorScale).ticks(5));
      errorPath.attr("d", lineError(graphData));
    }
  }

  function syncStateFromInputs() {
    state.segments = Number(segmentSlider.value);
    state.zoomRaw = Number(zoomSlider.value);
    state.showExact = showExactInput.checked;
    state.showCubic = showCubicInput.checked;
    state.showPoly = showPolyInput.checked;
    state.overlay = overlayInput.checked;
    state.showHeatmap = heatmapInput.checked;
    state.showCurvature = curvatureInput.checked;
    state.showSelfSimilarity = selfSimilarityInput.checked;
    state.showErrorGraph = errorGraphInput.checked;

    segmentValue.textContent = String(state.segments);
    zoomValue.textContent = `${zoomFactor(state.zoomRaw).toFixed(1)}×`;
  }

  function handleInput() {
    syncStateFromInputs();
    update();
  }

  [
    segmentSlider,
    zoomSlider,
    showExactInput,
    showCubicInput,
    showPolyInput,
    overlayInput,
    heatmapInput,
    curvatureInput,
    selfSimilarityInput,
    errorGraphInput,
  ].forEach((input) => input.addEventListener("input", handleInput));

  syncStateFromInputs();
  update();
})();
