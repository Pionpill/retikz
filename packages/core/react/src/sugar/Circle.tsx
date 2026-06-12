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
  midpoint,
  normalizeCornerBox,
  normalizeShapeBox,
  pickPathVisual,
  requireXY,
  resolveAngles,
} from './_shared';

/** Circle sugar props. */
export type CircleProps = PathVisualProps &
  AngleInput &
  BoxAdjustmentProps & {
    /** Fit a circle to the box with either the shortest or longest side. */
    fit?: 'contain' | 'cover';
    /** Box input for fitting a circle. */
    box?: ShapeBox;
    /** Partial closing mode when angles are present. */
    closed?: 'chord' | 'open' | 'sector';
  } & (
    | { center: IRTarget; radius: number }
    | { center: IRTarget; diameter: number }
    | { from: [number, number]; to: [number, number] }
    | { corner1: [number, number]; corner2: [number, number] }
    | { box: ShapeBox }
  );

const resolveCircleByBox = (
  props: CircleProps,
  sugarName: string,
  rawBox: ShapeBox,
): { center: [number, number]; radius: number } => {
  const normalized = adjustShapeBox(normalizeShapeBox(rawBox, sugarName, 'box'), props, sugarName);
  const center = boxCenter(normalized);
  const [width, height] = boxSize(normalized);
  const fit = props.fit ?? 'contain';
  return {
    center,
    radius: (fit === 'cover' ? Math.max(width, height) : Math.min(width, height)) / 2,
  };
};

/**
 * Circle sugar - expands to a Path + circlePath step.
 */
export const Circle: FC<CircleProps> = props => {
  let center: IRTarget;
  let radius: number;
  if ('box' in props) {
    ({ center, radius } = resolveCircleByBox(props, 'Circle', props.box!));
  } else if ('radius' in props) {
    center = props.center;
    radius = props.radius;
  } else if ('diameter' in props) {
    center = props.center;
    radius = props.diameter / 2;
  } else if ('from' in props) {
    const from = requireXY(props.from, 'Circle', 'from');
    const to = requireXY(props.to, 'Circle', 'to');
    center = midpoint(from, to);
    radius = Math.hypot(to[0] - from[0], to[1] - from[1]) / 2;
  } else if ('corner1' in props) {
    const c1 = requireXY(props.corner1, 'Circle', 'corner1');
    const c2 = requireXY(props.corner2, 'Circle', 'corner2');
    const normalized = adjustShapeBox(normalizeCornerBox(c1, c2), props, 'Circle');
    center = boxCenter(normalized);
    const [width, height] = boxSize(normalized);
    const fit = props.fit ?? 'contain';
    radius = (fit === 'cover' ? Math.max(width, height) : Math.min(width, height)) / 2;
  } else {
    throw new Error(
      '<Circle> needs one of { center, radius }, { center, diameter }, { from, to }, { corner1, corner2 }, or { box }',
    );
  }

  const angles = resolveAngles(props, 'Circle');

  return (
    <Path {...pickPathVisual(props)}>
      <Step kind="move" to={center} />
      <Step
        kind="circlePath"
        radius={radius}
        startAngle={angles?.startAngle}
        endAngle={angles?.endAngle}
        closed={angles ? (props.closed ?? 'chord') : undefined}
      />
    </Path>
  );
};
