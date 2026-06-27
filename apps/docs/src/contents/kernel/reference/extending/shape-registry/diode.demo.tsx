import { type PathCommand, type Position, type ShapeDefinition, defineShape, localToWorld, worldToLocal } from '@retikz/core';
import { Draw, Layout, Node } from '@retikz/react';
import { z } from 'zod';
import type { FC } from 'react';

const diode: ShapeDefinition = defineShape({
  paramsSchema: z.strictObject({}),
  circumscribe: (innerHalfWidth, innerHalfHeight) => ({
    halfWidth: Math.max(innerHalfWidth, 42),
    halfHeight: Math.max(innerHalfHeight, 22),
  }),
  boundaryPoint: (rect, toward) => {
    const localToward = worldToLocal(rect, toward);
    const terminal: Position = localToward[0] < 0 ? [-rect.width / 2, 0] : [rect.width / 2, 0];
    return localToWorld(rect, terminal);
  },
  anchor: (rect, name) => {
    if (name === 'center') return [rect.x, rect.y];
    if (name === 'west' || name === 'input') return localToWorld(rect, [-rect.width / 2, 0]);
    if (name === 'east' || name === 'output') return localToWorld(rect, [rect.width / 2, 0]);
    return undefined;
  },
  *emit(rect, style, round) {
    const halfWidth = rect.width / 2;
    const halfHeight = rect.height / 2;
    const stroke = style.stroke ?? 'currentColor';
    const strokeWidth = style.strokeWidth ?? 1.5;
    const sharedStyle = {
      stroke,
      strokeOpacity: style.strokeOpacity,
      strokeWidth,
      dashPattern: style.dashPattern,
      opacity: style.opacity,
    };
    const left: Position = [round(rect.x - halfWidth), round(rect.y)];
    const right: Position = [round(rect.x + halfWidth), round(rect.y)];
    const triangleLeft = rect.x - 12;
    const triangleRight = rect.x + 10;
    const triangleTop = rect.y - Math.min(halfHeight, 16);
    const triangleBottom = rect.y + Math.min(halfHeight, 16);
    const barX = rect.x + 14;

    const triangleCommands: Array<PathCommand> = [
      { kind: 'move', to: [round(triangleLeft), round(triangleTop)] },
      { kind: 'line', to: [round(triangleLeft), round(triangleBottom)] },
      { kind: 'line', to: [round(triangleRight), round(rect.y)] },
      { kind: 'close' },
    ];

    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: left },
        { kind: 'line', to: [round(triangleLeft), round(rect.y)] },
      ],
      ...sharedStyle,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(barX), round(triangleTop)] },
        { kind: 'line', to: [round(barX), round(triangleBottom)] },
      ],
      ...sharedStyle,
    };
    yield {
      type: 'path',
      commands: [
        { kind: 'move', to: [round(barX), round(rect.y)] },
        { kind: 'line', to: right },
      ],
      ...sharedStyle,
    };
    yield {
      type: 'path',
      commands: triangleCommands,
      fill: style.fill ?? 'transparent',
      fillOpacity: style.fillOpacity,
      ...sharedStyle,
    };
  },
});

const Demo: FC = () => (
  <Layout width={420} height={190} shapes={{ diode }}>
    <Node id="source" position={[-150, 0]} text="in" />
    <Node id="d" shape="diode" position={[0, 0]} fill="lightgray" stroke="darkorange" strokeWidth={2} />
    <Node id="sink" position={[145, 55]} text="out" />
    <Draw way={['source', 'd', 'sink']} arrow="->" stroke="gray" strokeWidth={1.5} />
  </Layout>
);

export default Demo;
