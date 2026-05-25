import type { ComponentProps, FC } from 'react';
import { Draw, Layout, Node } from '@retikz/react';

const SANS_FONT = { family: 'Helvetica, Arial, sans-serif' };

type RoadmapNodeProps = {
  id?: string;
  position: ComponentProps<typeof Node>['position'];
  variant?: 'title' | 'header' | 'required' | 'optional';
  width?: number;
  height?: number;
  children: string;
};

const RoadmapNode: FC<RoadmapNodeProps> = ({ id, position, variant = 'required', width, height, children }) => {
  const isTitle = variant === 'title';
  const isHeader = variant === 'header';
  const hasBox = !isTitle && !isHeader;
  const fill = variant === 'required' ? 'blue' : variant === 'optional' ? 'gray' : undefined;
  return (
    <Node
      id={id}
      position={position}
      shape="rectangle"
      roundedCorners={hasBox ? 4.5 : 0}
      fill={fill}
      stroke={hasBox ? 'currentColor' : 'none'}
      strokeWidth={hasBox ? 0.5 : 0}
      textColor={hasBox ? 'currentColor' : 'currentColor'}
      font={{ ...SANS_FONT, size: isTitle ? 24 : isHeader ? 14 : 12, weight: isTitle || isHeader ? 'bold' : 'normal' }}
      padding={hasBox ? 5 : 4}
      minimumWidth={width}
      minimumHeight={height}
    >
      {children}
    </Node>
  );
};

const Demo: FC = () => (
  <Layout width={811} height={441}>
    <RoadmapNode id="title" position={[404, 20]} variant="title" width={200} height={40}>
      AI Expert in 2022
    </RoadmapNode>
    <RoadmapNode id="fundamentals" position={[404, 95]} variant="optional" width={90} height={30}>
      Fundamentals
    </RoadmapNode>
    <RoadmapNode id="choose" position={[404, 162]} variant="header" width={130} height={25}>
      Choose your path
    </RoadmapNode>

    {/* Step 2: 中段 spine —— 2 条 line。
        Sugar Draw way 数组：[源 id, 目标 id]，retikz 自动用节点 id 解析锚点 */}
    <Draw way={['title', 'fundamentals']} stroke="blue" strokeWidth={2} arrow="->" />
    <Draw way={['fundamentals', 'choose']} stroke="blue" strokeWidth={2} arrow="->" />
  </Layout>
);

export default Demo;
