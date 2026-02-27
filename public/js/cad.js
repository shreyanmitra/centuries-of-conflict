(function cadModule() {
  const mount = document.getElementById("cad-view");
  const meshToggle = document.getElementById("cad-mesh-toggle");
  const tessSlider = document.getElementById("cad-tess-slider");
  const tessValue = document.getElementById("cad-tess-value");
  const statsText = document.getElementById("cad-mesh-stats");

  if (!mount || !meshToggle || !tessSlider || !tessValue || !statsText) {
    return;
  }

  mount.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";
  mount.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    statsText.textContent = "CAD preview unavailable: canvas not supported.";
    return;
  }

  const state = {
    showMesh: meshToggle.checked,
    tessellation: Number(tessSlider.value),
  };

  const tau = Math.PI * 2;

  function add(a, b) {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  function sub(a, b) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  function scale(vector, scalar) {
    return {
      x: vector.x * scalar,
      y: vector.y * scalar,
      z: vector.z * scalar,
    };
  }

  function cross(a, b) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  function dot(a, b) {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  function normalize(vector) {
    const length = Math.hypot(vector.x, vector.y, vector.z) || 1;
    return {
      x: vector.x / length,
      y: vector.y / length,
      z: vector.z / length,
    };
  }

  function curvePoint(u) {
    const p = 2;
    const q = 3;
    const mainRadius = 1.05;
    const minorRadius = 0.43;
    const cosQu = Math.cos(q * u);
    const sinQu = Math.sin(q * u);
    const cosPu = Math.cos(p * u);
    const sinPu = Math.sin(p * u);

    return {
      x: (mainRadius + minorRadius * cosQu) * cosPu,
      y: (mainRadius + minorRadius * cosQu) * sinPu,
      z: minorRadius * sinQu,
    };
  }

  function frameAt(u) {
    const epsilon = 0.0009;
    const center = curvePoint(u);
    const ahead = curvePoint(u + epsilon);
    const tangent = normalize(sub(ahead, center));

    const globalUp =
      Math.abs(tangent.z) > 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 0, z: 1 };

    const normal = normalize(cross(globalUp, tangent));
    const binormal = normalize(cross(tangent, normal));

    return { center, normal, binormal };
  }

  function surfacePoint(u, v) {
    const tubeRadius = 0.24;
    const frame = frameAt(u);
    const radial = add(
      scale(frame.normal, Math.cos(v) * tubeRadius),
      scale(frame.binormal, Math.sin(v) * tubeRadius),
    );
    return add(frame.center, radial);
  }

  function rotate(point, yaw, pitch) {
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);

    const x1 = point.x * cosY + point.z * sinY;
    const z1 = -point.x * sinY + point.z * cosY;
    const y2 = point.y * cosP - z1 * sinP;
    const z2 = point.y * sinP + z1 * cosP;

    return { x: x1, y: y2, z: z2 };
  }

  function project(point, width, height) {
    const cameraDistance = 3.9;
    const perspective = 320 / (cameraDistance - point.z);
    return {
      x: width / 2 + point.x * perspective,
      y: height / 2 - point.y * perspective,
      depth: point.z,
    };
  }

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(280, mount.clientWidth);
    const height = Math.max(220, mount.clientHeight);

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    return { width, height };
  }

  function meshConfig() {
    if (state.showMesh) {
      return {
        uSegments: Math.max(24, state.tessellation * 5),
        vSegments: Math.max(5, Math.round(state.tessellation / 2)),
        wire: true,
      };
    }

    return {
      uSegments: 150,
      vSegments: 28,
      wire: false,
    };
  }

  function drawFrame(timeMs) {
    const { width, height } = resizeCanvas();

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    const config = meshConfig();
    const yaw = timeMs * 0.00055;
    const pitch = 0.35 + 0.09 * Math.sin(timeMs * 0.00045);

    const points = [];
    for (let i = 0; i <= config.uSegments; i += 1) {
      const u = (i / config.uSegments) * tau;
      for (let j = 0; j <= config.vSegments; j += 1) {
        const v = (j / config.vSegments) * tau;
        const world = surfacePoint(u, v);
        const rotated = rotate(world, yaw, pitch);
        points.push({
          world: rotated,
          screen: project(rotated, width, height),
        });
      }
    }

    function pointAt(i, j) {
      const stride = config.vSegments + 1;
      return points[i * stride + j];
    }

    const lightDir = normalize({ x: -0.5, y: 0.8, z: 1.4 });
    const triangles = [];

    for (let i = 0; i < config.uSegments; i += 1) {
      for (let j = 0; j < config.vSegments; j += 1) {
        const a = pointAt(i, j);
        const b = pointAt(i + 1, j);
        const c = pointAt(i + 1, j + 1);
        const d = pointAt(i, j + 1);
        triangles.push([a, b, c], [a, c, d]);
      }
    }

    triangles.sort((left, right) => {
      const leftDepth =
        (left[0].screen.depth + left[1].screen.depth + left[2].screen.depth) /
        3;
      const rightDepth =
        (right[0].screen.depth +
          right[1].screen.depth +
          right[2].screen.depth) /
        3;
      return leftDepth - rightDepth;
    });

    for (let i = 0; i < triangles.length; i += 1) {
      const tri = triangles[i];
      const edgeA = sub(tri[1].world, tri[0].world);
      const edgeB = sub(tri[2].world, tri[0].world);
      const normal = normalize(cross(edgeA, edgeB));
      const light = Math.max(0.08, dot(normal, lightDir));

      const tone = state.showMesh
        ? Math.floor(120 + light * 90)
        : Math.floor(110 + light * 110);

      ctx.beginPath();
      ctx.moveTo(tri[0].screen.x, tri[0].screen.y);
      ctx.lineTo(tri[1].screen.x, tri[1].screen.y);
      ctx.lineTo(tri[2].screen.x, tri[2].screen.y);
      ctx.closePath();

      ctx.fillStyle = state.showMesh
        ? `rgb(${tone + 35}, ${Math.floor(tone * 0.72)}, 45)`
        : `rgb(62, ${Math.floor(tone * 0.8)}, ${tone + 45})`;
      ctx.fill();

      if (config.wire) {
        ctx.strokeStyle = "rgba(73, 80, 87, 0.7)";
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    }

    const triCount = config.uSegments * config.vSegments * 2;
    if (state.showMesh) {
      statsText.textContent = `3MF mesh preview: ~${triCount.toLocaleString()} triangles (${config.uSegments}×${config.vSegments})`;
    } else {
      statsText.textContent = `Smooth preview`;
    }
  }

  let frameId = 0;
  function animate(timeMs) {
    drawFrame(timeMs);
    frameId = requestAnimationFrame(animate);
  }

  function syncTessellationControlState() {
    tessSlider.disabled = !state.showMesh;
  }

  meshToggle.addEventListener("change", () => {
    state.showMesh = meshToggle.checked;
    syncTessellationControlState();
  });

  tessSlider.addEventListener("input", () => {
    state.tessellation = Number(tessSlider.value);
    tessValue.textContent = String(state.tessellation);
  });

  window.addEventListener("resize", () => drawFrame(performance.now()));

  syncTessellationControlState();
  tessValue.textContent = String(state.tessellation);
  animate(0);

  window.addEventListener("beforeunload", () => {
    cancelAnimationFrame(frameId);
  });
})();
