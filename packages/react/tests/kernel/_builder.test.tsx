import { describe, expect, it } from 'vitest';
import { Draw } from '../../src/sugar/Draw';
import { Node } from '../../src/kernel/Node';
import { Path } from '../../src/kernel/Path';
import { Step } from '../../src/kernel/Step';
import { Text } from '../../src/kernel/Text';
import { buildIR } from '../../src/kernel/_builder';

describe('buildIR', () => {
  it('单个 <Node> → IR scene', () => {
    const ir = buildIR(
      <Node id="A" position={[10, 10]}>
        Hi
      </Node>,
    );
    expect(ir.type).toBe('scene');
    expect(ir.children).toEqual([expect.objectContaining({ type: 'node', id: 'A', text: 'Hi' })]);
  });

  it("children 字符串带 '\\n' 自动拆成多行数组", () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]}>{'Line 1\nLine 2'}</Node>,
    );
    expect(ir.children[0]).toMatchObject({ type: 'node', text: ['Line 1', 'Line 2'] });
  });

  it('children 直接传字符串数组同样产出多行', () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]}>{['L1', 'L2', 'L3']}</Node>,
    );
    expect(ir.children[0]).toMatchObject({ type: 'node', text: ['L1', 'L2', 'L3'] });
  });

  it('text prop 优先于 children（同时给两边时取 text）', () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]} text={['from', 'prop']}>
        from-children
      </Node>,
    );
    expect(ir.children[0]).toMatchObject({ type: 'node', text: ['from', 'prop'] });
  });

  it('children 单字符串无换行 → 单行 string（不是 string[]）', () => {
    const ir = buildIR(<Node id="A" position={[0, 0]}>Hello world</Node>);
    expect(ir.children[0]).toMatchObject({ type: 'node', text: 'Hello world' });
  });

  it('<Text> children 带样式 → 对象 LineSpec', () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]}>
        <Text fill="red" font={{ weight: 'bold' }}>Heading</Text>
        body line
      </Node>,
    );
    expect(ir.children[0]).toMatchObject({
      type: 'node',
      text: [
        { text: 'Heading', fill: 'red', font: { weight: 'bold' } },
        'body line',
      ],
    });
  });

  it('<Text> 无样式属性时退回纯字符串 LineSpec（不浪费 IR 字段）', () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]}>
        <Text>plain</Text>
      </Node>,
    );
    expect(ir.children[0]).toMatchObject({ type: 'node', text: 'plain' });
  });

  it('<Text> 与字符串行混排时按 JSX 顺序排列', () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]}>
        {'before\nmiddle1'}
        <Text fill="red">red</Text>
        {'middle2\nafter'}
      </Node>,
    );
    expect(ir.children[0]).toMatchObject({
      type: 'node',
      text: ['before', 'middle1', { text: 'red', fill: 'red' }, 'middle2', 'after'],
    });
  });

  it('<Path><Step/><Step/></Path> 收集 step 序列', () => {
    const ir = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step to={[100, 100]} />
      </Path>,
    );
    expect(ir.children).toHaveLength(1);
    expect(ir.children[0]).toMatchObject({
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: 'A' },
        { type: 'step', kind: 'line', to: [100, 100] },
      ],
    });
  });

  it('<Draw> 与等价 <Path><Step/></Path> 产出相同 IR（Sugar = Kernel 等价性）', () => {
    const fromSugar = buildIR(<Draw way={['A', 'B']} stroke="red" />);
    const fromKernel = buildIR(
      <Path stroke="red">
        <Step kind="move" to="A" />
        <Step to="B" />
      </Path>,
    );
    expect(fromSugar).toEqual(fromKernel);
  });
});
