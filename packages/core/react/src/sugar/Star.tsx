import type { FC } from 'react';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';
import { type PathVisualProps, pickPathVisual, requireXY, starVertices } from './_shared';

/** `<Star>` 形态：中心 + 外/内半径（或外半径 + 内半径比例）+ 角数 */
export type StarProps = PathVisualProps & {
  /** 整体起始角（°）；缺省 −90 = 一个外角朝上（y-down） */
  rotate?: number;
} & (
    | { center: [number, number]; outerRadius: number; innerRadius: number; points: number }
    | { center: [number, number]; outerRadius: number; points: number; innerRatio?: number }
  );

const DEFAULT_ROTATE = -90;
const DEFAULT_INNER_RATIO = 0.5;

/**
 * Star sugar——星形，展开为 `<Path>` 的 `move + (2·points-1) line + cycle`（交替外/内半径顶点）
 * @description 纯几何 sugar，无 IR 改动。center 须 literal 笛卡尔。`points >= 2`。
 *   缺省 innerRadius = outerRadius × 0.5。
 */
export const Star: FC<StarProps> = props => {
  const center = requireXY(props.center, 'Star', 'center');
  const { points, outerRadius } = props;
  if (!Number.isInteger(points) || points < 2) {
    throw new Error('<Star> 的 points 需为 >= 2 的整数');
  }
  const innerRadius =
    'innerRadius' in props
      ? props.innerRadius
      : outerRadius * (props.innerRatio ?? DEFAULT_INNER_RATIO);
  const rotate = props.rotate ?? DEFAULT_ROTATE;
  const verts = starVertices(center, outerRadius, innerRadius, points, rotate);

  // rotate 已烘焙进顶点坐标；不能再经 pickPathVisual 透传给 <Path>（会绕包围盒中心二次旋转）。
  return (
    <Path {...pickPathVisual({ ...props, rotate: undefined })}>
      <Step kind="move" to={verts[0]} />
      {verts.slice(1).map((v, i) => (
        <Step key={i} kind="line" to={v} />
      ))}
      <Step kind="cycle" />
    </Path>
  );
};
