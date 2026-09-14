import { Draw, Layout, Node } from '@retikz/react';
import type { ComponentProps, FC } from 'react';

import type { Lang } from '@/i18n';

import { aiRoadmapI18n } from './ai-roadmap.i18n';

const REQUIRED_FILL = '#1f6286';
const OPTIONAL_FILL = '#878787';
const LEAF_TEXT = '#ffffff';
const NODE_STROKE = '#000000';
const EDGE_BLUE = '#1f6286';
const EDGE_RECOMMEND = '#287fad';
const EDGE_RED = '#ff0000';
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
      cornerRadius={hasBox ? 4.5 : 0}
      style={{
        ...(fill === undefined ? {} : { fill }),
        stroke: hasBox ? NODE_STROKE : 'none',
        strokeWidth: hasBox ? 0.5 : 0,
        textColor: hasBox ? LEAF_TEXT : TITLE_TEXT,
        font: {
          ...SANS_FONT,
          size: isTitle ? 24 : isHeader ? 14 : 12,
          weight: isTitle || isHeader ? 'bold' : 'normal',
        },
      }}
      layout={{ padding: hasBox ? 5 : 4, minimumSize: { width, height } }}
    >
      {children}
    </Node>
  );
};

export type AiRoadmapProps = Readonly<{ lang?: Lang }>;

const Demo: FC<AiRoadmapProps> = props => {
  const { lang = 'zh' } = props;
  const i18n = aiRoadmapI18n[lang];

  return (
    <Layout nodeDistance={41}>
      <RoadmapNode id="title" position={[404, 20]} variant="title" width={200} height={40}>
        {i18n.title}
      </RoadmapNode>
      <RoadmapNode id="fundamentals" position={[404, 95]} variant="optional" width={90} height={30}>
        {i18n.fundamentals}
      </RoadmapNode>
      <RoadmapNode id="choose" position={[404, 162]} variant="header" width={130} height={25}>
        {i18n.choosePath}
      </RoadmapNode>

      <RoadmapNode id="required-header" position={[100, 35]} variant="header" width={160} height={22.5}>
        {i18n.requiredForAnyPath}
      </RoadmapNode>
      <RoadmapNode id="papers" position={[105, 68]} variant="required" width={210} height={30}>
        {i18n.papersWithCode}
      </RoadmapNode>
      <RoadmapNode id="git" position={{ direction: 'bottom', of: 'papers' }} variant="required" width={210} height={30}>
        {i18n.git}
      </RoadmapNode>
      <RoadmapNode id="semver" position={{ direction: 'bottom', of: 'git' }} variant="required" width={210} height={30}>
        {i18n.semanticVersioning}
      </RoadmapNode>
      <RoadmapNode
        id="changelog"
        position={{ direction: 'bottom', of: 'semver' }}
        variant="required"
        width={210}
        height={30}
      >
        {i18n.keepAChangelog}
      </RoadmapNode>

      <RoadmapNode id="legend-header" position={[700, 36]} variant="header" width={80} height={20}>
        {i18n.legend}
      </RoadmapNode>
      <RoadmapNode id="legend-blue" position={[705, 68]} variant="required" width={210} height={30}>
        {i18n.personalRecommendation}
      </RoadmapNode>
      <RoadmapNode
        id="legend-gray"
        position={{ direction: 'bottom', of: 'legend-blue' }}
        variant="optional"
        width={210}
        height={30}
      >
        {i18n.availableOptions}
      </RoadmapNode>

      <RoadmapNode id="data-scientist" position={[316, 245]} variant="optional" width={111} height={30}>
        {i18n.dataScientist}
      </RoadmapNode>
      <RoadmapNode
        id="machine-learning"
        position={{ direction: 'bottom', of: 'data-scientist', distance: 61 }}
        variant="optional"
        width={111}
        height={30}
      >
        {i18n.machineLearning}
      </RoadmapNode>
      <RoadmapNode
        id="deep-learning"
        position={{ direction: 'bottom', of: 'machine-learning', distance: 60 }}
        variant="optional"
        width={111}
        height={30}
      >
        {i18n.deepLearning}
      </RoadmapNode>
      <RoadmapNode id="data-engineer" position={[495, 245]} variant="optional" width={111} height={30}>
        {i18n.dataEngineer}
      </RoadmapNode>
      <RoadmapNode
        id="big-data-engineer"
        position={{ direction: 'bottom', of: 'data-engineer', distance: 61 }}
        variant="optional"
        width={111}
        height={30}
      >
        {i18n.bigDataEngineer}
      </RoadmapNode>

      <Draw way={['title', 'fundamentals']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 2 }} />
      <Draw way={['fundamentals', 'choose']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 2 }} />
      <Draw way={['data-scientist', 'machine-learning']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 2 }} />
      <Draw way={['machine-learning', 'deep-learning']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 2 }} />
      <Draw way={['data-engineer', 'big-data-engineer']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 2 }} />
      <Draw
        way={['choose', { curve: [404, 200] }, [360, 195], { curve: [316, 190] }, 'data-scientist']}
        arrow="->"
        style={{ stroke: EDGE_BLUE, strokeWidth: 2 }}
      />
      <Draw
        way={['choose', { curve: [404, 200] }, [449.5, 195], { curve: [495, 190] }, 'data-engineer']}
        arrow="->"
        style={{ stroke: EDGE_BLUE, strokeWidth: 2 }}
      />

      <Draw
        way={[
          [251.88, 359.77],
          { label: i18n.recommended },
          { curve: [200, 320] },
          [225, 241],
          { curve: [250, 162] },
          [327, 186],
          { curve: [404, 210] },
          'choose',
        ]}
        arrow="<-"
        style={{ stroke: EDGE_RECOMMEND, strokeWidth: 2, dashPattern: [6, 6] }}
      />

      <Draw
        way={[
          [315.21, 387],
          [315.21, 437],
        ]}
        style={{ stroke: EDGE_BLUE, strokeWidth: 4, dashPattern: [4, 4] }}
      />
      <Draw
        way={[
          [494.21, 321],
          [494.21, 371],
        ]}
        style={{ stroke: EDGE_BLUE, strokeWidth: 4, dashPattern: [4, 4] }}
      />

      <Draw
        way={[
          [194, 258],
          [244, 308],
        ]}
        style={{ stroke: EDGE_RED, strokeWidth: 4 }}
      />
      <Draw
        way={[
          [194, 308],
          [244, 258],
        ]}
        style={{ stroke: EDGE_RED, strokeWidth: 4 }}
      />
    </Layout>
  );
};

export default Demo;
