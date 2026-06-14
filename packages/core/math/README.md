# @retikz/math

Zero-dependency pure computational geometry for [retikz](https://pionpill.github.io/retikz/) — vectors, affine transforms, arc primitives, intersections, triangle in/circumcircles, point-in-polygon, and convex hull. Pure functions over plain `Position = [number, number]` arrays; **no classes, no IR, no zod, no runtime dependencies**.

零依赖纯计算几何：向量运算、仿射变换、arc 原语、求交（线 / 圆 / 线段 / ray-arc）、三角形内切 / 外接圆、点在多边形、凸包。一律纯函数 + 普通 `Position` 数组，**不写 class、零 IR、零 zod、零运行时依赖**。作为 `@retikz/core` 与 domain（plot / flow…）包的共享计算底座。

## Install

```bash
pnpm add @retikz/math
```

## Usage

Most consumers get the common primitives through `@retikz/core`'s re-exports (`Position`, `point`, `lerp`, `localToWorld` / `worldToLocal`). Depend on `@retikz/math` directly when you need computation that core does not re-export — `intersect`, `triangle`, `polygon`, `convexHull`.

```ts
import { point, intersect, triangle, convexHull } from '@retikz/math';

point.cross([1, 0], [0, 1]); // 1
intersect.lineLine([0, 0], [2, 2], [0, 2], [2, 0]); // [1, 1]
triangle.circumcircle([0, 0], [4, 0], [0, 3]); // { center: [2, 1.5], radius: 2.5 }
convexHull([[0, 0], [4, 0], [4, 4], [0, 4], [2, 2]]); // 4 corners, CCW
```

All functions are pure and side-effect-free; degenerate inputs return `null` (`triangle.*`) or `[]` (intersections) rather than throwing. Epsilon is naive (`DEFAULT_EPSILON = 1e-9`), tuned for drawing-scale coordinates.

## Exports

- `Position` / `DEFAULT_EPSILON` / `point` (add / sub / scale / dot / cross / length / normalize / shiftToward / equal) / `lerp`
- `localToWorld` / `worldToLocal` / `CenteredShape` — affine transforms (center + optional rotate)
- `arcEndPoint` / `arcAngleInRange` / `rayArc` / `ellipseArcPoint` / `arcBoundingPoints` / `ellipseArcBoundingPoints` — arc primitives (SVG y-down angle convention)
- `intersect` — `lineLine` / `lineCircle` / `circleCircle` / `segmentSegment` (point-returning; `rayArc` lives on the arc module, returns ray-parameter scalars)
- `triangle` — `incircle` / `circumcircle`
- `polygon.containsPoint` — ray-casting even-odd test
- `convexHull` — Andrew's monotone chain (CCW, drops collinear points)

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
