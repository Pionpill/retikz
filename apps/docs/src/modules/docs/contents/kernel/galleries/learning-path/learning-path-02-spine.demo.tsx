import { Draw, Layout, Node } from '@retikz/react';
import type { ComponentProps, FC } from 'react';

const REQUIRED_FILL = '#1f6286';
const OPTIONAL_FILL = '#878787';
const LEAF_TEXT = '#ffffff';
const NODE_STROKE = '#000000';
const EDGE_BLUE = '#1f6286';
const TITLE_TEXT = 'currentColor';
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
  const fill = variant === 'required' ? REQUIRED_FILL : variant === 'optional' ? OPTIONAL_FILL : undefined;
  return (
    <Node
      id={id}
      position={position}
      shape="rectangle"
      cornerRadius={hasBox ? 3.825 : 0}
      style={{
        ...(fill === undefined ? {} : { fill }),
        stroke: hasBox ? NODE_STROKE : 'none',
        strokeWidth: hasBox ? 0.425 : 0,
        textColor: hasBox ? LEAF_TEXT : TITLE_TEXT,
        font: {
          ...SANS_FONT,
          size: isTitle ? 24 : isHeader ? 14 : 12,
          weight: isTitle || isHeader ? 'bold' : 'normal',
        },
      }}
      layout={{ padding: hasBox ? 4.25 : 3.4, minimumSize: { width, height } }}
    >
      {children}
    </Node>
  );
};

const Demo: FC = () => (
  <Layout>
    <RoadmapNode id="title" position={[343.4, 17]} variant="title" width={170} height={34}>
      AI Expert in 2022
    </RoadmapNode>
    <RoadmapNode id="fundamentals" position={[343.4, 80.75]} variant="optional" width={76.5} height={25.5}>
      Fundamentals
    </RoadmapNode>
    <RoadmapNode id="choose" position={[343.4, 137.7]} variant="header" width={110.5} height={21.25}>
      Choose your path
    </RoadmapNode>

    {/* Step 2: 中段 spine —— 2 条 line。
        Sugar Draw way 数组：[源 id, 目标 id]，retikz 自动用节点 id 解析锚点 */}
    <Draw way={['title', 'fundamentals']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />
    <Draw way={['fundamentals', 'choose']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />
  </Layout>
);

export default Demo;
