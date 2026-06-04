import type { IR } from '@retikz/core';
import { Plot, PointMark, buildPlotSpec } from '@retikz/plot-react';
import type { FC } from 'react';

import { useCarPerformance } from './line-scatter-fetch.data';

/** mark 声明：散点 马力 → 油耗。同一份 marks 既喂给下面 live <Plot>，又用来算静态 spec */
const marks = <PointMark x="horsepower" y="mpg" />;

/**
 * 图形描述 IR（Plot spec）：只描述「画什么」，与具体数据无关（数据是 ref，不进 IR）
 * @description 交互 demo 静态执行不了组件（hooks 会抛），故显式导出此 IR 供预览的 IR 视图展示；与 live 渲染同源（同一份 marks 经 buildPlotSpec）
 */
// eslint-disable-next-line react-refresh/only-export-components -- demo 内容文件经 glob 静态加载、非 HMR 热点；previewIR 与 marks 同源需同文件
export const previewIR: IR = { version: 1, type: 'scene', children: [buildPlotSpec(marks, 'cars')] };

/** 主文件只管「画什么」：取数（fetch / 清洗 / 状态）全在 line-scatter-fetch.data.ts 的 hook 里 */
const Demo: FC = () => {
  const { data, error } = useCarPerformance();

  if (error) return <div className="text-sm text-muted-foreground">加载失败：{error}</div>;
  if (!data) return <div className="text-sm text-muted-foreground">加载中…</div>;

  // 数据来自哪里对 <Plot> 透明：作图写法与本地数据完全一致
  return (
    <Plot data={data} width={480} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
      {marks}
    </Plot>
  );
};

export default Demo;
