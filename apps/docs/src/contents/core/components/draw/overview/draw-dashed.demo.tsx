import { Draw, Node, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * 描边样式变体并排
 * @description 每行一个 stroke / strokeWidth / dashPattern 组合，左端 Node 当 row 标签，右端纯坐标终点。
 */
const Demo: FC = () => (
  <TikZ width={420} height={200}>
    <Node id="r1" position={[0, 0]}>
      默认
    </Node>
    <Node id="r2" position={[0, 30]}>
      着色
    </Node>
    <Node id="r3" position={[0, 60]}>
      加粗
    </Node>
    <Node id="r4" position={[0, 90]}>
      虚线
    </Node>
    <Node id="r5" position={[0, 120]}>
      点线
    </Node>

    {/* 默认：currentColor + 1px 实线 */}
    <Draw way={['r1', [320, 0]]} />
    {/* 自定义颜色 */}
    <Draw way={['r2', [320, 30]]} stroke="#3b82f6" strokeWidth={2} />
    {/* 加粗 */}
    <Draw way={['r3', [320, 60]]} strokeWidth={4} />
    {/* 虚线 */}
    <Draw way={['r4', [320, 90]]} stroke="#10b981" strokeWidth={2} dashPattern="6 3" />
    {/* 点线 */}
    <Draw way={['r5', [320, 120]]} stroke="#f97316" strokeWidth={2} dashPattern="1 4" />
  </TikZ>
);

export default Demo;
