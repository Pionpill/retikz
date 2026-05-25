import type { ComponentProps, FC } from 'react';
import { Layout, Node } from '@retikz/react';

// 配色 — 节点底 / 边 / 必填白字用字面色（离线 SVG 下不会变黑）；
// title / header 的黑字用 currentColor，跟随主题 light / dark 自适应
const REQUIRED_FILL = '#1f6286';
const OPTIONAL_FILL = '#878787';
const LEAF_TEXT = '#ffffff';
const NODE_STROKE = '#000000';
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

/** Roadmap 节点 — 4 variant 复用 shape / 圆角 / 字体；按 variant 选色和字号 */
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
      roundedCorners={hasBox ? 4.5 : 0}
      fill={fill}
      stroke={hasBox ? NODE_STROKE : 'none'}
      strokeWidth={hasBox ? 0.5 : 0}
      textColor={hasBox ? LEAF_TEXT : TITLE_TEXT}
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
    {/* 标题：白底（无 fill）、24px 加粗黑字，居中顶部。
        位置 (404, 20) + 宽 200 × 高 40 完全复刻 intro.svg 的 (304, 0, 200×40) 标题框 */}
    <RoadmapNode id="title" position={[404, 20]} variant="title" width={200} height={40}>
      AI Expert in 2022
    </RoadmapNode>
  </Layout>
);

export default Demo;
