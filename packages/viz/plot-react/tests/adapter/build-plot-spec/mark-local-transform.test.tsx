import type { IRDataTransform, IRDataTransformDeclaration } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { IntervalMark, PathMark, PointMark } from '../../../src/components/marks';

describe('buildPlotIR mark-local transform', () => {
  const markTransform: Array<IRDataTransformDeclaration> = [
    { operation: { kind: 'sort', params: { field: 'score', order: 'descending' } } },
  ];

  it('point_mark_forwards_local_transform', () => {
    const spec = buildPlotIR(
      <PointMark transforms={markTransform} encodings={{ position: { x: { field: 'x' }, y: { field: 'score' } } }} />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({ type: 'point', transforms: markTransform });
  });

  it('path_mark_forwards_local_transform', () => {
    const spec = buildPlotIR(
      <PathMark
        transforms={markTransform}
        encodings={{ order: 'x', position: { x: { field: 'x' }, y: { field: 'score' } } }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({ type: 'path', transforms: markTransform });
  });

  it('interval_mark_forwards_local_transform', () => {
    const spec = buildPlotIR(
      <IntervalMark
        transforms={markTransform}
        encodings={{ position: { x: { field: 'x' }, y: { field: 'score' } } }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({ type: 'interval', transforms: markTransform });
  });

  it('mark_transform_shortcut_definitions_append_plot_transforms_without_consuming_mark_local_transform', () => {
    const shortcutTransform: IRDataTransform = {
      kind: 'jitter',
      params: { axis: 'x', xField: 'x', amount: 0.2, seed: 9 },
    };
    const spec = buildPlotIR(
      <PointMark transforms={markTransform} encodings={{ position: { x: { field: 'x' }, y: { field: 'score' } } }} />,
      '__plot',
      {
        markTransformShortcuts: [
          {
            markType: 'point',
            build: ({ mark }) => (mark.type === 'point' ? [shortcutTransform] : []),
          },
        ],
      },
    );

    expect(spec.transform).toEqual([{ operation: shortcutTransform }]);
    expect(spec.marks[0]).toMatchObject({ type: 'point', transforms: markTransform });
  });
});
