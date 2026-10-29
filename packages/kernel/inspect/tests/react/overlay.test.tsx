import type { CompileResult } from '@retikz/core';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { createDefaultInspectorRegistry, PATH_INSPECTOR_KEY } from '../../src';
import { InspectionOverlay } from '../../src/react';
import { prepareInspectionPresentation, renderInspectionToSvgString } from '../../src/vanilla';

describe('React 结果消费', () => {
  it('SSR 与 Vanilla 使用相同辅助输出，失败保持独立空层', () => {
    const result: CompileResult = {
      scene: {
        layout: { x: 0, y: 0, width: 40, height: 30 },
        primitives: [
          {
            type: 'path',
            commands: [
              { kind: 'move', to: [0, 0] },
              { kind: 'quad', control: [10, 20], to: [30, 0] },
            ],
          },
        ],
      },
      artifacts: [],
    };
    const options = {
      registry: createDefaultInspectorRegistry(),
      requests: [{ inspector: PATH_INSPECTOR_KEY }],
      idPrefix: 'react-aux',
    };
    const svg = renderInspectionToSvgString(prepareInspectionPresentation(result, options), options);
    expect(renderToStaticMarkup(<InspectionOverlay result={result} options={options} />)).toContain(svg);
    expect(
      renderToStaticMarkup(
        <InspectionOverlay
          result={result}
          options={{ ...options, requests: [{ inspector: { namespace: 'missing', type: 'missing' } }] }}
        />,
      ),
    ).not.toContain('<svg');
  });
});
