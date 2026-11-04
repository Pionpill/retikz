import { describe, expect, it } from 'vitest';

import { emitCompiledDrawing, splitCompiledDrawing } from '../../src/compile';
import type { ScenePrimitive } from '../../src/contract';

describe('最终绘制几何与外观', () => {
  it('往返保留嵌套组、箭头、文本行及省略字段', () => {
    const primitives: Array<ScenePrimitive> = [
      {
        type: 'group',
        id: 'drawing',
        children: [
          {
            type: 'path',
            commands: [
              { kind: 'move', to: [0, 0] },
              { kind: 'line', to: [10, 0] },
            ],
            stroke: 'red',
            arrowEnd: {
              shape: 'triangle',
              baseSize: 10,
              refX: 8,
              markerWidth: 10,
              markerHeight: 5,
              opacity: 0.4,
              marker: [{ type: 'path', commands: [{ kind: 'move', to: [0, 0] }], fill: 'blue' }],
            },
          },
          {
            type: 'text',
            x: 0,
            y: 0,
            fontSize: 12,
            lineHeight: 14,
            align: 'middle',
            baseline: 'top',
            measuredWidth: 20,
            measuredHeight: 28,
            lines: [{ text: 'a' }, { text: 'b', fill: 'green', opacity: 0.5 }],
          },
        ],
      },
    ];
    const drawing = splitCompiledDrawing(primitives);
    expect(emitCompiledDrawing(drawing)).toStrictEqual(primitives);
    const changed: Array<ScenePrimitive> = [{ ...primitives[0], id: 'repainted' }];
    const repainted = splitCompiledDrawing(changed);
    expect(repainted.geometry).toStrictEqual(drawing.geometry);
    expect(repainted.style).not.toEqual(drawing.style);
    expect(JSON.parse(JSON.stringify(drawing.geometry))).toEqual(drawing.geometry);
  });

  it('空输出保持为空，不产生占位图元', () => {
    expect(emitCompiledDrawing(splitCompiledDrawing([]))).toEqual([]);
  });
});
