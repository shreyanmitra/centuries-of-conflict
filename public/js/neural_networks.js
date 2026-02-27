(function neuralNetworksModule() {
  const targetSelect = document.getElementById("nn-target-select");
  const unitSlider = document.getElementById("nn-unit-slider");
  const unitValue = document.getElementById("nn-unit-value");
  const showBasisInput = document.getElementById("nn-show-basis");
  const metricsText = document.getElementById("nn-metrics");

  if (
    !targetSelect ||
    !unitSlider ||
    !unitValue ||
    !showBasisInput ||
    !metricsText ||
    typeof d3 === "undefined"
  ) {
    return;
  }

  const initialUnits = Number(unitSlider.getAttribute("value")) || 6;
  unitSlider.value = String(initialUnits);

  const state = {
    target: targetSelect.value,
    units: initialUnits,
    showBasis: showBasisInput.checked,
  };

  const width = 760;
  const height = 320;
  const margin = { top: -30, right: 10, bottom: -20, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const xDomain = [-1, 1];
  const sampleCount = 140;
  const denseCount = 440;
  const activationSharpness = 5.5;

  const svg = d3.select("#nn-main-chart");
  svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const root = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const gridG = root.append("g").attr("class", "nn-grid");
  const xAxisG = root
    .append("g")
    .attr("class", "nn-axis")
    .attr("transform", `translate(0,${innerHeight})`);
  const yAxisG = root.append("g").attr("class", "nn-axis");

  root
    .append("text")
    .attr("class", "axis-label")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 26)
    .attr("text-anchor", "middle")
    .text("x");
  root
    .append("text")
    .attr("class", "axis-label")
    .attr("transform", "rotate(-90)")
    .attr("x", -innerHeight / 2)
    .attr("y", -34)
    .attr("text-anchor", "middle")
    .text("f(x)");

  const basisG = root.append("g");
  const targetPath = root.append("path").attr("class", "nn-target-line");
  const approxPath = root.append("path").attr("class", "nn-approx-line");

  const xScale = d3.scaleLinear().domain(xDomain).range([0, innerWidth]);
  const yScale = d3.scaleLinear().range([innerHeight, 0]);

  const line = d3
    .line()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  function targetValue(x) {
    if (state.target === "step") {
      return 0.65 * Math.tanh(5.2 * x) + 0.23 * Math.sin(2.8 * Math.PI * x);
    }
    if (state.target === "sharp") {
      return 0.9 * Math.abs(x + 0.08) - 0.3 + 0.1 * Math.sin(4 * Math.PI * x);
    }
    return (
      0.45 * Math.sin(2.1 * Math.PI * x + 0.25) +
      0.18 * Math.sin(6.4 * Math.PI * x)
    );
  }

  function uniformXs(count) {
    return d3.range(count).map((index) => {
      const t = index / (count - 1);
      return xDomain[0] + t * (xDomain[1] - xDomain[0]);
    });
  }

  function makeCenters(unitCount) {
    if (unitCount === 1) {
      return [0];
    }
    return d3.range(unitCount).map((index) => {
      const t = index / (unitCount - 1);
      return xDomain[0] + t * (xDomain[1] - xDomain[0]);
    });
  }

  function featureVector(x, centers) {
    const vector = [1];
    for (let i = 0; i < centers.length; i += 1) {
      vector.push(Math.tanh(activationSharpness * (x - centers[i])));
    }
    return vector;
  }

  function solveLinearSystem(matrix, rhs) {
    const n = matrix.length;
    const a = matrix.map((row, rowIndex) => [...row, rhs[rowIndex]]);

    for (let pivot = 0; pivot < n; pivot += 1) {
      let bestRow = pivot;
      for (let row = pivot + 1; row < n; row += 1) {
        if (Math.abs(a[row][pivot]) > Math.abs(a[bestRow][pivot])) {
          bestRow = row;
        }
      }

      if (Math.abs(a[bestRow][pivot]) < 1e-10) {
        continue;
      }

      if (bestRow !== pivot) {
        const tmp = a[pivot];
        a[pivot] = a[bestRow];
        a[bestRow] = tmp;
      }

      const pivotValue = a[pivot][pivot];
      for (let col = pivot; col <= n; col += 1) {
        a[pivot][col] /= pivotValue;
      }

      for (let row = 0; row < n; row += 1) {
        if (row === pivot) {
          continue;
        }
        const factor = a[row][pivot];
        if (factor === 0) {
          continue;
        }
        for (let col = pivot; col <= n; col += 1) {
          a[row][col] -= factor * a[pivot][col];
        }
      }
    }

    return a.map((row) => row[n]);
  }

  function fitModel(samples, centers) {
    const dimension = centers.length + 1;
    const normalMatrix = Array.from({ length: dimension }, () =>
      Array.from({ length: dimension }, () => 0),
    );
    const rhs = Array.from({ length: dimension }, () => 0);

    for (let index = 0; index < samples.length; index += 1) {
      const x = samples[index].x;
      const y = samples[index].y;
      const phi = featureVector(x, centers);
      for (let row = 0; row < dimension; row += 1) {
        rhs[row] += phi[row] * y;
        for (let col = row; col < dimension; col += 1) {
          normalMatrix[row][col] += phi[row] * phi[col];
        }
      }
    }

    for (let row = 0; row < dimension; row += 1) {
      for (let col = row + 1; col < dimension; col += 1) {
        normalMatrix[col][row] = normalMatrix[row][col];
      }
    }

    const ridge = 1e-4;
    for (let d = 0; d < dimension; d += 1) {
      normalMatrix[d][d] += ridge;
    }

    return solveLinearSystem(normalMatrix, rhs);
  }

  function predict(x, centers, coefficients) {
    const phi = featureVector(x, centers);
    let output = 0;
    for (let i = 0; i < phi.length; i += 1) {
      output += phi[i] * coefficients[i];
    }
    return output;
  }

  function render() {
    const sampleXs = uniformXs(sampleCount);
    const denseXs = uniformXs(denseCount);
    const targetSamples = sampleXs.map((x) => ({ x, y: targetValue(x) }));

    const centers = makeCenters(state.units);
    const coefficients = fitModel(targetSamples, centers);

    const denseTarget = denseXs.map((x) => ({ x, y: targetValue(x) }));
    const denseApprox = denseXs.map((x) => ({
      x,
      y: predict(x, centers, coefficients),
    }));

    let squaredError = 0;
    let maxError = 0;
    for (let i = 0; i < denseTarget.length; i += 1) {
      const error = Math.abs(denseTarget[i].y - denseApprox[i].y);
      squaredError += error * error;
      maxError = Math.max(maxError, error);
    }
    const rms = Math.sqrt(squaredError / denseTarget.length);

    const yExtent = d3.extent([...denseTarget, ...denseApprox], (d) => d.y);
    const yPadding = 0.08 * (yExtent[1] - yExtent[0] || 1);
    yScale.domain([yExtent[0] - yPadding, yExtent[1] + yPadding]);

    xAxisG.call(d3.axisBottom(xScale).ticks(8));
    yAxisG.call(d3.axisLeft(yScale).ticks(6));

    gridG
      .selectAll("line.v")
      .data(xScale.ticks(8))
      .join("line")
      .attr("class", "v")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", innerHeight);

    gridG
      .selectAll("line.h")
      .data(yScale.ticks(6))
      .join("line")
      .attr("class", "h")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d));

    targetPath.datum(denseTarget).attr("d", line);
    approxPath.datum(denseApprox).attr("d", line);

    const basisData = centers.map((center, idx) => {
      const coeff = coefficients[idx + 1] || 0;
      const points = denseXs.map((x) => ({
        x,
        y: coeff * Math.tanh(activationSharpness * (x - center)),
      }));
      return { idx, points };
    });

    basisG
      .selectAll("path")
      .data(state.showBasis ? basisData : [])
      .join("path")
      .attr("class", "nn-basis-line")
      .attr("d", (d) => line(d.points));

    metricsText.textContent = `RMS error: ${rms.toFixed(4)} | max error: ${maxError.toFixed(4)}`;
  }

  targetSelect.addEventListener("change", () => {
    state.target = targetSelect.value;
    render();
  });

  unitSlider.addEventListener("input", () => {
    state.units = Number(unitSlider.value);
    unitValue.textContent = String(state.units);
    render();
  });

  showBasisInput.addEventListener("change", () => {
    state.showBasis = showBasisInput.checked;
    render();
  });

  unitValue.textContent = String(state.units);
  render();
})();
