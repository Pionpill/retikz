import { createCoordinateFrame, defineCoordinate } from '@retikz/plot';
import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';
import { z } from 'zod';

import { grid } from './coordinate-custom-bridge.data';

/**
 * 自定义「桥」坐标系定义：x 沿抛物拱、y 竖直偏移（投影函数，运行时给、不进 IR）。
 * 把 archHeight 改成 0 就退化回普通 cartesian——坐标系形态只由这个函数决定。
 * 回传 roleScales 让 guide 画曲线轴（x 轴随拱弯、y 轴竖直）。
 */
const bridge = defineCoordinate({
  schema: z.object({
    type: z.literal('bridge').describe('Discriminator: bridge custom coordinate op'),
    archHeight: z.number().optional().describe('Arch height in user units'),
  }),
  roles: ['x', 'y'],
  resolve: (op, context) => {
    const xValues = context.collectRoleValues('x');
    const yValues = context.collectRoleValues('y');
    const xScale = context.buildPositionScale(context.resolveScaleForRole('x', undefined, xValues), xValues, [0, context.width]);
    const yScale = context.buildPositionScale(context.resolveScaleForRole('y', undefined, yValues), yValues, [context.height - 30, 30]);
    const archHeight = op.archHeight ?? 60;
    const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
      const screenX = xScale.coordinate(values[0]);
      const screenY = yScale.coordinate(values[1]);
      if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return null;
      const t = screenX / context.width;
      return [screenX, screenY - archHeight * (1 - (2 * t - 1) ** 2)];
    };
    const frame = createCoordinateFrame('bridge', ['x', 'y'], projectRoles, { roleScales: { x: xScale, y: yScale } });
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

/** 规则 (x,y) 网格喂「桥」坐标系：x 轴被拱起、y 仍竖直 */
const Demo: FC = () => (
  <Plot
    data={grid}
    width={420}
    height={220}
    coordinate={{ type: 'bridge', archHeight: 60 }}
    coordinates={[bridge]}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="x" y="y" />
    <Axis dimension="x" />
    <Axis dimension="y" />
  </Plot>
);

export default Demo;
