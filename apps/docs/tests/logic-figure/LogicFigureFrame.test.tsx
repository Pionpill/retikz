import { GroupSchema } from '@retikz/graph';
import { createInputScene, Node } from '@retikz/react';
import { normalizeScene } from '@retikz/vanilla';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import {
  LogicFigureFrame,
  LogicFigureFrameDescription,
  LogicFigureFrameTitle,
} from '@/modules/docs/components/logic-figure';

const readFrame = (element: ReactNode) => {
  const input = createInputScene(element);
  const child = normalizeScene(input.scene, { adapters: input.adapters }).ir.children[0];
  return GroupSchema.parse(child);
};

/** 通过唯一 React-to-Vanilla Input 路径触发 marker 的父级约束 */
const normalizeReactNode = (element: ReactNode) => {
  const input = createInputScene(element);
  return normalizeScene(input.scene, { adapters: input.adapters });
};

describe('LogicFigureFrame', () => {
  it('provides logic-figure Group defaults and semantic caption parts', () => {
    const frame = readFrame(
      <LogicFigureFrame id="core">
        <LogicFigureFrameTitle>Core</LogicFigureFrameTitle>
        <LogicFigureFrameDescription>IR → Scene</LogicFigureFrameDescription>
        <Node id="compile" position={[0, 0]}>
          compileToScene
        </Node>
      </LogicFigureFrame>,
    );

    expect(frame).toMatchObject({
      namespace: 'graph',
      type: 'group',
      background: { fill: 'lightgray', fillOpacity: 0.04 },
      border: {
        stroke: 'lightgray',
        dashPattern: [4, 3],
      },
      cornerRadius: 4,
      padding: 10,
      caption: {
        title: {
          text: 'Core',
          textColor: 'gray',
          font: { size: 12, weight: 'normal' },
        },
        description: {
          text: 'IR → Scene',
          textColor: 'gray',
          opacity: 0.7,
          font: { size: 11 },
        },
      },
    });
  });

  it('lets explicit Group appearance replace defaults while shallow-merging caption fonts', () => {
    const frame = readFrame(
      <LogicFigureFrame
        id="custom"
        background={{ fill: 'darkorange', fillOpacity: 0.12 }}
        border={{ stroke: 'darkorange', dashPattern: undefined }}
        cornerRadius={0}
        padding={{ x: 16, y: 8 }}
      >
        <LogicFigureFrameTitle textColor="currentColor" font={{ weight: 700 }}>
          Custom
        </LogicFigureFrameTitle>
        <LogicFigureFrameDescription opacity={0.9} font={{ family: 'serif' }}>
          Description
        </LogicFigureFrameDescription>
        <Node position={[0, 0]}>Body</Node>
      </LogicFigureFrame>,
    );

    expect(frame).toMatchObject({
      background: { fill: 'darkorange', fillOpacity: 0.12 },
      border: {
        stroke: 'darkorange',
      },
      cornerRadius: 0,
      padding: { x: 16, y: 8 },
      caption: {
        title: {
          textColor: 'currentColor',
          font: { size: 12, weight: 700 },
        },
        description: {
          opacity: 0.9,
          font: { family: 'serif', size: 11 },
        },
      },
    });
    expect(frame.border?.dashPattern).toBeUndefined();
  });

  it('rejects semantic header parts used outside LogicFigureFrame', () => {
    expect(() => normalizeReactNode(<LogicFigureFrameTitle>Standalone</LogicFigureFrameTitle>)).toThrow(
      /direct child of LogicFigureFrame/i,
    );
    expect(() => normalizeReactNode(<LogicFigureFrameDescription>Standalone</LogicFigureFrameDescription>)).toThrow(
      /direct child of LogicFigureFrame/i,
    );
  });
});
