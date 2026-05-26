import type { FC, ReactElement } from 'react';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';
import { type PathVisualProps, pickPathVisual, requireXY } from './_shared';

type BorderRenderOrder = 'before' | 'after';

type GridPathVisualProps = Pick<
  PathVisualProps,
  | 'color'
  | 'stroke'
  | 'strokeWidth'
  | 'dashPattern'
  | 'lineCap'
  | 'lineJoin'
  | 'thickness'
  | 'fill'
  | 'fillRule'
  | 'opacity'
  | 'fillOpacity'
  | 'drawOpacity'
  | 'zIndex'
>;

/** `<Grid>` 形态：两选一定包围盒 + 步长（单值 step 或分轴 xStep/yStep）。点位限 literal 笛卡尔 */
export type GridProps = PathVisualProps & {
  /** 单值步长（xStep = yStep = step）；与 xStep/yStep 二选一，分轴优先 */
  step?: number;
  /** x 轴步长（覆盖 step） */
  xStep?: number;
  /** y 轴步长（覆盖 step） */
  yStep?: number;
  /** 网格对齐基准；缺省从范围左上角起算 */
  origin?: [number, number];
  /** 网格相位偏移；与 origin 叠加，缺省 [0, 0] */
  offset?: [number, number];
  /** 范围不能被 step 整除时是否补最后一条边界线 */
  includeBoundary?: boolean;
  /** 是否画竖线 */
  showVertical?: boolean;
  /** 是否画横线 */
  showHorizontal?: boolean;
  /** 每隔多少条线使用主网格样式 */
  majorEvery?: number;
  /** 主网格从第几条开始计算 */
  majorOffset?: number;
  /** 主网格颜色 */
  majorColor?: GridPathVisualProps['color'];
  /** 主网格描边 */
  majorStroke?: GridPathVisualProps['stroke'];
  /** 主网格描边宽度 */
  majorStrokeWidth?: GridPathVisualProps['strokeWidth'];
  /** 主网格虚线 */
  majorDashPattern?: GridPathVisualProps['dashPattern'];
  /** 主网格端点 */
  majorLineCap?: GridPathVisualProps['lineCap'];
  /** 主网格拐点 */
  majorLineJoin?: GridPathVisualProps['lineJoin'];
  /** 主网格语义粗细 */
  majorThickness?: GridPathVisualProps['thickness'];
  /** 主网格整体透明度 */
  majorOpacity?: GridPathVisualProps['opacity'];
  /** 主网格描边透明度 */
  majorDrawOpacity?: GridPathVisualProps['drawOpacity'];
  /** 是否画外边框 */
  border?: boolean;
  /** 外边框与网格范围的距离 */
  borderPadding?: number;
  /** 边框是否作为底层画在网格线前面 */
  borderRenderOrder?: BorderRenderOrder;
  /** 网格线是否延伸到外边框 */
  clipToBorder?: boolean;
  /** 外边框主色 */
  borderColor?: GridPathVisualProps['color'];
  /** 外边框描边 */
  borderStroke?: GridPathVisualProps['stroke'];
  /** 外边框描边宽度 */
  borderStrokeWidth?: GridPathVisualProps['strokeWidth'];
  /** 外边框虚线 */
  borderDashPattern?: GridPathVisualProps['dashPattern'];
  /** 外边框端点 */
  borderLineCap?: GridPathVisualProps['lineCap'];
  /** 外边框拐点 */
  borderLineJoin?: GridPathVisualProps['lineJoin'];
  /** 外边框语义粗细 */
  borderThickness?: GridPathVisualProps['thickness'];
  /** 外边框填充 */
  borderFill?: GridPathVisualProps['fill'];
  /** 外边框填充规则 */
  borderFillRule?: GridPathVisualProps['fillRule'];
  /** 外边框整体透明度 */
  borderOpacity?: GridPathVisualProps['opacity'];
  /** 外边框填充透明度 */
  borderFillOpacity?: GridPathVisualProps['fillOpacity'];
  /** 外边框描边透明度 */
  borderDrawOpacity?: GridPathVisualProps['drawOpacity'];
  /** 外边框栈序 */
  borderZIndex?: GridPathVisualProps['zIndex'];
} & (
    | { corner1: [number, number]; corner2: [number, number] }
    | { center: [number, number]; width: number; height: number }
  );

/**
 * Grid sugar——展开为多条 `<Path>`（每条 move + line）和可选外边框 Path
 * @description 默认按范围左上角起算，显式给 origin/offset 时按基准点对齐；includeBoundary 会补范围边界线。
 *   普通视觉 prop 透传到内部线，major* 覆盖主网格线，border* 覆盖外边框。点位限 literal 笛卡尔。
 */
export const Grid: FC<GridProps> = props => {
  let x0: number;
  let x1: number;
  let y0: number;
  let y1: number;
  if ('corner2' in props) {
    const c1 = requireXY(props.corner1, 'Grid', 'corner1');
    const c2 = requireXY(props.corner2, 'Grid', 'corner2');
    x0 = Math.min(c1[0], c2[0]);
    x1 = Math.max(c1[0], c2[0]);
    y0 = Math.min(c1[1], c2[1]);
    y1 = Math.max(c1[1], c2[1]);
  } else if ('center' in props) {
    if (props.width <= 0) {
      throw new Error('<Grid> 的 width 必须为正数');
    }
    if (props.height <= 0) {
      throw new Error('<Grid> 的 height 必须为正数');
    }
    const c = requireXY(props.center, 'Grid', 'center');
    x0 = c[0] - props.width / 2;
    x1 = c[0] + props.width / 2;
    y0 = c[1] - props.height / 2;
    y1 = c[1] + props.height / 2;
  } else {
    throw new Error('<Grid> 需要 { corner1, corner2 } / { center, width, height } 之一');
  }

  const showVertical = props.showVertical ?? true;
  const showHorizontal = props.showHorizontal ?? true;
  const xStep = props.xStep ?? props.step;
  const yStep = props.yStep ?? props.step;
  if (showVertical && (xStep === undefined || xStep <= 0)) {
    throw new Error('<Grid> 画竖线时需要正的 xStep（或 step）');
  }
  if (showHorizontal && (yStep === undefined || yStep <= 0)) {
    throw new Error('<Grid> 画横线时需要正的 yStep（或 step）');
  }
  if (props.majorEvery !== undefined && props.majorEvery <= 0) {
    throw new Error('<Grid> 的 majorEvery 必须为正数');
  }
  if (props.borderPadding !== undefined && props.borderPadding < 0) {
    throw new Error('<Grid> 的 borderPadding 不能为负数');
  }

  const visual = pickPathVisual(props);
  const majorVisual = getMajorVisual(props, visual);
  const borderVisual = getBorderVisual(props);
  const lines: Array<ReactElement> = [];
  const borderPadding = props.borderPadding ?? 0;
  const borderX0 = x0 - borderPadding;
  const borderX1 = x1 + borderPadding;
  const borderY0 = y0 - borderPadding;
  const borderY1 = y1 + borderPadding;
  const lineX0 = props.clipToBorder ? borderX0 : x0;
  const lineX1 = props.clipToBorder ? borderX1 : x1;
  const lineY0 = props.clipToBorder ? borderY0 : y0;
  const lineY1 = props.clipToBorder ? borderY1 : y1;

  if (props.border && props.borderRenderOrder === 'before') {
    lines.push(createBorderPath('border-before', borderX0, borderY0, borderX1, borderY1, borderVisual));
  }

  if (showVertical && xStep !== undefined) {
    const xs = getGridValues(x0, x1, xStep, props.origin?.[0], props.offset?.[0], props.includeBoundary);
    xs.forEach((x, k) => {
      const pathVisual = isMajorLine(k, props.majorEvery, props.majorOffset) ? majorVisual : visual;
      lines.push(
        <Path key={`v${k}`} {...pathVisual}>
          <Step kind="move" to={[x, lineY0]} />
          <Step kind="line" to={[x, lineY1]} />
        </Path>,
      );
    });
  }

  if (showHorizontal && yStep !== undefined) {
    const ys = getGridValues(y0, y1, yStep, props.origin?.[1], props.offset?.[1], props.includeBoundary);
    ys.forEach((y, k) => {
      const pathVisual = isMajorLine(k, props.majorEvery, props.majorOffset) ? majorVisual : visual;
      lines.push(
        <Path key={`h${k}`} {...pathVisual}>
          <Step kind="move" to={[lineX0, y]} />
          <Step kind="line" to={[lineX1, y]} />
        </Path>,
      );
    });
  }

  if (props.border && props.borderRenderOrder !== 'before') {
    lines.push(createBorderPath('border-after', borderX0, borderY0, borderX1, borderY1, borderVisual));
  }

  return <>{lines}</>;
};

const getGridValues = (
  min: number,
  max: number,
  step: number,
  origin: number | undefined,
  offset: number | undefined,
  includeBoundary: boolean | undefined,
): Array<number> => {
  const values: Array<number> = [];
  const base = (origin ?? min) + (offset ?? 0);
  const firstIndex = Math.ceil((min - base) / step);
  const lastIndex = Math.floor((max - base) / step);
  for (let k = firstIndex; k <= lastIndex; k++) {
    values.push(base + k * step);
  }
  if (includeBoundary) {
    pushUnique(values, min);
    pushUnique(values, max);
    values.sort((a, b) => a - b);
  }
  return values;
};

const pushUnique = (values: Array<number>, value: number): void => {
  if (!values.some(item => Math.abs(item - value) < Number.EPSILON * 16)) {
    values.push(value);
  }
};

const isMajorLine = (
  index: number,
  majorEvery: number | undefined,
  majorOffset: number | undefined,
): boolean => {
  if (majorEvery === undefined) return false;
  const offset = majorOffset ?? 0;
  return ((index - offset) % majorEvery + majorEvery) % majorEvery === 0;
};

const getMajorVisual = (props: GridProps, base: PathVisualProps): PathVisualProps => ({
  ...base,
  ...(props.majorColor !== undefined ? { color: props.majorColor } : {}),
  ...(props.majorStroke !== undefined ? { stroke: props.majorStroke } : {}),
  ...(props.majorStrokeWidth !== undefined ? { strokeWidth: props.majorStrokeWidth } : {}),
  ...(props.majorDashPattern !== undefined ? { dashPattern: props.majorDashPattern } : {}),
  ...(props.majorLineCap !== undefined ? { lineCap: props.majorLineCap } : {}),
  ...(props.majorLineJoin !== undefined ? { lineJoin: props.majorLineJoin } : {}),
  ...(props.majorThickness !== undefined ? { thickness: props.majorThickness } : {}),
  ...(props.majorOpacity !== undefined ? { opacity: props.majorOpacity } : {}),
  ...(props.majorDrawOpacity !== undefined ? { drawOpacity: props.majorDrawOpacity } : {}),
});

const getBorderVisual = (props: GridProps): PathVisualProps => ({
  ...(props.borderColor !== undefined ? { color: props.borderColor } : {}),
  ...(props.borderStroke !== undefined ? { stroke: props.borderStroke } : {}),
  ...(props.borderStrokeWidth !== undefined ? { strokeWidth: props.borderStrokeWidth } : {}),
  ...(props.borderDashPattern !== undefined ? { dashPattern: props.borderDashPattern } : {}),
  ...(props.borderLineCap !== undefined ? { lineCap: props.borderLineCap } : {}),
  ...(props.borderLineJoin !== undefined ? { lineJoin: props.borderLineJoin } : {}),
  ...(props.borderThickness !== undefined ? { thickness: props.borderThickness } : {}),
  ...(props.borderFill !== undefined ? { fill: props.borderFill } : {}),
  ...(props.borderFillRule !== undefined ? { fillRule: props.borderFillRule } : {}),
  ...(props.borderOpacity !== undefined ? { opacity: props.borderOpacity } : {}),
  ...(props.borderFillOpacity !== undefined ? { fillOpacity: props.borderFillOpacity } : {}),
  ...(props.borderDrawOpacity !== undefined ? { drawOpacity: props.borderDrawOpacity } : {}),
  ...(props.borderZIndex !== undefined ? { zIndex: props.borderZIndex } : {}),
});

const createBorderPath = (
  key: string,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  visual: PathVisualProps,
): ReactElement => (
  <Path key={key} {...visual}>
    <Step kind="move" to={[x0, y0]} />
    <Step kind="line" to={[x1, y0]} />
    <Step kind="line" to={[x1, y1]} />
    <Step kind="line" to={[x0, y1]} />
    <Step kind="cycle" />
  </Path>
);
