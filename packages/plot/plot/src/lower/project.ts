import { Cartesian1DOrientation, type Cartesian1DOrientationType, PlotCoordinate } from '../ir';
import { isFiniteNumber } from './field';
import type { Rect } from './layout';
import type { PositionScale } from './scale';

/** polar 段内采样：相邻顶点间在 [θ, r] 空间插入的固定中间点数（每段定额，连续角轴弯弧） */
export const RETIKZ_POLAR_SEGMENT_SAMPLES = 16;

/**
 * 坐标系位置角色：mark 按 frame.roles 序从 encoding 取对应通道值喂 projectRoles
 * @description cartesian=[x,y]、polar=[angle,radius]、cartesian1D=[x]、polar1D=[angle]、ternary=[a,b,c]。
 *   值对齐 IR GuideDimension 字面量，但位置角色是 frame 内部类型、guide dimension 是 IR 字段（各自管类型）。
 */
export type DimensionRole = 'x' | 'y' | 'angle' | 'radius' | 'a' | 'b' | 'c';

/**
 * 某角色轴曲线在某参数点的局部标架（alpha.9 ADR-05）：原点 + 切向，均在屏幕空间
 * @description 固定其余角色、只让某 role 变化得到一条 1D 轴曲线 γ_role(t)；`tangent` = ∂γ/∂role（原始幅值，
 *   消费方需方向时自行归一化）。法向 = 切向逆时针转 90°，由 guide 导出（不入此类型）。
 *   无论坐标系总共几个 role，轴曲线永远 1D、永远有切向法向——这是曲线轴刻度 / 标签所需。
 */
export type AxisFrame = {
  /** 该点屏幕坐标（= projectRoles(values)，分量数值相等） */
  origin: [number, number];
  /** 沿该角色轴曲线的切向 ∂γ/∂role（屏幕空间，原始幅值） */
  tangent: [number, number];
};

/**
 * 解析后的坐标帧：lowering 算一次，mark / guide 共用同一帧（不各造临时投影框架）
 * @description grammar of graphics 的 coordinate 层：scale 把值归一化后，frame 负责归一化→2D 点。
 *   N 通道泛化（alpha.9 ADR-01）：`roles` 是该坐标系的位置角色序、`projectRoles(values)` 按 roles 序传值投影；
 *   2 通道的 `project(primary, secondary)` 保留为便捷别名（cartesian/polar 内部 + line/area 复用，零行为改变）。
 *   非有限值返回 null（跳过该点）。
 */
export type CoordinateFrame = CartesianFrame | PolarFrame | Cartesian1DFrame | Polar1DFrame | Ternary2DFrame | CustomFrame;

/** 笛卡尔帧：primary = x（水平）、secondary = y（垂直），投影直接取两条 scale 的 coordinate */
export type CartesianFrame = {
  /** 判别字段：2D 笛卡尔 */
  type: typeof PlotCoordinate.Cartesian2D;
  /** 位置角色序（[x, y]）；mark 按此序取 encoding 通道值 */
  roles: ReadonlyArray<DimensionRole>;
  /** x（水平）位置 scale */
  primary: PositionScale;
  /** y（垂直）位置 scale */
  secondary: PositionScale;
  /** 投影：[primary.coordinate(x), secondary.coordinate(y)]；任一非有限 → null */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
  /** N 通道投影：按 roles 序传值（[x, y]），内部委托 project；任一非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
};

/** 极坐标帧：primary = angle（度，range = [startAngle, endAngle]）、secondary = radius（user units，range = [innerRadius, outerRadius]） */
export type PolarFrame = {
  /** 判别字段：2D 极坐标 */
  type: typeof PlotCoordinate.Polar2D;
  /** 位置角色序（[angle, radius]）；mark 按此序取 encoding 通道值（x→angle、y→radius 别名） */
  roles: ReadonlyArray<DimensionRole>;
  /** 圆心（屏幕坐标） */
  center: [number, number];
  /** 内半径（user units，环图内半径，0 = 实心） */
  innerRadius: number;
  /** 外半径（user units，可用外半径） */
  outerRadius: number;
  /** 角向起始角（度，角向 range 起） */
  startAngle: number;
  /** 角向终止角（度，角向 range 止） */
  endAngle: number;
  /** 角向 scale 是否连续（linear / time）；连续才在段内插值采样，分类（band / point）走弦 */
  continuousAngle: boolean;
  /** angle 位置 scale（range = [startAngle, endAngle] 度） */
  primary: PositionScale;
  /** radius 位置 scale（range = [innerRadius, outerRadius]） */
  secondary: PositionScale;
  /** 投影：θ=primary.coordinate(angle)°、r=secondary.coordinate(radius)，[cx + r·cosθ, cy + r·sinθ]；任一非有限 → null */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
  /** N 通道投影：按 roles 序传值（[angle, radius]），内部委托 project；任一非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
  /** 把已映射的极坐标对 (θ 度, r user units) 换算成屏幕点（段内采样反投影用；非有限 → null） */
  projectPolar: (thetaDeg: number, radius: number) => [number, number] | null;
};

/** 度 → 弧度 */
const DEG_TO_RAD = Math.PI / 180;

/** 建笛卡尔帧：primary/secondary 直接投影成 [x, y]（与早期 createCartesianProjector 行为等价） */
export const createCartesianFrame = (primary: PositionScale, secondary: PositionScale): CartesianFrame => {
  const project = (primaryValue: unknown, secondaryValue: unknown): [number, number] | null => {
    const x = primary.coordinate(primaryValue);
    const y = secondary.coordinate(secondaryValue);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return [x, y];
  };
  return {
    type: PlotCoordinate.Cartesian2D,
    roles: ['x', 'y'],
    primary,
    secondary,
    project,
    projectRoles: values => project(values[0], values[1]),
  };
};

/** 建极坐标帧的参数（圆心 + 内外半径 + 角向区间，均来自 layout / coordinate IR） */
export type PolarFrameSpec = {
  /** 圆心（屏幕坐标） */
  center: [number, number];
  /** 内半径（user units） */
  innerRadius: number;
  /** 外半径（user units） */
  outerRadius: number;
  /** 角向起始角（度） */
  startAngle: number;
  /** 角向终止角（度） */
  endAngle: number;
  /** 角向 scale 是否连续（linear / time）；决定连续 mark 是否段内采样 */
  continuousAngle: boolean;
  /** angle 位置 scale */
  primary: PositionScale;
  /** radius 位置 scale */
  secondary: PositionScale;
};

/**
 * 建极坐标帧：投影只在 PositionScale 之上加一步极坐标→笛卡尔
 * @description θ=primary.coordinate(angleValue)（度）、r=secondary.coordinate(radiusValue)；
 *   返回 [cx + r·cos(θ°), cy + r·sin(θ°)]，屏幕 y 向下、0°=+x、90°=+y（与 core polar 约定一致）。
 */
export const createPolarFrame = (input: PolarFrameSpec): PolarFrame => {
  const [cx, cy] = input.center;
  const projectPolar = (thetaDeg: number, radius: number): [number, number] | null => {
    if (!Number.isFinite(thetaDeg) || !Number.isFinite(radius)) return null;
    const radians = thetaDeg * DEG_TO_RAD;
    return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
  };
  const project = (angleValue: unknown, radiusValue: unknown): [number, number] | null => {
    const theta = input.primary.coordinate(angleValue);
    const radius = input.secondary.coordinate(radiusValue);
    return projectPolar(theta, radius);
  };
  return {
    type: PlotCoordinate.Polar2D,
    roles: ['angle', 'radius'],
    center: input.center,
    innerRadius: input.innerRadius,
    outerRadius: input.outerRadius,
    startAngle: input.startAngle,
    endAngle: input.endAngle,
    continuousAngle: input.continuousAngle,
    primary: input.primary,
    secondary: input.secondary,
    project,
    projectRoles: values => project(values[0], values[1]),
    projectPolar,
  };
};

/** 一维笛卡尔帧（直线）：单一位置 scale 落一条轴线，塌缩的第二屏幕维取固定基线 */
export type Cartesian1DFrame = {
  /** 判别字段：1D 笛卡尔直线 */
  type: typeof PlotCoordinate.Cartesian1D;
  /** 位置角色序（[x]，单通道） */
  roles: ReadonlyArray<DimensionRole>;
  /** 轴向（horizontal 沿 x、vertical 沿 y） */
  orientation: Cartesian1DOrientationType;
  /** 塌缩维固定基线（horizontal=底边屏幕 y、vertical=左边屏幕 x） */
  baseline: number;
  /** 单一位置 scale */
  primary: PositionScale;
  /** 投影别名（2 入参形态，secondary 忽略）：等价 projectRoles([primaryValue]) */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
  /** N 通道投影：roles 长度 1，传 [value] → horizontal [scale(v), baseline] / vertical [baseline, scale(v)]；非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
};

/** 一维极坐标帧（圆周）：单一角向 scale 落固定半径圆周（半径常量、角度编码值） */
export type Polar1DFrame = {
  /** 判别字段：1D 极坐标圆周 */
  type: typeof PlotCoordinate.Polar1D;
  /** 位置角色序（[angle]，单通道；x→angle 别名取值） */
  roles: ReadonlyArray<DimensionRole>;
  /** 圆心（屏幕坐标） */
  center: [number, number];
  /** 固定圆周半径（user units，= radius 占比 × outerRadius） */
  radius: number;
  /** 角向起始角（度，角向 range 起） */
  startAngle: number;
  /** 角向终止角（度，角向 range 止） */
  endAngle: number;
  /** 角向 scale 是否连续（linear / time）；连续才在段内插值采样 */
  continuousAngle: boolean;
  /** angle 位置 scale（range = [startAngle, endAngle] 度） */
  primary: PositionScale;
  /** 把已映射的极坐标对 (θ 度, r user units) 换算成屏幕点（非有限 → null） */
  projectPolar: (thetaDeg: number, radius: number) => [number, number] | null;
  /** 投影别名（2 入参形态，secondary 忽略）：等价 projectRoles([angleValue]) */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
  /** N 通道投影：roles 长度 1，传 [angleValue] → projectPolar(angleScale(angleValue), radius)；非有限 → null */
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
};

/** 建一维笛卡尔帧：单 scale + 轴向 + 塌缩维基线（horizontal → [scale(v), baseline]、vertical → [baseline, scale(v)]） */
export const createCartesian1DFrame = (scale: PositionScale, orientation: Cartesian1DOrientationType, baseline: number): Cartesian1DFrame => {
  const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const position = scale.coordinate(values[0]);
    if (!Number.isFinite(position)) return null;
    // horizontal：数据沿 x、塌缩 y=baseline（底边）；vertical：数据沿 y、塌缩 x=baseline（左边）
    return orientation === Cartesian1DOrientation.Horizontal ? [position, baseline] : [baseline, position];
  };
  return {
    type: PlotCoordinate.Cartesian1D,
    roles: ['x'],
    orientation,
    baseline,
    primary: scale,
    project: primaryValue => projectRoles([primaryValue]),
    projectRoles,
  };
};

/** 建一维极坐标帧的参数（圆心 + 固定半径 + 角向区间 + angle scale） */
export type Polar1DFrameSpec = {
  /** 圆心（屏幕坐标） */
  center: [number, number];
  /** 固定圆周半径（user units） */
  radius: number;
  /** 角向起始角（度） */
  startAngle: number;
  /** 角向终止角（度） */
  endAngle: number;
  /** 角向 scale 是否连续 */
  continuousAngle: boolean;
  /** angle 位置 scale */
  primary: PositionScale;
};

/** 建一维极坐标帧：角向投影固定在半径 radius 的圆周（复用极坐标→笛卡尔换算） */
export const createPolar1DFrame = (input: Polar1DFrameSpec): Polar1DFrame => {
  const [cx, cy] = input.center;
  const projectPolar = (thetaDeg: number, radius: number): [number, number] | null => {
    if (!Number.isFinite(thetaDeg) || !Number.isFinite(radius)) return null;
    const radians = thetaDeg * DEG_TO_RAD;
    return [cx + radius * Math.cos(radians), cy + radius * Math.sin(radians)];
  };
  const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const theta = input.primary.coordinate(values[0]);
    return projectPolar(theta, input.radius);
  };
  return {
    type: PlotCoordinate.Polar1D,
    roles: ['angle'],
    center: input.center,
    radius: input.radius,
    startAngle: input.startAngle,
    endAngle: input.endAngle,
    continuousAngle: input.continuousAngle,
    primary: input.primary,
    projectPolar,
    project: primaryValue => projectRoles([primaryValue]),
    projectRoles,
  };
};

/** 三角顶点序（屏幕坐标）：[Va(a=100%顶点), Vb(b=100%右下), Vc(c=100%左下)] */
export type TernaryVertices = [[number, number], [number, number], [number, number]];

/** 三元帧（重心坐标）：三连续分量 a/b/c 归一化后按重心坐标投影到等边三角内 */
export type Ternary2DFrame = {
  /** 判别字段：2D 三元 */
  type: typeof PlotCoordinate.Ternary2D;
  /** 位置角色序（[a, b, c]，3 通道） */
  roles: ReadonlyArray<DimensionRole>;
  /** 三角顶点（屏幕坐标）：[Va, Vb, Vc] */
  vertices: TernaryVertices;
  /** 投影别名（2 入参形态对三元无意义，恒返回 null）：三元须走 projectRoles */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
  /** N 通道投影：roles 长度 3，传 [a, b, c] → 归一化 + 重心坐标屏幕点；非有限 → null（跳过）、含负 / 和≤0 → throw（fail-loud） */
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
};

/**
 * 建三元帧：重心投影 + 自动归一化（容忍任意正三元组）
 * @description 每行 (a,b,c) 先归一化 s=a+b+c、(a/s,b/s,c/s)，再 na·Va + nb·Vb + nc·Vc 得屏幕点。
 *   非有限值（缺字段 / NaN）→ null 跳过该点（与其它坐标系一致）；含负分量 / 和≤0 → fail-loud（数据错误、不静默归一）。
 */
export const createTernary2DFrame = (vertices: TernaryVertices): Ternary2DFrame => {
  const [va, vb, vc] = vertices;
  const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const a = values[0];
    const b = values[1];
    const c = values[2];
    if (!isFiniteNumber(a) || !isFiniteNumber(b) || !isFiniteNumber(c)) return null;
    if (a < 0 || b < 0 || c < 0) {
      throw new Error(`lowerPlots: ternary coordinate requires non-negative components (got a=${a}, b=${b}, c=${c})`);
    }
    const sum = a + b + c;
    if (sum <= 0) {
      throw new Error(`lowerPlots: ternary coordinate requires a+b+c > 0 (got a=${a}, b=${b}, c=${c})`);
    }
    // 各分量有限但和上溢 Infinity（分量数量级过大）→ 归一化系数塌成 0、点静默落原点；fail-loud 不静默出怪图
    if (!Number.isFinite(sum)) {
      throw new Error(`lowerPlots: ternary coordinate components overflow when summed (got a=${a}, b=${b}, c=${c}); use proportions or smaller magnitudes`);
    }
    const na = a / sum;
    const nb = b / sum;
    const nc = c / sum;
    return [na * va[0] + nb * vb[0] + nc * vc[0], na * va[1] + nb * vb[1] + nc * vc[1]];
  };
  return {
    type: PlotCoordinate.Ternary2D,
    roles: ['a', 'b', 'c'],
    vertices,
    project: () => null,
    projectRoles,
  };
};

// ── 自定义坐标系（实验性；alpha.9 设计探讨产物）──────────────────────────────────────────
// 证明并落地：`projectRoles` 足以表达任意坐标系几何，无需「轴」抽象。投影函数（不可序列化）由运行时工厂
// 提供、不进 IR；IR 只留 `{type:'custom', name, roles, params}` 的 JSON 引用（见 ir/coordinate.ts）。
// 这是「一个通用扩展点」而非给枚举塞 exotic 成员——用户自定义曲线一维 / 拱形 x 轴等都走这条。

/** 自定义坐标帧：投影完全由工厂给出的 projectRoles 决定（任意几何） */
export type CustomFrame = {
  /** 判别字段：自定义（运行时工厂产出，非内建坐标系） */
  type: 'custom';
  /** 位置角色序（工厂消费哪些 mark 通道，按序喂 projectRoles） */
  roles: ReadonlyArray<DimensionRole>;
  /** 投影别名：自定义须走 projectRoles（2 入参形态对任意角色数无意义），恒 null */
  project: (primaryValue: unknown, secondaryValue: unknown) => [number, number] | null;
  /** N 通道投影：按 roles 序传值 → 屏幕点；非有限 → null（跳过） */
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null;
  /**
   * 各角色的位置 scale（工厂可选回传）：供 guide 画轴用——取该角色刻度、其余角色锚在各自 domain 起点，
   * 沿 projectRoles 密采样得曲线轴线 + 刻度点。不回传 → 该坐标系不画轴。
   */
  roleScales?: Partial<Record<DimensionRole, PositionScale>>;
  /**
   * 某角色轴曲线在某点的局部标架（工厂可选回传，alpha.9 ADR-05）：origin + 切向 ∂γ/∂role。
   * 曲线轴优先用它取精确切向；不回传 → guide 对 projectRoles 数值差分回落（现状行为）。
   */
  frameAlong?: (role: DimensionRole, values: ReadonlyArray<unknown>) => AxisFrame | null;
};

/** createCustomFrame 选项（alpha.9 ADR-05）：roleScales 让 guide 画曲线轴、frameAlong 给精确切向；均可选 */
export type CreateCustomFrameOptions = {
  /** 各角色位置 scale；供 guide 画轴。省略 → 该坐标系无轴 */
  roleScales?: Partial<Record<DimensionRole, PositionScale>>;
  /** 某角色轴曲线局部标架；曲线轴优先用其切向，省略 → guide 数值差分回落 */
  frameAlong?: (role: DimensionRole, values: ReadonlyArray<unknown>) => AxisFrame | null;
};

/**
 * 建自定义坐标帧：把工厂给的 roles + projectRoles 包成 CoordinateFrame（point mark 经此投影）
 * @description 第三参 options（alpha.9 ADR-05）：roleScales 让 guide 画曲线轴、frameAlong 给精确轴切向；均可选。
 */
export const createCustomFrame = (
  roles: ReadonlyArray<DimensionRole>,
  projectRoles: (values: ReadonlyArray<unknown>) => [number, number] | null,
  options?: CreateCustomFrameOptions,
): CustomFrame => ({
  type: 'custom',
  roles,
  project: () => null,
  projectRoles,
  ...(options?.roleScales !== undefined ? { roleScales: options.roleScales } : {}),
  ...(options?.frameAlong !== undefined ? { frameAlong: options.frameAlong } : {}),
});

/**
 * 自定义坐标系工厂的上下文：画布尺寸 + 数值参数 + 角色序 + 按角色建线性位置 scale 的工具
 * @description 工厂据此组装任意投影几何（曲线、拱、螺旋…）。`linearScaleFor(role, range)` 按该角色绑定字段的
 *   数据 extent 建一条线性 scale 映到给定屏幕 range，供工厂拼装；要更复杂 scale 工厂可自行处理。
 */
export type CustomCoordinateContext = {
  /** 整图宽（user units） */
  width: number;
  /** 整图高（user units） */
  height: number;
  /** 绘图区矩形（本轮自定义坐标系给整画布、不自动收窄） */
  plotArea: Rect;
  /** label 字号 */
  fontSize: number;
  /** IR 传入的数值参数（如 archHeight），JSON 安全；键可缺省（工厂自带默认值），故值可能 undefined */
  params: Record<string, number | undefined>;
  /** 该坐标系消费的位置角色序（= IR coordinate.roles） */
  roles: ReadonlyArray<DimensionRole>;
  /** 按角色建线性位置 scale（数据 extent → 给定屏幕 range），供工厂拼装投影 */
  linearScaleFor: (role: DimensionRole, range: [number, number]) => PositionScale;
};

/** 自定义坐标系工厂：上下文 → CoordinateFrame（通常 createCustomFrame(roles, projectRoles)） */
export type CustomCoordinateFactory = (context: CustomCoordinateContext) => CoordinateFrame;

/** 一行的极坐标映射结果：θ（度）+ r（user units），均经 scale 映射后；任一非有限 → null（跳过该顶点） */
export type PolarVertex = { theta: number; radius: number };

/** 把一行的角向 / 径向原始值映射成 PolarVertex（非有限 → null，跳过） */
export const toPolarVertex = (frame: PolarFrame, angleValue: unknown, radiusValue: unknown): PolarVertex | null => {
  const theta = frame.primary.coordinate(angleValue);
  const radius = frame.secondary.coordinate(radiusValue);
  if (!isFiniteNumber(theta) || !isFiniteNumber(radius)) return null;
  return { theta, radius };
};

/**
 * 连续角轴段内采样：在 [θ, r] scale 输出空间线性插值，逐点反投影成屏幕弧点
 * @description 相邻顶点间插 RETIKZ_POLAR_SEGMENT_SAMPLES 个中间点（在度 + 半径空间线性，非原始数据空间），
 *   使数据空间「常半径变角」的直边在屏幕弯成弧。顶点数 < 2 时直接返回各顶点投影点（不采样）。
 */
export const densifyPolarSegments = (frame: PolarFrame, vertices: ReadonlyArray<PolarVertex>): Array<[number, number]> => {
  if (vertices.length < 2) {
    return vertices.map(v => frame.projectPolar(v.theta, v.radius)).filter((p): p is [number, number] => p !== null);
  }
  const points: Array<[number, number]> = [];
  const first = frame.projectPolar(vertices[0].theta, vertices[0].radius);
  if (first) points.push(first);
  for (let i = 1; i < vertices.length; i += 1) {
    const a = vertices[i - 1];
    const b = vertices[i];
    // 段内中间点 + 段终点：t 从 1/(N+1) 走到 1（含终点）
    for (let step = 1; step <= RETIKZ_POLAR_SEGMENT_SAMPLES + 1; step += 1) {
      const t = step / (RETIKZ_POLAR_SEGMENT_SAMPLES + 1);
      const theta = a.theta + (b.theta - a.theta) * t;
      const radius = a.radius + (b.radius - a.radius) * t;
      const point = frame.projectPolar(theta, radius);
      if (point) points.push(point);
    }
  }
  return points;
};
