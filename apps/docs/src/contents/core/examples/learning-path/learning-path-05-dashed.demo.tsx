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
  <Layout width={811} height={441} nodeDistance={41}>
    <RoadmapNode id="title" position={[404, 20]} variant="title" width={200} height={40}>AI Expert in 2022</RoadmapNode>
    <RoadmapNode id="fundamentals" position={[404, 95]} variant="optional" width={90} height={30}>Fundamentals</RoadmapNode>
    <RoadmapNode id="choose" position={[404, 162]} variant="header" width={130} height={25}>Choose your path</RoadmapNode>

    <RoadmapNode id="required-header" position={[100, 35]} variant="header" width={160} height={22.5}>Required for any path</RoadmapNode>
    <RoadmapNode id="papers" position={[105, 68]} variant="required" width={210} height={30}>Papers With Code</RoadmapNode>
    <RoadmapNode id="git" position={{ direction: 'below', of: 'papers' }} variant="required" width={210} height={30}>GIT - Version Control</RoadmapNode>
    <RoadmapNode id="semver" position={{ direction: 'below', of: 'git' }} variant="required" width={210} height={30}>Semantic Versioning</RoadmapNode>
    <RoadmapNode id="changelog" position={{ direction: 'below', of: 'semver' }} variant="required" width={210} height={30}>Keep a Changelog</RoadmapNode>

    <RoadmapNode id="legend-header" position={[700, 36]} variant="header" width={80} height={20}>Legend</RoadmapNode>
    <RoadmapNode id="legend-blue" position={[705, 68]} variant="required" width={210} height={30}>Personal Recommendation!</RoadmapNode>
    <RoadmapNode id="legend-gray" position={{ direction: 'below', of: 'legend-blue' }} variant="optional" width={210} height={30}>Available Options</RoadmapNode>

    <RoadmapNode id="data-scientist" position={[316, 245]} variant="optional" width={111} height={30}>Data Scientist</RoadmapNode>
    <RoadmapNode id="machine-learning" position={{ direction: 'below', of: 'data-scientist', distance: 61 }} variant="optional" width={111} height={30}>Machine Learning</RoadmapNode>
    <RoadmapNode id="deep-learning" position={{ direction: 'below', of: 'machine-learning', distance: 60 }} variant="optional" width={111} height={30}>Deep Learning</RoadmapNode>
    <RoadmapNode id="data-engineer" position={[495, 245]} variant="optional" width={111} height={30}>Data Engineer</RoadmapNode>
    <RoadmapNode id="big-data-engineer" position={{ direction: 'below', of: 'data-engineer', distance: 61 }} variant="optional" width={111} height={30}>Big Data Engineer</RoadmapNode>

    <Draw way={['title', 'fundamentals']} stroke="blue" strokeWidth={2} arrow="->" />
    <Draw way={['fundamentals', 'choose']} stroke="blue" strokeWidth={2} arrow="->" />
    <Draw way={['data-scientist', 'machine-learning']} stroke="blue" strokeWidth={2} arrow="->" />
    <Draw way={['machine-learning', 'deep-learning']} stroke="blue" strokeWidth={2} arrow="->" />
    <Draw way={['data-engineer', 'big-data-engineer']} stroke="blue" strokeWidth={2} arrow="->" />
    <Draw
      way={['choose', { curve: [404, 200] }, [360, 195], { curve: [316, 190] }, 'data-scientist']}
      stroke="blue" strokeWidth={2} arrow="->"
    />
    <Draw
      way={['choose', { curve: [404, 200] }, [449.5, 195], { curve: [495, 190] }, 'data-engineer']}
      stroke="blue" strokeWidth={2} arrow="->"
    />

    {/* === Step 5：装饰层 ===
        1) 青色虚线"推荐路径"——3 段 curve 串成，{label} infix 修饰下一段；
           dashPattern=[6,6] 虚线 + arrow="<-" 把箭头放起点指向 Deep Learning */}
    <Draw
      way={[
        [251.88, 359.77],
        { label: 'recommended' },
        { curve: [200, 320] }, [225, 241],
        { curve: [250, 162] }, [327, 186],
        { curve: [404, 210] }, 'choose',
      ]}
      stroke="blue"
      strokeWidth={2}
      dashPattern={[6, 6]}
      arrow="<-"
    />

    {/* 2) "more below" 短虚线 — 4px 粗 + dashPattern [4,4] */}
    <Draw way={[[315.21, 387], [315.21, 437]]} stroke="blue" strokeWidth={4} dashPattern={[4, 4]} />
    <Draw way={[[494.21, 321], [494.21, 371]]} stroke="blue" strokeWidth={4} dashPattern={[4, 4]} />

    {/* 3) 红色 X — 2 条 4px 粗交叉线 */}
    <Draw way={[[194, 258], [244, 308]]} stroke="red" strokeWidth={4} />
    <Draw way={[[194, 308], [244, 258]]} stroke="red" strokeWidth={4} />
  </Layout>
);

export default Demo;
