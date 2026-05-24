/**
 * Scope 样式继承 compile 测试（alpha.2 ADR-01）
 * @description 主色级联 + 同源分项覆盖主色 + 颜色级联到 label/arrow + 四通道 every-X + 优先级链（就近 model A）+
 *   缺省/显式 none + resetStyle 四通道（不碰 host 轴）+ opacity 替换不复合 + 与 transforms / localNamespace 正交。
 *   断言层级：node → rect/ellipse fill/stroke + text fill；path → PathPrim.stroke + 已解析 marker 几何颜色（markerPaintColor）+ step-label TextPrim.fill
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type {
  ArrowEndSpec,
  EllipsePrim,
  MarkerFill,
  MarkerPrimitive,
  PathPrim,
  RectPrim,
  ScenePrimitive,
  TextPrim,
} from '../../src/primitive';

/** 递归展开 GroupPrim，把所有叶子 primitive 拍平（scope 子元素在 GroupPrim 内） */
const flatten = (prims: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];
  for (const p of prims) {
    out.push(p);
    if (p.type === 'group') out.push(...flatten(p.children));
  }
  return out;
};

const allPrims = (ir: IR): Array<ScenePrimitive> => flatten(compileToScene(ir).primitives);
const rectOf = (ir: IR): RectPrim | undefined =>
  allPrims(ir).find((p): p is RectPrim => p.type === 'rect');
const ellipseOf = (ir: IR): EllipsePrim | undefined =>
  allPrims(ir).find((p): p is EllipsePrim => p.type === 'ellipse');
const linePathOf = (ir: IR): PathPrim | undefined =>
  allPrims(ir).find(
    (p): p is PathPrim => p.type === 'path' && !p.commands.some(c => c.kind === 'close'),
  );
const textsOf = (ir: IR): Array<TextPrim> =>
  allPrims(ir).filter((p): p is TextPrim => p.type === 'text');
/** 取指定文字内容的 TextPrim（node 文本 vs step label 文本区分） */
const textWith = (ir: IR, content: string): TextPrim | undefined =>
  textsOf(ir).find(t => t.lines[0]?.text === content);

/**
 * 从已解析 `ArrowEndSpec` 的 marker 几何里抽"主导箭头颜色"
 * @description 新契约下视觉输入（color）在 compile 被消费、不再挂 `ArrowEndSpec`——解析后的颜色物化进
 *   `marker[]` 内部几何的 fill / stroke（实心走 fill、空心走 stroke；contextStroke 表示继承 path stroke）。
 *   测断言箭头颜色优先级链时改读此处。递归穿 group 子原语，返回首个非 contextStroke 的纯色字符串；
 *   全部 contextStroke / 无 paint 时返回 undefined（= 走继承，未冻结颜色）。
 */
const markerPaintColor = (spec: ArrowEndSpec | undefined): string | undefined => {
  if (!spec) return undefined;
  const pickFill = (f: MarkerFill | undefined): string | undefined =>
    typeof f === 'string' ? f : undefined;
  const walk = (prims: ReadonlyArray<MarkerPrimitive>): string | undefined => {
    for (const p of prims) {
      if (p.type === 'group') {
        const c = walk(p.children);
        if (c !== undefined) return c;
        continue;
      }
      const c = pickFill(p.fill) ?? (typeof p.stroke === 'string' ? p.stroke : undefined);
      if (c !== undefined && c !== 'context-stroke') return c;
    }
    return undefined;
  };
  return walk(spec.marker);
};

// ===========================================================================
// Happy path
// ===========================================================================

describe('Happy: 主色级联 / 四通道', () => {
  it('scope_color_cascades_all：<Scope color="blue"> → node 边/文字/path stroke/arrow/label 全蓝', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          color: 'blue',
          children: [
            { type: 'node', id: 'A', position: [0, 0], text: 'A' },
            {
              type: 'path',
              arrow: '->',
              children: [
                { type: 'step', kind: 'move', to: { id: 'A' } },
                { type: 'step', kind: 'line', to: [60, 0], label: { text: 'e' } },
              ],
            },
          ],
        },
      ],
    };
    const rect = rectOf(ir);
    expect(rect?.stroke).toBe('blue');
    expect(rect?.fill).toBe('blue');
    expect(textWith(ir, 'A')?.fill).toBe('blue');
    const path = linePathOf(ir);
    expect(path?.stroke).toBe('blue');
    // 解析后的箭头颜色物化进 marker 几何（新契约：color 不再挂 ArrowEndSpec）
    expect(markerPaintColor(path?.arrowEnd)).toBe('blue');
    expect(textWith(ir, 'e')?.fill).toBe('blue');
  });

  it('node_default_applies：nodeDefault={{shape:circle, fill:lightblue}} → 子 node 圆 + 浅蓝', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          nodeDefault: { shape: 'circle', fill: 'lightblue' },
          children: [{ type: 'node', position: [0, 0] }],
        },
      ],
    };
    expect(ellipseOf(ir)?.fill).toBe('lightblue');
  });

  it('path_color_follows_to_label_arrow：<Path color="crimson" arrow="->"> + label → label 与 arrow 均 crimson', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          color: 'crimson',
          arrow: '->',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [80, 40], label: { text: 'sin' } },
          ],
        },
      ],
    };
    expect(linePathOf(ir)?.stroke).toBe('crimson');
    expect(markerPaintColor(linePathOf(ir)?.arrowEnd)).toBe('crimson');
    expect(textWith(ir, 'sin')?.fill).toBe('crimson');
  });

  it('arrow_default_applies：arrowDefault={{shape:stealth, scale:1.5}} → 子 path 箭头 stealth 1.5×', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          arrowDefault: { shape: 'stealth', scale: 1.5 },
          children: [
            {
              type: 'path',
              arrow: '->',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [50, 0] },
              ],
            },
          ],
        },
      ],
    };
    expect(linePathOf(ir)?.arrowEnd?.shape).toBe('stealth');
    // scale 1.5 在 compile 被消费乘进 markerWidth（默认 length 6 × 1.5 = 9）；scale 不再挂 ArrowEndSpec
    expect(linePathOf(ir)?.arrowEnd?.markerWidth).toBeCloseTo(9, 5);
  });
});

// ===========================================================================
// 边界
// ===========================================================================

describe('边界: 缺省 / 显式 / 内置', () => {
  it('specific_overrides_master_same_source：<Node color="blue" stroke="red"> → stroke red、fill/text blue', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', position: [0, 0], text: 'x', color: 'blue', stroke: 'red' },
      ],
    };
    expect(rectOf(ir)?.stroke).toBe('red');
    expect(rectOf(ir)?.fill).toBe('blue');
    expect(textWith(ir, 'x')?.fill).toBe('blue');
  });

  it('missing_falls_through_to_outer：外层 color=white ⊃ 内层无 → 继承 white', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          color: 'white',
          children: [{ type: 'node', position: [0, 0], text: 'x' }],
        },
      ],
    };
    expect(rectOf(ir)?.stroke).toBe('white');
    expect(rectOf(ir)?.fill).toBe('white');
    expect(textWith(ir, 'x')?.fill).toBe('white');
  });

  it('whole_chain_silent_builtin：全链无色 → 内置（currentColor / transparent，零破坏）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', position: [0, 0], text: 'x' }],
    };
    expect(rectOf(ir)?.stroke).toBe('currentColor');
    expect(rectOf(ir)?.fill).toBe('transparent');
    expect(textWith(ir, 'x')?.fill).toBe('currentColor');
  });

  it('empty_default_no_effect：nodeDefault={{}} → 无变化（内置）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          nodeDefault: {},
          children: [{ type: 'node', position: [0, 0], text: 'x' }],
        },
      ],
    };
    expect(rectOf(ir)?.stroke).toBe('currentColor');
    expect(rectOf(ir)?.fill).toBe('transparent');
  });
});

// ===========================================================================
// 交互
// ===========================================================================

describe('交互: 优先级 / resetStyle / opacity / 正交', () => {
  it('explicit_none_overrides_outer：外 color=white ⊃ node stroke="none" → stroke none（显式截断），fill 仍 white', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          color: 'white',
          children: [{ type: 'node', position: [0, 0], text: 'x', stroke: 'none' }],
        },
      ],
    };
    expect(rectOf(ir)?.stroke).toBe('none');
    expect(rectOf(ir)?.fill).toBe('white');
  });

  it('nested_inner_color_beats_outer：S1 color=red ⊃ S2 color=blue ⊃ node → blue（就近）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          color: 'red',
          children: [
            {
              type: 'scope',
              color: 'blue',
              children: [{ type: 'node', position: [0, 0], text: 'x' }],
            },
          ],
        },
      ],
    };
    expect(rectOf(ir)?.stroke).toBe('blue');
  });

  it('node_default_beats_scope_cascade：<Scope stroke="red" nodeDefault={{stroke:"green"}}> → node green', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          stroke: 'red',
          nodeDefault: { stroke: 'green' },
          children: [{ type: 'node', position: [0, 0] }],
        },
      ],
    };
    expect(rectOf(ir)?.stroke).toBe('green');
  });

  it('reset_style_cuts_outer_keeps_own：S1 color=red ⊃ S2 resetStyle color=white → node white、其余回内置', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          color: 'red',
          children: [
            {
              type: 'scope',
              resetStyle: true,
              color: 'white',
              children: [{ type: 'node', position: [0, 0], text: 'x' }],
            },
          ],
        },
      ],
    };
    expect(rectOf(ir)?.stroke).toBe('white');
    expect(rectOf(ir)?.fill).toBe('white');
  });

  it('reset_style_arrow_keeps_host_color：resetStyle=[arrow] 切外层 arrowDefault，箭头仍跟宿主 path 主色', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          arrowDefault: { shape: 'circle', scale: 2 },
          children: [
            {
              type: 'scope',
              resetStyle: ['arrow'],
              children: [
                {
                  type: 'path',
                  color: 'red',
                  arrow: '->',
                  children: [
                    { type: 'step', kind: 'move', to: [0, 0] },
                    { type: 'step', kind: 'line', to: [40, 0] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    // 外层 arrowDefault circle 被切 → 回内置 stealth；但 color 仍跟宿主 path 红（host 轴不切）
    expect(linePathOf(ir)?.arrowEnd?.shape).toBe('stealth');
    expect(markerPaintColor(linePathOf(ir)?.arrowEnd)).toBe('red');
  });

  it('reset_style_label_keeps_host_color：resetStyle=[label] 切外层 labelDefault，label 仍跟宿主线红', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          labelDefault: { textColor: 'gray' },
          children: [
            {
              type: 'scope',
              resetStyle: ['label'],
              children: [
                {
                  type: 'path',
                  color: 'red',
                  children: [
                    { type: 'step', kind: 'move', to: [0, 0] },
                    { type: 'step', kind: 'line', to: [40, 0], label: { text: 'x' } },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    expect(textWith(ir, 'x')?.fill).toBe('red');
  });

  it('opacity_per_element_no_compound：S1 opacity .5 ⊃ S2 opacity .5 ⊃ node → 0.5（不复合）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          opacity: 0.5,
          children: [
            {
              type: 'scope',
              opacity: 0.5,
              children: [{ type: 'node', position: [0, 0], text: 'x' }],
            },
          ],
        },
      ],
    };
    expect(rectOf(ir)?.opacity).toBe(0.5);
  });

  it('style_orthogonal_to_transforms：scope scale + strokeWidth → strokeWidth 不随 scale 缩放', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          transforms: [{ kind: 'scale', x: 2 }],
          strokeWidth: 3,
          children: [{ type: 'node', position: [0, 0] }],
        },
      ],
    };
    expect(rectOf(ir)?.strokeWidth).toBe(3);
  });

  it('style_orthogonal_to_local_namespace：<Scope localNamespace color="red"> → 样式照常级联', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          localNamespace: true,
          color: 'red',
          children: [{ type: 'node', position: [0, 0], text: 'x' }],
        },
      ],
    };
    expect(rectOf(ir)?.stroke).toBe('red');
  });

  it('arrow_master_color_beats_arrow_default：path 主色覆盖外层 arrowDefault.color；元素 arrowDetail.color 最高（回归 BUG-1）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          arrowDefault: { color: 'green' },
          children: [
            {
              type: 'path',
              color: 'red',
              arrow: '->',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [40, 0] },
              ],
            },
            {
              type: 'path',
              color: 'blue',
              arrow: '->',
              arrowDetail: { color: 'purple' },
              children: [
                { type: 'step', kind: 'move', to: [0, 50] },
                { type: 'step', kind: 'line', to: [40, 50] },
              ],
            },
          ],
        },
      ],
    };
    const arrowColors = allPrims(ir)
      .filter(
        (p): p is PathPrim =>
          p.type === 'path' && !p.commands.some(c => c.kind === 'close'),
      )
      .map(p => markerPaintColor(p.arrowEnd));
    // 第一条：主色 red 覆盖 arrowDefault green（host 轴 > every-X color）；第二条：元素 arrowDetail.color=purple 最高
    expect(arrowColors).toEqual(['red', 'purple']);
  });

  it('arrow_end_color_master_beats_default_end：path 主色覆盖 arrowDefault.end.color；显式 arrowDetail.end.color 最高（端点级）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          arrowDefault: { end: { color: 'green' } },
          children: [
            {
              type: 'path',
              color: 'red',
              arrow: '->',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [40, 0] },
              ],
            },
            {
              type: 'path',
              color: 'blue',
              arrow: '->',
              arrowDetail: { end: { color: 'purple' } },
              children: [
                { type: 'step', kind: 'move', to: [0, 50] },
                { type: 'step', kind: 'line', to: [40, 50] },
              ],
            },
          ],
        },
      ],
    };
    const arrowColors = allPrims(ir)
      .filter(
        (p): p is PathPrim =>
          p.type === 'path' && !p.commands.some(c => c.kind === 'close'),
      )
      .map(p => markerPaintColor(p.arrowEnd));
    // 第一条：主色 red 覆盖 arrowDefault.end.color=green（端点回退主色）；第二条：显式 arrowDetail.end.color=purple 最高
    expect(arrowColors).toEqual(['red', 'purple']);
  });

  it('arrow_default_nested_end_per_field_merge：内层 arrowDefault.end 只改 shape，保留外层 end.color（nested per-field 合并）', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          arrowDefault: { end: { color: 'red', shape: 'normal' } },
          children: [
            {
              type: 'scope',
              arrowDefault: { end: { shape: 'circle' } },
              children: [
                {
                  type: 'path',
                  arrow: '->',
                  children: [
                    { type: 'step', kind: 'move', to: [0, 0] },
                    { type: 'step', kind: 'line', to: [40, 0] },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const arrow = linePathOf(ir)?.arrowEnd;
    // per-field merge：内层 shape=circle 覆盖，外层 end.color=red 保留（path 无主色，arrowDefault 端点色生效）
    expect(arrow?.shape).toBe('circle');
    expect(markerPaintColor(arrow)).toBe('red');
  });
});
