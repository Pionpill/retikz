# @retikz/math

Zero-dependency pure computational geometry for [retikz](https://pionpill.github.io/retikz/) — vectors, affine transforms, arc primitives, intersections, triangle in-circle / circum-circle helpers, point-in-polygon, and convex hull. Pure functions over plain `Position = [number, number]` arrays; **no classes, no IR, no zod, no runtime dependencies**. The package currently has no real `@retikz/foundation` import and therefore declares no such dependency.

零依赖纯计算几何：向量运算、仿射变换、arc 原语、求交（线 / 圆 / 线段 / ray-arc）、三角形内切 / 外接圆、点在多边形、凸包。一律纯函数 + 普通 `Position` 数组，**不写 class、零 IR、零 zod、零运行时依赖**。作为 `@retikz/core` 与 domain（plot / flow…）包的共享计算底座。当前没有真实 `@retikz/foundation` import，因此不声明该依赖。

## Install

```bash
pnpm add @retikz/math
```

This package is ESM-only and requires Node.js 24 or newer.
本包仅发布 ES modules，要求 Node.js 24 或更高版本。

## Usage

Most consumers get common drawing helpers through `@retikz/core`'s re-exports: `DEFAULT_EPSILON`, `point`, `vector2`, `localToWorld`, and `worldToLocal`; core exposes math's `lerp` as `lerpPoint`. Import `Position` / `Vector2`, affine matrices, bounds, ellipses, arcs, intersections, enclosures, polygons, hulls, and curves directly from `@retikz/math`.

多数绘图代码可使用 `@retikz/core` 转出的 `DEFAULT_EPSILON`、`point`、`vector2`、`localToWorld` 与 `worldToLocal`；math 的 `lerp` 在 core 中名为 `lerpPoint`。`Position` / `Vector2` 类型、仿射矩阵、外接范围、椭圆、圆弧、求交、包围、多边形、凸包和曲线应直接从 `@retikz/math` 导入。

```ts
import { intersect, triangle, circle, convexHull, vector2 } from '@retikz/math';

vector2.cross([1, 0], [0, 1]); // 1
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

The affine tuple follows the SVG / Canvas `[a,b,c,d,e,f]` order. `multiplyAffine(outer, inner)` applies `inner` first; `AFFINE_IDENTITY` is frozen at runtime, while operation results are fresh unfrozen tuples. `multiplyAffine` and `applyAffine` intentionally do not validate finite, invertible, or similarity-transform constraints; use `isFiniteNonSingularAffine` and `getAffineSimilarityScale` when those predicates are needed.

仿射六元组采用 SVG / Canvas 的 `[a,b,c,d,e,f]` 顺序。`multiplyAffine(outer, inner)` 先应用 `inner`；`AFFINE_IDENTITY` 在运行时冻结，普通运算结果则是新的未冻结 tuple。`multiplyAffine` 与 `applyAffine` 刻意不检查有限性、可逆性或 similarity transform 约束；需要这些判定时使用 `isFiniteNonSingularAffine` 与 `getAffineSimilarityScale`。

## Exports

| Group                  | Exports                                                                                                                                                                                                                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Points / vectors       | `Position`, `Vector2`, `DEFAULT_EPSILON`, `isFiniteNumber`, `isFinitePoint`, `isInfiniteNumber`, `point`, `vector2`, `lerp`                                                                                                                                       |
| Local/world transforms | `CenteredShape`, `localToWorld`, `worldToLocal`                                                                                                                                                                                                                   |
| Affine matrices        | `AffineMatrix`, `AFFINE_IDENTITY`, `multiplyAffine`, `applyAffine`, `isFiniteNonSingularAffine`, `getAffineSimilarityScale`                                                                                                                                       |
| Bounds                 | `AxisAlignedBounds`, `BoundsRect`, `BoundsHalfAxes`, `BoundsInsets`, `boundsOf`, `mergeBounds`, `boundsToRect`, `rectToBounds`, `isFiniteBoundsRect`, `isPositiveBoundsRect`, `centerOfBounds`, `halfAxesOfBounds`, `expandBounds`, `cornersOfBounds`             |
| Arc primitives         | `ArcSweepAngleInput`, `ArcBoundingCandidatesInput`, `EllipseArcAnglePointInput`, `EllipseArcBoundingCandidatesInput`, `pointAtArcAngle`, `isAngleWithinArcSweep`, `pointAtEllipseArcAngle`, `collectArcBoundingCandidates`, `collectEllipseArcBoundingCandidates` |
| Ellipse helpers        | `Ellipse`, `CenteredBox`, `EllipseCircumscribeMode`, `ellipse`                                                                                                                                                                                                    |
| Intersections          | `LineLineInput`, `LineCircleInput`, `CircleCircleInput`, `RayArcIntersectionInput`, `intersect.lineLine`, `intersect.lineCircle`, `intersect.circleCircle`, `intersect.segmentSegment`, `intersectRayWithArc`                                                     |
| Enclosing / algorithms | `Circle`, `circle.minimalEnclosing`, `triangle.incircle`, `triangle.circumCircle`, `polygon.containsPoint`, `convexHull`                                                                                                                                          |
| Curves                 | `CubicSegment`, `curve.catmullRomToCubic`                                                                                                                                                                                                                         |

The `intersectRayWithArc` algorithm returns scalar parameters `s` for the general equation `origin + s * direction`, sorted ascending and filtered to positive forward hits. `direction` does not need to be unit length; a zero direction returns `[]`. The `intersect.*` helpers return coordinate points instead.

## Docs

<https://pionpill.github.io/retikz/>

## License

MIT
