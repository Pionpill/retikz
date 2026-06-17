import type { FC } from 'react';
import { Node, type NodeProps } from '@retikz/react';

/** `<Math>` props：除 `text` / `children` / `math` 外继承全部 `<Node>` props（position / shape / fill / shadow…），加 tex / displayMode */
export type MathProps = Omit<NodeProps, 'math' | 'text' | 'children'> & {
  /** LaTeX 公式源，如 `\frac{a}{b}` */
  tex: string;
  /** 块级（display）度量；缺省行内（false） */
  displayMode?: boolean;
};

/**
 * `<Math>` —— LaTeX 公式节点 sugar，展开为 `<Node math={{ tex, displayMode }}>`
 * @description 复用 Node 全套几何（position / compass anchor / 连线 / shadow / blend）。无 shape = 独立公式块（A）；
 *   配 `shape` = 带框公式（B）。需上层 `<Layout lowerMath={useLowerMath()}>` 注入 MathJax 渲染能力。
 */
export const Math: FC<MathProps> = props => {
  const { tex, displayMode, ...rest } = props;
  return <Node {...rest} math={displayMode === undefined ? { tex } : { tex, displayMode }} />;
};
