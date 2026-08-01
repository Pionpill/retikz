import { describe, expect, it } from 'vitest';

import { resolveChartSpec } from '../../src/pipeline';

describe('Chart inspection', () => {
  it('按最终 Plot collection 顺序输出完整 member literal', () => {
    const result = resolveChartSpec({
      namespace: 'chart',
      type: '__infrastructure-fixture',
      id: 'sales',
      data: { reference: 'rows' },
      encoding: { x: 'amount', y: 'margin' },
      transform: [{ kind: 'sort', field: 'margin', order: 'descending' }],
      scales: [
        { type: 'log', name: 'x', base: 2 },
        { type: 'linear', name: 'z' },
      ],
      mark: { opacity: { kind: 'constant', value: 0.5 } },
      components: [{ target: 'guide.x', grid: true }],
      marks: [
        {
          type: 'point',
          id: 'user.mark',
          encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
        },
      ],
    });

    const { style, ...inspection } = result.inspection;
    expect(style).toMatchObject({ preset: 'neutral', mode: 'light', authoredOverrides: [] });
    expect(style.tokenSources).toHaveLength(75);
    expect(inspection).toEqual({
      chart: { type: '__infrastructure-fixture', id: 'sales' },
      plot: { id: 'sales/plot' },
      members: [
        {
          target: 'extension.transform.0',
          kind: 'transform',
          core: false,
          value: { kind: 'sort', field: 'margin', order: 'descending' },
          sources: [{ kind: 'user-override', path: '$spec/transform/0' }],
        },
        {
          target: 'transform.order-x',
          kind: 'transform',
          core: true,
          value: { kind: 'sort', field: 'amount', order: 'ascending' },
          sources: [{ kind: 'type-default', path: '$recipe/__infrastructure-fixture/transform.order-x' }],
        },
        {
          target: 'scale.x',
          kind: 'scale',
          core: true,
          value: { type: 'log', name: 'x', base: 2 },
          sources: [
            { kind: 'type-default', path: '$recipe/__infrastructure-fixture/scale.x' },
            { kind: 'user-override', path: '$spec/scales/0' },
          ],
        },
        {
          target: 'scale.y',
          kind: 'scale',
          core: true,
          value: { type: 'linear', name: 'y' },
          sources: [{ kind: 'type-default', path: '$recipe/__infrastructure-fixture/scale.y' }],
        },
        {
          target: 'extension.scale.2',
          kind: 'scale',
          core: false,
          value: { type: 'linear', name: 'z' },
          sources: [{ kind: 'user-override', path: '$spec/scales/1' }],
        },
        {
          target: 'coordinate.main',
          kind: 'coordinate',
          core: true,
          value: { type: 'cartesian2D', x: 'x', y: 'y' },
          sources: [{ kind: 'type-default', path: '$recipe/__infrastructure-fixture/coordinate.main' }],
        },
        {
          target: 'mark.main',
          kind: 'mark',
          id: '__chart.__infrastructure-fixture.mark.main',
          core: true,
          value: {
            type: 'point',
            id: '__chart.__infrastructure-fixture.mark.main',
            encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
            opacity: { kind: 'constant', value: 0.5 },
          },
          sources: [
            { kind: 'type-default', path: '$recipe/__infrastructure-fixture/mark.main' },
            { kind: 'user-override', path: '$spec/mark' },
          ],
        },
        {
          target: 'extension.mark.1',
          kind: 'mark',
          id: 'user.mark',
          core: false,
          value: {
            type: 'point',
            id: 'user.mark',
            encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
          },
          sources: [{ kind: 'plot-extension', path: '$spec/marks/0' }],
        },
        {
          target: 'guide.x',
          kind: 'guide',
          id: '__chart.__infrastructure-fixture.guide.x',
          core: false,
          value: {
            type: 'axis',
            id: '__chart.__infrastructure-fixture.guide.x',
            dimension: 'x',
            grid: true,
          },
          sources: [
            { kind: 'type-default', path: '$recipe/__infrastructure-fixture/guide.x' },
            { kind: 'user-override', path: '$spec/components/0' },
          ],
        },
        {
          target: 'guide.y',
          kind: 'guide',
          id: '__chart.__infrastructure-fixture.guide.y',
          core: false,
          value: {
            type: 'axis',
            id: '__chart.__infrastructure-fixture.guide.y',
            dimension: 'y',
            grid: true,
          },
          sources: [{ kind: 'type-default', path: '$recipe/__infrastructure-fixture/guide.y' }],
        },
      ],
    });
  });

  it('guide replacement 使用 final-index extension target', () => {
    const result = resolveChartSpec({
      namespace: 'chart',
      type: '__infrastructure-fixture',
      data: { reference: 'rows' },
      encoding: { x: 'amount', y: 'margin' },
      guides: [{ type: 'axis', id: 'user.axis', dimension: 'x' }],
    });

    expect(result.inspection.members.filter(member => member.kind === 'guide')).toEqual([
      {
        target: 'extension.guide.0',
        kind: 'guide',
        id: 'user.axis',
        core: false,
        value: { type: 'axis', id: 'user.axis', dimension: 'x' },
        sources: [{ kind: 'user-override', path: '$spec/guides/0' }],
      },
    ]);
  });
});
