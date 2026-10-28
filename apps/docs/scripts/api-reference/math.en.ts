/** @retikz/math 中文 JSDoc 的审阅后英文投影 */
const translations: Readonly<Record<string, string>> = {
  '空数组返回空数组；单顶点产生自连接线段，双顶点产生方向相反的两段\n  保留输入绕向与重复顶点，线段端点复用输入坐标，不修改或复制坐标':
    'An empty array returns an empty array; one vertex creates a self-loop, and two vertices create opposite segments. Input winding and repeated vertices are preserved. Segment endpoints reuse the input coordinates without modifying or copying them',
  '按顶点顺序构造闭合有向线段环，末段连接最后一个顶点与首个顶点':
    'Build a closed ring of directed segments in vertex order, joining the final vertex to the first',
  '曲线在给定向量上的标量投影范围，包含内部极值':
    'Scalar projection range of a curve along a vector, including interior extrema',
  '曲线沿给定向量的精确投影极值；向量无需单位化，复杂度 O(1)':
    'Exact curve projection extrema along a vector; the vector need not be normalized. Complexity: O(1)',

  返回椭圆中心的新坐标元组: 'Returns the ellipse center as a new coordinate tuple',
  待包围矩形盒的半宽与半高: 'Half-width and half-height of the box to enclose',
  "半轴策略；默认 'proportional'": "Semiaxis strategy; defaults to 'proportional'",
  '包住矩形盒的椭圆半轴，新建对象': 'A new object containing the semiaxes of the enclosing ellipse',
  '返回 origin + direction × length 对应的新坐标': 'Returns new coordinates at origin + direction × length',
  '不自动单位化 direction；只有 direction 为单位向量时，实际位移长度才等于 length 的绝对值':
    'Does not normalize direction; the displacement magnitude equals the absolute value of length only for a unit direction vector',
  '返回 origin - direction × length 对应的新坐标': 'Returns new coordinates at origin - direction × length',
  用于距离反解的曲线段: 'Curve segment used to invert the distance',
  '沿曲线的距离，会限制到 0 至完整曲线长度': 'Distance along the curve, clamped from zero to the full curve length',
  '反解配置；默认 {}，采用字段各自的默认值': 'Inversion options; defaults to {}, using each field default',
  '0..1 范围内的曲线参数；完整长度非有限或不大于 DEFAULT_EPSILON 时返回 0':
    'Curve parameter in 0..1; returns 0 when the full length is non-finite or no greater than DEFAULT_EPSILON',
  两条直线各自的两个定义点: 'Two defining points for each infinite line',
  两条线段各自的端点: 'Endpoints of the two line segments',
  '直线原点、方向与圆心、半径': 'Line origin and direction, and circle center and radius',
  两个圆各自的圆心和半径: 'Center and radius of each circle',
  '二维向量运算；不修改输入，单位化退化时可返回传入的 fallback 引用':
    'Vector operations without input mutation; degenerate normalization may return the supplied fallback reference',
  '点的位置关系运算；不修改输入，移动距离为零或两点重合时可返回原点引用':
    'Point operations without input mutation; zero movement or coincident points may return the original point reference',
  'fallback 默认 [1, 0]，epsilon 默认 DEFAULT_EPSILON；长度小于 epsilon 时返回 fallback 原引用':
    'fallback defaults to [1, 0] and epsilon to DEFAULT_EPSILON; returns the original fallback reference when length is less than epsilon',
  'epsilon 默认 0；长度非有限或小于等于 epsilon 时返回 null':
    'epsilon defaults to 0; returns null for non-finite lengths or lengths less than or equal to epsilon',
  '覆盖输入点集的最小圆；空集返回 null。epsilon 默认 DEFAULT_EPSILON，用于判断点是否落在圆内':
    'Smallest circle enclosing the input points; returns null for empty input. epsilon defaults to DEFAULT_EPSILON for point containment checks',
  '覆盖输入点集的最小圆；空集返回 null': 'Smallest circle enclosing the input points; returns null for empty input',
  'line 与圆弧使用解析长度；Bezier 与椭圆弧按 `sampleCount` 采样':
    'Lines and circular arcs use analytic lengths; Bézier curves and elliptical arcs use `sampleCount` samples',
  '输入不足 2 个 knot 时返回空数组；每段终点严格命中下一个 knot':
    'Returns an empty array for fewer than two knots; each segment ends exactly at the next knot',
  '使用与 `approximateLength` 相同的离散长度模型；传入 `totalLength` 时必须与相同 sample count 对应。当中点的近似长度与目标距离相差不超过默认几何容差时提前返回':
    'Uses the same discrete length model as `approximateLength`; supplied `totalLength` must use the same sample count. Returns early when the midpoint length is within the default geometry tolerance of the target distance',
  '参数会 clamp 到 `[0, 1]`；零导数回退为确定的 `[1, 0]` 切线':
    'Clamps the parameter to `[0, 1]`; a zero derivative uses the deterministic tangent `[1, 0]`',
  '参数先 clamp 并升序排列；Bezier 使用 De Casteljau，圆弧和椭圆弧保留有向角扫描':
    'Clamps and sorts parameters in ascending order; uses De Casteljau for Bézier curves and preserves directed sweeps for arcs',
  '退化椭圆返回中心，避免零半轴除法':
    'Returns the center for a degenerate ellipse, avoiding division by zero half-axes',
  '`proportional` 保持内部盒宽高比例，`equal` 使用等轴圆包住内部盒':
    '`proportional` preserves the inner box aspect ratio; `equal` encloses the box in a circle',
  '边界点结果未定义，调用方需按自身语义处理':
    'Boundary-point results are unspecified; callers must choose their own boundary policy',
  '三点共线（面积≈0）返回 null': 'Returns null when the three points are collinear (approximately zero area)',
  '三点共线或退化时返回 null': 'Returns null for collinear or degenerate points',
  待计算的二维点集: 'Two-dimensional point set to evaluate',
  待判定的动态值: 'Dynamic value to test',
  待计算的二维仿射矩阵: 'Two-dimensional affine matrix to evaluate',
  轴对齐的最小与最大坐标: 'Axis-aligned minimum and maximum coordinates',
  矩形位置及宽高: 'Rectangle position and dimensions',
  '几何输入参数，字段含义见对应类型': 'Geometry input parameters; see the corresponding type for field semantics',
  形状中心与可选旋转弧度: 'Shape center and optional rotation in radians',
  '点集外接范围；空集返回 undefined': 'Bounds of the point set, or undefined for empty input',
  '第一个范围，可省略': 'First bounds, which may be omitted',
  '第二个范围，可省略': 'Second bounds, which may be omitted',
  '新建的合并范围；两者均缺省时返回 undefined': 'New merged bounds, or undefined when both inputs are omitted',
  '依次返回左上、右上、左下、右下角点':
    'Returns top-left, top-right, bottom-left, and bottom-right corners in that order',
  '各边外扩距离；负值表示内缩': 'Expansion for each side; negative values shrink the bounds',
  '插值参数；不限制在 0..1，区间外执行外插': 'Interpolation parameter; values outside 0..1 extrapolate',
  以形状中心为原点的本地坐标: 'Local coordinates relative to the shape center',
  待转换的世界坐标: 'World coordinates to transform',
  后应用的外层矩阵: 'Outer matrix applied second',
  先应用的内层矩阵: 'Inner matrix applied first',
  待映射的二维点: 'Two-dimensional point to transform',

  '点集的最小外接圆（Welzl 迭代式）': 'Smallest enclosing circle of a point set (iterative Welzl algorithm)',
  '用确定的等参数 polyline 近似曲线长度': 'Approximates curve length with a deterministic, uniformly sampled polyline',
  'centripetal Catmull-Rom（α=0.5）穿过 knots → 三次贝塞尔段链':
    'Converts centripetal Catmull-Rom (α=0.5) through knots into cubic Bézier segments',
  将沿曲线的距离反解为参数位置: 'Converts distance along a curve to its parameter',
  在曲线参数位置采样点和行进方向切线: 'Samples a point and forward tangent at a curve parameter',
  取曲线参数区间的保形子段: 'Extracts a shape-preserving segment over a parameter interval',
  从中心向目标方向的射线与椭圆的交点: 'Intersects an ellipse with a ray from its center toward a target',
  包住内部盒的椭圆外接半轴: 'Computes ellipse half-axes enclosing an inner box',
  '判断点是否在椭圆内，含边界': 'Tests whether a point is inside an ellipse, including its boundary',
  矩形盒的内接椭圆: 'Ellipse inscribed in a rectangular box',
  '圆 ∩ 圆，返回 0/1/2 交点（重合 / 内含 / 相离返回空）；外 / 内切（discriminant≈0）返回 2 个重合点，调用方自判':
    'Intersects circles; returns no points for coincident, contained, or disjoint circles, and two coincident points for tangency; callers handle duplicates',
  '直线（origin + direction，direction 不必单位化）∩ 圆，返回 0/1/2 交点；切线返回 2 个重合点，调用方自判':
    'Intersects a line with a circle without requiring a unit direction; tangency returns two coincident points for callers to deduplicate',
  '两条无限直线（各由两点定）的交点；平行 / 共线返回 null':
    'Intersects two infinite lines defined by point pairs; returns null for parallel or collinear lines',
  '线段 ∩ 线段：真交叉返回交点；平行 / 共线（含重叠）/ 不相交返回 null':
    'Intersects line segments; returns null for parallel, collinear (including overlapping), or disjoint segments',
  '从 origin 逆 direction 后退指定长度': 'Moves from origin opposite direction by the given scalar',
  '从 origin 沿 direction 前进指定长度': 'Moves from origin along direction by the given scalar',
  两点欧氏距离: 'Euclidean distance between two points',
  '精确相等比较，不使用容差': 'Exact equality comparison without tolerance',
  '将 sourcePoint 朝 targetPoint 移动指定距离': 'Moves sourcePoint toward targetPoint by the given distance',
  '点是否在简单多边形内（ray-casting 奇偶规则；顶点按序，不要求凹凸 / 绕向）':
    'Tests containment in a simple polygon using ray-casting parity; accepts ordered vertices of either winding and concavity',
  '外接圆（过三顶点的圆）': 'Circumcircle through all three vertices',
  '内切圆（与三边相切的圆）': 'Incircle tangent to all three sides',
  '向量加法：`a + b`': 'Vector addition: `a + b`',
  二维叉积标量: 'Scalar two-dimensional cross product',
  点积: 'Dot product',
  '角度（度）转单位向量': 'Converts an angle in degrees to a unit vector',
  向量长度: 'Vector length',
  '左手法向量 `[-y, x]`；不改变输入长度': 'Left normal `[-y, x]`, preserving the input length',
  '单位化向量；零长度时返回 fallback': 'Normalizes a vector; returns fallback for zero length',
  '单位化向量；零长度或非有限长度时返回 null': 'Normalizes a vector; returns null for zero or non-finite length',
  '标量乘法：`a * k`': 'Scalar multiplication: `a * k`',
  '向量减法：`a - b`': 'Vector subtraction: `a - b`',
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
  '角度区间（单位：度），用于描述沿屏幕坐标系的有向扫描范围':
    'An angle range in degrees describing a directed sweep in screen coordinates',
  '规范化后的终止角（度），落在起始角之后最多一整圈':
    'Normalized end angle in degrees, at most one full turn after the start',
  '起止角中分角（度）': 'Midpoint angle in degrees',
  '规范化后的起始角（度）': 'Normalized start angle in degrees',
  '圆弧段：圆心、半径、起末角（度）与扫描方向':
    'A circular arc defined by its center, radius, endpoint angles in degrees, and sweep direction',
  '圆心 [x, y]': 'Center [x, y]',
  '是否逆时针扫描；缺省 / false = CW（角度递增 / 屏幕顺时针）':
    'Whether to sweep counterclockwise; omitted or false means increasing angles, clockwise on screen',
  '终止角度（度）': 'End angle in degrees',
  鉴别字面量: 'Discriminator literal',
  '半径（user units）': 'Radius in user units',
  '起始角度（度，0=+x、90=+y 视觉下）': 'Start angle in degrees; 0 points along +x and 90 along screen-down +y',
  '中立轮廓命令，描述移动、直线、圆弧与闭合': 'Neutral contour commands describing moves, lines, arcs, and closure',
  '选择移动、直线、圆弧或闭合操作': 'Selects a move, line, arc, or close operation',
  移动或直线操作的目标坐标: 'Destination coordinate for a move or line',
  圆弧中心坐标: 'Arc center',
  '是否逆时针扫描；缺省 / false = CW': 'Whether to sweep counterclockwise; omitted or false means clockwise',
  '圆弧终止角，单位为度': 'Arc end angle in degrees',
  '圆弧半径，使用绘图坐标单位': 'Arc radius in coordinate units',
  '圆弧起始角，单位为度；0 指向水平正向': 'Arc start angle in degrees; 0 points right',
  '轮廓段：组成开放或闭合轮廓的直线或圆弧': 'A line or arc segment in an open or closed contour',
  '起点 [x, y]': 'Start point [x, y]',
  '终点 [x, y]': 'End point [x, y]',
  '一个接缝处 fillet 的解算结果': 'The fillet solution at one seam',
  'tangentInPoint = 前段被裁短到此点（前段新终点）；tangentOutPoint = 后段从此点起（后段新起点）；\n  圆心、半径与起末角描述连接两切点的圆弧。clampedToZero=true 表示该角夹紧后 r→0，不倒角（保持尖角）':
    'The incoming segment ends at tangentInPoint and the outgoing segment starts at tangentOutPoint. The center, radius, and endpoint angles describe the connecting arc. clampedToZero means the radius was clamped to zero and the corner remains sharp.',
  'fillet 圆心': 'Fillet center',
  '夹紧后 r→0，本角不倒（emit 走原尖角）': 'Whether the radius was clamped to zero, preserving the sharp corner',
  'fillet 弧是否逆时针': 'Whether the fillet arc sweeps counterclockwise',
  'fillet 弧终止角（度，从 center 看 tangentOutPoint）':
    'Fillet end angle in degrees, from the center toward tangentOutPoint',
  'fillet 半径': 'Fillet radius',
  'fillet 弧起始角（度，从 center 看 tangentInPoint）':
    'Fillet start angle in degrees, from the center toward tangentInPoint',
  '前段切点（前段新终点）': 'Incoming tangent point and new incoming-segment endpoint',
  '后段切点（后段新起点）': 'Outgoing tangent point and new outgoing-segment start point',
  '直线段：从 from 到 to 的有向线段': 'A directed line segment from from to to',
  '角度（degree）转弧度（radian）的乘数': 'Multiplier converting degrees to radians',
  '弧度（radian）转角度（degree）的乘数': 'Multiplier converting radians to degrees',
  '调整 endAngle，使 start -> end 沿指定方向扫描且跨度不超过一整圈':
    'Aligns the end angle to sweep from start in the requested direction by at most one full turn',
  将轮廓与已求解的圆角组装为中立路径命令: 'Builds neutral contour commands from segments and previously solved fillets',
  'fillets 为空时保留原轮廓；非空时必须与同一段序列及 closed 配对，逐段裁剪并插入相切圆弧。\n  夹紧到零的接缝保持尖角；closed 为 false 时不添加闭合命令':
    'An empty fillet list preserves the original contour. A nonempty list must match the same segment sequence and closed flag; segments are trimmed and tangent arcs inserted. Zero-radius seams remain sharp. No closing command is emitted when closed is false.',
  '从 rayOrigin 朝 toward 射线 ∩ fillet 后轮廓全部段，返回最近正向交点':
    'Intersects the ray from rayOrigin toward toward with the filleted contour, returning the nearest forward hit',
  'rayOrigin 显式传（不假设中心）；toward 是射线指向的目标点（方向 = toward − rayOrigin）。\n  遍历 fillet 后的有效段（缩短 line / 裁剪 arc / fillet arc），对每段求 ray∩段、取最小正参数命中点。\n  fillets 为空时查询原轮廓；非空时复用与同一段序列配对的圆角结果。无命中返回 undefined':
    'The explicit ray origin need not be the contour center; direction is toward minus rayOrigin. Tests trimmed lines, original arcs, and fillet arcs, selecting the smallest positive ray parameter. An empty fillet list queries the original contour; a nonempty list must match the segments. Returns undefined when no hit exists.',
  '规范化起止角：保证 start <= end <= start + 360，并给出中分角':
    'Normalizes endpoint angles so start <= end <= start + 360 and returns the midpoint angle',
  '角度沿屏幕系（角度递增 = 顺时针）从 start 扫到 end；end < start 视为跨过 360 度':
    'Sweeps from start to end with increasing angles, clockwise in screen coordinates; an end below start wraps across 360 degrees.',
  '把角度规范化到 [0, 360) 区间': 'Normalizes an angle to [0, 360)',
  '把角度规范化为最近表示，范围为 [-180, 180]':
    'Normalizes an angle to its nearest signed representation in [-180, 180]',
  '矩形 outline：两对角 → 顺时针 path 算子序列':
    'Builds clockwise rectangle contour commands from two opposite corners',
  'from/to 任意顺序，归一化 (x0,y0)=min、(x1,y1)=max。直角 = 3 line + close（起点左上 (x0,y0)）；\n  圆角 = 4 line + 4 quarter-arc + close（起点 (x0+r, y0)）。cornerRadius clamp 到 min(w,h)/2。\n  角度约定同 `@retikz/math` arc（y-down：0=+x, 90=+y/下, 180=-x, 270=-y/上）':
    'Accepts either corner order and derives the minimum and maximum coordinates. Sharp corners use three line commands plus close from the top-left corner. Rounded corners use four lines and four quarter-arcs plus close, starting at (x0+r, y0). The radius is clamped to half the shorter side. Angles follow screen coordinates: 0=right, 90=down, 180=left, 270=up.',
  '对轮廓的每个接缝做 fillet，返回 fillet 解算列表（与接缝一一对应，下标 i = 段 i 终点接段下一段起点）':
    'Solves one fillet per contour seam; index i joins the end of segment i to the next segment',
  'cornerRadius 省略 / ≤0 → 返回空数组；需要倒角的 arc-arc 接缝返回 undefined。\n  closed（缺省 true）= 闭合轮廓，含首尾环绕接缝（下标 n-1 = 段 n-1 终点接段 0 起点）；\n  closed=false = 开放折线，只倒内部接缝（下标 0..n-2），末位补一个 clampedToZero 占位使返回长度恒 = n，\n  下游轮廓构造与射线求交据 clampedToZero 跳过该「不存在的」环绕缝':
    'An omitted or nonpositive radius returns an empty list. Arc-to-arc seams requiring a fillet return undefined. closed defaults to true and includes the wraparound seam. For an open contour, only internal seams are rounded; a final clampedToZero placeholder preserves one result per segment so construction and intersection can skip the absent wraparound seam.',
};

/** 将中文 JSDoc 投影为英文文案，缺少审阅后的映射时终止生成 */
export const translateMathApiReference = (source: string): string => {
  if (!/[\u3400-\u9fff]/u.test(source)) return source;

  const translation = translations[source];
  if (translation) return translation;

  throw new Error(`缺少 @retikz/math API Reference 的审阅后英文翻译：${source}`);
};
