# @retikz/math

Zero-dependency pure computational geometry for [retikz](https://pionpill.github.io/retikz/) — vectors, affine transforms, arc primitives, intersections, triangle in-circle / circum-circle helpers, point-in-polygon, and convex hull. Pure functions over plain `Position = [number, number]` arrays; **no classes, no IR, no zod, no runtime dependencies**.

零依赖纯计算几何：向量运算、仿射变换、arc 原语、求交（线 / 圆 / 线段 / ray-arc）、三角形内切 / 外接圆、点在多边形、凸包。一律纯函数 + 普通 `Position` 数组，**不写 class、零 IR、零 zod、零运行时依赖**。作为 `@retikz/core` 与 domain（plot / flow…）包的共享计算底座。

## Install

```bash
pnpm add @retikz/math
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

## Usage

Most consumers get the common primitives through `@retikz/core`'s re-exports (`Position`, `point`, `lerp`, `localToWorld` / `worldToLocal`). Depend on `@retikz/math` directly when you need computation that core does not re-export — `intersect`, `triangle`, `circle`, `polygon`, `convexHull`, `ellipse`, or `curve`.

```ts
import { point, intersect, triangle, circle, convexHull } from '@retikz/math';

point.cross([1, 0], [0, 1]); // 1
intersect.lineLine({ a1: [0, 0], a2: [2, 2], b1: [0, 2], b2: [2, 0] }); // [1, 1]
triangle.circumCircle([0, 0], [4, 0], [0, 3]); // { center: [2, 1.5], radius: 2.5 }
circle.minimalEnclosing([
  [0, 0],
  [4, 0],
  [0, 3],
]); // { center: [2, 1.5], radius: 2.5 }
convexHull([
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
  [2, 2],
]); // 4 corners, CCW
```

All functions are pure and side-effect-free; degenerate inputs return `null` (`triangle.*`) or `[]` (intersections) rather than throwing. Epsilon is naive (`DEFAULT_EPSILON = 1e-9`), tuned for drawing-scale coordinates.

## Exports

| Group                  | Exports                                                                                                                                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Points / vectors       | `Position`, `Vector2`, `DEFAULT_EPSILON`, `isFiniteNumber`, `isFinitePoint`, `isInfiniteNumber`, `point`, `vector2`, `lerp`                                                                                                                     |
| Affine transforms      | `CenteredShape`, `localToWorld`, `worldToLocal`                                                                                                                                                                                                 |
| Bounds                 | `AxisAlignedBounds`, `BoundsRect`, `BoundsHalfAxes`, `BoundsInsets`, `boundsOf`, `mergeBounds`, `boundsToRect`, `rectToBounds`, `isFiniteBoundsRect`, `isPositiveBoundsRect`, `boundsCenter`, `boundsHalfAxes`, `expandBounds`, `boundsCorners` |
| Arc primitives         | `ArcAngleInRangeInput`, `ArcBoundingPointsInput`, `RayArcInput`, `EllipseArcPointInput`, `EllipseArcBoundingPointsInput`, `arcEndPoint`, `arcAngleInRange`, `rayArc`, `ellipseArcPoint`, `arcBoundingPoints`, `ellipseArcBoundingPoints`        |
| Ellipse helpers        | `Ellipse`, `CenteredBox`, `EllipseCircumscribeMode`, `ellipse`                                                                                                                                                                                  |
| Intersections          | `LineLineInput`, `LineCircleInput`, `CircleCircleInput`, `intersect.lineLine`, `intersect.lineCircle`, `intersect.circleCircle`, `intersect.segmentSegment`                                                                                     |
| Enclosing / algorithms | `Circle`, `circle.minimalEnclosing`, `triangle.inCircle`, `triangle.circumCircle`, `polygon.containsPoint`, `convexHull`                                                                                                                        |
| Curves                 | `CubicSegment`, `curve.catmullRomToCubic`                                                                                                                                                                                                       |

`rayArc` returns scalar parameters `s` for the general equation `origin + s * dir`, sorted ascending and filtered to positive forward hits. `dir` does not need to be unit length; a zero direction returns `[]`. The `intersect.*` helpers return coordinate points instead, so `rayArc` stays on the arc primitive API.

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
