import { Draw, DrawWay, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * way 末尾用 `DrawWay.cycle` 闭合，配合 `fill` 填色——半透明色 + 同色 stroke
 * 是 UML / 流程图常用配色。
 */
const Demo: FC = () => (
  <Tikz width={360} height={160}>
    {/* 蓝色填充三角形 */}
    <Draw
      way={[[20, 20], [100, 20], [60, 110], DrawWay.cycle]}
      fill="#3b82f680"
      stroke="#3b82f6"
      strokeWidth={2}
    />
    {/* 绿色填充菱形 */}
    <Draw
      way={[[180, 65], [230, 20], [280, 65], [230, 110], DrawWay.cycle]}
      fill="#10b98180"
      stroke="#10b981"
      strokeWidth={2}
    />
  </Tikz>
);

export default Demo;
