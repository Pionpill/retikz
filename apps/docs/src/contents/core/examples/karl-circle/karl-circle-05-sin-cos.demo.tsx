import { Fragment } from 'react';
import type { FC } from 'react';
import { Circle, Coordinate, Draw, Grid, Layout, Sector } from '@retikz/react';
import { TexNode, useLowerTex } from '@retikz/tex/react';

const COS30 = Math.cos((30 * Math.PI) / 180);

const Demo: FC = () => {
  const lowerTex = useLowerTex();
  return (
    <Layout width={600} height={360} lowerTex={lowerTex}>
      {/* 背景网格 */}
      <Grid corner1={[-100, -100]} corner2={[100, 100]} step={50} stroke="lightgray" strokeWidth={0.5} />

      {/* 单位圆 */}
      <Circle center={[0, 0]} radius={100} lineCap="round" />

      {/* 坐标轴 */}
      <Draw way={[[-150, 0], [150, 0]]} arrow="->" />
      <TexNode position={[162, 0]} stroke="none" padding={0}>
        {'x'}
      </TexNode>
      <Coordinate id="x-axis" position={[150, 0]} />
      <Draw way={[[0, 150], [0, -150]]} arrow="->" />
      <TexNode position={[0, -162]} stroke="none" padding={0}>
        {'y'}
      </TexNode>
      <Coordinate id="y-axis" position={[0, -150]} />

      {/* 刻度 */}
      {[
        { x: -100, tex: '-1' },
        { x: -50, tex: '-\\frac{1}{2}' },
        { x: 100, tex: '1' },
      ].map(({ x, tex }) => (
        <Fragment key={`tx-${x}`}>
          <Draw way={[[x, -3], [x, 3]]} />
          <TexNode position={[x - 10, 14]} stroke="none" padding={1}>
            {tex}
          </TexNode>
        </Fragment>
      ))}
      {[
        { y: 100, tex: '-1' },
        { y: 50, tex: '-\\frac{1}{2}' },
        { y: -50, tex: '\\frac{1}{2}' },
        { y: -100, tex: '1' },
      ].map(({ y, tex }) => (
        <Fragment key={`ty-${y}`}>
          <Draw way={[[-3, y], [3, y]]} />
          <TexNode position={[-18, y + 10]} stroke="none" padding={1}>
            {tex}
          </TexNode>
        </Fragment>
      ))}

      {/* 30° 扇形 + α */}
      <Sector center={[0, 0]} radius={30} startAngle={0} endAngle={-30} fill="lightgray" stroke="green" />
      <TexNode position={{ angle: -15, radius: 22 }} stroke="none" textColor="green" padding={1}>
        {'\\alpha'}
      </TexNode>

      {/* sin α 红色竖线：从圆周 (30°, 100px) 垂直落到 x 轴投影点 (cos30·100, 0)
          IR 还没投影 target，手算投影坐标兜底；边标注是 Draw way 内的 text 算子（行内混排 ADR-03 延后，
          这里仍是纯文本，不走 tex） */}
      <Draw
        way={[{ angle: -30, radius: 100 }, { label: { text: 'sin α', side: 'left' } }, [COS30 * 100, 0]]}
        stroke="red"
        thickness="thick"
      />

      {/* cos α 蓝色横线：投影点 → 原点 */}
      <Draw
        way={[[COS30 * 100, 0], { label: { text: 'cos α', side: 'below' } }, [0, 0]]}
        stroke="dodgerblue"
        thickness="thick"
      />
    </Layout>
  );
};

export default Demo;
