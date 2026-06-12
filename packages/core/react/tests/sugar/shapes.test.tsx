import { describe, expect, it } from 'vitest';
import { Arc } from '../../src/sugar/Arc';
import { Circle } from '../../src/sugar/Circle';
import { Ellipse } from '../../src/sugar/Ellipse';
import { Grid } from '../../src/sugar/Grid';
import { Rectangle } from '../../src/sugar/Rectangle';
import { RegularPolygon } from '../../src/sugar/RegularPolygon';
import { Sector } from '../../src/sugar/Sector';
import { Star } from '../../src/sugar/Star';
import { polarXY, regularPolygonVertices, starVertices } from '../../src/sugar/_shared';
import { Path } from '../../src/kernel/Path';
import { Step } from '../../src/kernel/Step';
import { buildIR } from '../../src/kernel/builder';

const ir = (jsx: React.ReactNode) => buildIR(jsx);

describe('Circle equivalence', () => {
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

  it('center + diameter', () => {
    expect(ir(<Circle center={[1, 2]} diameter={8} />).children).toEqual(
      ir(<Circle center={[1, 2]} radius={4} />).children,
    );
  });

  it('{ from, to } diameter endpoints', () => {
    expect(ir(<Circle from={[0, 0]} to={[10, 0]} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[5, 0]} />
          <Step kind="circlePath" radius={5} />
        </Path>,
      ).children,
    );
  });

  it('{ corner1, corner2 } bbox', () => {
    expect(ir(<Circle corner1={[0, 0]} corner2={[10, 4]} />).children).toEqual(
      ir(<Circle center={[5, 2]} radius={2} />).children,
    );
  });

  it('box fit（contain / cover；x/y 与 origin 两种 box 写法）', () => {
    expect(ir(<Circle box={{ x: 0, y: 0, width: 10, height: 4 }} />).children).toEqual(
      ir(<Circle center={[5, 2]} radius={2} />).children,
    );
    expect(ir(<Circle box={{ origin: [0, 0], width: 10, height: 4 }} fit="cover" />).children).toEqual(
      ir(<Circle center={[5, 2]} radius={5} />).children,
    );
  });

  it('inset / outset adjust the box before fitting', () => {
    expect(ir(<Circle corner1={[0, 0]} corner2={[10, 6]} inset={1} />).children).toEqual(
      ir(<Circle center={[5, 3]} radius={2} />).children,
    );
    expect(ir(<Circle box={{ x: 0, y: 0, width: 10, height: 6 }} outset={2} />).children).toEqual(
      ir(<Circle center={[5, 3]} radius={5} />).children,
    );
  });

  it('partial circle uses circlePath with angles', () => {
    expect(ir(<Circle center={[0, 0]} radius={10} startAngle={0} sweepAngle={180} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="circlePath" radius={10} startAngle={0} endAngle={180} closed="chord" />
        </Path>,
      ).children,
    );
  });

  it('partial circle can close as sector', () => {
    expect(ir(<Circle center={[0, 0]} radius={10} startAngle={0} endAngle={90} closed="sector" />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="circlePath" radius={10} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });
});

describe('Ellipse equivalence', () => {
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

  it('{ corner1, corner2 } bbox', () => {
    expect(ir(<Ellipse corner1={[0, 0]} corner2={[20, 10]} />).children).toEqual(
      ir(<Ellipse center={[10, 5]} radiusX={10} radiusY={5} />).children,
    );
  });

  it('box fit（x/y 与 origin 两种 box 写法）', () => {
    expect(ir(<Ellipse box={{ x: 0, y: 0, width: 20, height: 10 }} />).children).toEqual(
      ir(<Ellipse center={[10, 5]} radiusX={10} radiusY={5} />).children,
    );
    expect(ir(<Ellipse box={{ origin: [2, 4], width: 20, height: 10 }} />).children).toEqual(
      ir(<Ellipse center={[12, 9]} radiusX={10} radiusY={5} />).children,
    );
  });

  it('inset / outset adjust the box before fitting', () => {
    expect(ir(<Ellipse corner1={[0, 0]} corner2={[20, 10]} inset={2} />).children).toEqual(
      ir(<Ellipse center={[10, 5]} radiusX={8} radiusY={3} />).children,
    );
    expect(ir(<Ellipse box={{ x: 0, y: 0, width: 20, height: 10 }} outset={2} />).children).toEqual(
      ir(<Ellipse center={[10, 5]} radiusX={12} radiusY={7} />).children,
    );
  });

  it('partial ellipse can close as sector', () => {
    expect(
      ir(<Ellipse center={[0, 0]} radiusX={15} radiusY={10} startAngle={0} endAngle={90} closed="sector" />)
        .children,
    ).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="ellipsePath" radiusX={15} radiusY={10} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });
});

describe('Arc equivalence', () => {
  it('center + radius + angles', () => {
    expect(ir(<Arc center={[0, 0]} radius={10} startAngle={0} endAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="arc" center={[0, 0]} startAngle={0} endAngle={90} radius={10} />
        </Path>,
      ).children,
    );
  });

  it('ellipse arc', () => {
    expect(ir(<Arc center={[0, 0]} radiusX={15} radiusY={10} startAngle={0} endAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="arc" center={[0, 0]} startAngle={0} endAngle={90} radiusX={15} radiusY={10} />
        </Path>,
      ).children,
    );
  });

  it('close="chord" delegates to circlePath chord', () => {
    expect(ir(<Arc center={[0, 0]} radius={10} startAngle={0} endAngle={90} close="chord" />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="circlePath" radius={10} startAngle={0} endAngle={90} closed="chord" />
        </Path>,
      ).children,
    );
  });

  it('close="sector" on an ellipse delegates to ellipsePath sector', () => {
    expect(
      ir(<Arc center={[0, 0]} radiusX={15} radiusY={10} startAngle={0} endAngle={90} close="sector" />).children,
    ).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="ellipsePath" radiusX={15} radiusY={10} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });
});

describe('Sector equivalence', () => {
  it('filled wedge uses circlePath sector close (center accepts any target)', () => {
    expect(ir(<Sector center={[0, 0]} radius={10} startAngle={0} endAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="circlePath" radius={10} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });

  it('elliptical filled wedge uses ellipsePath sector close', () => {
    expect(
      ir(<Sector center={[0, 0]} radiusX={15} radiusY={10} startAngle={0} endAngle={90} />).children,
    ).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="ellipsePath" radiusX={15} radiusY={10} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });

  it('filled wedge accepts a node-id center', () => {
    expect(ir(<Sector center="hub" radius={10} startAngle={0} sweepAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to="hub" />
          <Step kind="circlePath" radius={10} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });

  it('donut sector', () => {
    const c: [number, number] = [0, 0];
    expect(
      ir(<Sector center={c} radius={60} innerRadius={30} startAngle={0} endAngle={90} />).children,
    ).toEqual(
      ir(
        <Path>
          <Step kind="move" to={polarXY(c, 60, 60, 0)} />
          <Step kind="arc" center={c} startAngle={0} endAngle={90} radius={60} />
          <Step kind="line" to={polarXY(c, 30, 30, 90)} />
          <Step kind="arc" center={c} startAngle={90} endAngle={0} radius={30} />
          <Step kind="line" to={polarXY(c, 60, 60, 0)} />
        </Path>,
      ).children,
    );
  });
});

describe('Rectangle equivalence', () => {
  it('{ corner1, corner2 } pass through', () => {
    expect(ir(<Rectangle corner1={[0, 0]} corner2={[10, 6]} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="rectangle" from={[0, 0]} to={[10, 6]} />
        </Path>,
      ).children,
    );
  });

  it('{ center, width, height } normalizes to corners', () => {
    expect(ir(<Rectangle center={[5, 3]} width={10} height={6} />).children).toEqual(
      ir(<Rectangle corner1={[0, 0]} corner2={[10, 6]} />).children,
    );
  });

  it('cornerRadius passes through to rectangle step', () => {
    expect(ir(<Rectangle corner1={[0, 0]} corner2={[10, 6]} cornerRadius={6} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="rectangle" from={[0, 0]} to={[10, 6]} cornerRadius={6} />
        </Path>,
      ).children,
    );
  });
});

describe('Grid equivalence', () => {
  it('corner1/corner2 + step', () => {
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

  // <Grid> 按参数改变产出的 Path 节点数（Tier2-ish 行为，锁定计数防回归）
  const gridLineCount = (jsx: React.ReactNode): number => {
    const children = ir(jsx).children;
    return Array.isArray(children) ? children.length : 0;
  };

  it('showVertical/showHorizontal 控制方向、改变线数', () => {
    expect(gridLineCount(<Grid corner1={[0, 0]} corner2={[2, 2]} step={1} />)).toBe(6); // 3 竖 + 3 横
    expect(gridLineCount(<Grid corner1={[0, 0]} corner2={[2, 2]} step={1} showHorizontal={false} />)).toBe(3);
    expect(gridLineCount(<Grid corner1={[0, 0]} corner2={[2, 2]} step={1} showVertical={false} />)).toBe(3);
  });

  it('includeBoundary 在不整除时补一条边界线', () => {
    expect(gridLineCount(<Grid corner1={[0, 0]} corner2={[2.5, 2]} step={1} showHorizontal={false} />)).toBe(3); // x=0,1,2
    expect(gridLineCount(<Grid corner1={[0, 0]} corner2={[2.5, 2]} step={1} showHorizontal={false} includeBoundary />)).toBe(4); // + x=2.5
  });
});

describe('RegularPolygon equivalence', () => {
  it('sides=4', () => {
    const verts = regularPolygonVertices([0, 0], 30, 30, 4, -90);
    expect(ir(<RegularPolygon center={[0, 0]} radius={30} sides={4} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={verts[0]} />
          <Step kind="line" to={verts[1]} />
          <Step kind="line" to={verts[2]} />
          <Step kind="line" to={verts[3]} />
          <Step kind="cycle" />
        </Path>,
      ).children,
    );
  });

  it('sides=6（顶点数随 sides 变）', () => {
    const verts = regularPolygonVertices([0, 0], 30, 30, 6, -90);
    expect(verts).toHaveLength(6);
    expect(ir(<RegularPolygon center={[0, 0]} radius={30} sides={6} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={verts[0]} />
          {verts.slice(1).map((v, i) => (
            <Step key={i} kind="line" to={v} />
          ))}
          <Step kind="cycle" />
        </Path>,
      ).children,
    );
  });
});

describe('Star equivalence', () => {
  it('5-point star', () => {
    const verts = starVertices([0, 0], 30, 12, 5, -90);
    const hand = ir(
      <Path>
        <Step kind="move" to={verts[0]} />
        {verts.slice(1).map((v, i) => (
          <Step key={i} kind="line" to={v} />
        ))}
        <Step kind="cycle" />
      </Path>,
    );
    expect(ir(<Star center={[0, 0]} outerRadius={30} innerRadius={12} points={5} />).children).toEqual(
      hand.children,
    );
  });

  it('points=6（顶点数随 points 变：2×points）', () => {
    const verts = starVertices([0, 0], 30, 12, 6, -90);
    expect(verts).toHaveLength(12);
    const hand = ir(
      <Path>
        <Step kind="move" to={verts[0]} />
        {verts.slice(1).map((v, i) => (
          <Step key={i} kind="line" to={v} />
        ))}
        <Step kind="cycle" />
      </Path>,
    );
    expect(ir(<Star center={[0, 0]} outerRadius={30} innerRadius={12} points={6} />).children).toEqual(
      hand.children,
    );
  });
});
