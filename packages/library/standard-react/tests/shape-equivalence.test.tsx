import { Path, Step, createInputScene } from '@retikz/react';
import { processToStaticInputResult } from '@retikz/vanilla';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { Circle, Ellipse, Rectangle, Polygon, Star, Arc, Sector } from '../src/shape';
import { synchronousAdapters } from './helpers/synchronous-adapters';

const ir = (jsx: ReactNode) => {
  const input = createInputScene(jsx);
  return { children: processToStaticInputResult(input.scene, { adapters: synchronousAdapters(input.adapters) }).scene };
};

const polarXY = (center: [number, number], rx: number, ry: number, angle: number): [number, number] => [
  center[0] + rx * Math.cos((angle * Math.PI) / 180),
  center[1] + ry * Math.sin((angle * Math.PI) / 180),
];

const polygonVertices = (center: [number, number], rx: number, ry: number, sides: number, rotate: number) =>
  Array.from({ length: sides }, (_, i) => polarXY(center, rx, ry, rotate + (i * 360) / sides));

const starVertices = (center: [number, number], outer: number, inner: number, points: number, rotate: number) =>
  Array.from({ length: points * 2 }, (_, i) =>
    polarXY(center, i % 2 ? inner : outer, i % 2 ? inner : outer, rotate + (i * 180) / points),
  );
describe('圆等效', () => {
  it('中心+半径', () => {
    expect(ir(<Circle center={[0, 0]} radius={10} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="circlePath" radius={10} />
        </Path>,
      ).children,
    );
  });

  it('中心+直径', () => {
    expect(ir(<Circle center={[1, 2]} diameter={8} />).children).toEqual(
      ir(<Circle center={[1, 2]} radius={4} />).children,
    );
  });

  it('{从，到}直径端点', () => {
    expect(ir(<Circle from={[0, 0]} to={[10, 0]} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[5, 0]} />
          <Step kind="circlePath" radius={5} />
        </Path>,
      ).children,
    );
  });

  it('{ 角点 1, 角点 2 } bbox', () => {
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

  it('安装前插入/向外调整框', () => {
    expect(ir(<Circle corner1={[0, 0]} corner2={[10, 6]} inset={1} />).children).toEqual(
      ir(<Circle center={[5, 3]} radius={2} />).children,
    );
    expect(ir(<Circle box={{ x: 0, y: 0, width: 10, height: 6 }} outset={2} />).children).toEqual(
      ir(<Circle center={[5, 3]} radius={5} />).children,
    );
  });

  it('部分圆使用带角度的 circlePath', () => {
    expect(ir(<Circle center={[0, 0]} radius={10} startAngle={0} sweepAngle={180} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="circlePath" radius={10} startAngle={0} endAngle={180} closed="chord" />
        </Path>,
      ).children,
    );
  });

  it('部分圆可以闭合为扇形', () => {
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

describe('椭圆等效', () => {
  it('中心+半径对象', () => {
    expect(ir(<Ellipse center={[0, 0]} radius={{ x: 15, y: 10 }} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="ellipsePath" radius={{ x: 15, y: 10 }} />
        </Path>,
      ).children,
    );
  });

  it('{ 角点 1, 角点 2 } bbox', () => {
    expect(ir(<Ellipse corner1={[0, 0]} corner2={[20, 10]} />).children).toEqual(
      ir(<Ellipse center={[10, 5]} radius={{ x: 10, y: 5 }} />).children,
    );
  });

  it('box fit（x/y 与 origin 两种 box 写法）', () => {
    expect(ir(<Ellipse box={{ x: 0, y: 0, width: 20, height: 10 }} />).children).toEqual(
      ir(<Ellipse center={[10, 5]} radius={{ x: 10, y: 5 }} />).children,
    );
    expect(ir(<Ellipse box={{ origin: [2, 4], width: 20, height: 10 }} />).children).toEqual(
      ir(<Ellipse center={[12, 9]} radius={{ x: 10, y: 5 }} />).children,
    );
  });

  it('安装前插入/向外调整框', () => {
    expect(ir(<Ellipse corner1={[0, 0]} corner2={[20, 10]} inset={2} />).children).toEqual(
      ir(<Ellipse center={[10, 5]} radius={{ x: 8, y: 3 }} />).children,
    );
    expect(ir(<Ellipse box={{ x: 0, y: 0, width: 20, height: 10 }} outset={2} />).children).toEqual(
      ir(<Ellipse center={[10, 5]} radius={{ x: 12, y: 7 }} />).children,
    );
  });

  it('部分椭圆可以闭合为扇形', () => {
    expect(
      ir(<Ellipse center={[0, 0]} radius={{ x: 15, y: 10 }} startAngle={0} endAngle={90} closed="sector" />).children,
    ).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="ellipsePath" radius={{ x: 15, y: 10 }} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });
});

describe('弧等效', () => {
  it('中心+半径+角度', () => {
    expect(ir(<Arc center={[0, 0]} radius={10} startAngle={0} endAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="arc" center={[0, 0]} startAngle={0} endAngle={90} radius={10} />
        </Path>,
      ).children,
    );
  });

  it('椭圆弧', () => {
    expect(ir(<Arc center={[0, 0]} radius={{ x: 15, y: 10 }} startAngle={0} endAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="arc" center={[0, 0]} startAngle={0} endAngle={90} radius={{ x: 15, y: 10 }} />
        </Path>,
      ).children,
    );
  });

  it('close="chord" 委托给 circlePath 和弦', () => {
    expect(ir(<Arc center={[0, 0]} radius={10} startAngle={0} endAngle={90} close="chord" />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="circlePath" radius={10} startAngle={0} endAngle={90} closed="chord" />
        </Path>,
      ).children,
    );
  });

  it('椭圆上的 close="sector" 委托给 ellipsePath 的扇形处理', () => {
    expect(
      ir(<Arc center={[0, 0]} radius={{ x: 15, y: 10 }} startAngle={0} endAngle={90} close="sector" />).children,
    ).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="ellipsePath" radius={{ x: 15, y: 10 }} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });
});

describe('扇区等效', () => {
  it('填充楔形使用 circlePath 扇形闭合（中心接受任何目标）', () => {
    expect(ir(<Sector center={[0, 0]} radius={10} startAngle={0} endAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="circlePath" radius={10} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });

  it('椭圆填充楔形采用 ellipsePath 扇形闭合', () => {
    expect(ir(<Sector center={[0, 0]} radius={{ x: 15, y: 10 }} startAngle={0} endAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="ellipsePath" radius={{ x: 15, y: 10 }} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });

  it('填充楔形接受节点 ID 中心', () => {
    expect(ir(<Sector center="hub" radius={10} startAngle={0} sweepAngle={90} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to="hub" />
          <Step kind="circlePath" radius={10} startAngle={0} endAngle={90} closed="sector" />
        </Path>,
      ).children,
    );
  });

  it('甜甜圈扇区', () => {
    const c: [number, number] = [0, 0];

    expect(ir(<Sector center={c} radius={60} innerRadius={30} startAngle={0} endAngle={90} />).children).toEqual(
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

describe('矩形等效', () => {
  it('{corner1,corner2}穿过', () => {
    expect(ir(<Rectangle corner1={[0, 0]} corner2={[10, 6]} />).children).toEqual(
      ir(
        <Path>
          <Step kind="move" to={[0, 0]} />
          <Step kind="rectangle" from={[0, 0]} to={[10, 6]} />
        </Path>,
      ).children,
    );
  });

  it('{ center, width, height } 标准化为角点', () => {
    expect(ir(<Rectangle center={[5, 3]} width={10} height={6} />).children).toEqual(
      ir(<Rectangle corner1={[0, 0]} corner2={[10, 6]} />).children,
    );
  });

  it('cornerRadius 穿过矩形步骤', () => {
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

describe('多边形等效', () => {
  it('边数=4', () => {
    const verts = polygonVertices([0, 0], 30, 30, 4, -90);

    expect(ir(<Polygon center={[0, 0]} radius={30} sides={4} />).children).toEqual(
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
    const verts = polygonVertices([0, 0], 30, 30, 6, -90);

    expect(verts).toHaveLength(6);
    expect(ir(<Polygon center={[0, 0]} radius={30} sides={6} />).children).toEqual(
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

  it('显式 rotate 只烘焙进顶点、不再透传给 Path（不二次旋转）', () => {
    const verts = polygonVertices([0, 0], 30, 30, 4, 30);
    const out = ir(<Polygon center={[0, 0]} radius={30} sides={4} rotate={30} />);

    expect(out.children).toEqual(
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
});

describe('星形等效', () => {
  it('五角星', () => {
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

    expect(ir(<Star center={[0, 0]} outerRadius={30} innerRadius={12} points={5} />).children).toEqual(hand.children);
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

    expect(ir(<Star center={[0, 0]} outerRadius={30} innerRadius={12} points={6} />).children).toEqual(hand.children);
  });

  it('显式 rotate 只烘焙进顶点、不再透传给 Path（不二次旋转）', () => {
    const verts = starVertices([0, 0], 30, 12, 5, 30);
    const hand = ir(
      <Path>
        <Step kind="move" to={verts[0]} />
        {verts.slice(1).map((v, i) => (
          <Step key={i} kind="line" to={v} />
        ))}
        <Step kind="cycle" />
      </Path>,
    );
    const out = ir(<Star center={[0, 0]} outerRadius={30} innerRadius={12} points={5} rotate={30} />);

    expect(out.children).toEqual(hand.children);
  });
});
