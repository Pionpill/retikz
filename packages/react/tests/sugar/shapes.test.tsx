import { describe, expect, it } from 'vitest';
import { Arc } from '../../src/sugar/Arc';
import { Circle } from '../../src/sugar/Circle';
import { Ellipse } from '../../src/sugar/Ellipse';
import { Grid } from '../../src/sugar/Grid';
import { Rectangle } from '../../src/sugar/Rectangle';
import { Sector } from '../../src/sugar/Sector';
import { Path } from '../../src/kernel/Path';
import { Step } from '../../src/kernel/Step';
import { buildIR } from '../../src/kernel/builder';

/**
 * 形状 sugar 等价性：sugar 派发的 IR 必须与手写 Kernel `<Path><Step>` IR 完全一致
 * （Sugar 不引入新能力——只是 Kernel 的便利包装）。
 */
const ir = (jsx: React.ReactNode) => buildIR(jsx);

describe('Circle 等价性', () => {
  it('center + radius', () => {
    expect(ir(<Circle center={[0, 0]} radius={10} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="circlePath" radius={10} />
        </Path>,
      ).children,
    );
  });

  it('center + diameter（radius = d/2）', () => {
    expect(ir(<Circle center={[1, 2]} diameter={8} />).children).toEqual(
      ir(<Circle center={[1, 2]} radius={4} />).children,
    );
  });

  it('{ from, to } 直径两端 → 圆心 midpoint、半径 = 距离/2', () => {
    expect(ir(<Circle from={[0, 0]} to={[10, 0]} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[5, 0]} />
          <Step kind="circlePath" radius={5} />
        </Path>,
      ).children,
    );
  });

  it('{ corner1, corner2 } bbox → 半径 = min(|dx|,|dy|)/2', () => {
    expect(ir(<Circle corner1={[0, 0]} corner2={[10, 4]} />).children).toEqual(
      ir(<Circle center={[5, 2]} radius={2} />).children,
    );
  });

  it('部分圆（角度三键求二）→ circlePath 带 startAngle/endAngle/closed', () => {
    expect(ir(<Circle center={[0, 0]} radius={10} startAngle={0} sweepAngle={180} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="circlePath" radius={10} startAngle={0} endAngle={180} closed="chord" />
        </Path>,
      ).children,
    );
  });

  it('视觉 prop 透传到 Path', () => {
    const out = ir(<Circle center={[0, 0]} radius={5} fill="#eee" stroke="#333" zIndex={3} />);
    expect(out.children[0]).toMatchObject({ type: 'path', fill: '#eee', stroke: '#333', zIndex: 3 });
  });
});

describe('Ellipse 等价性', () => {
  it('center + radiusX/radiusY', () => {
    expect(ir(<Ellipse center={[0, 0]} radiusX={15} radiusY={10} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="ellipsePath" radiusX={15} radiusY={10} />
        </Path>,
      ).children,
    );
  });

  it('{ corner1, corner2 } 内切椭圆', () => {
    expect(ir(<Ellipse corner1={[0, 0]} corner2={[20, 10]} />).children).toEqual(
      ir(<Ellipse center={[10, 5]} radiusX={10} radiusY={5} />).children,
    );
  });
});

describe('Arc 等价性', () => {
  it('center + radius + 角度（开放弧）', () => {
    expect(ir(<Arc center={[0, 0]} radius={10} startAngle={0} endAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="arc" center={[0, 0]} startAngle={0} endAngle={90} radius={10} />
        </Path>,
      ).children,
    );
  });

  it('椭圆弧 radiusX/radiusY', () => {
    expect(ir(<Arc center={[0, 0]} radiusX={15} radiusY={10} startAngle={0} endAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="arc" center={[0, 0]} startAngle={0} endAngle={90} radiusX={15} radiusY={10} />
        </Path>,
      ).children,
    );
  });
});

describe('Sector 等价性（wedge）', () => {
  it('move(arcStart) → arc(center) → line(center) → cycle', () => {
    expect(ir(<Sector center={[0, 0]} radius={10} startAngle={0} endAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[10, 0]} />
          <Step kind="arc" center={[0, 0]} startAngle={0} endAngle={90} radius={10} />
          <Step kind="line" to={[0, 0]} />
          <Step kind="cycle" />
        </Path>,
      ).children,
    );
  });
});

describe('Rectangle 等价性', () => {
  it('{ corner1, corner2 } 透传', () => {
    expect(ir(<Rectangle corner1={[0, 0]} corner2={[10, 6]} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="rectangle" from={[0, 0]} to={[10, 6]} />
        </Path>,
      ).children,
    );
  });

  it('{ center, width, height } → 归一化两角', () => {
    expect(ir(<Rectangle center={[5, 3]} width={10} height={6} />).children).toEqual(
      ir(<Rectangle corner1={[0, 0]} corner2={[10, 6]} />).children,
    );
  });

  it('{ center, side } 正方形 + roundedCorners 透传', () => {
    expect(ir(<Rectangle center={[0, 0]} side={4} roundedCorners={1} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[-2, -2]} />
          <Step kind="rectangle" from={[-2, -2]} to={[2, 2]} roundedCorners={1} />
        </Path>,
      ).children,
    );
  });
});

describe('Grid 等价性（展开多 Path）', () => {
  it('corner1/corner2 + step → 竖线 + 横线', () => {
    expect(ir(<Grid corner1={[0, 0]} corner2={[2, 2]} step={1} />).children).toEqual(
      ir(
        <>
          <Path><Step kind="move" to={[0, 0]} /><Step kind="line" to={[0, 2]} /></Path>
          <Path><Step kind="move" to={[1, 0]} /><Step kind="line" to={[1, 2]} /></Path>
          <Path><Step kind="move" to={[2, 0]} /><Step kind="line" to={[2, 2]} /></Path>
          <Path><Step kind="move" to={[0, 0]} /><Step kind="line" to={[2, 0]} /></Path>
          <Path><Step kind="move" to={[0, 1]} /><Step kind="line" to={[2, 1]} /></Path>
          <Path><Step kind="move" to={[0, 2]} /><Step kind="line" to={[2, 2]} /></Path>
        </>,
      ).children,
    );
  });

  it('xStep/yStep 分轴覆盖 step', () => {
    const out = ir(<Grid corner1={[0, 0]} corner2={[4, 2]} xStep={2} yStep={1} />);
    // 竖线 floor(4/2)+1=3，横线 floor(2/1)+1=3 → 共 6 path
    expect(out.children).toHaveLength(6);
  });
});

describe('点位契约 + 形态校验报错', () => {
  it('可计算形态点位传非 literal → 抛错', () => {
    expect(() => ir(<Circle from={'a' as never} to={[10, 0]} />)).toThrow(/literal/);
    expect(() => ir(<Sector center={'a' as never} radius={5} startAngle={0} endAngle={90} />)).toThrow(/literal/);
    expect(() => ir(<Grid corner1={'a' as never} corner2={[2, 2]} step={1} />)).toThrow(/literal/);
  });

  it('角度三键给 1 个 / Arc 不给角度 → 抛错', () => {
    expect(() => ir(<Circle center={[0, 0]} radius={10} startAngle={0} />)).toThrow();
    expect(() => ir(<Arc center={[0, 0]} radius={10} />)).toThrow();
  });

  it('Grid 缺 step → 抛错', () => {
    expect(() => ir(<Grid corner1={[0, 0]} corner2={[2, 2]} />)).toThrow();
  });
});
