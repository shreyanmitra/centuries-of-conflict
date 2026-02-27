const domain = [0, 3];
const yDomain = [0, 21];
const sampleCount = 240;

const state = {
  degree: 3,
  coeffs: [0, 1, 0, 0],
  showBasis: false,
};

const degreeSlider = document.getElementById("degree-slider");
const degreeValue = document.getElementById("degree-value");
const dimensionText = document.getElementById("dimension-text");
const coeffSliders = document.getElementById("coeff-sliders");
const basisToggle = document.getElementById("basis-toggle");
const randomBtn = document.getElementById("random-btn");
const polynomialEquation = document.getElementById("polynomial-equation");

const svg = d3.select("#poly-chart");
const width = 760;
const height = 420;
const margin = { top: 20, right: 24, bottom: 44, left: 56 };
const innerWidth = width - margin.left - margin.right;
const innerHeight = height - margin.top - margin.bottom;

const g = svg
  .append("g")
  .attr("transform", `translate(${margin.left},${margin.top})`);

const xScale = d3.scaleLinear().domain(domain).range([0, innerWidth]);
const yScale = d3.scaleLinear().domain(yDomain).range([innerHeight, 0]);

const xAxisGroup = g
  .append("g")
  .attr("transform", `translate(0,${innerHeight})`);
const yAxisGroup = g.append("g");

g.append("text")
  .attr("class", "axis-label")
  .attr("x", innerWidth / 2)
  .attr("y", innerHeight + 36)
  .attr("text-anchor", "middle")
  .text("x");

g.append("text")
  .attr("class", "axis-label")
  .attr("transform", "rotate(-90)")
  .attr("x", -innerHeight / 2)
  .attr("y", -40)
  .attr("text-anchor", "middle")
  .text("y");

const basisGroup = g.append("g");
const targetPath = g.append("path").attr("class", "target-line");
const polyPath = g.append("path").attr("class", "poly-line");

const color = d3.scaleOrdinal(d3.schemeTableau10);

const lineGenerator = d3
  .line()
  .x((d) => xScale(d.x))
  .y((d) => yScale(d.y));

function targetFunction(x) {
  return Math.exp(x);
}

function polynomial(x) {
  let sum = 0;
  for (let i = 0; i <= state.degree; i += 1) {
    sum += (state.coeffs[i] || 0) * x ** i;
  }
  return sum;
}

function buildSamples(fn) {
  return d3.range(sampleCount).map((i) => {
    const t = i / (sampleCount - 1);
    const x = domain[0] + t * (domain[1] - domain[0]);
    return { x, y: fn(x) };
  });
}

function basisSamples(power) {
  return buildSamples((x) => x ** power);
}

function buildEquationLatex() {
  const terms = [];

  for (let i = 0; i <= state.degree; i += 1) {
    const coeff = Number((state.coeffs[i] || 0).toFixed(1));
    const magnitude = Math.abs(coeff).toFixed(1);

    let termBody = magnitude;
    if (i === 1) {
      termBody += "x";
    } else if (i >= 2) {
      termBody += `x^{${i}}`;
    }

    if (i === 0) {
      terms.push(coeff < 0 ? `-${termBody}` : termBody);
    } else {
      terms.push(coeff < 0 ? `- ${termBody}` : `+ ${termBody}`);
    }
  }

  return `p(x) = ${terms.join(" ")}`;
}

function rebuildCoefficientControls() {
  coeffSliders.innerHTML = "";

  for (let i = 0; i <= state.degree; i += 1) {
    const row = document.createElement("div");
    row.className = "coefficient-row d-flex align-items-center gap-2";

    const label = document.createElement("label");
    label.className = "form-label mb-0 fw-semibold";
    label.setAttribute("for", `coef-${i}`);
    label.textContent = `a${i}`;

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "-3";
    slider.max = "3";
    slider.step = "0.1";
    slider.value = String(state.coeffs[i] || 0);
    slider.id = `coef-${i}`;
    slider.className = "form-range flex-grow-1 mb-0";

    const value = document.createElement("span");
    value.className = "small text-muted";
    value.style.minWidth = "3rem";
    value.textContent = Number(slider.value).toFixed(1);

    slider.addEventListener("input", (event) => {
      state.coeffs[i] = Number(event.target.value);
      value.textContent = state.coeffs[i].toFixed(1);
      render();
    });

    row.append(label, slider, value);
    coeffSliders.appendChild(row);
  }
}

function syncDegree(newDegree) {
  state.degree = newDegree;
  if (state.coeffs.length < newDegree + 1) {
    for (let i = state.coeffs.length; i <= newDegree; i += 1) {
      state.coeffs.push(0);
    }
  }

  degreeValue.textContent = String(newDegree);
  dimensionText.textContent = `Space dimension = ${newDegree + 1}`;
  rebuildCoefficientControls();
}

function randomizePolynomial() {
  for (let i = 0; i <= state.degree; i += 1) {
    state.coeffs[i] = Number((Math.random() * 4 - 2).toFixed(1));
  }
  rebuildCoefficientControls();
  render();
}

function render() {
  if (polynomialEquation) {
    const equationLatex = buildEquationLatex();
    if (typeof katex !== "undefined" && typeof katex.render === "function") {
      katex.render(equationLatex, polynomialEquation, {
        throwOnError: false,
        displayMode: true,
      });
    } else {
      polynomialEquation.textContent = equationLatex;
    }
  }

  const target = buildSamples(targetFunction);
  const poly = buildSamples(polynomial);

  xAxisGroup.call(d3.axisBottom(xScale));
  yAxisGroup.call(d3.axisLeft(yScale));

  targetPath.datum(target).attr("d", lineGenerator);
  polyPath.datum(poly).attr("d", lineGenerator);

  const basisData = state.showBasis
    ? d3
        .range(state.degree + 1)
        .map((p) => ({ power: p, points: basisSamples(p) }))
    : [];

  const basisJoin = basisGroup
    .selectAll("path")
    .data(basisData, (d) => d.power);

  basisJoin.join(
    (enter) =>
      enter
        .append("path")
        .attr("class", "basis-line")
        .attr("stroke", (d) => color(d.power))
        .attr("d", (d) => lineGenerator(d.points)),
    (update) =>
      update
        .attr("stroke", (d) => color(d.power))
        .attr("d", (d) => lineGenerator(d.points)),
    (exit) => exit.remove(),
  );
}

degreeSlider.addEventListener("input", (event) => {
  syncDegree(Number(event.target.value));
  render();
});

basisToggle.addEventListener("change", (event) => {
  state.showBasis = event.target.checked;
  render();
});

randomBtn.addEventListener("click", randomizePolynomial);

syncDegree(state.degree);
render();
