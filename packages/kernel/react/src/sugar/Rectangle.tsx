import type { FC } from 'react';
import type { IRTarget } from '@retikz/core';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';
import { type PathVisualProps, pickPathVisual, requireXY } from './_shared';

/** `<Rectangle>` 形态：四选一定两对角 */
export type RectangleProps = PathVisualProps & {
  /** 四角同圆角半径；缺省直角 */
  cornerRadius?: number;
} & (
    | { corner1: IRTarget; corner2: IRTarget }
    | { center: [number, number]; width: number; height: number }
    | { center: [number, number]; side: number }
    | { corner1: [number, number]; width: number; height: number }
  );

/**
 * Rectangle sugar——展开为 `<Path><Step move(from)><Step rectangle(from,to)></Path>`
 * @description `{ corner1, corner2 }` 透传（任意 Target，直接作 rectangle 的 from/to）；其余形态需算坐标 → 限 literal 笛卡尔。
 */
export const Rectangle: FC<RectangleProps> = props => {
  let from: IRTarget;
  let to: IRTarget;
  if ('corner2' in props) {
    from = props.corner1;
    to = props.corner2;
  } else if ('side' in props) {
    const c = requireXY(props.center, 'Rectangle', 'center');
    const h = props.side / 2;
    from = [c[0] - h, c[1] - h];
    to = [c[0] + h, c[1] + h];
  } else if ('center' in props) {
    const c = requireXY(props.center, 'Rectangle', 'center');
    const hw = props.width / 2;
    const hh = props.height / 2;
    from = [c[0] - hw, c[1] - hh];
    to = [c[0] + hw, c[1] + hh];
  } else if ('corner1' in props) {
    const c1 = requireXY(props.corner1, 'Rectangle', 'corner1');
    from = c1;
    to = [c1[0] + props.width, c1[1] + props.height];
  } else {
    throw new Error(
      '<Rectangle> 需要 { corner1, corner2 } / { center, width, height } / { center, side } / { corner1, width, height } 之一',
    );
  }

  return (
    <Path {...pickPathVisual(props)}>
      <Step kind="move" to={from} />
      <Step kind="rectangle" from={from} to={to} cornerRadius={props.cornerRadius} />
    </Path>
  );
};
