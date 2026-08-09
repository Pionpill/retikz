import { LayoutItemKind } from '@retikz/layout';
import { figure, renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { LayoutVanillaAdapters } from '../../src';
import { createLayoutInspectionVanillaDriver, inspectFlexLayout } from '../../src/inspect';

describe('@retikz/layout-vanilla/inspect', () => {
  it('通过可选 helper 输出 FlexLayout 只读辅助图层', () => {
    const source = figure({
      children: [
        inspectFlexLayout('flex', {
          children: [
            { kind: LayoutItemKind.Flex, key: 'leaf', child: { type: 'node', position: [0, 0], text: 'leaf' } },
          ],
        }),
      ],
    });
    const svg = renderToSvgString(source, {
      adapters: LayoutVanillaAdapters,
      compileDriver: createLayoutInspectionVanillaDriver(),
    });
    expect(svg).toContain('data-retikz-readonly-layer');
    expect(svg).toContain('#2563eb');
  });
});
