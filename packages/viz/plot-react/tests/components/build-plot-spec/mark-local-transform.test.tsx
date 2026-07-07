import type { Transform as PlotTransformOperation } from '@retikz/plot';

import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/components/build-plot-spec';
import { IntervalMark, PathMark, PointMark, ReferenceMark } from '../../../src/components/marks';

describe('buildPlotSpec mark-local transform', () => {
  const markTransform: Array<PlotTransformOperation> = [{ kind: 'sort', field: 'score', order: 'descending' }];

  it('point_mark_forwards_local_transform', () => {
    const spec = buildPlotSpec(<PointMark x="x" y="score" transform={markTransform} />, '__plot');
    expect(spec.marks[0]).toMatchObject({ type: 'point', transform: markTransform });
  });

  it('path_mark_forwards_local_transform', () => {
    const spec = buildPlotSpec(<PathMark x="x" y="score" order="x" transform={markTransform} />, '__plot');
    expect(spec.marks[0]).toMatchObject({ type: 'path', transform: markTransform });
  });

  it('interval_mark_forwards_local_transform', () => {
    const spec = buildPlotSpec(<IntervalMark x="x" y="score" transform={markTransform} />, '__plot');
    expect(spec.marks[0]).toMatchObject({ type: 'interval', transform: markTransform });
  });

  it('reference_mark_forwards_local_transform', () => {
    const spec = buildPlotSpec(<ReferenceMark y={80} transform={markTransform} />, '__plot');
    expect(spec.marks[0]).toMatchObject({ type: 'reference', transform: markTransform });
  });

  it('mark_transform_shortcut_definitions_append_plot_transforms_without_consuming_mark_local_transform', () => {
    const shortcutTransform: PlotTransformOperation = { kind: 'jitter', axis: 'x', xField: 'x', amount: 0.2, seed: 9 };
    const spec = buildPlotSpec(<PointMark x="x" y="score" transform={markTransform} />, '__plot', {
      markTransformShortcuts: [
        {
          markType: 'point',
          build: ({ mark }) => (mark.type === 'point' ? [shortcutTransform] : []),
        },
      ],
    });

    expect(spec.transform).toEqual([shortcutTransform]);
    expect(spec.marks[0]).toMatchObject({ type: 'point', transform: markTransform });
  });
});
