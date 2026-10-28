import { describe, expect, it } from 'vitest';

import { compileToScene } from '../../src/compile/compile';
import type { ScenePrimitive, TextPrimitive } from '../../src/contract';
import type { IRScene } from '../../src/schemas';

const flatten = (prims: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];

  for (const p of prims) {
    out.push(p);
    if (p.type === 'group') out.push(...flatten(p.children));
  }

  return out;
};

/** 取首个 step label TextPrimitive（拍平 group，找 text） */
const labelOf = (ir: IRScene): TextPrimitive | undefined =>
  flatten(compileToScene(ir).scene.primitives).find((p): p is TextPrimitive => p.type === 'text');

/** 构造单 line 段 path（可选 path 级字段 + label 字段） */
const pathWithLabel = (pathProps: Record<string, unknown>, label: Record<string, unknown>): IRScene => ({
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
  it('单行文本对象的字体、颜色与透明度覆盖参与测量和输出', () => {
    const scene = compileToScene(
      pathWithLabel(
        { style: { opacity: 0.5 } },
        {
          font: { size: 12 },
          opacity: 0.5,
          text: [{ text: 'A', font: { size: 24, weight: 'bold' }, fill: 'red', opacity: 0.4 }],
        },
      ),
      { measureText: (_text, font) => ({ width: font.size * 2, height: font.size }) },
    ).scene;
    const label = flatten(scene.primitives).find(primitive => primitive.type === 'text');
    expect(label).toMatchObject({ fontSize: 24, fontWeight: 'bold', fill: 'red', measuredWidth: 48 });
    expect(label?.opacity).toBeCloseTo(0.1);
  });

  it('步骤标签将 textColor=red 应用为 TextPrimitive.fill=red', () => {
    expect(labelOf(pathWithLabel({}, { textColor: 'red' }))?.fill).toBe('red');
  });

  it('步骤标签将 font.size=10 应用为 fontSize=10', () => {
    expect(labelOf(pathWithLabel({}, { font: { size: 10 } }))?.fontSize).toBe(10);
  });

  it('步骤标签保留 opacity=0.6', () => {
    expect(labelOf(pathWithLabel({}, { opacity: 0.6 }))?.opacity).toBe(0.6);
  });

  it('step_label_inherits_host_path_color：<Path color="crimson"> + label 无 textColor → fill=crimson', () => {
    expect(
      labelOf(
        pathWithLabel(
          {
            style: { color: 'crimson' },
          },
          {},
        ),
      )?.fill,
    ).toBe('crimson');
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
    expect(
      labelOf(
        pathWithLabel(
          {
            style: { stroke: 'crimson' },
          },
          {},
        ),
      )?.fill,
    ).toBe('currentColor');
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
  it('步骤标签的显式红色优先于 Scope labelDefault 的灰色', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [80, 0], label: { text: 'x', textColor: 'red' } },
              ],
            },
          ],
          defaults: { node: { label: { textColor: 'gray' } }, path: { label: { textColor: 'gray' } } },
        },
      ],
    };

    expect(labelOf(ir)?.fill).toBe('red');
  });

  it('step_label_default_beats_host_color：labelDefault textColor=gray + <Path color="crimson"> 无 label textColor → gray', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [80, 0], label: { text: 'x' } },
              ],
              style: { color: 'crimson' },
            },
          ],
          defaults: { node: { label: { textColor: 'gray' } }, path: { label: { textColor: 'gray' } } },
        },
      ],
    };

    expect(labelOf(ir)?.fill).toBe('gray');
  });

  it('step_label_font_inherits_label_default：labelDefault font.size=10 + label 无 font → fontSize=10', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [80, 0], label: { text: 'x' } },
              ],
            },
          ],
          defaults: { node: { label: { font: { size: 10 } } }, path: { label: { font: { size: 10 } } } },
        },
      ],
    };

    expect(labelOf(ir)?.fontSize).toBe(10);
  });

  it('步骤标签不透明度与路径相乘：0.5 × 0.5 = 0.25', () => {
    expect(
      labelOf(
        pathWithLabel(
          {
            style: { opacity: 0.5 },
          },
          { opacity: 0.5 },
        ),
      )?.opacity,
    ).toBe(0.25);
  });

  it('step_label_zero_break：既有无样式 label → currentColor + 默认字号 16', () => {
    const t = labelOf(pathWithLabel({}, {}));

    expect(t?.fill).toBe('currentColor');
    expect(t?.fontSize).toBe(16);
  });
});
