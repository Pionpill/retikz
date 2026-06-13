import type { FC } from 'react';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';
import {
  type PathVisualProps,
  pickPathVisual,
  regularPolygonVertices,
  requireXY,
} from './_shared';

/** `<RegularPolygon>` 形态：中心 + 外接圆半径（或边长）+ 边数 */
export type RegularPolygonProps = PathVisualProps & {
  /** 整体起始角（°）；缺省 −90 = 一个顶点朝上（y-down） */
  rotate?: number;
} & (
    | { center: [number, number]; radius: number; sides: number }
    | { center: [number, number]; sideLength: number; sides: number }
  );

/** 缺省一个顶点朝上（y-down 下 −90 = 上方） */
const DEFAULT_ROTATE = -90;

/**
 * RegularPolygon sugar——正多边形，展开为 `<Path>` 的 `move + (sides-1) line + cycle`
 * @description 纯几何 sugar，无 IR 改动。center 须 literal 笛卡尔（组件内算顶点）。`sides >= 3`。
 *   边长形态由 `R = sideLength / (2·sin(π/sides))` 反算外接半径。
 */
export const RegularPolygon: FC<RegularPolygonProps> = props => {
  const center = requireXY(props.center, 'RegularPolygon', 'center');
  const { sides } = props;
  if (!Number.isInteger(sides) || sides < 3) {
    throw new Error('<RegularPolygon> 的 sides 需为 >= 3 的整数');
  }
  const radius =
    'radius' in props
      ? props.radius
      : props.sideLength / (2 * Math.sin(Math.PI / sides));
  const rotate = props.rotate ?? DEFAULT_ROTATE;
  const verts = regularPolygonVertices(center, radius, radius, sides, rotate);

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
