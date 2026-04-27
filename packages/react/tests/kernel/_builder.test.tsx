import { describe, expect, it } from 'vitest';
import { Draw } from '../../src/sugar/Draw';
import { Node } from '../../src/kernel/Node';
import { Path } from '../../src/kernel/Path';
import { Step } from '../../src/kernel/Step';
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
