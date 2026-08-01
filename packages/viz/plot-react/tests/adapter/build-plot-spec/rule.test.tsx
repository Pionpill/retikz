import { PlotSpecSchema } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import { buildPlotSpec } from '../../../src/adapter';
import { ReferenceMark } from '../../../src/components/marks';

describe('buildPlotSpec rule 装配（alpha.11 ADR-03）', () => {
  it('rulemark-constant：数字 → value（line），常量 color → value', () => {
    const spec = buildPlotSpec(<ReferenceMark y={80} color="crimson" />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', encoding: { y: { value: 80 }, color: { value: 'crimson' } } });
  });

  it('rulemark-field：字符串 → field（per-datum line），color field → AUTO_COLOR', () => {
    const spec = buildPlotSpec(<ReferenceMark y="threshold" color="category" />, '__plot');
    expect(spec.marks[0]).toEqual({
      type: 'reference',
      encoding: { y: { field: 'threshold' }, color: { field: 'category', scale: '__color' } },
    });
    // per-datum color field → 自动色 scale
    expect(spec.scales.some(scale => scale.name === '__color')).toBe(true);
  });

  it('rulemark-band：给 yTo → band（数字常量上界）', () => {
    const spec = buildPlotSpec(<ReferenceMark y={70} yTo={90} color="amber" />, '__plot');
    expect(spec.marks[0]).toEqual({
      type: 'reference',
      yTo: 90,
      encoding: { y: { value: 70 }, color: { value: 'amber' } },
    });
  });

  it('rulemark-band-field：字符串上界 → field band', () => {
    const spec = buildPlotSpec(<ReferenceMark y="lo" yTo="hi" />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', yTo: 'hi', encoding: { y: { field: 'lo' } } });
  });

  it('rulemark-orientation-vertical：绑 x → 竖直 rule（encoding.x）', () => {
    const spec = buildPlotSpec(<ReferenceMark x={5} />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', encoding: { x: { value: 5 } } });
  });

  it('rulemark-extent：透传 extent 字段', () => {
    const spec = buildPlotSpec(<ReferenceMark x="date" extentField="rowLo" extentToField="rowHi" />, '__plot');
    expect(spec.marks[0]).toEqual({
      type: 'reference',
      extentField: 'rowLo',
      extentToField: 'rowHi',
      encoding: { x: { field: 'date' } },
    });
  });

  it('rulemark-vertical-band-xTo：绑 x + xTo → band', () => {
    const spec = buildPlotSpec(<ReferenceMark x={2} xTo={5} />, '__plot');
    expect(spec.marks[0]).toEqual({ type: 'reference', xTo: 5, encoding: { x: { value: 2 } } });
  });

  it('rulemark-region：kind=region + x/xTo/y/yTo → bounded area', () => {
    const spec = buildPlotSpec(<ReferenceMark kind="region" x={2} xTo={5} y={70} yTo={90} color="amber" />, '__plot');
    expect(spec.marks[0]).toEqual({
      type: 'reference',
      kind: 'region',
      xTo: 5,
      yTo: 90,
      encoding: { x: { value: 2 }, y: { value: 70 }, color: { value: 'amber' } },
    });
  });

  it('rulemark-region-field：region 字符串边界 → field + color field', () => {
    const spec = buildPlotSpec(<ReferenceMark kind="region" x="x0" xTo="x1" y="y0" yTo="y1" color="tier" />, '__plot');
    expect(spec.marks[0]).toEqual({
      type: 'reference',
      kind: 'region',
      xTo: 'x1',
      yTo: 'y1',
      encoding: { x: { field: 'x0' }, y: { field: 'y0' }, color: { field: 'tier', scale: '__color' } },
    });
  });

  it('rulemark-orientation-conflict：x 与 y 皆给 → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark x={1} y={2} />, '__plot')).toThrow(/exactly one of x|both|neither/i);
  });

  it('rulemark-orientation-missing：x 与 y 皆缺 → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark />, '__plot')).toThrow(/exactly one of x|both|neither/i);
  });

  it('rulemark-bound-mismatch：绑 x 却给 yTo → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark x={5} yTo={10} />, '__plot')).toThrow(
      /yTo|match the bound dimension|xTo/i,
    );
  });

  it('rulemark-bound-mismatch-y：绑 y 却给 xTo → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark y={5} xTo={10} />, '__plot')).toThrow(
      /xTo|match the bound dimension|yTo/i,
    );
  });

  it('rulemark-extent-unpaired：仅 extentField → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark x="date" extentField="lo" />, '__plot')).toThrow(
      /extentField|extentToField|together/i,
    );
  });

  it('rulemark-region-missing-bound：region 缺 yTo → fail-loud', () => {
    expect(() => buildPlotSpec(<ReferenceMark kind="region" x={1} xTo={2} y={3} />, '__plot')).toThrow(
      /region|xTo|yTo/i,
    );
  });

  it('rulemark-region-extent：region 不接收 extent → fail-loud', () => {
    expect(() =>
      buildPlotSpec(
        <ReferenceMark kind="region" x={1} xTo={2} y={3} yTo={4} extentField="a" extentToField="b" />,
        '__plot',
      ),
    ).toThrow(/region|extentField|extentToField/i);
  });

  it('rule 装配产物过 PlotSpecSchema', () => {
    const spec = buildPlotSpec(
      <>
        <ReferenceMark y={80} color="crimson" />
        <ReferenceMark y={70} yTo={90} color="amber" />
        <ReferenceMark x="date" extentField="a" extentToField="b" />
      </>,
      '__plot',
    );
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });
});
