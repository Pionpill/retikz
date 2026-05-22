/**
 * StepLabel 样式 compile 测试（alpha.2 ADR-02）
 * @description textColor 继承顺序（label 显式 > scope.labelDefault > 宿主 path 主色 color > currentColor）；
 *   font 逐字段回退；opacity 元素内与 path opacity 相乘（跨 scope 不复合）；零破坏既有 currentColor 行为。
 *   跟随的是宿主 path 主色 color（不是 stroke）——与 TikZ `color=` 一致。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import type { IR } from '../../src/ir';
import type { ScenePrimitive, TextPrim } from '../../src/primitive';

const flatten = (prims: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];
  for (const p of prims) {
    out.push(p);
    if (p.type === 'group') out.push(...flatten(p.children));
  }
  return out;
};
/** 取首个 step label TextPrim（拍平 group，找 text） */
const labelOf = (ir: IR): TextPrim | undefined =>
  flatten(compileToScene(ir).primitives).find((p): p is TextPrim => p.type === 'text');

/** 构造单 line 段 path（可选 path 级字段 + label 字段） */
const pathWithLabel = (
  pathProps: Record<string, unknown>,
  label: Record<string, unknown>,
): IR => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      ...pathProps,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [80, 0], label: { text: 'x', ...label } },
      ],
    } as never,
  ],
});

// ===========================================================================
// Happy path
// ===========================================================================

describe('Happy: StepLabel 样式字段落地', () => {
  it('step_label_text_color_applies：textColor=red → TextPrim.fill=red', () => {
    expect(labelOf(pathWithLabel({}, { textColor: 'red' }))?.fill).toBe('red');
  });

  it('step_label_font_size_applies：font.size=10 → fontSize=10', () => {
    expect(labelOf(pathWithLabel({}, { font: { size: 10 } }))?.fontSize).toBe(10);
  });

  it('step_label_opacity_applies：opacity=0.6 → opacity=0.6', () => {
    expect(labelOf(pathWithLabel({}, { opacity: 0.6 }))?.opacity).toBe(0.6);
  });

  it('step_label_inherits_host_path_color：<Path color="crimson"> + label 无 textColor → fill=crimson', () => {
    expect(labelOf(pathWithLabel({ color: 'crimson' }, {}))?.fill).toBe('crimson');
  });
});

// ===========================================================================
// 边界
// ===========================================================================

describe('边界: 回退链 / 不跟 stroke', () => {
  it('step_label_no_text_color_falls_to_current_color：无 textColor + path 无 color → currentColor（零破坏）', () => {
    expect(labelOf(pathWithLabel({}, {}))?.fill).toBe('currentColor');
  });

  it('step_label_stroke_only_does_not_follow：<Path stroke="crimson">（只 stroke）→ label currentColor（不跟 stroke）', () => {
    expect(labelOf(pathWithLabel({ stroke: 'crimson' }, {}))?.fill).toBe('currentColor');
  });

  it('step_label_font_partial_fallback：font.size=10 无 family → size=10、family 走 renderer 默认（undefined）', () => {
    const t = labelOf(pathWithLabel({}, { font: { size: 10 } }));
    expect(t?.fontSize).toBe(10);
    expect(t?.fontFamily).toBeUndefined();
  });

  it('step_label_opacity_omitted：无 opacity + path 无 opacity → 不设（undefined）', () => {
    expect(labelOf(pathWithLabel({}, {}))?.opacity).toBeUndefined();
  });
});

// ===========================================================================
// 交互
// ===========================================================================

describe('交互: labelDefault / 相乘 / 零破坏', () => {
  it('step_label_explicit_beats_label_default：scope labelDefault textColor=gray + label textColor=red → red', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          labelDefault: { textColor: 'gray' },
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [80, 0], label: { text: 'x', textColor: 'red' } },
              ],
            },
          ],
        },
      ],
    };
    expect(labelOf(ir)?.fill).toBe('red');
  });

  it('step_label_default_beats_host_color：labelDefault textColor=gray + <Path color="crimson"> 无 label textColor → gray', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          labelDefault: { textColor: 'gray' },
          children: [
            {
              type: 'path',
              color: 'crimson',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [80, 0], label: { text: 'x' } },
              ],
            },
          ],
        },
      ],
    };
    expect(labelOf(ir)?.fill).toBe('gray');
  });

  it('step_label_font_inherits_label_default：labelDefault font.size=10 + label 无 font → fontSize=10', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          labelDefault: { font: { size: 10 } },
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [80, 0], label: { text: 'x' } },
              ],
            },
          ],
        },
      ],
    };
    expect(labelOf(ir)?.fontSize).toBe(10);
  });

  it('step_label_opacity_multiplies_with_path：path opacity 0.5 + label opacity 0.5 → 0.25', () => {
    expect(labelOf(pathWithLabel({ opacity: 0.5 }, { opacity: 0.5 }))?.opacity).toBe(0.25);
  });

  it('step_label_zero_break：既有无样式 label → currentColor + 默认字号 14（快照不变）', () => {
    const t = labelOf(pathWithLabel({}, {}));
    expect(t?.fill).toBe('currentColor');
    expect(t?.fontSize).toBe(14);
  });
});
