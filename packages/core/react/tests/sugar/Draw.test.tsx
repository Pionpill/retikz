import { describe, expect, it } from 'vitest';
import { DrawWay } from '@retikz/core';
import { Draw } from '../../src/sugar/Draw';
import { Path } from '../../src/kernel/Path';
import { Step } from '../../src/kernel/Step';
import { buildIR } from '../../src/kernel/builder';

/**
 * Draw 是 Sugar：调一次它得到 <Path><Step.../></Path> 子树。
 * 在 node env 不渲染，直接调 FC 拿 element 树检查；走 buildIR 拿最终 IR 验证语义。
 *
 * Hard rule：Sugar 不引入新能力——任何 Draw 表达都必须能用 Kernel 等价表达。这里通过对比
 * Draw 输出的 IR 与手写 Kernel 的 IR 是否一致来验。
 */
const ir = (jsx: React.ReactNode) => buildIR(jsx);

describe('Draw: 基础展开', () => {
  it('两个 id：展开为 Path + move + line', () => {
    const out = ir(<Draw way={['a', 'b']} />);
    expect(out.children[0]).toMatchObject({
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: { id: 'a' } },
        { type: 'step', kind: 'line', to: { id: 'b' } },
      ],
    });
  });

  it('与等价 Kernel Path 产出一致——Sugar 不引入新能力', () => {
    const sugarIR = ir(<Draw way={['a', 'b']} stroke="#f00" strokeWidth={2} arrow="->" />);
    const kernelIR = ir(
      <Path stroke="#f00" strokeWidth={2} arrow="->">
        <Step kind="move" to="a" />
        <Step kind="line" to="b" />
      </Path>,
    );
    expect(sugarIR.children).toEqual(kernelIR.children);
  });

  it('样式 / 箭头 / 填充 props 透传到 Path 节点', () => {
    const out = ir(
      <Draw
        way={['a', 'b']}
        stroke="#abc"
        strokeWidth={3}
        dashPattern={[4, 2]}
        lineCap="round"
        lineJoin="bevel"
        thickness="thick"
        arrow="<->"
        arrowDetail={{ shape: 'stealth' }}
        fill="#fed"
        fillRule="evenodd"
        opacity={0.8}
        fillOpacity={0.5}
        drawOpacity={0.7}
        zIndex={5}
      />,
    );
    expect(out.children[0]).toMatchObject({
      type: 'path',
      stroke: '#abc',
      strokeWidth: 3,
      dashPattern: [4, 2],
      lineCap: 'round',
      lineJoin: 'bevel',
      thickness: 'thick',
      arrow: '<->',
      arrowDetail: { shape: 'stealth' },
      fill: '#fed',
      fillRule: 'evenodd',
      opacity: 0.8,
      fillOpacity: 0.5,
      drawOpacity: 0.7,
      zIndex: 5,
    });
  });

  it('zIndex 透传——与等价 Kernel Path 的 IR 一致', () => {
    const sugarIR = ir(<Draw way={['a', 'b']} zIndex={3} />);
    const kernelIR = ir(
      <Path zIndex={3}>
        <Step kind="move" to="a" />
        <Step kind="line" to="b" />
      </Path>,
    );
    expect(sugarIR.children).toEqual(kernelIR.children);
  });
});

describe('Draw: 各 step kind 分派', () => {
  it('cycle 算子 → kind=cycle', () => {
    const out = ir(<Draw way={['a', 'b', DrawWay.Cycle]} />);
    const steps = (out.children[0] as { children: Array<{ kind: string }> }).children;
    expect(steps[steps.length - 1]).toMatchObject({ kind: 'cycle' });
  });

  it('折角算子 -| → kind=fold + via', () => {
    const out = ir(<Draw way={['a', '-|', 'b']} />);
    const steps = (out.children[0] as { children: Array<{ kind: string; via?: string }> }).children;
    expect(steps[1]).toMatchObject({ kind: 'fold', via: '-|', to: { id: 'b' } });
  });

  it('curve 算子 → kind=curve + control', () => {
    const out = ir(<Draw way={['a', { curve: [10, 20] }, 'b']} />);
    const steps = (out.children[0] as { children: Array<{ kind: string }> }).children;
    expect(steps[1]).toMatchObject({ kind: 'curve', to: { id: 'b' }, control: [10, 20] });
  });

  it('cubic 算子 → kind=cubic + control1 / control2', () => {
    const out = ir(<Draw way={['a', { cubic: [[10, 0], [10, 20]] }, 'b']} />);
    const steps = (out.children[0] as { children: Array<{ kind: string }> }).children;
    expect(steps[1]).toMatchObject({ kind: 'cubic', to: { id: 'b' }, control1: [10, 0], control2: [10, 20] });
  });

  it('bend 算子（带 angle）→ kind=bend + bendDirection + bendAngle', () => {
    const out = ir(<Draw way={['a', { bend: 'left', angle: 45 }, 'b']} />);
    const steps = (out.children[0] as { children: Array<{ kind: string }> }).children;
    expect(steps[1]).toMatchObject({ kind: 'bend', to: { id: 'b' }, bendDirection: 'left', bendAngle: 45 });
  });

  it('bend 算子（缺省 angle）→ 不写 bendAngle 字段', () => {
    const out = ir(<Draw way={['a', { bend: 'right' }, 'b']} />);
    const steps = (out.children[0] as { children: Array<{ kind: string; bendAngle?: number }> }).children;
    expect(steps[1]).toMatchObject({ kind: 'bend', to: { id: 'b' }, bendDirection: 'right' });
    expect(steps[1].bendAngle).toBeUndefined();
  });

  it('arc 算子 → kind=arc，不消耗下一项', () => {
    const out = ir(<Draw way={['a', { arc: { startAngle: 0, endAngle: 90, radius: 20 } }]} />);
    const steps = (out.children[0] as { children: Array<{ kind: string }> }).children;
    expect(steps[1]).toMatchObject({ kind: 'arc', startAngle: 0, endAngle: 90, radius: 20 });
  });

  it('circle 算子 → kind=circlePath', () => {
    const out = ir(<Draw way={['a', { circle: { radius: 15 } }]} />);
    const steps = (out.children[0] as { children: Array<{ kind: string }> }).children;
    expect(steps[1]).toMatchObject({ kind: 'circlePath', radius: 15 });
  });

  it('ellipse 算子 → kind=ellipsePath', () => {
    const out = ir(<Draw way={['a', { ellipse: { radiusX: 20, radiusY: 10 } }]} />);
    const steps = (out.children[0] as { children: Array<{ kind: string }> }).children;
    expect(steps[1]).toMatchObject({ kind: 'ellipsePath', radiusX: 20, radiusY: 10 });
  });
});

describe('Draw: 边标注 label 透传', () => {
  it('line 段 label：短记字符串 → IR step.label.text', () => {
    const out = ir(<Draw way={['a', { label: 'yes' }, 'b']} />);
    const steps = (out.children[0] as { children: Array<{ label?: { text: string } }> }).children;
    expect(steps[1].label).toMatchObject({ text: 'yes' });
  });

  it('对象 label：text + side 透传到 IR', () => {
    const out = ir(<Draw way={['a', { label: { text: 'no', side: 'below' } }, 'b']} />);
    const steps = (out.children[0] as { children: Array<{ label?: { text: string; side?: string } }> }).children;
    expect(steps[1].label).toMatchObject({ text: 'no', side: 'below' });
  });
});

describe('Draw: 相对偏移', () => {
  it('对象形态 { position, type: Relative } → IR target.relative', () => {
    const out = ir(
      <Draw way={['a', { position: [10, 0], type: DrawWay.Relative }]} />,
    );
    const steps = (out.children[0] as { children: Array<{ to: { relative?: [number, number] } }> }).children;
    expect(steps[1].to).toMatchObject({ relative: [10, 0] });
  });

  it('对象形态 { position, type: Accumulate } → IR target.relativeAccumulate', () => {
    const out = ir(
      <Draw way={['a', { position: [10, 0], type: DrawWay.Accumulate }]} />,
    );
    const steps = (out.children[0] as { children: Array<{ to: { relativeAccumulate?: [number, number] } }> }).children;
    expect(steps[1].to).toMatchObject({ relativeAccumulate: [10, 0] });
  });

  it('sugar 字符串 "+x,y" → IR target.relative', () => {
    const out = ir(<Draw way={['a', '+10,5']} />);
    const steps = (out.children[0] as { children: Array<{ to: { relative?: [number, number] } }> }).children;
    expect(steps[1].to).toMatchObject({ relative: [10, 5] });
  });
});
