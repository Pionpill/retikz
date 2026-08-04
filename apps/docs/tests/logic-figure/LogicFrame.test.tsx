import type { ReactNode } from 'react';

import { convertReactNodeToIR, Node } from '@retikz/react';
import { FrameSchema } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import { LogicFrame, LogicFrameDescription, LogicFrameTitle } from '@/modules/docs/components/logic-figure';

const readFrame = (element: ReactNode) => {
  const child = convertReactNodeToIR(element).children[0];
  return FrameSchema.parse(child);
};

describe('LogicFrame', () => {
  it('provides logic-figure defaults to Frame and its semantic header parts', () => {
    const frame = readFrame(
      <LogicFrame id="core">
        <LogicFrameTitle>Core</LogicFrameTitle>
        <LogicFrameDescription>IR → Scene</LogicFrameDescription>
        <Node id="compile" position={[0, 0]}>
          compileToScene
        </Node>
      </LogicFrame>,
    );

    expect(frame).toMatchObject({
      border: {
        style: {
          stroke: 'lightgray',
          fill: 'lightgray',
          fillOpacity: 0.04,
          dashPattern: [4, 3],
        },
        cornerRadius: 4,
      },
      padding: 10,
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
    });
  });

  it('lets explicit styles replace defaults while shallow-merging header fonts', () => {
    const frame = readFrame(
      <LogicFrame
        id="custom"
        border={{
          style: {
            stroke: 'darkorange',
            fill: 'darkorange',
            fillOpacity: 0.12,
            dashPattern: undefined,
          },
          cornerRadius: 0,
        }}
        padding={{ x: 16, y: 8 }}
      >
        <LogicFrameTitle textColor="currentColor" font={{ weight: 700 }}>
          Custom
        </LogicFrameTitle>
        <LogicFrameDescription opacity={0.9} font={{ family: 'serif' }}>
          Description
        </LogicFrameDescription>
        <Node position={[0, 0]}>Body</Node>
      </LogicFrame>,
    );

    expect(frame).toMatchObject({
      border: {
        style: {
          stroke: 'darkorange',
          fill: 'darkorange',
          fillOpacity: 0.12,
        },
        cornerRadius: 0,
      },
      padding: { x: 16, y: 8 },
      title: {
        textColor: 'currentColor',
        font: { size: 12, weight: 700 },
      },
      description: {
        opacity: 0.9,
        font: { family: 'serif', size: 11 },
      },
    });
    expect(frame.border.style.dashPattern).toBeUndefined();
  });

  it('rejects semantic header parts used outside LogicFrame', () => {
    expect(() => convertReactNodeToIR(<LogicFrameTitle>Standalone</LogicFrameTitle>)).toThrow(
      /direct child of LogicFrame/i,
    );
    expect(() => convertReactNodeToIR(<LogicFrameDescription>Standalone</LogicFrameDescription>)).toThrow(
      /direct child of LogicFrame/i,
    );
  });
});
