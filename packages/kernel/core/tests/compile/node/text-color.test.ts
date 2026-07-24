import { describe, expect, it } from 'vitest';

import type { CompileWarning } from '../../../src/compile/warning';
import type { TextPrim } from '../../../src/contract';
import type { IRScene } from '../../../src/schemas';

import { compileToScene } from '../../../src/compile/compile';
import { chooseBlackOrWhiteForLuminance } from '../../../src/compile/node/text-color';
import { flattenPrims } from '../../helpers/flatten';

const AUTO_CONTRAST = 'contrast' as const;

const sceneOf = (node: Record<string, unknown>): IRScene =>
  ({
    version: 1,
    type: 'scene',
    children: [{ type: 'node', position: [0, 0], text: 'Status', ...node }],
  }) as unknown as IRScene;

const textPrimitives = (ir: IRScene, warnings: Array<CompileWarning> = []): Array<TextPrim> =>
  flattenPrims(compileToScene(ir, { onWarn: warning => warnings.push(warning) }).primitives).filter(
    (primitive): primitive is TextPrim => primitive.type === 'text',
  );

const resolvedTextColor = (
  fill: unknown,
  node: Record<string, unknown> = {},
): { fill: TextPrim['fill'] | undefined; warnings: Array<CompileWarning> } => {
  const warnings: Array<CompileWarning> = [];
  const [text] = textPrimitives(
    sceneOf({
      fill,
      textColor: AUTO_CONTRAST,
      ...node,
    }),
    warnings,
  );
  return { fill: text.fill, warnings };
};

describe('Node auto-contrast static opaque color parsing', () => {
  it.each([
    ['white', '#000000'],
    ['WHITE', '#000000'],
    ['#fff', '#000000'],
    ['#ffffffff', '#000000'],
    ['rgb(255, 255, 255)', '#000000'],
    ['rgb(100% 100% 100% / 100%)', '#000000'],
    ['hsl(0 0% 100%)', '#000000'],
    ['HSL(0deg, 0%, 100%)', '#000000'],
    ['black', '#ffffff'],
    ['rebeccapurple', '#ffffff'],
    ['rgb(+2.55e2 0 0)', '#000000'],
    ['hsl(0.5turn 100% 50%)', '#000000'],
    ['hsl(3.141592653589793rad 100% 50%)', '#000000'],
  ])('把 %s 解析为稳定的 %s 前景', (fill, expected) => {
    const result = resolvedTextColor(fill);
    expect(result.fill).toBe(expected);
    expect(result.warnings).toHaveLength(0);
  });

  it.each([
    '#fffff',
    'unknown-color',
    'rgb(1, 2, 3 / .5)',
    'rgb(1 2% 3)',
    'rgb(none 0 0)',
    'rgb(NaN 0 0)',
    'hsl(0 50 50%)',
    'hsl(0, 50%, 50% / .5)',
    'rgba(1 2 3 / .5)',
    'hsla(0 50% 50% / .5)',
    'color(display-p3 1 0 0)',
    'constructor',
  ])('拒绝不在静态支持集内的 %s 并使用固定 fallback', fill => {
    const result = resolvedTextColor(fill);
    expect(result.fill).toBe('currentColor');
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.code).toBe('TEXT_AUTO_CONTRAST_UNRESOLVED');
  });
});

describe('Node auto-contrast opacity boundary and contrast', () => {
  it('未 round 的黑白对比率相等时选择黑色', () => {
    expect(chooseBlackOrWhiteForLuminance(0.179128784747792)).toBe('#000000');
  });

  it.each([
    ['#0008', {}],
    ['rgb(0 0 0 / 50%)', {}],
    ['#ffffff', { fillOpacity: 0.5 }],
    ['transparent', {}],
    ['none', {}],
    [undefined, {}],
  ])('透明或缺省背景 %s 使用固定 fallback 并 warning', (fill, node) => {
    const result = resolvedTextColor(fill, node);
    expect(result.fill).toBe('currentColor');
    expect(result.warnings).toHaveLength(1);
  });

  it('node opacity 不参与背景选择', () => {
    expect(resolvedTextColor('#ffffff', { opacity: 0 }).fill).toBe('#000000');
  });
});

describe('Node auto-contrast consumers and warnings', () => {
  it('不可解析 fill 使用 currentColor，并按当前 Node locator 只 warning 一次', () => {
    const warnings: Array<CompileWarning> = [];
    const ir = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'node',
          position: [0, 0],
          fill: {
            kind: 'linearGradient',
            stops: [
              { offset: 0, color: '#000000' },
              { offset: 1, color: '#ffffff' },
            ],
          },
          textColor: AUTO_CONTRAST,
          text: [{ runs: [{ text: 'body' }, { text: 'mixed body' }] }],
          label: [{ text: 'label' }, { text: { runs: [{ text: 'mixed' }] } }],
        },
      ],
    } as unknown as IRScene;

    const texts = textPrimitives(ir, warnings);
    expect(texts.map(text => text.fill)).toContain('currentColor');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({
      code: 'TEXT_AUTO_CONTRAST_UNRESOLVED',
      path: 'children[0].node',
    });
    expect(warnings[0]?.message).toContain('linearGradient');
    expect(warnings[0]?.message).toContain('currentColor');
  });

  it('无正文与 label 时不解析关键字、不发 warning', () => {
    const warnings: Array<CompileWarning> = [];
    textPrimitives(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            position: [0, 0],
            fill: 'var(--surface)',
            textColor: AUTO_CONTRAST,
          },
        ],
      },
      warnings,
    );
    expect(warnings).toHaveLength(0);
  });

  it('正文、label 与 pin 全部显式着色时不解析关键字', () => {
    const warnings: Array<CompileWarning> = [];
    const texts = textPrimitives(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'node',
            position: [0, 0],
            fill: 'var(--surface)',
            textColor: AUTO_CONTRAST,
            text: [{ text: 'body', fill: 'red' }],
            label: {
              text: { runs: [{ text: 'label', fill: 'blue' }] },
              textColor: 'green',
              pin: { stroke: 'purple' },
            },
          },
        ],
      },
      warnings,
    );
    expect(texts.some(text => text.lines.some(line => line.fill === 'red'))).toBe(true);
    expect(warnings).toHaveLength(0);
  });

  it('未显式 stroke 的 pin 继承 Node 自动色并触发解析', () => {
    const ir = sceneOf({
      fill: '#000000',
      text: [{ text: 'body', fill: 'red' }],
      textColor: AUTO_CONTRAST,
      label: {
        text: { runs: [{ text: 'label', fill: 'blue' }] },
        pin: true,
      },
    });
    const paths = flattenPrims(compileToScene(ir).primitives).filter(primitive => primitive.type === 'path');
    expect(paths.some(path => path.stroke === '#ffffff')).toBe(true);
  });
});

describe('Node auto-contrast cascade and precedence', () => {
  it('nodeDefault 关键字在级联后按每个 Node 的 effective fill 独立解析', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          nodeDefault: { textColor: AUTO_CONTRAST },
          children: [
            { type: 'node', position: [0, 0], text: 'light', fill: '#ffffff' },
            { type: 'node', position: [80, 0], text: 'dark', fill: '#000000' },
          ],
        },
      ],
    };
    expect(textPrimitives(ir).map(text => text.fill)).toEqual(['#000000', '#ffffff']);
  });

  it('label 与 run 显式颜色优先于 resolved Node 自动色', () => {
    const ir = sceneOf({
      fill: '#000000',
      textColor: AUTO_CONTRAST,
      text: [{ runs: [{ text: 'inherited' }, { text: 'explicit', fill: 'red' }] }],
      label: [{ text: 'node-color' }, { text: 'label-color', textColor: 'blue' }],
    });
    const fills = flattenPrims(compileToScene(ir).primitives)
      .filter(primitive => primitive.type === 'text' || primitive.type === 'path')
      .map(primitive => primitive.fill);
    expect(fills).toContain('#ffffff');
    expect(fills).toContain('red');
    expect(fills).toContain('blue');
  });

  it('labelDefault.textColor 与 labelDefault.color 优先于 resolved Node 色', () => {
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'scope',
          labelDefault: { textColor: 'orange', color: 'green' },
          children: [
            {
              type: 'node',
              position: [0, 0],
              fill: '#000000',
              textColor: AUTO_CONTRAST,
              text: 'body',
              label: { text: 'label' },
            },
          ],
        },
      ],
    };
    expect(textPrimitives(ir).map(text => text.fill)).toEqual(['#ffffff', 'orange']);
  });
});
