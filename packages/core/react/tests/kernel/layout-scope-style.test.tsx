/**
 * <Layout> 顶层级联样式 props 测试（隐式根 Scope）
 * @description Layout 设级联样式 props（color / stroke / nodeDefault / pathDefault / labelDefault / ...）时把
 *   children 包进合成根 `<Scope>`，编译产物 = 用户手写一层根 `<Scope>` 的同一 IR。覆盖：
 *   - happy：node / path / label 各通道继承 + 主色级联
 *   - 边界：无样式 prop 时 IR 形态逐字节不变（不包空 scope）/ 空 children / 单通道只进该通道
 *   - 错误路径：与 `ir` prop 并用 → dev warn + 样式忽略 / 非法 nodeDefault 不被 Layout 吞掉、走 schema 校验报错
 *   - 交互：内层 `<Scope>` 覆盖 / 图元显式属性胜出 / 内层 `<Scope resetStyle>` 屏障切断继承
 *   断言层：wrapRootScope（Layout 实际调用的合成函数）+ buildIR 出 IR 形态；compileToScene 出已解析 primitive 样式
 */
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileToScene } from '@retikz/core';
import { SceneSchema } from '@retikz/core';
import type { IR } from '@retikz/core';
import type {
  EllipsePrim,
  PathPrim,
  RectPrim,
  ScenePrimitive,
  TextPrim,
} from '@retikz/core';
import { Draw, EdgeLabel, Layout, Node, Scope, Step } from '../../src';
import { Path } from '../../src/kernel/Path';
import { buildIR, wrapRootScope } from '../../src/kernel/builder';
import type { ScopeStyleProps } from '../../src/kernel/_fields';

// --- helpers ---------------------------------------------------------------

/** 递归展开 GroupPrim，把所有叶子 primitive 拍平（合成 scope 的子元素都在 GroupPrim 内） */
const flatten = (prims: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const out: Array<ScenePrimitive> = [];
  for (const p of prims) {
    out.push(p);
    if (p.type === 'group') out.push(...flatten(p.children));
  }
  return out;
};

/** 复刻 Layout 的 IR 构造：wrapRootScope（按需包合成根 Scope）→ buildIR */
const layoutIR = (style: ScopeStyleProps, children: ReactNode): IR =>
  buildIR(wrapRootScope(children, style));

/** Layout 流水线编译后的全部叶子 primitive */
const layoutPrims = (style: ScopeStyleProps, children: ReactNode): Array<ScenePrimitive> =>
  flatten(compileToScene(layoutIR(style, children)).primitives);

const rectOf = (prims: Array<ScenePrimitive>): RectPrim | undefined =>
  prims.find((p): p is RectPrim => p.type === 'rect');
const ellipseOf = (prims: Array<ScenePrimitive>): EllipsePrim | undefined =>
  prims.find((p): p is EllipsePrim => p.type === 'ellipse');
const linePathOf = (prims: Array<ScenePrimitive>): PathPrim | undefined =>
  prims.find(
    (p): p is PathPrim => p.type === 'path' && !p.commands.some(c => c.kind === 'close'),
  );
const textWith = (prims: Array<ScenePrimitive>, content: string): TextPrim | undefined =>
  prims.find((p): p is TextPrim => p.type === 'text' && p.lines[0]?.text === content);

/** 两端点 + 一条 Draw，供 path / 边 label 级联测试复用 */
const twoNodesAndDraw = (drawProps: Record<string, unknown> = {}): ReactNode => (
  <>
    <Node id="a" position={[0, 0]}>a</Node>
    <Node id="b" position={[80, 0]}>b</Node>
    <Draw way={['a', 'b']} {...drawProps} />
  </>
);

afterEach(() => {
  vi.restoreAllMocks();
});

// ===========================================================================
// Happy path（≥ 3）
// ===========================================================================

describe('Happy：Layout 级联样式 → 子图元继承', () => {
  it('layout_nodedefault_inherits：nodeDefault={{fill, stroke:none}} → 子 Node 未单设时继承', () => {
    const prims = layoutPrims(
      { nodeDefault: { fill: 'lightblue', stroke: 'none' } },
      <Node id="A" position={[0, 0]}>A</Node>,
    );
    const rect = rectOf(prims);
    expect(rect?.fill).toBe('lightblue');
    expect(rect?.stroke).toBe('none');
  });

  it('layout_pathdefault_inherits：pathDefault={{strokeWidth:5, lineCap:round}} → 子 Draw 继承', () => {
    const prims = layoutPrims(
      { pathDefault: { strokeWidth: 5, lineCap: 'round' } },
      twoNodesAndDraw(),
    );
    const path = linePathOf(prims);
    expect(path?.strokeWidth).toBe(5);
    expect(path?.strokeLinecap).toBe('round');
  });

  it('layout_color_cascades：color="blue" → node 边/填充 + path stroke 全蓝', () => {
    const prims = layoutPrims({ color: 'blue' }, twoNodesAndDraw());
    const rect = rectOf(prims);
    expect(rect?.stroke).toBe('blue');
    expect(rect?.fill).toBe('blue');
    expect(linePathOf(prims)?.stroke).toBe('blue');
    // 端到端：真实 <Layout> 组件渲染也应把主色透出到 SVG
    const svg = renderToStaticMarkup(
      <Layout color="blue">
        <Node id="A" position={[0, 0]}>A</Node>
      </Layout>,
    );
    expect(svg).toContain('blue');
  });

  it('layout_labeldefault_inherits：labelDefault={{textColor:green}} → 边 label 文字继承', () => {
    const prims = layoutPrims(
      { labelDefault: { textColor: 'green' } },
      <>
        <Node id="a" position={[0, 0]}>a</Node>
        <Node id="b" position={[80, 0]}>b</Node>
        <Path>
          <Step kind="move" to="a" />
          <Step kind="line" to="b">
            <EdgeLabel>e</EdgeLabel>
          </Step>
        </Path>
      </>,
    );
    expect(textWith(prims, 'e')?.fill).toBe('green');
  });
});

// ===========================================================================
// 边界（≥ 2）
// ===========================================================================

describe('边界：无样式 / 空 children / 单通道', () => {
  it('layout_no_style_prop_ir_unchanged：不带样式 prop → IR 与 buildIR(children) 逐字段一致（不包空 scope）', () => {
    const children = (
      <>
        <Node id="A" position={[0, 0]}>A</Node>
        <Node id="B" position={[80, 0]}>B</Node>
      </>
    );
    const wrapped = layoutIR({}, children);
    const plain = buildIR(children);
    expect(wrapped).toEqual(plain);
    // 顶层不应出现合成 scope
    expect(wrapped.children.every(c => c.type !== 'scope')).toBe(true);
  });

  it('layout_style_prop_empty_children：带样式 prop 但 children 为空 → 合成空 scope 合法、不报错', () => {
    const ir = layoutIR({ stroke: 'red' }, undefined);
    const scope = ir.children[0];
    expect(scope).toMatchObject({ type: 'scope', stroke: 'red', children: [] });
    expect(() => compileToScene(ir)).not.toThrow();
  });

  it('layout_empty_object_default_no_wrap：空对象 default（nodeDefault={{}}）不携带样式指令 → 不包合成 scope', () => {
    const children = <Node id="A" position={[0, 0]}>A</Node>;
    // 空对象 default 是 no-op，不应无谓包一层空 scope 改变 IR 拓扑（ADR：避免无谓的空 scope）
    const emptyDefaults = layoutIR(
      { nodeDefault: {}, pathDefault: {}, labelDefault: {}, arrowDefault: {} },
      children,
    );
    expect(emptyDefaults).toEqual(buildIR(children));
    expect(emptyDefaults.children.every(c => c.type !== 'scope')).toBe(true);
    // 但标量 falsy-defined 值（strokeWidth=0）是有意义样式 → 仍包 scope
    const zeroWidth = layoutIR({ strokeWidth: 0 }, children);
    expect(zeroWidth.children[0]).toMatchObject({ type: 'scope', strokeWidth: 0 });
  });

  it('layout_single_style_channel：只设 stroke → 合成 scope 只进 stroke 通道，其余不出现', () => {
    const ir = layoutIR({ stroke: 'red' }, <Node id="A" position={[0, 0]}>A</Node>);
    const scope = ir.children[0];
    expect(scope).toMatchObject({ type: 'scope', stroke: 'red' });
    expect(scope).not.toHaveProperty('color');
    expect(scope).not.toHaveProperty('fill');
    expect(scope).not.toHaveProperty('nodeDefault');
    expect(scope).not.toHaveProperty('pathDefault');
  });
});

// ===========================================================================
// 错误路径（≥ 2）
// ===========================================================================

describe('错误路径：ir + 样式并用 / 非法 nodeDefault', () => {
  it('layout_ir_prop_with_style_warns：同时传 ir + 样式 prop → dev warn + 样式被忽略', () => {
    const ir: IR = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'A', position: [0, 0], text: 'A' }],
    };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const withStyle = renderToStaticMarkup(<Layout ir={ir} stroke="red" nodeDefault={{ fill: 'lime' }} />);
    const plain = renderToStaticMarkup(<Layout ir={ir} />);
    // 样式被忽略：与不传样式的渲染逐字符一致
    expect(withStyle).toBe(plain);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain('<Layout>');
  });

  it('layout_invalid_nodedefault_rejected：非法 nodeDefault 不被 Layout 吞掉、走 schema 校验报错', () => {
    // fill 期望 string | PaintSpec，给 number 是非法结构（模拟无类型 JS 调用方 / LLM 生成）
    const badIr = layoutIR(
      { nodeDefault: { fill: 42 } as never },
      <Node id="A" position={[0, 0]}>A</Node>,
    );
    // Layout / buildIR 原样透传，不在自己这层 sanitize
    expect(badIr.children[0]).toMatchObject({ type: 'scope', nodeDefault: { fill: 42 } });
    // 既有 IRScope schema 校验路径拒掉
    expect(SceneSchema.safeParse(badIr).success).toBe(false);
    // 对照：合法 fill 同路径通过
    const okIr = layoutIR(
      { nodeDefault: { fill: 'lightblue' } },
      <Node id="A" position={[0, 0]}>A</Node>,
    );
    expect(SceneSchema.safeParse(okIr).success).toBe(true);
  });
});

// ===========================================================================
// 交互（≥ 2）
// ===========================================================================

describe('交互：内层 Scope 覆盖 / 显式属性胜出 / resetStyle 屏障', () => {
  it('layout_style_overridden_by_inner_scope：内层 Scope pathDefault 覆盖 Layout pathDefault', () => {
    const prims = layoutPrims(
      { pathDefault: { strokeWidth: 5 } },
      <Scope pathDefault={{ strokeWidth: 2 }}>{twoNodesAndDraw()}</Scope>,
    );
    expect(linePathOf(prims)?.strokeWidth).toBe(2);
  });

  it('layout_style_overridden_by_node_prop：Node 显式 stroke 胜过 Layout nodeDefault', () => {
    const prims = layoutPrims(
      { nodeDefault: { stroke: 'none' } },
      <Node id="A" position={[0, 0]} stroke="red">A</Node>,
    );
    const shape = rectOf(prims) ?? ellipseOf(prims);
    expect(shape?.stroke).toBe('red');
  });

  it('layout_color_with_inner_resetstyle：内层 Scope resetStyle 切断 Layout color 继承', () => {
    const prims = layoutPrims(
      { color: 'red' },
      <Scope resetStyle>
        <Node id="A" position={[0, 0]}>A</Node>
      </Scope>,
    );
    const rect = rectOf(prims);
    // 屏障切断：内层 node 不染成 red
    expect(rect?.stroke).not.toBe('red');
    expect(rect?.fill).not.toBe('red');
  });
});

// ===========================================================================
// 等价性：Layout 样式 props === 用户手写根 <Scope>
// ===========================================================================

describe('等价性：合成根 scope 与手写根 <Scope> 同 IR', () => {
  it('layout_synthetic_scope_equals_manual：<Layout stroke nodeDefault> 与 <Scope stroke nodeDefault> 包同 children → 同一 scene.children', () => {
    const children = (
      <>
        <Node id="A" position={[0, 0]}>A</Node>
        <Node id="B" position={[80, 0]}>B</Node>
      </>
    );
    const synthetic = layoutIR({ stroke: 'currentColor', nodeDefault: { fill: 'none' } }, children);
    const manual = buildIR(
      <Scope stroke="currentColor" nodeDefault={{ fill: 'none' }}>
        {children}
      </Scope>,
    );
    expect(synthetic).toEqual(manual);
  });
});
