import { describe, expect, it } from 'vitest';
import { PlotSpecSchema } from '@retikz/plot';
import { buildPlotSpec } from '../../src/components/build-plot-spec';
import { RibbonMark } from '../../src/components/marks';

/**
 * ADR-05（alpha.11）：plot-react ribbon 装配契约。
 * <RibbonMark> 扁平端点 props（sourceX/Y、targetX/Y、value、endWidth、curvature、color）
 * → 嵌套 IR ribbon mark（source/target 字段对、value、color encoding），与手写 IR 等价。
 */

type RibbonIR = {
  type: string;
  source?: { x?: { field?: string }; y?: { field?: string } };
  target?: { x?: { field?: string }; y?: { field?: string } };
  value?: string;
  endWidth?: string;
  curvature?: number;
  orientation?: string;
  encoding?: { color?: { field?: string; scale?: string } };
};

describe('ribbon-react-sugar-assembles-ir', () => {
  it('扁平端点 props → 嵌套 source/target 字段对端点 + value', () => {
    const spec = buildPlotSpec(<RibbonMark sourceX="sx" sourceY="sy" targetX="tx" targetY="ty" value="amount" />, '__plot', { deferPositionScaleInference: true });
    const mark = spec.marks[0] as RibbonIR;
    expect(mark.type).toBe('ribbon');
    expect(mark.source).toEqual({ x: { field: 'sx' }, y: { field: 'sy' } });
    expect(mark.target).toEqual({ x: { field: 'tx' }, y: { field: 'ty' } });
    expect(mark.value).toBe('amount');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('color → color encoding（AUTO_COLOR ordinal）+ endWidth / curvature 落顶层', () => {
    const spec = buildPlotSpec(<RibbonMark sourceX="sx" sourceY="sy" targetX="tx" targetY="ty" value="amount" endWidth="end" curvature={0.3} color="cat" />, '__plot', {
      deferPositionScaleInference: true,
    });
    const mark = spec.marks[0] as RibbonIR;
    expect(mark.endWidth).toBe('end');
    expect(mark.curvature).toBe(0.3);
    expect(mark.encoding?.color).toEqual({ field: 'cat', scale: '__color' });
    // color 字段 → 自动 ordinal 色 scale 进 spec.scales
    expect(spec.scales.some(s => s.name === '__color')).toBe(true);
  });

  it('无 endWidth / curvature / orientation → 不写顶层字段（等宽带、默认 curvature / horizontal 由 lowering 兜底）', () => {
    const spec = buildPlotSpec(<RibbonMark sourceX="sx" sourceY="sy" targetX="tx" targetY="ty" value="amount" />, '__plot', { deferPositionScaleInference: true });
    const mark = spec.marks[0] as RibbonIR;
    expect(mark).not.toHaveProperty('endWidth');
    expect(mark).not.toHaveProperty('curvature');
    expect(mark).not.toHaveProperty('orientation');
  });

  it('orientation → 透传顶层字段', () => {
    const spec = buildPlotSpec(<RibbonMark sourceX="sx" sourceY="sy" targetX="tx" targetY="ty" value="amount" orientation="vertical" />, '__plot', { deferPositionScaleInference: true });
    expect((spec.marks[0] as RibbonIR).orientation).toBe('vertical');
    expect(() => PlotSpecSchema.parse(spec)).not.toThrow();
  });

  it('id → mark.id 句柄', () => {
    const spec = buildPlotSpec(<RibbonMark id="flow" sourceX="sx" sourceY="sy" targetX="tx" targetY="ty" value="amount" />, '__plot', { deferPositionScaleInference: true });
    expect((spec.marks[0] as { id?: string }).id).toBe('flow');
  });
});
