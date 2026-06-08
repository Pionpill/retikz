import type { IRGradientStop, IRNode, IRPath, IRScope, IRStep } from '@retikz/core';
import type { AxisGuide, LegendChannelType, LegendOrientType, LegendPositionType } from '../ir';
import { AXIS_LABEL_GAP, AXIS_TICK_LENGTH, type Rect, estimateLabelWidth } from './layout';
import type { PolarFrame } from './project';
import { type ProvenanceContext, guideLayerId, guideLayerMeta } from './provenance';
import type { PositionScale, TickSet } from './scale';

/**
 * lowerGuide 上下文：cartesian 直线 guide 用 plotArea + 两维投影 + ticks；polar 经 `frame` 走弧 / 辐条几何
 * @description cartesian 沿用 alpha.2 形态（projectX/projectY/plotArea/xTicks/yTicks），产物逐字不变；
 *   polar 由 `frame`（ADR-01 的 PolarFrame）驱动：圆心 / 内外半径 / 起止角 + primary(angle)/secondary(radius) 投影。
 *   存在 `frame.type === polar2D` 即走极坐标分支，guide 与 mark 同帧严格对齐。
 */
export type GuideContext = {
  /** 缩进后的绘图区矩形（cartesian 轴线 / 网格框） */
  plotArea: Rect;
  /** x 维位置 scale（值 → 像素 x，含 band 中心；cartesian 用） */
  projectX: PositionScale;
  /** y 维位置 scale（值 → 像素 y；cartesian 用） */
  projectY: PositionScale;
  /** x 轴刻度集（axis 与同维 grid 复用；cartesian 用） */
  xTicks: TickSet;
  /** y 轴刻度集（cartesian 用） */
  yTicks: TickSet;
  /** label 字号（与 ADR-03 估算同源） */
  fontSize: number;
  /** polar 坐标帧（仅 polar2D 时给）：存在即按维度角色走 angular / radial 几何 */
  frame?: PolarFrame;
  /** angular 维刻度集（polar；angle / x 维 axis 与同维 grid 复用） */
  angularTicks?: TickSet;
  /** radial 维刻度集（polar；radius / y 维） */
  radialTicks?: TickSet;
};

/** lowerGuide 返回：网格层（仅 grid:true 时非空，垫底）+ 轴层（总有，压顶） */
export type LoweredGuide = {
  /** 网格层 scope（grid:true 且有刻度时）；否则 null */
  gridLayer: IRScope | null;
  /** 轴层 scope（轴线 + 刻度线 + 可选标签）；空刻度时 null */
  axisLayer: IRScope | null;
};

/** 一段直线（首尾两点） */
type Segment = [readonly [number, number], readonly [number, number]];

/** 度 → 弧度 */
const DEG_TO_RAD = Math.PI / 180;

/** 把若干直线段拼成一条多子路径 Path（每段一对 move/line）；空段返回 null */
const segmentsToPath = (segments: Array<Segment>): IRPath | null => {
  if (segments.length === 0) return null;
  const steps: Array<IRStep> = segments.flatMap(([from, to]) => [
    { type: 'step', kind: 'move', to: [from[0], from[1]] },
    { type: 'step', kind: 'line', to: [to[0], to[1]] },
  ]);
  return { type: 'path', children: steps };
};

/** 某 dimension 是否为 primary 角色（cartesian x / polar angle）；否则 secondary（y / radius） */
const isPrimaryDimension = (dimension: string): boolean => dimension === 'x' || dimension === 'angle';

/**
 * 轴 / 网格 scope 的 id + meta props（provenance 开时合成 `<plotId>.` 前缀 id + layer 来源 meta）
 * @description provenance 关（context undefined）→ 沿用 alpha.2 行为：仅在用户给 guide.id 时绑裸 id、无 meta。
 *   开 → id 走 `<plotId>.<guideId|axis|grid.dim>`（plotId 缺则匿名）、meta 写 {source,layer,dimension}。
 */
const guideScopeProps = (
  guide: AxisGuide,
  layer: 'axis' | 'grid',
  context: ProvenanceContext | undefined,
): { id?: string; meta?: ReturnType<typeof guideLayerMeta> } => {
  if (!context) return layer === 'axis' && guide.id ? { id: guide.id } : {};
  // 用户句柄 guide.id 只挂轴层（一个 guide 一个外部句柄）；网格层走结构 id，避免轴 / 网格 id 撞名
  const guideId = layer === 'axis' ? guide.id : undefined;
  const id = guideLayerId(context.plotId, guideId, layer, guide.dimension);
  return { ...(id !== undefined ? { id } : {}), meta: guideLayerMeta(layer, guide.dimension) };
};

/** cartesian guide：直线轴 + 竖 / 横刻度 + grid 跨绘图区直线（alpha.2 几何，逐字保持） */
const lowerCartesianGuide = (guide: AxisGuide, ctx: GuideContext, context: ProvenanceContext | undefined): LoweredGuide => {
  const { plotArea, fontSize } = ctx;
  const left = plotArea.x;
  const right = plotArea.x + plotArea.width;
  const top = plotArea.y;
  const bottom = plotArea.y + plotArea.height;
  const showLabels = guide.tickLabels !== false;

  const isX = guide.dimension === 'x';
  const ticks = isX ? ctx.xTicks : ctx.yTicks;
  const project = isX ? ctx.projectX : ctx.projectY;

  // ---- 轴层 ----
  const axisLine: Segment = isX ? [[left, bottom], [right, bottom]] : [[left, top], [left, bottom]];
  const tickSegments: Array<Segment> = ticks.values.map(value => {
    const p = project.coordinate(value);
    return isX ? [[p, bottom], [p, bottom + AXIS_TICK_LENGTH]] : [[left, p], [left - AXIS_TICK_LENGTH, p]];
  });
  const linePath = segmentsToPath([axisLine, ...tickSegments]);
  const labels: Array<IRNode> = showLabels
    ? ticks.values.map((value, index): IRNode => {
        const p = project.coordinate(value);
        const text = ticks.labels[index];
        const position: [number, number] = isX
          ? [p, bottom + AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize / 2]
          : [left - AXIS_TICK_LENGTH - AXIS_LABEL_GAP - estimateLabelWidth(text, fontSize) / 2, p];
        return { type: 'node', position, text };
      })
    : [];

  const axisLayer: IRScope | null = linePath
    ? {
        type: 'scope',
        ...guideScopeProps(guide, 'axis', context),
        pathDefault: { stroke: 'currentColor' },
        nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
        children: [linePath, ...labels],
      }
    : null;

  // ---- 网格层（grid:true 才出）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const gridSegments: Array<Segment> = ticks.values.map(value => {
      const p = project.coordinate(value);
      return isX ? [[p, top], [p, bottom]] : [[left, p], [right, p]];
    });
    const gridPath = segmentsToPath(gridSegments);
    if (gridPath) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor', drawOpacity: 0.15 },
        children: [gridPath],
      };
    }
  }

  return { gridLayer, axisLayer };
};

/** 圆心 + 角(度) + 半径 → 屏幕点（0°=+x、90°=+y，屏幕 y 向下，与 frame.project 约定一致） */
const polarPoint = (center: readonly [number, number], angleDeg: number, radius: number): [number, number] => {
  const radians = angleDeg * DEG_TO_RAD;
  return [center[0] + radius * Math.cos(radians), center[1] + radius * Math.sin(radians)];
};

/** 一条弧 Path（move 到弧起点 + arc step 扫 startAngle→endAngle，圆心 = frame.center、给定半径）；轴线与同心环复用 */
const arcPath = (frame: PolarFrame, radius: number): IRPath => {
  const start = polarPoint(frame.center, frame.startAngle, radius);
  return {
    type: 'path',
    children: [
      { type: 'step', kind: 'move', to: [start[0], start[1]] },
      {
        type: 'step',
        kind: 'arc',
        startAngle: frame.startAngle,
        endAngle: frame.endAngle,
        radius,
        center: [frame.center[0], frame.center[1]],
      },
    ],
  };
};

/**
 * polar angular axis：外圆弧轴线 + 每角向刻度短径向刻度线 + 圆周外标签
 * @description 轴线 = arc step（半径 outerRadius）；刻度 = 圆周点向外 AXIS_TICK_LENGTH 短线；
 *   标签 = center + (outerRadius+gap)·(cosθ,sinθ) 处 Node text。grid:true → 每刻度一条圆心→外圆辐条。
 */
const lowerAngularAxis = (guide: AxisGuide, ctx: GuideContext, frame: PolarFrame, context: ProvenanceContext | undefined): LoweredGuide => {
  const { fontSize } = ctx;
  const ticks = ctx.angularTicks ?? { values: [], labels: [] };
  const scale = frame.primary;
  const outer = frame.outerRadius;
  const showLabels = guide.tickLabels !== false;

  // ---- 轴层 ----
  const tickSegments: Array<Segment> = ticks.values.map(value => {
    const theta = scale.coordinate(value);
    return [polarPoint(frame.center, theta, outer), polarPoint(frame.center, theta, outer + AXIS_TICK_LENGTH)];
  });
  const tickPath = segmentsToPath(tickSegments);
  const axisChildren: Array<IRPath | IRNode> = [arcPath(frame, outer)];
  if (tickPath) axisChildren.push(tickPath);
  const labels: Array<IRNode> = showLabels
    ? ticks.values.map((value, index): IRNode => {
        const theta = scale.coordinate(value);
        const position = polarPoint(frame.center, theta, outer + AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize / 2);
        return { type: 'node', position, text: ticks.labels[index] };
      })
    : [];

  const axisLayer: IRScope = {
    type: 'scope',
    ...guideScopeProps(guide, 'axis', context),
    pathDefault: { stroke: 'currentColor' },
    nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
    children: [...axisChildren, ...labels],
  };

  // ---- 网格层（grid:true → 每角向刻度一条圆心→外圆辐条）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const spokes: Array<Segment> = ticks.values.map(value => {
      const theta = scale.coordinate(value);
      return [polarPoint(frame.center, theta, frame.innerRadius), polarPoint(frame.center, theta, outer)];
    });
    const gridPath = segmentsToPath(spokes);
    if (gridPath) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor', drawOpacity: 0.15 },
        children: [gridPath],
      };
    }
  }

  return { gridLayer, axisLayer };
};

/**
 * polar radial axis：沿 startAngle 辐条轴线 + 辐条上刻度 + 标签
 * @description 轴线 = center→外圆 直段（基准角 = startAngle）；刻度 = 辐条上每径向刻度短切向横线；
 *   标签 = 刻度点旁 Node text。grid:true → 每径向刻度一个同心圆环（arc step）。
 */
const lowerRadialAxis = (guide: AxisGuide, ctx: GuideContext, frame: PolarFrame, context: ProvenanceContext | undefined): LoweredGuide => {
  const { fontSize } = ctx;
  const ticks = ctx.radialTicks ?? { values: [], labels: [] };
  const scale = frame.secondary;
  const baseAngle = frame.startAngle;
  const showLabels = guide.tickLabels !== false;
  // 辐条径向单位向量（沿辐条方向），刻度短线沿此方向画（短径向 dash，保证整条轴 + 刻度共线）
  const radial: [number, number] = [Math.cos(baseAngle * DEG_TO_RAD), Math.sin(baseAngle * DEG_TO_RAD)];

  // ---- 轴层 ----
  const axisLine: Segment = [
    polarPoint(frame.center, baseAngle, frame.innerRadius),
    polarPoint(frame.center, baseAngle, frame.outerRadius),
  ];
  const tickSegments: Array<Segment> = ticks.values.map(value => {
    const radius = scale.coordinate(value);
    const point = polarPoint(frame.center, baseAngle, radius);
    return [
      [point[0] - (radial[0] * AXIS_TICK_LENGTH) / 2, point[1] - (radial[1] * AXIS_TICK_LENGTH) / 2],
      [point[0] + (radial[0] * AXIS_TICK_LENGTH) / 2, point[1] + (radial[1] * AXIS_TICK_LENGTH) / 2],
    ];
  });
  const linePath = segmentsToPath([axisLine, ...tickSegments]);
  const labels: Array<IRNode> = showLabels
    ? ticks.values.map((value, index): IRNode => {
        const radius = scale.coordinate(value);
        const point = polarPoint(frame.center, baseAngle, radius);
        const text = ticks.labels[index];
        // 标签沿切向（垂直于辐条）一侧偏移，避开辐条与刻度
        const tangent: [number, number] = [-radial[1], radial[0]];
        const offset = AXIS_TICK_LENGTH + AXIS_LABEL_GAP + fontSize / 2;
        const position: [number, number] = [point[0] - tangent[0] * offset, point[1] - tangent[1] * offset];
        return { type: 'node', position, text };
      })
    : [];

  const axisLayer: IRScope | null = linePath
    ? {
        type: 'scope',
        ...guideScopeProps(guide, 'axis', context),
        pathDefault: { stroke: 'currentColor' },
        nodeDefault: { font: { size: fontSize }, stroke: 'none', fill: 'none', padding: 0 },
        children: [linePath, ...labels],
      }
    : null;

  // ---- 网格层（grid:true → 每径向刻度一个同心圆环）----
  let gridLayer: IRScope | null = null;
  if (guide.grid) {
    const rings: Array<IRPath> = ticks.values
      .map(value => scale.coordinate(value))
      .filter(radius => Number.isFinite(radius) && radius > 0)
      .map(radius => arcPath(frame, radius));
    if (rings.length > 0) {
      gridLayer = {
        type: 'scope',
        ...guideScopeProps(guide, 'grid', context),
        pathDefault: { stroke: 'currentColor', drawOpacity: 0.15 },
        children: rings,
      };
    }
  }

  return { gridLayer, axisLayer };
};

/**
 * 把一个 axis guide 下沉成网格层 + 轴层（各自一层 core scope；样式上提到 scope）
 * @description 按坐标帧分支：polar（ctx.frame 存在）按维度角色走 angular（外圆弧 + 圆周刻度 / 标签 + 角向辐条 grid）
 *   或 radial（辐条轴 + 同心环 grid）；否则走 cartesian 直线轴 / 网格（alpha.2 几何，产物不变）。
 *   下沉目标统一是 core Node（标签）+ Path（直段 / arc step）。id → 轴层 scope.id（anchor 预留）。
 */
export const lowerGuide = (guide: AxisGuide, ctx: GuideContext, context?: ProvenanceContext): LoweredGuide => {
  if (ctx.frame) {
    return isPrimaryDimension(guide.dimension)
      ? lowerAngularAxis(guide, ctx, ctx.frame, context)
      : lowerRadialAxis(guide, ctx, ctx.frame, context);
  }
  return lowerCartesianGuide(guide, ctx, context);
};

// ── legend（ADR-03）─────────────────────────────────────────────────────

/** legend swatch 边长（user units）；离散色块 / 形状框 / size 符号格的基准格尺寸 */
export const LEGEND_SWATCH_SIZE = 14;
/** legend swatch 到标签的水平间距（user units） */
export const LEGEND_LABEL_GAP = 6;
/** legend 条目间的行 / 列距（user units） */
export const LEGEND_ENTRY_GAP = 6;
/** legend 标题到首条目的间距（user units） */
export const LEGEND_TITLE_GAP = 6;
/** 连续色带 ramp 的长边长度（user units） */
export const LEGEND_RAMP_LENGTH = 100;
/** 连续色带 ramp 的短边宽度（user units） */
export const LEGEND_RAMP_THICKNESS = 12;

/**
 * 一个离散 legend 条目：swatch 视觉量 + 标签
 * @description color = 色块填充；shape = glyph 名（形状 swatch）；radius = size 梯度符号半径；opacity = 透明度块。
 *   一个条目按 channel 取其中一种视觉量；label 是已格式化的文本（formatter 在 expand 侧据 fieldType 选定）。
 */
export type LegendEntry = {
  /** 条目标签（类别串 / 代表值 / 区间） */
  label: string;
  /** 色块填充色（color / 分箱 swatch） */
  color?: string;
  /** glyph 形状名（shape swatch） */
  shape?: string;
  /** size 梯度符号半径（px） */
  radius?: number;
  /** 透明度（opacity 块；0..1） */
  opacity?: number;
};

/** 连续色带 ramp：渐变 stop（offset 0..1 + 色）+ 沿带刻度（offset 0..1 + 标签） */
export type LegendRamp = {
  /** 渐变 stop（喂 core linearGradient paint server） */
  stops: Array<IRGradientStop>;
  /** 沿带刻度标签（offset 0..1） */
  ticks: Array<{ offset: number; label: string }>;
};

/**
 * lowerLegend 入参：已解析的 legend 内容（形态 + 条目 / ramp + 摆放）
 * @description 形态选择（swatch / ramp）与颜色 / 代表值由 expand 据 descriptor + scale 求好后传入；
 *   本函数只管几何摆放与 core 节点产出（关注点分离：求值在 expand、绘制在 guide）。
 */
export type LegendInput = {
  /** 形态：swatch（离散 / 分箱 / size / opacity）或 ramp（连续色带） */
  form: 'swatch' | 'ramp';
  /** 绑定通道（决定 swatch 视觉量取色 / 形状 / 半径 / 透明度） */
  channel: LegendChannelType;
  /** 标题（缺省 = 绑定字段名；undefined → 不画标题） */
  title?: string;
  /** 离散条目（form==='swatch'） */
  entries: Array<LegendEntry>;
  /** 连续色带（form==='ramp'） */
  ramp?: LegendRamp;
  /** 摆放位置（预留带所在边） */
  position: LegendPositionType;
  /** 条目排布方向 */
  orient: LegendOrientType;
  /** label 字号 */
  fontSize: number;
  /** 预留带矩形（plotArea 旁的 legend 带；条目从带左上角起摆） */
  band: Rect;
  /** legend scope id（稳定，'legend' 前缀；anchor / 识别用） */
  id?: string;
};

/** 闭合矩形 Path（左上角 + 宽高），swatch 色块 / 形状框 / ramp 条用（core rectangle step 自闭合） */
const rectPath = (x: number, y: number, width: number, height: number): IRPath => ({
  type: 'path',
  children: [{ type: 'step', kind: 'rectangle', from: [x, y], to: [x + width, y + height] }],
});

/**
 * 把已解析的 legend 内容下沉成一个 core scope（swatch / ramp + 标签）
 * @description swatch 形态：每条目一个矩形 Path（填 color；shape / opacity 同位作记号）+ 一个标签 Node，纵 / 横堆叠；
 *   ramp 形态：一条矩形 Path 填 core linearGradient paint server（连续真渐变）+ 沿带刻度标签 Node。
 *   条目几何在传入 band 内从左上角起摆，受无文字度量约束（plot-design §13.1）：超 band 溢出可接受、不做测量自适应。
 *   下沉目标统一是 core Node（标签）+ Path（swatch / ramp 矩形），纯 JSON。
 */
export const lowerLegend = (input: LegendInput): IRScope => {
  const { fontSize, band, orient } = input;
  const children: Array<IRPath | IRNode> = [];
  // 标题占一行（顶部），条目区从标题下方起
  let cursorY = band.y;
  if (input.title !== undefined) {
    children.push({ type: 'node', position: [band.x + estimateLabelWidth(input.title, fontSize) / 2, cursorY + fontSize / 2], text: input.title });
    cursorY += fontSize + LEGEND_TITLE_GAP;
  }

  if (input.form === 'ramp' && input.ramp) {
    // 连续色带：一条矩形填 linearGradient（vertical → 自上而下、horizontal → 自左而右）
    const vertical = orient === 'vertical';
    const rampLength = LEGEND_RAMP_LENGTH;
    const rampThickness = LEGEND_RAMP_THICKNESS;
    const rampX = band.x;
    const rampY = cursorY;
    const rect = vertical ? rectPath(rampX, rampY, rampThickness, rampLength) : rectPath(rampX, rampY, rampLength, rampThickness);
    // 垂直色带：offset 0 在顶（小值上 / 大值下，与轴一致需翻转）；这里 0 在带起点，stops 直接用
    const angle = vertical ? 90 : 0;
    rect.fill = { type: 'linearGradient', stops: input.ramp.stops, angle };
    rect.strokeWidth = 0;
    children.push(rect);
    // 沿带刻度标签
    for (const tick of input.ramp.ticks) {
      const position: [number, number] = vertical
        ? [rampX + rampThickness + LEGEND_LABEL_GAP + estimateLabelWidth(tick.label, fontSize) / 2, rampY + tick.offset * rampLength]
        : [rampX + tick.offset * rampLength, rampY + rampThickness + LEGEND_LABEL_GAP + fontSize / 2];
      children.push({ type: 'node', position, text: tick.label });
    }
  } else {
    // 离散 swatch：逐条目堆叠（vertical 自上而下、horizontal 自左而右）
    const vertical = orient === 'vertical';
    let cursorX = band.x;
    let rowY = cursorY;
    for (const entry of input.entries) {
      const swatch = rectPath(cursorX, rowY, LEGEND_SWATCH_SIZE, LEGEND_SWATCH_SIZE);
      swatch.strokeWidth = 0;
      if (entry.color !== undefined) swatch.fill = entry.color;
      if (entry.opacity !== undefined) {
        swatch.fill = 'currentColor';
        swatch.fillOpacity = entry.opacity;
      }
      children.push(swatch);
      // size 梯度符号：在格内画一个代表半径的圆点 Node（覆盖 swatch 框，给出比例感）
      if (entry.radius !== undefined) {
        children.push({ type: 'node', position: [cursorX + LEGEND_SWATCH_SIZE / 2, rowY + LEGEND_SWATCH_SIZE / 2], shape: 'circle', minimumSize: entry.radius * Math.SQRT2, fill: 'currentColor' });
      }
      // 标签：swatch 右侧
      const labelX = cursorX + LEGEND_SWATCH_SIZE + LEGEND_LABEL_GAP + estimateLabelWidth(entry.label, fontSize) / 2;
      const labelY = rowY + LEGEND_SWATCH_SIZE / 2;
      children.push({ type: 'node', position: [labelX, labelY], text: entry.label });
      if (vertical) {
        rowY += LEGEND_SWATCH_SIZE + LEGEND_ENTRY_GAP;
      } else {
        cursorX = labelX + estimateLabelWidth(entry.label, fontSize) / 2 + LEGEND_ENTRY_GAP;
      }
    }
  }

  return {
    type: 'scope',
    ...(input.id !== undefined ? { id: input.id } : {}),
    // 标签字号 + swatch 默认填充；不写 stroke:'none'（避免被测试当成轴层）、不写 nodeDefault.shape（避免被当成 mark 层）
    nodeDefault: { font: { size: fontSize }, padding: 0 },
    pathDefault: { stroke: 'none' },
    children,
  };
};
