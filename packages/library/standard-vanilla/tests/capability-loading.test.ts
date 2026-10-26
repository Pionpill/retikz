import { StandardInputEmbedAdapters } from '@retikz/standard-vanilla';
import {
  TreeInputEmbedAdapter,
  QueueInputEmbedAdapter,
  StackInputEmbedAdapter,
  ChainInputEmbedAdapter,
  MatrixInputEmbedAdapter,
  ArrayInputEmbedAdapter,
  MapInputEmbedAdapter,
} from '@retikz/standard-vanilla/collection';
import {
  axes,
  AxesInputEmbedAdapter,
  frame,
  FrameInputEmbedAdapter,
  grid,
  GridInputEmbedAdapter,
  legend,
  LegendInputEmbedAdapter,
  surface,
  surfaceChild,
  SurfaceInputEmbedAdapter,
} from '@retikz/standard-vanilla/presentation';
import { createGrid, GridDefinition, LegendContentKind } from '@retikz/standard/presentation';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import {
  CircleInputEmbedAdapter,
  EllipseInputEmbedAdapter,
  RectangleInputEmbedAdapter,
  PolygonInputEmbedAdapter,
  StarInputEmbedAdapter,
  ArcInputEmbedAdapter,
  SectorInputEmbedAdapter,
} from '../src/shape';

const input = scene({
  children: [
    grid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } }),
    axes({ x: { extent: 20 }, y: { extent: 20 } }),
    frame({ children: [{ type: 'node', position: [0, 0], text: 'Contract' }] }),
    surface({ child: surfaceChild({ type: 'node', position: [0, 0], text: 'Surface' }) }),
    legend({
      content: {
        kind: LegendContentKind.Items,
        items: [{ key: 'node', sample: { type: 'node', position: [0, 0], text: 'N' } }],
      },
    }),
  ],
});

describe('Standard Vanilla 定义加载', () => {
  it('以稳定的冻结顺序提供当前适配器目录', () => {
    expect(StandardInputEmbedAdapters).toEqual([
      TreeInputEmbedAdapter,
      QueueInputEmbedAdapter,
      StackInputEmbedAdapter,
      ChainInputEmbedAdapter,
      MatrixInputEmbedAdapter,
      MapInputEmbedAdapter,
      ArrayInputEmbedAdapter,
      GridInputEmbedAdapter,
      AxesInputEmbedAdapter,
      FrameInputEmbedAdapter,
      SurfaceInputEmbedAdapter,
      LegendInputEmbedAdapter,
      CircleInputEmbedAdapter,
      EllipseInputEmbedAdapter,
      RectangleInputEmbedAdapter,
      PolygonInputEmbedAdapter,
      StarInputEmbedAdapter,
      ArcInputEmbedAdapter,
      SectorInputEmbedAdapter,
    ]);
    expect(Object.isFrozen(StandardInputEmbedAdapters)).toBe(true);
    expect(Object.isFrozen(GridInputEmbedAdapter)).toBe(false);
  });

  it('使用全适配器预设标准化所有当前嵌入', () => {
    const normalized = normalizeScene(input, { adapters: StandardInputEmbedAdapters });

    expect(normalized.contributions).toHaveLength(5);
    expect(normalized.ir.children.map(child => child.type)).toEqual(['grid', 'axes', 'frame', 'surface', 'legend']);
  });

  it('保持部分适配器选择显式', () => {
    expect(() => normalizeScene(input, { adapters: [GridInputEmbedAdapter, FrameInputEmbedAdapter] })).toThrow(
      /kind "standard\.axes" but no adapter was provided/i,
    );
  });

  it('使用显式定义编译直接 Standard IR，没有适配器', () => {
    const ir = {
      type: 'scene' as const,
      version: 1 as const,
      children: [createGrid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })],
    };

    expect(() => renderToSvgString(ir, { compile: { composites: [GridDefinition] } })).not.toThrow();
  });

  it('对相同显式定义对象进行去重，并拒绝同一键上的不同对象', () => {
    expect(() =>
      renderToSvgString(
        scene({ children: [grid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })] }),
        {
          adapters: [GridInputEmbedAdapter],
          compile: { composites: [GridDefinition] },
        },
      ),
    ).not.toThrow();
    expect(() =>
      renderToSvgString(
        scene({ children: [grid({ bounds: { start: [0, 0], end: [20, 20] }, line: { spacing: 10 } })] }),
        {
          adapters: [GridInputEmbedAdapter],
          compile: { composites: [{ ...GridDefinition }] },
        },
      ),
    ).toThrow(/definition conflict.*standard\.grid/i);
  });
});
