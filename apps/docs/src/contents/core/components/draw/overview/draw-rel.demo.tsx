import { Draw, DrawWay, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * { position, type: DrawWay.Relative | DrawWay.Accumulate } 的 sugar 对象形态
 * 与裸字符串 `'+dx,dy'` / `'++dx,dy'` 完全等价，但更适合 IDE：position 元组与
 * type 鉴别字段都受 TS 校验，编辑器可补全。
 *
 * 实线（Relative）每段都从同一锚点 (20, 60) 解析 → L 形；
 * 虚线（Accumulate）累积推进 prevEnd → 阶梯形。
 */
const Demo: FC = () => (
  <Tikz width={320} height={200}>
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
      strokeDasharray="4 2"
    />
  </Tikz>
);

export default Demo;
