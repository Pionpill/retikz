import { Fragment } from 'react';
import { describe, expect, it } from 'vitest';
import { Coordinate } from '../../src/kernel/Coordinate';
import { Draw } from '../../src/sugar/Draw';
import { EdgeLabel } from '../../src/sugar/EdgeLabel';
import { Node } from '../../src/kernel/Node';
import { Path } from '../../src/kernel/Path';
import { Scope } from '../../src/kernel/Scope';
import { Step } from '../../src/kernel/Step';
import { Text } from '../../src/kernel/Text';
import { buildIR } from '../../src/kernel/builder';

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

  it('children 字符串数组按相邻 inline 拼成一行（对齐 React）', () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]}>{['L1', 'L2', 'L3']}</Node>,
    );
    expect(ir.children[0]).toMatchObject({ type: 'node', text: 'L1L2L3' });
  });

  it("children 数组带 '\\n' 元素时拆成多行", () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]}>{['L1\n', 'L2\n', 'L3']}</Node>,
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

  it('number 子节点当文本，与相邻字符串拼成一行', () => {
    const ir = buildIR(<Node id="A" position={[0, 0]}>计数：{0}</Node>);
    expect(ir.children[0]).toMatchObject({ type: 'node', text: '计数：0' });
  });

  it('非零 number 子节点拼接', () => {
    const ir = buildIR(<Node id="A" position={[0, 0]}>计数：{5}</Node>);
    expect(ir.children[0]).toMatchObject({ type: 'node', text: '计数：5' });
  });

  it('纯 number 子节点 → 单行字符串', () => {
    const ir = buildIR(<Node id="A" position={[0, 0]}>{42}</Node>);
    expect(ir.children[0]).toMatchObject({ type: 'node', text: '42' });
  });

  it('相邻 inline（字符串 + number 交替）全拼成一行', () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]}>a{1}b{2}</Node>,
    );
    expect(ir.children[0]).toMatchObject({ type: 'node', text: 'a1b2' });
  });

  it("inline number 拼接，'\\n' 仍分行", () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]}>第一行{1}{'\n'}第二行{2}</Node>,
    );
    expect(ir.children[0]).toMatchObject({ type: 'node', text: ['第一行1', '第二行2'] });
  });

  it('<Text>{n}</Text> 的 number children 当文本', () => {
    const ir = buildIR(
      <Node id="A" position={[0, 0]}>
        <Text fill="red">{7}</Text>
      </Node>,
    );
    expect(ir.children[0]).toMatchObject({
      type: 'node',
      text: [{ text: '7', fill: 'red' }],
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
        { type: 'step', kind: 'move', to: { id: 'A' } },
        { type: 'step', kind: 'line', to: [100, 100] },
      ],
    });
  });

  it('<Path> 仅一个自包含 rectangle step（无 move）→ 不抛错，保留 rectangle（不被 move 替换）', () => {
    const ir = buildIR(
      <Path>
        <Step kind="rectangle" from={[0, 0]} to={[10, 6]} />
      </Path>,
    );
    expect(ir.children[0]).toMatchObject({
      type: 'path',
      children: [{ type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6] }],
    });
  });

  it('<Path> 仅一个非自包含 step（单 line）→ 仍抛 "requires at least 2"', () => {
    expect(() =>
      buildIR(
        <Path>
          <Step to="A" />
        </Path>,
      ),
    ).toThrow(/requires at least 2/);
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

  it('<Draw way={[..., { curve }, ...]}> 等价于 Kernel curve step', () => {
    const fromSugar = buildIR(<Draw way={['A', { curve: [5, 8] }, 'B']} />);
    const fromKernel = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step kind="curve" to="B" control={[5, 8]} />
      </Path>,
    );
    expect(fromSugar).toEqual(fromKernel);
  });

  it('<Draw way={[..., { cubic }, ...]}> 等价于 Kernel cubic step', () => {
    const fromSugar = buildIR(
      <Draw way={['A', { cubic: [[3, 5], [7, 5]] }, 'B']} />,
    );
    const fromKernel = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step kind="cubic" to="B" control1={[3, 5]} control2={[7, 5]} />
      </Path>,
    );
    expect(fromSugar).toEqual(fromKernel);
  });

  it('<Draw way={[..., { bend }, ...]}> 等价于 Kernel bend step（含 / 不含 angle 两种）', () => {
    const sugarNoAngle = buildIR(<Draw way={['A', { bend: 'left' }, 'B']} />);
    const kernelNoAngle = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step kind="bend" to="B" bendDirection="left" />
      </Path>,
    );
    expect(sugarNoAngle).toEqual(kernelNoAngle);

    const sugarWithAngle = buildIR(
      <Draw way={['A', { bend: 'right', angle: 60 }, 'B']} />,
    );
    const kernelWithAngle = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step kind="bend" to="B" bendDirection="right" bendAngle={60} />
      </Path>,
    );
    expect(sugarWithAngle).toEqual(kernelWithAngle);
  });

  it('<Draw way={[..., { arc }, ...]}> 等价于 Kernel arc step', () => {
    const fromSugar = buildIR(
      <Draw
        way={['A', { arc: { startAngle: 0, endAngle: 90, radius: 10 } }]}
      />,
    );
    const fromKernel = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step kind="arc" startAngle={0} endAngle={90} radius={10} />
      </Path>,
    );
    expect(fromSugar).toEqual(fromKernel);
  });

  it('<Draw way={[..., { circle }, ...]}> 等价于 Kernel circlePath step', () => {
    const fromSugar = buildIR(<Draw way={['A', { circle: { radius: 5 } }]} />);
    const fromKernel = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step kind="circlePath" radius={5} />
      </Path>,
    );
    expect(fromSugar).toEqual(fromKernel);
  });

  it('<Draw way={[..., { ellipse }, ...]}> 等价于 Kernel ellipsePath step', () => {
    const fromSugar = buildIR(
      <Draw way={['A', { ellipse: { radiusX: 8, radiusY: 4 } }]} />,
    );
    const fromKernel = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step kind="ellipsePath" radiusX={8} radiusY={4} />
      </Path>,
    );
    expect(fromSugar).toEqual(fromKernel);
  });

  it('<Step to="+1,0" /> sugar 字符串解析为 { relative: [1, 0] }', () => {
    const ir = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step to="+1,0" />
      </Path>,
    );
    expect(ir.children[0]).toMatchObject({
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'A' } },
        { type: 'step', kind: 'line', to: { relative: [1, 0] } },
      ],
    });
  });

  it('<Step to="++2,3" kind="curve" control={...} /> sugar 字符串走 relativeAccumulate', () => {
    const ir = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step kind="curve" to="++2,3" control={[1, 1]} />
      </Path>,
    );
    expect(ir.children[0]).toMatchObject({
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'A' } },
        {
          type: 'step',
          kind: 'curve',
          to: { relativeAccumulate: [2, 3] },
          control: [1, 1],
        },
      ],
    });
  });

  it('<Draw way={[..., "+5,0"]}> 与 <Path><Step to="+5,0" /></Path> 等价', () => {
    const fromSugar = buildIR(<Draw way={['A', '+5,0']} />);
    const fromKernel = buildIR(
      <Path>
        <Step kind="move" to="A" />
        <Step to="+5,0" />
      </Path>,
    );
    expect(fromSugar).toEqual(fromKernel);
  });

  describe('Step label prop 与 <EdgeLabel> child', () => {
    it('Step label prop 透传到 IR step.label', () => {
      const ir = buildIR(
        <Path>
          <Step kind="move" to="A" />
          <Step to="B" label={{ text: 'accept', side: 'above' }} />
        </Path>,
      );
      expect(ir.children[0]).toMatchObject({
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'A' } },
          {
            type: 'step',
            kind: 'line',
            to: { id: 'B' },
            label: { text: 'accept', side: 'above' },
          },
        ],
      });
    });

    it('<EdgeLabel> child 与 prop 形态产出相同 IR', () => {
      const fromProp = buildIR(
        <Path>
          <Step kind="move" to="A" />
          <Step to="B" label={{ text: 'x', position: 'near-end', side: 'below' }} />
        </Path>,
      );
      const fromChild = buildIR(
        <Path>
          <Step kind="move" to="A" />
          <Step to="B">
            <EdgeLabel position="near-end" side="below">x</EdgeLabel>
          </Step>
        </Path>,
      );
      expect(fromChild).toEqual(fromProp);
    });

    it('prop 与 child 同时存在时 prop 优先', () => {
      const ir = buildIR(
        <Path>
          <Step kind="move" to="A" />
          <Step to="B" label={{ text: 'from-prop' }}>
            <EdgeLabel>from-child</EdgeLabel>
          </Step>
        </Path>,
      );
      expect(ir.children[0]).toMatchObject({
        children: [
          { kind: 'move' },
          { kind: 'line', label: { text: 'from-prop' } },
        ],
      });
    });

    it('<EdgeLabel> 仅 children 字符串、其它属性走默认（IR 不写出 position/side）', () => {
      const ir = buildIR(
        <Path>
          <Step kind="move" to="A" />
          <Step to="B">
            <EdgeLabel>plain</EdgeLabel>
          </Step>
        </Path>,
      );
      const step = (ir.children[0] as { children: Array<{ label?: unknown }> }).children[1];
      expect(step.label).toEqual({ text: 'plain' });
    });

    it('label 在 fold / curve / cubic / bend / arc / circlePath / ellipsePath 上同样可挂', () => {
      const ir = buildIR(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="step" via="-|" to={[10, 5]} label={{ text: 'f' }} />
          <Step kind="curve" control={[5, -10]} to={[20, 0]} label={{ text: 'q' }} />
          <Step kind="cubic" control1={[24, -8]} control2={[26, -8]} to={[30, 0]} label={{ text: 'c' }} />
          <Step kind="bend" bendDirection="left" to={[40, 0]} label={{ text: 'b' }} />
          <Step kind="arc" startAngle={0} endAngle={90} radius={5} label={{ text: 'a' }} />
          <Step kind="circlePath" radius={3} label={{ text: 'o' }} />
          <Step kind="ellipsePath" radiusX={4} radiusY={2} label={{ text: 'e' }} />
        </Path>,
      );
      const steps = (ir.children[0] as { children: Array<{ label?: { text: string } }> }).children;
      expect(steps.slice(1).map(s => s.label?.text)).toEqual(['f', 'q', 'c', 'b', 'a', 'o', 'e']);
    });

    it('move / cycle 上的 <EdgeLabel> 静默忽略（schema 不允许）', () => {
      const ir = buildIR(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step to={[10, 0]} />
          {/* @ts-expect-error cycle 类型不允许 children；这里故意构造来验证 builder 静默忽略 */}
          <Step kind="cycle">
            <EdgeLabel>ignored</EdgeLabel>
          </Step>
        </Path>,
      );
      const steps = (ir.children[0] as { children: Array<Record<string, unknown>> }).children;
      expect(steps[2]).toEqual({ type: 'step', kind: 'cycle' });
    });

    it('<Draw way={[..., { label }, ...]}> 与 Kernel <Step><EdgeLabel/></Step> 等价', () => {
      const fromSugar = buildIR(<Draw way={['A', { label: 'accept' }, 'B']} />);
      const fromKernel = buildIR(
        <Path>
          <Step kind="move" to="A" />
          <Step to="B">
            <EdgeLabel>accept</EdgeLabel>
          </Step>
        </Path>,
      );
      expect(fromSugar).toEqual(fromKernel);
    });

    it('<Draw> 与 <Path> 等价透传 lineCap / lineJoin / thickness / opacity 全套', () => {
      const fromSugar = buildIR(
        <Draw
          way={['A', 'B']}
          lineCap="round"
          lineJoin="bevel"
          thickness="veryThick"
          opacity={0.8}
          fillOpacity={0.5}
          drawOpacity={0.7}
        />,
      );
      const fromKernel = buildIR(
        <Path
          lineCap="round"
          lineJoin="bevel"
          thickness="veryThick"
          opacity={0.8}
          fillOpacity={0.5}
          drawOpacity={0.7}
        >
          <Step kind="move" to="A" />
          <Step to="B" />
        </Path>,
      );
      expect(fromSugar).toEqual(fromKernel);
    });

    it('<Scope> emit IRScope：transforms / id / localNamespace 透传', () => {
      const ir = buildIR(
        <Scope id="cluster" localNamespace transforms={[{ kind: 'translate', x: 50, y: 0 }]}>
          <Node id="A" position={[0, 0]}>A</Node>
        </Scope>,
      );
      expect(ir.children).toHaveLength(1);
      expect(ir.children[0]).toMatchObject({
        type: 'scope',
        id: 'cluster',
        localNamespace: true,
        transforms: [{ kind: 'translate', x: 50, y: 0 }],
      });
    });

    it('<Scope> 嵌套：scope 内 scope / node / coordinate / path 全部 emit 到 scope.children', () => {
      const ir = buildIR(
        <Scope transforms={[{ kind: 'translate', x: 10, y: 0 }]}>
          <Node id="A" position={[0, 0]}>A</Node>
          <Coordinate id="anchor" position={[5, 5]} />
          <Scope transforms={[{ kind: 'rotate', degrees: 45 }]}>
            <Node id="inner" position={[0, 0]}>I</Node>
          </Scope>
          <Path>
            <Step kind="move" to="A" />
            <Step to="inner" />
          </Path>
        </Scope>,
      );
      const scope = ir.children[0];
      expect(scope.type).toBe('scope');
      if (!('namespace' in scope) && scope.type === 'scope') {
        expect(scope.children).toHaveLength(4);
        expect(scope.children[0]).toMatchObject({ type: 'node', id: 'A' });
        expect(scope.children[1]).toMatchObject({ type: 'coordinate', id: 'anchor' });
        expect(scope.children[2]).toMatchObject({ type: 'scope' });
        expect(scope.children[3]).toMatchObject({ type: 'path' });
      }
    });

    it('<Scope> 缺省 transforms / id / localNamespace → IR 字段缺省（不写出空值）', () => {
      const ir = buildIR(
        <Scope>
          <Node id="A" position={[0, 0]}>A</Node>
        </Scope>,
      );
      const scope = ir.children[0];
      expect(scope.type).toBe('scope');
      expect(scope).not.toHaveProperty('id');
      expect(scope).not.toHaveProperty('localNamespace');
      expect(scope).not.toHaveProperty('transforms');
    });

    it('<Node color> 主色透传到 IR（alpha.2）', () => {
      const ir = buildIR(<Node id="A" position={[0, 0]} color="blue">A</Node>);
      expect(ir.children[0]).toMatchObject({ type: 'node', color: 'blue' });
    });

    it('<Path color> 主色透传到 IR（alpha.2）', () => {
      const ir = buildIR(
        <Path color="crimson">
          <Step kind="move" to="A" />
          <Step to="B" />
        </Path>,
      );
      expect(ir.children[0]).toMatchObject({ type: 'path', color: 'crimson' });
    });

    it('<Scope> 样式字段透传：级联 graphic state + 四通道 every-X + resetStyle（alpha.2）', () => {
      const ir = buildIR(
        <Scope
          color="blue"
          strokeWidth={2}
          nodeDefault={{ shape: 'circle', fill: 'lightblue' }}
          pathDefault={{ stroke: 'green' }}
          labelDefault={{ font: { size: 10 } }}
          arrowDefault={{ shape: 'stealth', scale: 1.5 }}
          resetStyle={['label']}
        >
          <Node id="A" position={[0, 0]}>A</Node>
        </Scope>,
      );
      expect(ir.children[0]).toMatchObject({
        type: 'scope',
        color: 'blue',
        strokeWidth: 2,
        nodeDefault: { shape: 'circle', fill: 'lightblue' },
        pathDefault: { stroke: 'green' },
        labelDefault: { font: { size: 10 } },
        arrowDefault: { shape: 'stealth', scale: 1.5 },
        resetStyle: ['label'],
      });
    });

    it('<Step label> textColor / opacity / font 透传到 IR step.label（alpha.2）', () => {
      const ir = buildIR(
        <Path>
          <Step kind="move" to="A" />
          <Step to="B" label={{ text: 'x', textColor: 'red', opacity: 0.6, font: { size: 10 } }} />
        </Path>,
      );
      const step = (ir.children[0] as { children: Array<{ label?: unknown }> }).children[1];
      expect(step.label).toMatchObject({
        text: 'x',
        textColor: 'red',
        opacity: 0.6,
        font: { size: 10 },
      });
    });

    it('<Draw> way 中 label 与 fold / curve / arc 算子组合，全等价 Kernel 写法', () => {
      const fromSugar = buildIR(
        <Draw
          way={[
            'A',
            { label: 'fold' },
            '-|',
            'B',
            { label: { text: 'q', side: 'below' } },
            { curve: [5, 8] },
            'C',
            { label: 'a' },
            { arc: { startAngle: 0, endAngle: 90, radius: 4 } },
          ]}
        />,
      );
      const fromKernel = buildIR(
        <Path>
          <Step kind="move" to="A" />
          <Step kind="step" via="-|" to="B" label={{ text: 'fold' }} />
          <Step kind="curve" to="C" control={[5, 8]} label={{ text: 'q', side: 'below' }} />
          <Step kind="arc" startAngle={0} endAngle={90} radius={4} label={{ text: 'a' }} />
        </Path>,
      );
      expect(fromSugar).toEqual(fromKernel);
    });
  });

  describe('<Node boundary> 连接面透传', () => {
    it('<Node boundary="circle"> 透传到 IR node.boundary', () => {
      const ir = buildIR(<Node id="A" position={[0, 0]} boundary="circle" />);
      expect(ir.children[0]).toMatchObject({ type: 'node', boundary: 'circle' });
    });

    it('<Node boundary="shape"> 透传到 IR node.boundary', () => {
      const ir = buildIR(<Node id="A" position={[0, 0]} boundary="shape" />);
      expect(ir.children[0]).toMatchObject({ type: 'node', boundary: 'shape' });
    });

    it('<Node boundary={{ type, params }}> 对象形态透传到 IR', () => {
      const ir = buildIR(
        <Node id="A" position={[0, 0]} boundary={{ type: 'ellipse', params: { circumscribe: 'equal' } }} />,
      );
      expect(ir.children[0]).toMatchObject({
        type: 'node',
        boundary: { type: 'ellipse', params: { circumscribe: 'equal' } },
      });
    });

    it('<Node> 省略 boundary 时 IR node 不含该字段', () => {
      const ir = buildIR(<Node id="A" position={[0, 0]} />);
      expect(ir.children[0]).not.toHaveProperty('boundary');
    });
  });

  describe('React.Fragment 透明展开', () => {
    it('Fragment 直接子元素被展开为 Layout 子级', () => {
      const ir = buildIR(
        <Fragment>
          <Node id="A" position={[0, 0]}>a</Node>
          <Node id="B" position={[10, 0]}>b</Node>
        </Fragment>,
      );
      expect(ir.children).toEqual([
        expect.objectContaining({ type: 'node', id: 'A' }),
        expect.objectContaining({ type: 'node', id: 'B' }),
      ]);
    });

    it('.map() 返回 <Fragment> 包裹多个 Kernel 元素 → 全部展开（典型 demo 用法）', () => {
      const ir = buildIR(
        [-1, 0, 1].map(v => (
          <Fragment key={v}>
            <Node id={`x${v}`} position={[v * 10, 0]}>{`x=${v}`}</Node>
            <Coordinate id={`c${v}`} position={[v * 10, 10]} />
          </Fragment>
        )),
      );
      expect(ir.children.map(c => c.type)).toEqual([
        'node', 'coordinate',
        'node', 'coordinate',
        'node', 'coordinate',
      ]);
    });

    it('嵌套 Fragment 也递归展开', () => {
      const ir = buildIR(
        <Fragment>
          <Fragment>
            <Node id="A" position={[0, 0]}>a</Node>
          </Fragment>
          <Node id="B" position={[10, 0]}>b</Node>
        </Fragment>,
      );
      expect(ir.children.map(c => (c as { id?: string }).id)).toEqual(['A', 'B']);
    });

    it('混合 .map(Fragment) + 直接子节点 + 再 .map(Fragment) 保持 JSX 顺序（回归 karl-circle 网格→圆→刻度 模式）', () => {
      const ir = buildIR(
        <>
          {[1, 2].map(i => (
            <Fragment key={`g${i}`}>
              <Node id={`grid${i}`} position={[i, 0]}>g</Node>
            </Fragment>
          ))}
          <Node id="circle" position={[0, 0]}>c</Node>
          {[3].map(i => (
            <Fragment key={`t${i}`}>
              <Node id={`tick${i}`} position={[i, 0]}>t</Node>
            </Fragment>
          ))}
        </>,
      );
      expect(ir.children.map(c => (c as { id?: string }).id)).toEqual([
        'grid1', 'grid2', 'circle', 'tick3',
      ]);
    });
  });
});
