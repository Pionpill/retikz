import { LayoutItemKind } from '@retikz/standard';
import { figure, renderToSvgString } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { StandardLayoutVanillaAdapters } from '../../src';
import { createStandardInspectionVanillaDriver, inspectFlexLayout } from '../../src/inspect';

describe('@retikz/standard-vanilla/inspect', () => {
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
      adapters: StandardLayoutVanillaAdapters,
      compileDriver: createStandardInspectionVanillaDriver(),
    });
    expect(svg).toContain('data-retikz-readonly-layer');
    expect(svg).toContain('#2563eb');
  });
});
