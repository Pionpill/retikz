import type { IRDataTransform, IRDataTransformDeclaration } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { buildPlotIR } from '../../../src/adapter';
import { IntervalMark, PathMark, PointMark } from '../../../src/components/marks';

describe('buildPlotIR 标记局部变换', () => {
  const markTransform: Array<IRDataTransformDeclaration> = [
    { operation: { kind: 'sort', params: { field: 'score', order: 'descending' } } },
  ];

  it('点标记转发局部变换', () => {
    const spec = buildPlotIR(
      <PointMark transforms={markTransform} encodings={{ position: { x: { field: 'x' }, y: { field: 'score' } } }} />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({ type: 'point', transforms: markTransform });
  });

  it('路径标记转发局部变换', () => {
    const spec = buildPlotIR(
      <PathMark
        transforms={markTransform}
        encodings={{ order: 'x', position: { x: { field: 'x' }, y: { field: 'score' } } }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({ type: 'path', transforms: markTransform });
  });

  it('interval 标记透传局部变换', () => {
    const spec = buildPlotIR(
      <IntervalMark
        transforms={markTransform}
        encodings={{ position: { x: { field: 'x' }, y: { field: 'score' } } }}
      />,
      '__plot',
    );

    expect(spec.marks[0]).toMatchObject({ type: 'interval', transforms: markTransform });
  });

  it('标记变换快捷方式定义附加绘图变换而不消费标记局部变换', () => {
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
