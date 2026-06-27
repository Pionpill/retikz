import { Circle, Draw, DrawWay, Ellipse, Layout, Node, Rectangle } from '@retikz/react';
import type { FC } from 'react';

const IHW = 28; // 内框半宽（共享）
const IHH = 17; // 内框半高（共享）
const CHW = 20; // 内容盒半宽
const CHH = 10; // 内容盒半高
const ROW1 = -56;
const ROW2 = 56;
const L1 = -2; // 第一行标签
const L2 = 112; // 第二行标签
const SHAPE = { fill: 'none', stroke: 'darkorange', strokeWidth: 2 } as const;
const STROKE = { stroke: 'darkorange', strokeWidth: 2 } as const;
const LABEL = { stroke: 'none', textColor: 'gray' } as const;

// 第一行前三个、第二行后两个；宽的 diamond 放行末
const C = { rect: -150, ellipse: 0, diamond: 150, polygon: -75, circle: 75 };
const R1 = [C.rect, C.ellipse, C.diamond];
const R2 = [C.polygon, C.circle];

// diamond / pentagon 顶点（绕原点），circumscribe 共享内框；用 cycle 闭合，不复制首顶点
const DIAMOND: Array<[number, number]> = [[0, -IHH * 2], [IHW * 2, 0], [0, IHH * 2], [-IHW * 2, 0]];
const PENTAGON: Array<[number, number]> = [[0, -39.4], [37.47, -12.18], [23.16, 31.87], [-23.16, 31.87], [-37.47, -12.18]];
const shift = (cx: number, cy: number, pts: Array<[number, number]>): Array<[number, number]> =>
  pts.map(([x, y]): [number, number] => [cx + x, cy + y]);

const Demo: FC = () => (
  <Layout width={560} height={271} viewBox={{ x: -225, y: -96, width: 450, height: 218 }} style={{ maxWidth: '100%', height: 'auto' }}>
    {/* 内容盒（灰块）—— 共享 */}
    {R1.map(cx => (
      <Rectangle key={`c1-${cx}`} center={[cx, ROW1]} width={CHW * 2} height={CHH * 2} fill="lightgray" stroke="none" />
    ))}
    {R2.map(cx => (
      <Rectangle key={`c2-${cx}`} center={[cx, ROW2]} width={CHW * 2} height={CHH * 2} fill="lightgray" stroke="none" />
    ))}

    {/* shape 轮廓（darkorange），以内框为准 circumscribe */}
    <Rectangle center={[C.rect, ROW1]} width={IHW * 2} height={IHH * 2} {...SHAPE} />
    <Ellipse center={[C.ellipse, ROW1]} radiusX={IHW * Math.SQRT2} radiusY={IHH * Math.SQRT2} {...SHAPE} />
    <Draw way={[...shift(C.diamond, ROW1, DIAMOND), DrawWay.Cycle]} {...STROKE} />
    <Draw way={[...shift(C.polygon, ROW2, PENTAGON), DrawWay.Cycle]} {...STROKE} />
    <Circle center={[C.circle, ROW2]} radius={Math.sqrt(IHW ** 2 + IHH ** 2)} {...SHAPE} />

    {/* 内框（虚线）—— 共享，置顶可见 */}
    {R1.map(cx => (
      <Rectangle key={`f1-${cx}`} center={[cx, ROW1]} width={IHW * 2} height={IHH * 2} fill="none" stroke="currentColor" dashPattern={[4, 3]} />
    ))}
    {R2.map(cx => (
      <Rectangle key={`f2-${cx}`} center={[cx, ROW2]} width={IHW * 2} height={IHH * 2} fill="none" stroke="currentColor" dashPattern={[4, 3]} />
    ))}

    {/* 标签 */}
    <Node id="l-rect" position={[C.rect, L1]} {...LABEL}>
      rectangle
    </Node>
    <Node id="l-ellipse" position={[C.ellipse, L1]} {...LABEL}>
      ellipse
    </Node>
    <Node id="l-diamond" position={[C.diamond, L1]} {...LABEL}>
      diamond
    </Node>
    <Node id="l-polygon" position={[C.polygon, L2]} {...LABEL}>
      polygon
    </Node>
    <Node id="l-circle" position={[C.circle, L2]} {...LABEL}>
      circle
    </Node>
  </Layout>
);

export default Demo;
