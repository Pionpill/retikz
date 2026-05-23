import type { ComponentProps, FC } from 'react';
import { Draw, Layout, Node } from '@retikz/react';

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
  <Layout width={811} height={441} nodeDistance={41}>
    <RoadmapNode id="title" position={[404, 20]} variant="title" width={200} height={40}>
      AI Expert in 2022
    </RoadmapNode>
    <RoadmapNode id="fundamentals" position={[404, 95]} variant="optional" width={90} height={30}>
      Fundamentals
    </RoadmapNode>
    <RoadmapNode id="choose" position={[404, 162]} variant="header" width={130} height={25}>
      Choose your path
    </RoadmapNode>

    <Draw way={['title', 'fundamentals']} stroke={EDGE_BLUE} strokeWidth={2} arrow="->" />
    <Draw way={['fundamentals', 'choose']} stroke={EDGE_BLUE} strokeWidth={2} arrow="->" />

    {/* === Step 3：两侧色块条 ===
        左侧 "Required for any path" 列 —— 4 蓝色按钮紧贴堆叠；
        段头 papers 用绝对坐标，剩 3 个用 AtPosition direction=below，
        靠 <Layout nodeDistance={41}> 自动按 intro.svg 的 41 间隔堆叠 */}

    <RoadmapNode id="required-header" position={[100, 35]} variant="header" width={160} height={22.5}>
      Required for any path
    </RoadmapNode>
    <RoadmapNode id="papers" position={[105, 68]} variant="required" width={210} height={30}>
      Papers With Code
    </RoadmapNode>
    <RoadmapNode id="git" position={{ direction: 'below', of: 'papers' }} variant="required" width={210} height={30}>
      GIT - Version Control
    </RoadmapNode>
    <RoadmapNode id="semver" position={{ direction: 'below', of: 'git' }} variant="required" width={210} height={30}>
      Semantic Versioning
    </RoadmapNode>
    <RoadmapNode id="changelog" position={{ direction: 'below', of: 'semver' }} variant="required" width={210} height={30}>
      Keep a Changelog
    </RoadmapNode>

    {/* Legend 列：header + 1 蓝 + 1 灰，作图例 */}
    <RoadmapNode id="legend-header" position={[700, 36]} variant="header" width={80} height={20}>
      Legend
    </RoadmapNode>
    <RoadmapNode id="legend-blue" position={[705, 68]} variant="required" width={210} height={30}>
      Personal Recommendation!
    </RoadmapNode>
    <RoadmapNode id="legend-gray" position={{ direction: 'below', of: 'legend-blue' }} variant="optional" width={210} height={30}>
      Available Options
    </RoadmapNode>
  </Layout>
);

export default Demo;
