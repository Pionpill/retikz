import type { FC } from 'react';
import type { IRTarget } from '@retikz/core';
import { Path } from '../kernel/Path';
import { Step } from '../kernel/Step';
import {
  type AngleInput,
  type BoxAdjustmentProps,
  type PathVisualProps,
  type ShapeBox,
  adjustShapeBox,
  boxCenter,
  boxSize,
  normalizeCornerBox,
  normalizeShapeBox,
  pickPathVisual,
  requireXY,
  resolveAngles,
} from './_shared';

/** Ellipse sugar 的 props */
export type EllipseProps = PathVisualProps &
  AngleInput &
  BoxAdjustmentProps & {
    /** 用于拟合椭圆的 box 输入 */
    box?: ShapeBox;
    /** 给定角度时的局部闭合方式 */
    closed?: 'chord' | 'open' | 'sector';
  } & (
    | { center: IRTarget; radiusX: number; radiusY: number }
    | { center: IRTarget; diameterX: number; diameterY: number }
    | { corner1: [number, number]; corner2: [number, number] }
    | { box: ShapeBox }
  );

const resolveEllipseByBox = (
  props: EllipseProps,
  sugarName: string,
  rawBox: ShapeBox,
): { center: [number, number]; radiusX: number; radiusY: number } => {
  const normalized = adjustShapeBox(normalizeShapeBox(rawBox, sugarName, 'box'), props, sugarName);
  const center = boxCenter(normalized);
  const [width, height] = boxSize(normalized);
  return {
    center,
    radiusX: width / 2,
    radiusY: height / 2,
  };
};

/**
 * Ellipse sugar——展开为 Path + ellipsePath step
 */
export const Ellipse: FC<EllipseProps> = props => {
  let center: [number, number];
  let radiusX: number;
  let radiusY: number;
  if (props.box !== undefined) {
    ({ center, radiusX, radiusY } = resolveEllipseByBox(props, 'Ellipse', props.box));
  } else if ('radiusX' in props) {
    center = requireXY(props.center, 'Ellipse', 'center');
    radiusX = props.radiusX;
    radiusY = props.radiusY;
  } else if ('diameterX' in props) {
    center = requireXY(props.center, 'Ellipse', 'center');
    radiusX = props.diameterX / 2;
    radiusY = props.diameterY / 2;
  } else if ('corner1' in props) {
    const normalized = adjustShapeBox(
      normalizeCornerBox(props.corner1, props.corner2),
      props,
      'Ellipse',
    );
    center = boxCenter(normalized);
    [radiusX, radiusY] = boxSize(normalized).map(value => value / 2) as [number, number];
  } else {
    throw new Error(
      '<Ellipse> needs one of { center, radiusX, radiusY }, { center, diameterX, diameterY }, { corner1, corner2 }, or { box }',
    );
  }

  const angles = resolveAngles(props, 'Ellipse');

  return (
    <Path {...pickPathVisual(props)}>
      <Step kind="move" to={center} />
      <Step
        kind="ellipsePath"
        radiusX={radiusX}
        radiusY={radiusY}
        startAngle={angles?.startAngle}
        endAngle={angles?.endAngle}
        closed={angles ? (props.closed ?? 'chord') : undefined}
      />
    </Path>
  );
};
