import type { FC, ReactElement } from 'react';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';
import { type PathVisualProps, pickPathVisual, requireXY } from './_shared';

/** `<Grid>` 形态：两选一定包围盒 + 步长（单值 step 或分轴 xStep/yStep）。点位限 literal 笛卡尔 */
export type GridProps = PathVisualProps & {
  /** 单值步长（xStep = yStep = step）；与 xStep/yStep 二选一，分轴优先 */
  step?: number;
  /** x 轴步长（覆盖 step） */
  xStep?: number;
  /** y 轴步长（覆盖 step） */
  yStep?: number;
} & (
    | { corner1: [number, number]; corner2: [number, number] }
    | { center: [number, number]; width: number; height: number }
  );

/**
 * Grid sugar——展开为多条 `<Path>`（每条 move + line），不闭合
 * @description 竖线 floor(|x1-x0|/xStep)+1 条、横线 floor(|y1-y0|/yStep)+1 条；按 corner1（或 center-size/2）起算，
 *   严格按步进，最后一条不与对角重合则不画（不补尾）。视觉 prop 透传到每条 Path。点位限 literal 笛卡尔。
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
    const c = requireXY(props.center, 'Grid', 'center');
    x0 = c[0] - props.width / 2;
    x1 = c[0] + props.width / 2;
    y0 = c[1] - props.height / 2;
    y1 = c[1] + props.height / 2;
  } else {
    throw new Error('<Grid> 需要 { corner1, corner2 } / { center, width, height } 之一');
  }

  const xStep = props.xStep ?? props.step;
  const yStep = props.yStep ?? props.step;
  if (xStep === undefined || yStep === undefined || xStep <= 0 || yStep <= 0) {
    throw new Error('<Grid> 需要正的 step（或同时给 xStep + yStep）');
  }

  const visual = pickPathVisual(props);
  const lines: Array<ReactElement> = [];

  const vCount = Math.floor((x1 - x0) / xStep);
  for (let k = 0; k <= vCount; k++) {
    const x = x0 + k * xStep;
    lines.push(
      <Path key={`v${k}`} {...visual}>
        <Step kind="move" to={[x, y0]} />
        <Step kind="line" to={[x, y1]} />
      </Path>,
    );
  }
  const hCount = Math.floor((y1 - y0) / yStep);
  for (let k = 0; k <= hCount; k++) {
    const y = y0 + k * yStep;
    lines.push(
      <Path key={`h${k}`} {...visual}>
        <Step kind="move" to={[x0, y]} />
        <Step kind="line" to={[x1, y]} />
      </Path>,
    );
  }

  return <>{lines}</>;
};
