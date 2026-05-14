import { Draw, DrawWay, TikZ } from '@retikz/react';
import type { FC } from 'react';

/**
 * `{ position, type }` sugar 对象 vs 裸字符串
 * @description 与 `'+dx,dy'` / `'++dx,dy'` 等价但 TS 类型友好；实线 Relative 每段都从同一锚点解析（L 形），虚线 Accumulate 累积推进 prevEnd（阶梯形）。
 */
const Demo: FC = () => (
  <TikZ width={320} height={200}>
    <Draw
      way={[
        [20, 60],
        { position: [80, 0], type: DrawWay.Relative },
        { position: [80, 40], type: DrawWay.Relative },
      ]}
    />
    <Draw
      way={[
        [20, 140],
        { position: [80, 0], type: DrawWay.Accumulate },
        { position: [80, 40], type: DrawWay.Accumulate },
      ]}
      dashPattern={[4, 2]}
    />
  </TikZ>
);

export default Demo;
