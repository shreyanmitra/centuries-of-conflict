(function rungePhenomenonModule() {
  const degreeSlider = document.getElementById("runge-degree-slider");
  const degreeValue = document.getElementById("runge-degree-value");
  const nodeTypeInputs = document.querySelectorAll(
    'input[name="runge-node-type"]',
  );
  const showCondToggle = document.getElementById("runge-show-cond");
  const condReadout = document.getElementById("runge-cond-readout");

  if (
    !degreeSlider ||
    !degreeValue ||
    !showCondToggle ||
    !condReadout ||
    nodeTypeInputs.length === 0 ||
    typeof d3 === "undefined"
  ) {
    return;
  }

  const state = {
    degree: Number(degreeSlider.value),
    nodeType: "equispaced",
    showConditionNumber: false,
  };

  const domain = [-1, 1];
  const sampleCount = 500;

  const svg = d3.select("#runge-chart");
  const width = 760;
  const height = 360;
  const margin = { top: 20, right: 20, bottom: 42, left: 58 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const chartG = svg
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const xScale = d3.scaleLinear().domain(domain).range([0, innerWidth]);
  const yScale = d3.scaleLinear().range([innerHeight, 0]);

  const edgeBandsG = chartG.append("g");
  const gridG = chartG.append("g").attr("class", "runge-grid");

  const xAxisG = chartG
    .append("g")
    .attr("class", "runge-axis")
    .attr("transform", `translate(0,${innerHeight})`);
  const yAxisG = chartG.append("g").attr("class", "runge-axis");

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

  const edgeLabel = chartG
    .append("text")
    .attr("x", innerWidth / 2)
    .attr("y", 16)
    .attr("text-anchor", "middle")
    .attr("font-size", "0.8rem")
    .attr("fill", "#b91c1c")
    .text("Edge regions where oscillations become strong");

  const targetPath = chartG.append("path").attr("class", "runge-target-line");
  const polyPath = chartG.append("path").attr("class", "runge-poly-line");
  const nodesG = chartG.append("g");

  const line = d3
    .line()
    .x((d) => xScale(d.x))
    .y((d) => yScale(d.y));

  function rungeFunction(x) {
    return 1 / (1 + 25 * x * x);
  }

  function makeNodes(degree, type) {
    const n = degree;
    if (type === "chebyshev") {
      const nodes = d3.range(n + 1).map((k) => {
        const x = Math.cos(((2 * k + 1) / (2 * (n + 1))) * Math.PI);
        return x;
      });
      return nodes.sort((a, b) => a - b);
    }

    return d3.range(n + 1).map((k) => -1 + (2 * k) / n);
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

  function buildSamples(fn) {
    return d3.range(sampleCount).map((i) => {
      const t = i / (sampleCount - 1);
      const x = domain[0] + t * (domain[1] - domain[0]);
      return { x, y: fn(x) };
    });
  }

  function vandermondeMatrix(nodes) {
    return nodes.map((x) => d3.range(nodes.length).map((power) => x ** power));
  }

  function invertMatrix(matrix) {
    const n = matrix.length;
    const aug = matrix.map((row, i) => [
      ...row,
      ...d3.range(n).map((j) => (i === j ? 1 : 0)),
    ]);

    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < n; row += 1) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) {
          pivot = row;
        }
      }

      if (Math.abs(aug[pivot][col]) < 1e-14) {
        return null;
      }

      if (pivot !== col) {
        [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
      }

      const pivotVal = aug[col][col];
      for (let j = col; j < 2 * n; j += 1) {
        aug[col][j] /= pivotVal;
      }

      for (let row = 0; row < n; row += 1) {
        if (row === col) {
          continue;
        }
        const factor = aug[row][col];
        for (let j = col; j < 2 * n; j += 1) {
          aug[row][j] -= factor * aug[col][j];
        }
      }
    }

    return aug.map((row) => row.slice(n));
  }

  function matrixInfinityNorm(matrix) {
    return d3.max(matrix, (row) => d3.sum(row, (v) => Math.abs(v))) || 0;
  }

  function conditionNumberInfinity(matrix) {
    const inverse = invertMatrix(matrix);
    if (!inverse) {
      return Infinity;
    }
    return matrixInfinityNorm(matrix) * matrixInfinityNorm(inverse);
  }

  function formatConditionNumber(value) {
    if (!Number.isFinite(value)) {
      return "∞";
    }
    if (value < 1e4) {
      return value.toFixed(1);
    }
    return value.toExponential(2);
  }

  function render() {
    const nodes = makeNodes(state.degree, state.nodeType);
    const values = nodes.map((x) => rungeFunction(x));
    const weights = barycentricWeights(nodes);

    const targetSamples = buildSamples(rungeFunction);
    const polySamples = buildSamples((x) =>
      evaluateBarycentric(nodes, values, weights, x),
    );

    const yMin = d3.min([...targetSamples, ...polySamples], (d) => d.y) ?? 0;
    const yMax = d3.max([...targetSamples, ...polySamples], (d) => d.y) ?? 1;
    const yPad = 0.08 * (yMax - yMin || 1);
    yScale.domain([yMin - yPad, yMax + yPad]);

    const yGrid = d3
      .axisLeft(yScale)
      .ticks(6)
      .tickSize(-innerWidth)
      .tickFormat("");
    gridG.call(yGrid);
    gridG.selectAll("line").attr("stroke", "#e5e7eb").attr("opacity", 0.8);
    gridG.select("path").attr("stroke", "none");

    xAxisG.call(d3.axisBottom(xScale).ticks(8));
    yAxisG.call(d3.axisLeft(yScale).ticks(6));

    const edgeBands = [
      { x0: -1, x1: -0.8 },
      { x0: 0.8, x1: 1 },
    ];

    edgeBandsG
      .selectAll("rect")
      .data(edgeBands)
      .join("rect")
      .attr("class", "runge-edge-band")
      .attr("x", (d) => xScale(d.x0))
      .attr("width", (d) => xScale(d.x1) - xScale(d.x0))
      .attr("y", 0)
      .attr("height", innerHeight);

    targetPath.datum(targetSamples).attr("d", line);
    polyPath.datum(polySamples).attr("d", line);

    nodesG
      .selectAll("circle")
      .data(nodes.map((x) => ({ x, y: rungeFunction(x) })))
      .join("circle")
      .attr("class", "runge-node")
      .attr("r", 4)
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y));

    const vander = vandermondeMatrix(nodes);
    const cond = conditionNumberInfinity(vander);

    if (state.showConditionNumber) {
      condReadout.textContent = `n = ${state.degree} • κ∞(V) ≈ ${formatConditionNumber(cond)}`;
    } else {
      condReadout.textContent = "Condition number hidden";
    }

    edgeLabel.raise();
    nodesG.raise();
  }

  degreeSlider.addEventListener("input", (event) => {
    state.degree = Number(event.target.value);
    degreeValue.textContent = String(state.degree);
    render();
  });

  nodeTypeInputs.forEach((input) => {
    input.addEventListener("change", (event) => {
      state.nodeType = event.target.value;
      render();
    });
  });

  showCondToggle.addEventListener("change", (event) => {
    state.showConditionNumber = event.target.checked;
    render();
  });

  degreeValue.textContent = String(state.degree);
  render();
})();
