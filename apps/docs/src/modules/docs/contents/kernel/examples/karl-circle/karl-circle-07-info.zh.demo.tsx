import type { FC } from 'react';

import { Circle, Coordinate, Draw, Layout, Node, Sector } from '@retikz/react';
import { Grid } from '@retikz/standard-react';
import { useLowerTex } from '@retikz/tex/react';
import { Fragment } from 'react';

import type { PreviewSourceConfig } from '@/modules/docs/components/component-preview';

const COS30 = Math.cos((30 * Math.PI) / 180);
const SIN30 = Math.sin((30 * Math.PI) / 180);
const TAN30 = SIN30 / COS30;

export const previewSource = {
  deriveIR: false,
} satisfies PreviewSourceConfig;

/** 右侧说明框：每行常规文字 + `$...$` 公式混排，线名按颜色着色（对照 tikz.dev/tutorial 的 information text） */
const LEGEND = [
  { runs: [{ text: '角 ' }, { tex: '\\alpha = 30^\\circ = \\frac{\\pi}{6}' }] },
  { runs: [{ text: '红线', fill: 'red' }, { text: ' ' }, { tex: '\\sin\\alpha = \\frac{1}{2}' }] },
  { runs: [{ text: '蓝线', fill: 'dodgerblue' }, { text: ' ' }, { tex: '\\cos\\alpha = \\frac{\\sqrt{3}}{2}' }] },
  {
    runs: [
      { text: '橙线', fill: 'darkorange' },
      { text: ' ' },
      { tex: '\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha} = \\frac{1}{\\sqrt{3}}' },
    ],
  },
];

const Demo: FC = () => {
  const lowerTex = useLowerTex();
  return (
    <Layout width={720} height={360} lowerTex={lowerTex}>
      {/* 背景网格 */}
      <Grid
        bounds={{ min: [-100, -100], max: [100, 100] }}
        spacing={50}
        lines={{ style: { stroke: 'lightgray', strokeWidth: 0.5 } }}
      />

      {/* 单位圆 */}
      <Circle center={[0, 0]} radius={100} lineCap="round" />

      {/* 坐标轴 */}
      <Draw
        way={[
          [-150, 0],
          [150, 0],
        ]}
        arrow="->"
      />
      <Node position={[162, 0]} stroke="none" padding={0}>
        {'$x$'}
      </Node>
      <Coordinate id="x-axis" position={[150, 0]} />
      <Draw
        way={[
          [0, 150],
          [0, -150],
        ]}
        arrow="->"
      />
      <Node position={[0, -162]} stroke="none" padding={0}>
        {'$y$'}
      </Node>
      <Coordinate id="y-axis" position={[0, -150]} />

      {/* 刻度 */}
      {[
        { x: -100, tex: '$-1$' },
        { x: -50, tex: '$-\\frac{1}{2}$' },
        { x: 100, tex: '$1$' },
      ].map(({ x, tex }) => (
        <Fragment key={`tx-${x}`}>
          <Draw
            way={[
              [x, -3],
              [x, 3],
            ]}
          />
          <Node position={[x - 10, 14]} stroke="none" padding={1}>
            {tex}
          </Node>
        </Fragment>
      ))}
      {[
        { y: 100, tex: '$-1$' },
        { y: 50, tex: '$-\\frac{1}{2}$' },
        { y: -50, tex: '$\\frac{1}{2}$' },
        { y: -100, tex: '$1$' },
      ].map(({ y, tex }) => (
        <Fragment key={`ty-${y}`}>
          <Draw
            way={[
              [-3, y],
              [3, y],
            ]}
          />
          <Node position={[-18, y + 10]} stroke="none" padding={1}>
            {tex}
          </Node>
        </Fragment>
      ))}

      {/* 30° 扇形 + α */}
      <Sector center={[0, 0]} radius={30} startAngle={0} endAngle={-30} fill="lightgray" stroke="green" />
      <Node position={{ angle: -15, radius: 22 }} stroke="none" textColor="green" padding={1}>
        {'$\\alpha$'}
      </Node>

      {/* sin α / cos α / tan α —— 边标注用 `$...$` 行内公式 */}
      <Draw
        way={[{ angle: -30, radius: 100 }, { label: { text: '$\\sin\\alpha$', side: 'left' } }, [COS30 * 100, 0]]}
        stroke="red"
        thickness="thick"
      />
      <Draw
        way={[[COS30 * 100, 0], { label: { text: '$\\cos\\alpha$', side: 'bottom' } }, [0, 0]]}
        stroke="dodgerblue"
        thickness="thick"
      />
      <Draw
        way={[
          [100, 0],
          { label: { text: '$\\tan\\alpha = \\frac{\\sin\\alpha}{\\cos\\alpha}$', side: 'right' } },
          [100, -TAN30 * 100],
        ]}
        stroke="darkorange"
        thickness="thick"
      />
      <Coordinate id="t" position={[100, -TAN30 * 100]} />
      <Draw way={[[0, 0], 't']} />

      {/* 右侧说明框：浅灰虚线框 + 文字与公式混排，每行一个 `{ runs }` */}
      <Node
        position={[400, 0]}
        shape="rectangle"
        stroke="lightgray"
        dashed
        cornerRadius={6}
        padding={{ x: 12, y: 8 }}
        align="start"
        text={LEGEND}
      />
    </Layout>
  );
};

export default Demo;
