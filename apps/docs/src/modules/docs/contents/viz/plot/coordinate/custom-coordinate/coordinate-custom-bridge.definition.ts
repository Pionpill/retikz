import { createCoordinateFrame, defineCoordinate } from '@retikz/plot';
import { z } from 'zod';

/** 自定义桥坐标系：x 沿抛物拱，y 保持竖直偏移 */
export const bridgeCoordinate = defineCoordinate({
  schema: z.strictObject({
    type: z.literal('bridge').describe('Discriminator: bridge custom coordinate operation'),
    archHeight: z.number().optional().describe('Arch height in user units'),
  }),
  roles: ['x', 'y'],
  resolve: (operation, context) => {
    const xValues = context.collectRoleValues('x');
    const yValues = context.collectRoleValues('y');
    const xScale = context.buildPositionScale(context.resolveScaleForRole('x', undefined, xValues), xValues, [
      0,
      context.width,
    ]);
    const yScale = context.buildPositionScale(context.resolveScaleForRole('y', undefined, yValues), yValues, [
      context.height - 30,
      30,
    ]);
    const archHeight = operation.archHeight ?? 60;
    const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
      const screenX = xScale.coordinate(values[0]);
      const screenY = yScale.coordinate(values[1]);
      if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return null;
      const t = screenX / context.width;
      return [screenX, screenY - archHeight * (1 - (2 * t - 1) ** 2)];
    };
    const frame = createCoordinateFrame('bridge', ['x', 'y'], projectRoles, {
      roleScales: { x: xScale, y: yScale },
    });
    const axisLayers = context.axisGuides.flatMap(guide => {
      const lowered = context.lowerCustomAxis(frame, guide, context.fontSize, context.provenance);
      return lowered.axisLayer ? [lowered.axisLayer] : [];
    });
    return {
      frame,
      plotArea: { x: 0, y: 0, width: context.width, height: context.height },
      gridLayers: [],
      axisLayers,
    };
  },
});
