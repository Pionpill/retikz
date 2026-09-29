import type { PathKindBoundaryLabelInput, ScenePrimitive } from '../../../contract';
import type { ResolvedGeometryLabel } from '../../../resolve';
import { BoundaryLabelSchema } from '../../../schemas';
import type { IRPosition } from '../../../schemas';
import { placeBoundaryLabelBox } from '../../text';
import type { EmitLabelPrimitiveContext } from './label';
import { emitLabelPrimitive } from './label';

const defaults = BoundaryLabelSchema.parse({ text: '' });

/** 复用文字发射与测量，以独立边界轴和文字角度定位 */
export const emitBoundaryLabelPrimitive = (
  input: PathKindBoundaryLabelInput,
  styled: ResolvedGeometryLabel,
  context: EmitLabelPrimitiveContext,
): { primitive: ScenePrimitive; boundsPoints: Array<IRPosition> } => {
  const { label, point, outward } = input;
  const base = emitLabelPrimitive(
    { ...styled, position: 0, side: 'center', sloped: false, distance: 0, interrupt: false, gap: 0 },
    { point: [0, 0], tangent: [1, 0] },
    context,
  );
  const xs = base.boundsPoints.map(p => p[0]);
  const ys = base.boundsPoints.map(p => p[1]);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  const origin: IRPosition = [(Math.max(...xs) + Math.min(...xs)) / 2, (Math.max(...ys) + Math.min(...ys)) / 2];
  const { center, rotateDeg: degrees } = placeBoundaryLabelBox({
    label: { ...defaults, ...label },
    point,
    outward,
    tangent: [-outward[1], outward[0]],
    width,
    height,
    distance: label.distance ?? defaults.distance,
  });
  const rad = (degrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const boundsPoints = base.boundsPoints.map(([x, y]): IRPosition => [
    center[0] + (x - origin[0]) * cos - (y - origin[1]) * sin,
    center[1] + (x - origin[0]) * sin + (y - origin[1]) * cos,
  ]);
  const round = context.round;
  return {
    primitive: {
      type: 'group',
      transforms: [{ kind: 'translate', x: round(center[0]), y: round(center[1]) }],
      children: [
        {
          type: 'group',
          transforms: [{ kind: 'rotate', degrees: round(degrees), cx: 0, cy: 0 }],
          children: [
            {
              type: 'group',
              transforms: [{ kind: 'translate', x: round(-origin[0]), y: round(-origin[1]) }],
              children: [base.primitive],
            },
          ],
        },
      ],
    },
    boundsPoints,
  };
};
