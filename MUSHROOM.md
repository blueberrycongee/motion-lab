# The mushroom

Every work shows the same mushroom: one fly agaric, standing upright. A work may
change its material, medium, scale, or physics, but the silhouette and
proportions stay recognisable.

Units are shared by all the forms below: y points up, the ground is at 0, the
cap is about 1.12 wide, and its top is near 1.11.

| Part | Shape | Colour |
| --- | --- | --- |
| Cap | Flattened dome, 0.56 × 0.31 radii, centred at y 0.8 | `#b8321a` at the rim, darker `#6e130b` at the crown |
| Warts | Small, irregular, denser near the crown | `#efe7d6` |
| Gills | Thin band under the cap | `#d2c6ad` |
| Ring | Short skirt around the stem at y 0.56–0.66 | `#e8e2d2` |
| Stem | 0.17 wide at the top, flared bulb at the base, slight lean | `#e8e2d2` |

[`works/001-specimen.html`](works/001-specimen.html) is the reference rendering.

## Composition

- Size the subject from the viewport, for example `min(width, height)`, never
  from fixed CSS pixels. A gallery thumbnail must look like the full view
  scaled down, not like a crop of it.
- Keep the mushroom readable at thumbnail size (about 300 px wide).
- No text inside the work unless the effect is made of text.

## 3D signed distance (GLSL)

Take this for raymarched works. `p` is in mushroom units.

```glsl
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdEllipsoid(vec3 p, vec3 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / k1;
}

// The mushroom: ground at y = 0, cap top near y = 1.11, cap about 1.12 wide.
// Returns distance and part: 0 cap, 1 gills, 2 stem, 3 ring.
vec2 mushroom(vec3 p) {
  p.x -= 0.05 * p.y * p.y;                       // a slight lean
  float r = length(p.xz);

  float stemR = 0.085 + 0.025 * (1.0 - p.y / 0.86) + 0.065 * exp(-p.y * 9.0);
  float stem = max(r - stemR, abs(p.y - 0.43) - 0.43) * 0.8;

  float frill = 0.008 * sin(atan(p.z, p.x) * 9.0);
  float skirt = abs(r - (0.096 + (0.66 - p.y) * 0.32 + frill * smoothstep(0.64, 0.56, p.y))) - 0.009;
  float ring = max(skirt, abs(p.y - 0.605) - 0.05) * 0.7;

  vec3 c = p - vec3(0.0, 0.8, 0.0);
  float dome = sdEllipsoid(c, vec3(0.56, 0.31, 0.56));
  dome += 0.008 * sin(c.x * 11.0 + 1.3) * sin(c.z * 9.0) * sin(c.y * 7.0 + c.x * 5.0);
  float under = 0.82 + 0.08 * (1.0 - min(r * r / 0.31, 1.0));
  float cap = max(dome, under - p.y);
  float gills = max(dome + 0.02, max(p.y - under - 0.004, under - 0.04 - p.y));

  vec2 res = vec2(cap, 0.0);
  if (gills < res.x) res = vec2(gills, 1.0);
  float body = smin(stem, max(cap, gills), 0.03);
  if (body < res.x - 0.001) res = vec2(body, 2.0);
  if (ring < res.x) res = vec2(ring, 3.0);
  return res;
}
```

## Profile signed distance (GLSL)

Take this for 2D shader works.

```glsl
float sdEllipse(vec2 p, vec2 r) {
  float k0 = length(p / r);
  float k1 = length(p / (r * r));
  return k0 * (k0 - 1.0) / k1;
}

// The mushroom in profile: y up, ground at 0, cap about 1.12 wide, top near 1.11.
// Returns signed distance (negative inside) and part: 0 cap, 1 gills, 2 stem, 3 ring.
vec2 mushroom2D(vec2 p) {
  p.x -= 0.05 * p.y * p.y;
  float r = abs(p.x);
  float stemR = 0.085 + 0.025 * (1.0 - p.y / 0.86) + 0.065 * exp(-p.y * 9.0);
  float stem = max(r - stemR, abs(p.y - 0.43) - 0.43);
  float ring = max(r - 0.096 - (0.66 - p.y) * 0.32, abs(p.y - 0.605) - 0.05);
  float under = 0.82 + 0.02 * (1.0 - min(r * r / 0.3125, 1.0));
  float cap = max(sdEllipse(p - vec2(0.0, 0.8), vec2(0.56, 0.31)), under - p.y);
  float gills = max(r - 0.55, max(p.y - under, 0.8 + 0.015 * (1.0 - min(r * r / 0.27, 1.0)) - p.y));
  stem = max(stem, -min(cap, gills));
  vec2 res = vec2(cap, 0.0);
  if (gills < res.x) res = vec2(gills, 1.0);
  if (stem < res.x) res = vec2(stem, 2.0);
  if (ring < res.x) res = vec2(ring, 3.0);
  return res;
}
```

## Profile paths (Canvas 2D)

Take this for canvas works, or to sample points inside the silhouette with
`ctx.isPointInPath`. Draw the stem and ring before the gills and cap.

```js
// The mushroom in profile as Path2D, in mushroom units: y up, ground at 0,
// cap about 1.12 wide, top near 1.11. Draw with ctx.setTransform(s, 0, 0, -s, x, groundY).
function mushroomPaths() {
  const lean = (y) => 0.05 * y * y;
  const stemR = (y) => 0.085 + 0.025 * (1 - y / 0.86) + 0.065 * Math.exp(-y * 9);
  const outline = (y0, y1, radius) => {
    const path = new Path2D();
    const n = 32;
    for (let i = 0; i <= n; i++) {
      const y = y0 + (y1 - y0) * (i / n);
      path.lineTo(lean(y) + radius(y), y);
    }
    for (let i = n; i >= 0; i--) {
      const y = y0 + (y1 - y0) * (i / n);
      path.lineTo(lean(y) - radius(y), y);
    }
    path.closePath();
    return path;
  };
  const stem = outline(0, 0.86, stemR);
  const ring = outline(0.555, 0.655, (y) => 0.096 + (0.66 - y) * 0.32);

  const cx = lean(0.8), a = Math.asin(0.02 / 0.31);
  const cap = new Path2D();
  cap.ellipse(cx, 0.8, 0.56, 0.31, 0, a, Math.PI - a);
  cap.quadraticCurveTo(cx, 0.86, cx + 0.559, 0.82);
  cap.closePath();

  const gills = new Path2D();
  gills.moveTo(cx - 0.55, 0.822);
  gills.quadraticCurveTo(cx, 0.862, cx + 0.55, 0.822);
  gills.lineTo(cx + 0.52, 0.8);
  gills.quadraticCurveTo(cx, 0.83, cx - 0.52, 0.8);
  gills.closePath();

  // Warts on the visible face of the cap: [x, y, radius].
  const spots = [
    [-0.02, 1.07, 0.03], [0.17, 1.05, 0.026], [-0.22, 1.03, 0.028], [0.33, 0.99, 0.03],
    [-0.38, 0.96, 0.024], [0.06, 0.99, 0.034], [-0.12, 0.94, 0.022], [0.22, 0.93, 0.025],
    [0.44, 0.9, 0.02], [-0.47, 0.88, 0.018], [-0.28, 0.89, 0.026], [0.1, 0.88, 0.02],
    [0.34, 0.875, 0.017], [-0.06, 0.88, 0.016],
  ].map(([x, y, r]) => {
    const path = new Path2D();
    path.ellipse(cx + x, y, r, r * 0.8, 0, 0, Math.PI * 2);
    return path;
  });
  return { cap, gills, stem, ring, spots };
}
```

## Profile (SVG)

Take this for DOM, CSS and SVG works. Units are mushroom units × 1000 with y
flipped, so the ground is at y 0 and the cap top near y −1110. Each part has a
class for styling and animation.

```html
<svg viewBox="-620 -1160 1240 1200" xmlns="http://www.w3.org/2000/svg">
  <path class="stem" fill="#e8e2d2" d="M175 0 L153 -43 L138 -86 L127 -129 L120 -172 L115 -215 L112 -258 L110 -301 L109 -344 L108 -387 L108 -430 L108 -473 L109 -516 L110 -559 L111 -602 L112 -645 L114 -688 L116 -731 L118 -774 L120 -817 L122 -860 L-48 -860 L-53 -817 L-58 -774 L-62 -731 L-66 -688 L-71 -645 L-75 -602 L-79 -559 L-82 -516 L-86 -473 L-90 -430 L-93 -387 L-97 -344 L-101 -301 L-106 -258 L-111 -215 L-117 -172 L-126 -129 L-137 -86 L-153 -43 L-175 0 Z"/>
  <path class="ring" fill="#ddd5c2" d="M145 -555 L132 -605 L119 -655 L-76 -655 L-95 -605 L-114 -555 Z"/>
  <path class="gills" fill="#d2c6ad" d="M-518 -822 Q32 -862 582 -822 L552 -800 Q32 -830 -488 -800 Z"/>
  <path class="cap" fill="#b8321a" d="M591 -820 A560 310 0 1 0 -527 -820 Q32 -860 591 -820 Z"/>
  <g class="spots" fill="#efe7d6">
    <ellipse cx="12" cy="-1070" rx="30" ry="24"/>
    <ellipse cx="202" cy="-1050" rx="26" ry="21"/>
    <ellipse cx="-188" cy="-1030" rx="28" ry="22"/>
    <ellipse cx="362" cy="-990" rx="30" ry="24"/>
    <ellipse cx="-348" cy="-960" rx="24" ry="19"/>
    <ellipse cx="92" cy="-990" rx="34" ry="27"/>
    <ellipse cx="-88" cy="-940" rx="22" ry="18"/>
    <ellipse cx="252" cy="-930" rx="25" ry="20"/>
    <ellipse cx="472" cy="-900" rx="20" ry="16"/>
    <ellipse cx="-438" cy="-880" rx="18" ry="14"/>
    <ellipse cx="-248" cy="-890" rx="26" ry="21"/>
    <ellipse cx="132" cy="-880" rx="20" ry="16"/>
    <ellipse cx="372" cy="-875" rx="17" ry="14"/>
    <ellipse cx="-28" cy="-880" rx="16" ry="13"/>
  </g>
</svg>
```
