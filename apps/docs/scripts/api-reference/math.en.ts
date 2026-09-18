/** @retikz/math 中文 JSDoc 的审阅后英文投影 */
const translations: Readonly<Record<string, string>> = {
  矩形盒高度: 'Height of the rectangular bounds',
  矩形盒宽度: 'Width of the rectangular bounds',
  二分反解最多执行次数: 'Maximum number of bisection iterations for inverse evaluation',
  '已按同一采样预算计算的完整曲线长度，省略时即时计算':
    'Full curve length computed with the same sampling budget; calculated on demand when omitted',
  '沿本地 +x 的半轴长度': 'Semi-axis length along local +x',
  '沿本地 +y 的半轴长度': 'Semi-axis length along local +y',
  '射线方向，不要求单位化': 'Ray direction; normalization is not required',
  射线起点: 'Ray origin',
  正向参数容差: 'Tolerance for the forward parameter',
  圆心: 'Circle center',
  半径: 'Radius',
  '结束角度，单位为度': 'End angle in degrees',
  '起始角度，单位为度': 'Start angle in degrees',
  '待判定角度，单位为度': 'Angle to test in degrees',
  '角度容差，单位为度': 'Angle tolerance in degrees',
  '最大 x 坐标': 'Maximum x coordinate',
  '最大 y 坐标': 'Maximum y coordinate',
  '最小 x 坐标': 'Minimum x coordinate',
  '最小 y 坐标': 'Minimum y coordinate',
  'x 方向半宽': 'Half-width on the x axis',
  'y 方向半高': 'Half-height on the y axis',
  向下外扩距离: 'Downward expansion distance',
  向左外扩距离: 'Leftward expansion distance',
  向右外扩距离: 'Rightward expansion distance',
  向上外扩距离: 'Upward expansion distance',
  矩形高度: 'Rectangle height',
  矩形宽度: 'Rectangle width',
  '左上角 x 坐标': 'Top-left x coordinate',
  '左上角 y 坐标': 'Top-left y coordinate',
  '绕中心旋转弧度（可选，0 / 缺省 = 不旋转）':
    'Optional radians of rotation about the center; 0 or omitted means no rotation',
  中心横坐标: 'Center x coordinate',
  中心纵坐标: 'Center y coordinate',
  第一个圆心: 'First circle center',
  第二个圆心: 'Second circle center',
  第一个圆半径: 'First circle radius',
  第二个圆半径: 'Second circle radius',
  '是否逆时针扫描；省略时由起止角方向决定':
    'Whether to sweep counterclockwise; when omitted, the start and end angles determine the direction',
  '结束参数角，单位为度': 'End parameter angle in degrees',
  曲线种类: 'Curve kind',
  '起始参数角，单位为度': 'Start parameter angle in degrees',
  第一个控制点: 'First control point',
  第二个控制点: 'Second control point',
  起点: 'Start point',
  终点: 'End point',
  'Bezier 与椭圆弧使用的等参数采样数量': 'Number of uniform parameter samples for Bézier curves and elliptical arcs',
  参数位置对应的点: 'Point at the parameter position',
  '沿曲线前进方向的单位切线；零导数回退为 `[1, 0]`':
    'Unit tangent in the direction of travel; falls back to `[1, 0]` for a zero derivative',
  '参数角，单位为度': 'Parameter angle in degrees',
  椭圆中心: 'Ellipse center',
  'x 方向半轴': 'Half-axis on the x axis',
  'y 方向半轴': 'Half-axis on the y axis',
  '本地 x 半轴': 'Local x half-axis',
  '本地 y 半轴': 'Local y half-axis',
  '本地椭圆相对世界坐标的旋转角，单位为度': 'Rotation of the local ellipse relative to world coordinates in degrees',
  '直线方向，不要求单位化': 'Line direction; normalization is not required',
  直线起点: 'Line origin',
  圆半径: 'Circle radius',
  第一条直线上的第一个点: 'First point on the first line',
  第一条直线上的第二个点: 'Second point on the first line',
  第二条直线上的第一个点: 'First point on the second line',
  第二条直线上的第二个点: 'Second point on the second line',
  控制点: 'Control point',
  'SVG / Canvas 同序的二维仿射矩阵 `[a,b,c,d,e,f]`':
    'Two-dimensional affine matrix `[a,b,c,d,e,f]` in SVG / Canvas order',
  圆弧外接候选点参数: 'Parameters for arc bounds candidates',
  圆弧角度区间判定参数: 'Parameters for testing an arc angle range',
  轴对齐外接范围: 'Axis-aligned bounds',
  轴对齐外接范围半轴: 'Half-axes of axis-aligned bounds',
  轴对齐外接范围外扩量: 'Expansion amounts for axis-aligned bounds',
  '左上角 + 尺寸表示的轴对齐外接矩形': 'Axis-aligned bounds rectangle expressed by top-left corner and size',
  以中心描述的矩形盒: 'Rectangle box described from its center',
  '任何"中心 + 可选旋转"形状的几何契约（rect / circle / ellipse / diamond 共用）':
    'Geometry contract shared by shapes with a center and optional rotation (rect, circle, ellipse, and diamond)',
  '圆：圆心 + 半径': 'Circle: center and radius',
  两圆求交参数: 'Parameters for intersecting two circles',
  圆弧曲线段: 'Circular arc curve segment',
  三次贝塞尔曲线段: 'Cubic Bézier curve segment',
  '一段三次贝塞尔：两控制点 + 终点（起点为上一段终点 / 首段为第一个 knot）':
    'One cubic Bézier segment: two control points and an endpoint (the start is the prior segment endpoint or the first knot)',
  曲线长度近似配置: 'Curve-length approximation configuration',
  曲线距离到参数反解配置: 'Configuration for inverting curve distance to a parameter',
  '可参数化、可切片的零依赖曲线段': 'Zero-dependency curve segment that can be parameterized and sliced',
  曲线参数采样结果: 'Curve parameter sampling result',
  '椭圆：中心 + 半轴 + 可选旋转': 'Ellipse: center, half-axes, and optional rotation',
  椭圆弧参数点参数: 'Parameters for a point on an elliptical arc',
  椭圆弧外接候选点参数: 'Parameters for elliptical-arc bounds candidates',
  椭圆弧曲线段: 'Elliptical arc curve segment',
  椭圆外接内部盒的半轴策略: 'Half-axis strategy for the ellipse inner bounds box',
  直线与圆求交参数: 'Parameters for intersecting a line and a circle',
  直线曲线段: 'Line curve segment',
  两条无限直线求交参数: 'Parameters for intersecting two infinite lines',
  '笛卡尔坐标点，格式为 `[x, y]`': 'Cartesian point in `[x, y]` form',
  二次贝塞尔曲线段: 'Quadratic Bézier curve segment',
  射线与圆弧求交参数: 'Parameters for intersecting a ray and an arc',
  '二维向量，格式为 `[x, y]`': 'Two-dimensional vector in `[x, y]` form',
  运行时不可变的二维仿射单位矩阵: 'Runtime-immutable two-dimensional affine identity matrix',
  圆相关几何算法: 'Circle-related geometry algorithms',
  可参数化曲线的纯几何运算: 'Pure geometric operations for parameterized curves',
  几何工具默认容差: 'Default tolerance for geometry utilities',
  '基于中心、本地半轴和可选旋转的椭圆运算':
    'Ellipse operations based on a center, local half-axes, and optional rotation',
  '求交原语集（line / circle / segment），统一返回点（`Position | null` / `Array<Position>`）':
    'Intersection primitives for lines, circles, and segments, consistently returning points (`Position | null` / `Array<Position>`)',
  'ray∩arc 的返回值是沿射线的标量参数 `Array<number>`，因此由 `./arc-intersection` 单独导出':
    'ray∩arc returns scalar parameters along the ray as `Array<number>`, so it is exported separately from `./arc-intersection`.',
  '点的位置关系运算；所有方法都返回新 tuple，不修改输入':
    'Point positional operations. Every method returns a new tuple and does not mutate its input.',
  简单多边形运算: 'Simple polygon operations',
  三角形外接圆与内切圆构造: 'Triangle circumcircle and incircle construction',
  '二维向量运算；所有方法都返回新 tuple，不修改输入':
    'Two-dimensional vector operations. Every method returns a new tuple and does not mutate its input.',
  '按 SVG / Canvas 六元组公式把二维点映射到新坐标':
    'Maps a two-dimensional point to new coordinates with the SVG / Canvas six-value formula',
  点集的轴对齐外接范围: 'Axis-aligned bounds of a point set',
  '输入为空时返回 undefined；调用方按自身语义决定兜底、报错或忽略':
    'Returns undefined for empty input; callers decide whether to fall back, report an error, or ignore it.',
  '将 min/max bounds 转成左上角 + 尺寸矩形': 'Converts min/max bounds to a top-left-plus-size rectangle',
  '弧的 bbox 极值候选：起点、终点，加 [startAngle,endAngle] 内所有 90°·k 方向的圆周点':
    'Arc bounds extrema candidates: the start and end points plus points at every 90°·k direction inside `[startAngle, endAngle]`',
  '不去重；端角恰在 90°·k 上时由调用方处理':
    'Does not deduplicate candidates; callers handle endpoint angles that fall exactly on 90°·k.',
  '椭圆弧 bbox 极值候选：起点、终点，加 [start,end] 区间内所有 90°·k 参数角处的椭圆周点':
    'Elliptical-arc bounds extrema candidates: endpoints plus ellipse points at every 90°·k parameter angle inside `[start, end]`',
  '只处理轴对齐椭圆弧，候选点不去重': 'Handles only axis-aligned elliptical arcs and does not deduplicate candidates.',
  '角度 a（度）是否落在弧的角度区间 [startAngle, endAngle] 内（含端点，带容差）':
    'Whether angle `a` in degrees falls within the arc angle range `[startAngle, endAngle]`, including endpoints with tolerance',
  'start 到 end 为正时按屏幕顺时针扫描，为负时按逆时针扫描':
    'A positive start-to-end range sweeps clockwise on screen; a negative range sweeps counterclockwise.',
  '判断 bounds rect 四个字段是否都是 finite number':
    'Checks whether all four bounds-rectangle fields are finite numbers',
  判断二维仿射矩阵是否由有限数值组成且具有非零行列式:
    'Checks whether a two-dimensional affine matrix has finite values and a non-zero determinant',
  '判断 bounds rect 是否 finite 且宽高严格大于 0':
    'Checks whether a bounds rectangle is finite and has strictly positive width and height',
  '圆心、半径、角度（度，与 polar.toPosition 同约定）→ 圆周上对应点':
    'Maps a circle center, radius, and angle in degrees to the corresponding point on the circumference',
  '椭圆弧参数点：中心 + 半轴 rx/ry + 参数角（度）→ 椭圆周上点':
    'Maps an elliptical-arc center, half-axes `rx` / `ry`, and parameter angle in degrees to a point on the ellipse',
  '与 pointAtArcAngle 同角度约定；θ 是参数角，不一定等于真实极角':
    'Uses the same angle convention as `pointAtArcAngle`; θ is a parameter angle and not necessarily the true polar angle.',
  '本地坐标（以中心为原点）→ 世界坐标': 'Maps local coordinates with the center as origin to world coordinates',
  'rotate=0 / 缺省时退化为平移，否则绕中心旋转后再平移':
    'With `rotate = 0` or omitted, reduces to translation; otherwise rotates about the center before translating.',
  '世界坐标 → 本地坐标（`localToWorld` 逆变换）':
    'Maps world coordinates to local coordinates, the inverse of `localToWorld`',
  返回以形状中心和旋转为基准的本地坐标: 'Returns local coordinates relative to the shape center and rotation.',
  '复杂度：时间 O(n log n)，空间 O(n)，n 为输入点数': 'Complexity: O(n log n) time and O(n) space for n input points',
  轴对齐外接范围中心: 'Center of axis-aligned bounds',
  轴对齐外接范围的四个角点: 'Four corner points of axis-aligned bounds',
  "凸包（Andrew's monotone chain）": "Convex hull (Andrew's monotone chain)",
  '返回 CCW 顺序顶点、不含共线中间点；点数 < 3 时返回按 (x,y) 排序去重后的点。\n  全部点共线时退化为两端点':
    'Returns vertices in CCW order without intermediate collinear points. For fewer than three points, returns deduplicated points sorted by (x, y). All-collinear input degenerates to its two endpoints.',
  按四边外扩轴对齐外接范围: 'Expands axis-aligned bounds on all four sides',
  '返回仿射相似变换的统一缩放因子，不符合相似变换时返回 undefined':
    'Returns the uniform scale factor of an affine similarity transform, or undefined when it is not a similarity transform',
  '射线（origin + s·direction）∩ 圆弧（center, radius, [startAngle, endAngle]）':
    'Intersection of a ray (`origin + s·direction`) and an arc (`center`, `radius`, `[startAngle, endAngle]`)',
  '返回沿射线的正向参数 s，按升序排列；零方向或无有效交点时返回空数组':
    'Returns forward ray parameters `s` in ascending order; returns an empty array for a zero direction or no valid intersections.',
  '有限数值守卫，会排除 Infinity 和 NaN': 'Finite-number guard that excludes Infinity and NaN',
  有限二维点守卫: 'Finite two-dimensional point guard',
  '无限数值守卫，仅接受正负 Infinity': 'Infinite-number guard that accepts only positive or negative Infinity',
  '线性插值：a + (b - a) * t': 'Linear interpolation: `a + (b - a) * t`',
  合并两个轴对齐外接范围: 'Merges two axis-aligned bounds',
  复合二维仿射矩阵: 'Composes two-dimensional affine matrices',
  '返回 `outer × inner`，即对点先应用 `inner`，再应用 `outer`':
    'Returns `outer × inner`: apply `inner` to a point first, then `outer`.',
  '将左上角 + 尺寸矩形转成 min/max bounds': 'Converts a top-left-plus-size rectangle to min/max bounds',
};

/** 将中文 JSDoc 投影为英文文案，缺少审阅后的映射时终止生成 */
export const translateMathApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;
  const translation = translations[source];
  if (translation) return translation;
  throw new Error(`缺少 @retikz/math API Reference 的审阅后英文翻译：${source}`);
};
