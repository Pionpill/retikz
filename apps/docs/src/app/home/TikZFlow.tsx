import useTheme from '@/hooks/useTheme';
import { Draw, Node, Tikz } from '@retikz/react';
import type { FC } from 'react';

/**
 * 首页关系图。
 * 注：v0.1 alpha 暂未实现 PathNode（边上文字）/ endArrow / 节点配色等，
 * 当前为最小可视化版本，待 @retikz/react 能力齐全后再补。
 */
const TikZFlow: FC = () => {
  // 引入 useTheme 仅为保留首页主题响应能力，后续 fill 主题化时使用
  useTheme();

  return (
    <Tikz width={400} height={125}>
      <Node id="tikz" position={[50, 100]}>tikz</Node>
      <Node id="React" position={[175, 100]}>React</Node>
      <Node id="d3" position={[175, 25]}>d3</Node>
      <Node id="retikz" position={[350, 100]}>retikz</Node>
      <Draw way={['tikz', 'React']} stroke="silver" strokeDasharray="4 2" />
      <Draw way={['d3', 'React']} stroke="silver" />
      <Draw way={['React', 'retikz']} stroke="silver" />
    </Tikz>
  );
};

export default TikZFlow;
