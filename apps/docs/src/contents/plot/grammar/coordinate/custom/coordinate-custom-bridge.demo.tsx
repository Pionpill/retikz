import { type CustomCoordinateFactory, createCustomFrame } from '@retikz/plot';
import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { grid } from './coordinate-custom-bridge.data';

/**
 * 自定义「桥」坐标系工厂：x 沿抛物拱、y 竖直偏移（投影函数，运行时给、不进 IR）。
 * 把 archHeight 改成 0 就退化回普通 cartesian——坐标系形态只由这个函数决定。
 * 回传 roleScales 让 guide 画曲线轴（x 轴随拱弯、y 轴竖直）。
 */
const bridge: CustomCoordinateFactory = context => {
  const xScale = context.linearScaleFor('x', [0, context.width]);
  const yScale = context.linearScaleFor('y', [context.height - 30, 30]);
  const archHeight = context.params.archHeight ?? 60;
  const projectRoles = (values: ReadonlyArray<unknown>): [number, number] | null => {
    const screenX = xScale.coordinate(values[0]);
    const screenY = yScale.coordinate(values[1]);
    if (!Number.isFinite(screenX) || !Number.isFinite(screenY)) return null;
    const t = screenX / context.width;
    return [screenX, screenY - archHeight * (1 - (2 * t - 1) ** 2)];
  };
  return createCustomFrame(['x', 'y'], projectRoles, { roleScales: { x: xScale, y: yScale } });
};

/** 规则 (x,y) 网格喂「桥」坐标系：x 轴被拱起、y 仍竖直 */
const Demo: FC = () => (
  <Plot
    data={grid}
    width={420}
    height={220}
    coordinate={{ type: 'custom', name: 'bridge', roles: ['x', 'y'], params: { archHeight: 60 } }}
    coordinates={{ bridge }}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="x" y="y" />
    <Axis dimension="x" />
    <Axis dimension="y" />
  </Plot>
);

export default Demo;
