(function approximateThisFunctionModule() {
  const approxDomain = [-Math.PI, Math.PI];
  const displaySamples = 320;
  const fitSamples = 420;

  const approxState = {
    degree: 4,
    mode: "leastSquares",
    highlightMax: true,
  };

  const approxDegreeSlider = document.getElementById("approx-degree-slider");
  const approxDegreeValue = document.getElementById("approx-degree-value");
  const errorNormEl = document.getElementById("approx-error-norm");
  const highlightToggle = document.getElementById("approx-highlight-max");
  const modeInputs = document.querySelectorAll('input[name="fit-mode"]');

  if (
    !approxDegreeSlider ||
    !approxDegreeValue ||
    !errorNormEl ||
    !highlightToggle ||
    modeInputs.length === 0 ||
    typeof d3 === "undefined"
  ) {
    return;
  }

  const mainSvg = d3.select("#approx-main-chart");
  const errorSvg = d3.select("#approx-error-chart");

  const mainWidth = 760;
  const mainHeight = 320;
  const errorWidth = 760;
  const errorHeight = 200;

  const mainMargin = { top: 14, right: 20, bottom: 42, left: 54 };
  const errorMargin = { top: 14, right: 20, bottom: 34, left: 54 };

  const mainInnerWidth = mainWidth - mainMargin.left - mainMargin.right;
  const mainInnerHeight = mainHeight - mainMargin.top - mainMargin.bottom;
  const errorInnerWidth = errorWidth - errorMargin.left - errorMargin.right;
  const errorInnerHeight = errorHeight - errorMargin.top - errorMargin.bottom;

  const mainG = mainSvg
    .append("g")
    .attr("transform", `translate(${mainMargin.left},${mainMargin.top})`);

  const errorG = errorSvg
    .append("g")
    .attr("transform", `translate(${errorMargin.left},${errorMargin.top})`);

  const mainGridG = mainG.append("g").attr("class", "approx-grid");
  const mainXAxisG = mainG
    .append("g")
    .attr("class", "approx-axis")
    .attr("transform", `translate(0,${mainInnerHeight})`);
  const mainYAxisG = mainG.append("g").attr("class", "approx-axis");

  const errorGridG = errorG.append("g").attr("class", "approx-grid");
  const errorXAxisG = errorG
    .append("g")
    .attr("class", "approx-axis")
    .attr("transform", `translate(0,${errorInnerHeight})`);
  const errorYAxisG = errorG.append("g").attr("class", "approx-axis");

  mainG
    .append("text")
    .attr("class", "axis-label")
    .attr("x", mainInnerWidth / 2)
    .attr("y", mainInnerHeight + 34)
    .attr("text-anchor", "middle")
    .text("x");

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
    .attr("y", -40)
    .attr("text-anchor", "middle")
    .text("error");

  const mainTargetPath = mainG
    .append("path")
    .attr("class", "approx-target-line");
  const mainPolyPath = mainG.append("path").attr("class", "approx-poly-line");
  const maxErrorSegment = mainG
    .append("line")
    .attr("stroke", "#ef4444")
    .attr("stroke-width", 1.8)
    .attr("stroke-dasharray", "3 3");
  const maxErrorTargetPoint = mainG
    .append("circle")
    .attr("class", "max-error-point")
    .attr("r", 5);
  const maxErrorPolyPoint = mainG
    .append("circle")
    .attr("class", "max-error-point")
    .attr("r", 5);

  const errorZeroLine = errorG.append("line").attr("class", "approx-zero-line");
  const errorPath = errorG.append("path").attr("class", "approx-error-line");
  const errorMaxPoint = errorG
    .append("circle")
    .attr("class", "max-error-point")
    .attr("r", 5);

  const xScaleMain = d3
    .scaleLinear()
    .domain(approxDomain)
    .range([0, mainInnerWidth]);

  const xScaleError = d3
    .scaleLinear()
    .domain(approxDomain)
    .range([0, errorInnerWidth]);

  const yScaleMain = d3.scaleLinear().range([mainInnerHeight, 0]);
  const yScaleError = d3.scaleLinear().range([errorInnerHeight, 0]);

  const lineMain = d3
    .line()
    .x((d) => xScaleMain(d.x))
    .y((d) => yScaleMain(d.y));

  const lineError = d3
    .line()
    .x((d) => xScaleError(d.x))
    .y((d) => yScaleError(d.error));

  function targetFn(x) {
    return Math.sin(x);
  }

  function samplePoints(count) {
    return d3.range(count).map((i) => {
      const t = i / (count - 1);
      const x = approxDomain[0] + t * (approxDomain[1] - approxDomain[0]);
      return { x, y: targetFn(x) };
    });
  }

  function evaluatePolynomial(coeffs, x) {
    let value = 0;
    for (let i = 0; i < coeffs.length; i += 1) {
      value += coeffs[i] * x ** i;
    }
    return value;
  }

  function solveLinearSystem(matrix, rhs) {
    const n = matrix.length;
    const a = matrix.map((row, i) => [...row, rhs[i]]);

    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < n; row += 1) {
        if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) {
          pivot = row;
        }
      }

      if (Math.abs(a[pivot][col]) < 1e-12) {
        return null;
      }

      if (pivot !== col) {
        [a[col], a[pivot]] = [a[pivot], a[col]];
      }

      const pivotVal = a[col][col];
      for (let j = col; j <= n; j += 1) {
        a[col][j] /= pivotVal;
      }

      for (let row = 0; row < n; row += 1) {
        if (row === col) {
          continue;
        }
        const factor = a[row][col];
        for (let j = col; j <= n; j += 1) {
          a[row][j] -= factor * a[col][j];
        }
      }
    }

    return a.map((row) => row[n]);
  }

  function fitLeastSquares(degree) {
    const m = degree + 1;
    const ata = Array.from({ length: m }, () =>
      Array.from({ length: m }, () => 0),
    );
    const atb = Array.from({ length: m }, () => 0);
    const fitData = samplePoints(fitSamples);

    fitData.forEach((p) => {
      const powers = Array.from({ length: m }, (_, i) => p.x ** i);
      for (let i = 0; i < m; i += 1) {
        atb[i] += powers[i] * p.y;
        for (let j = 0; j < m; j += 1) {
          ata[i][j] += powers[i] * powers[j];
        }
      }
    });

    const solution = solveLinearSystem(ata, atb);
    return solution || Array.from({ length: m }, () => 0);
  }

  function fitInterpolation(degree) {
    const m = degree + 1;
    const nodes = samplePoints(m);
    const vandermonde = nodes.map((p) =>
      Array.from({ length: m }, (_, i) => p.x ** i),
    );
    const rhs = nodes.map((p) => p.y);

    const solution = solveLinearSystem(vandermonde, rhs);
    return solution || Array.from({ length: m }, () => 0);
  }

  function fitPolynomial() {
    if (approxState.mode === "interpolation") {
      return fitInterpolation(approxState.degree);
    }
    return fitLeastSquares(approxState.degree);
  }

  let displayedNorm = 0;

  function updateNormDisplay(nextNorm) {
    displayedNorm = nextNorm;
    errorNormEl.textContent = displayedNorm.toFixed(6);
  }

  function renderApproximation() {
    const coeffs = fitPolynomial();
    const points = samplePoints(displaySamples).map((p) => {
      const polyY = evaluatePolynomial(coeffs, p.x);
      return {
        x: p.x,
        targetY: p.y,
        polyY,
        error: p.y - polyY,
      };
    });

    yScaleMain.domain([-1.5, 1.5]);

    yScaleError.domain([-1, 1]);

    const rms = Math.sqrt(d3.mean(points, (p) => p.error ** 2) || 0);
    updateNormDisplay(rms);

    const maxErrorPoint = points.reduce((best, curr) =>
      Math.abs(curr.error) > Math.abs(best.error) ? curr : best,
    );

    const xTicks = d3.range(-3, 4).map((k) => (k * Math.PI) / 3);

    const xAxisMain = d3
      .axisBottom(xScaleMain)
      .tickValues(xTicks)
      .tickFormat((d) => {
        if (Math.abs(d) < 1e-10) return "0";
        const multiple = d / Math.PI;
        if (Math.abs(multiple - 1) < 1e-10) return "π";
        if (Math.abs(multiple + 1) < 1e-10) return "-π";
        return `${multiple.toFixed(1)}π`;
      });

    const xAxisError = d3
      .axisBottom(xScaleError)
      .tickValues(xTicks)
      .tickFormat((d) => {
        if (Math.abs(d) < 1e-10) return "0";
        const multiple = d / Math.PI;
        if (Math.abs(multiple - 1) < 1e-10) return "π";
        if (Math.abs(multiple + 1) < 1e-10) return "-π";
        return `${multiple.toFixed(1)}π`;
      });

    mainXAxisG.call(xAxisMain);
    mainYAxisG.call(d3.axisLeft(yScaleMain).ticks(6));
    errorXAxisG.call(xAxisError);
    errorYAxisG.call(d3.axisLeft(yScaleError).ticks(5));

    const mainGrid = d3
      .axisLeft(yScaleMain)
      .tickSize(-mainInnerWidth)
      .ticks(6)
      .tickFormat("");
    const errorGrid = d3
      .axisLeft(yScaleError)
      .tickSize(-errorInnerWidth)
      .ticks(5)
      .tickFormat("");

    mainGridG.call(mainGrid);
    errorGridG.call(errorGrid);

    const targetSeries = points.map((p) => ({ x: p.x, y: p.targetY }));
    const polySeries = points.map((p) => ({ x: p.x, y: p.polyY }));

    mainTargetPath.datum(targetSeries).attr("d", lineMain);
    mainPolyPath.datum(polySeries).attr("d", lineMain);
    errorPath.datum(points).attr("d", lineError);

    errorZeroLine
      .attr("x1", xScaleError(approxDomain[0]))
      .attr("x2", xScaleError(approxDomain[1]))
      .attr("y1", yScaleError(0))
      .attr("y2", yScaleError(0));

    const showMax = approxState.highlightMax;
    maxErrorSegment.style("display", showMax ? null : "none");
    maxErrorTargetPoint.style("display", showMax ? null : "none");
    maxErrorPolyPoint.style("display", showMax ? null : "none");
    errorMaxPoint.style("display", showMax ? null : "none");

    if (showMax) {
      const xMain = xScaleMain(maxErrorPoint.x);
      const yTarget = yScaleMain(maxErrorPoint.targetY);
      const yPoly = yScaleMain(maxErrorPoint.polyY);
      const xError = xScaleError(maxErrorPoint.x);
      const yError = yScaleError(maxErrorPoint.error);

      maxErrorSegment
        .attr("x1", xMain)
        .attr("x2", xMain)
        .attr("y1", yTarget)
        .attr("y2", yPoly);
      maxErrorTargetPoint.attr("cx", xMain).attr("cy", yTarget);
      maxErrorPolyPoint.attr("cx", xMain).attr("cy", yPoly);
      errorMaxPoint.attr("cx", xError).attr("cy", yError);
    }
  }

  approxDegreeSlider.addEventListener("input", (event) => {
    approxState.degree = Number(event.target.value);
    approxDegreeValue.textContent = String(approxState.degree);
    renderApproximation();
  });

  modeInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      approxState.mode = event.target.value;
      renderApproximation();
    });
  });

  highlightToggle.addEventListener("change", (event) => {
    approxState.highlightMax = event.target.checked;
    renderApproximation();
  });

  approxDegreeValue.textContent = String(approxState.degree);
  renderApproximation();
})();
