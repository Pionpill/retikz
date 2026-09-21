import { Draw, Layout, Node } from '@retikz/react';
import type { ComponentProps, FC } from 'react';

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
  <Layout nodeDistance={34.85}>
    <RoadmapNode id="title" position={[343.4, 17]} variant="title" width={170} height={34}>
      AI Expert in 2022
    </RoadmapNode>
    <RoadmapNode id="fundamentals" position={[343.4, 80.75]} variant="optional" width={76.5} height={25.5}>
      Fundamentals
    </RoadmapNode>
    <RoadmapNode id="choose" position={[343.4, 137.7]} variant="header" width={110.5} height={21.25}>
      Choose your path
    </RoadmapNode>

    <RoadmapNode id="required-header" position={[85, 29.75]} variant="header" width={136} height={19.125}>
      Required for any path
    </RoadmapNode>
    <RoadmapNode id="papers" position={[89.25, 57.8]} variant="required" width={178.5} height={25.5}>
      Papers With Code
    </RoadmapNode>
    <RoadmapNode
      id="git"
      position={{ direction: 'bottom', of: 'papers' }}
      variant="required"
      width={178.5}
      height={25.5}
    >
      GIT - Version Control
    </RoadmapNode>
    <RoadmapNode
      id="semver"
      position={{ direction: 'bottom', of: 'git' }}
      variant="required"
      width={178.5}
      height={25.5}
    >
      Semantic Versioning
    </RoadmapNode>
    <RoadmapNode
      id="changelog"
      position={{ direction: 'bottom', of: 'semver' }}
      variant="required"
      width={178.5}
      height={25.5}
    >
      Keep a Changelog
    </RoadmapNode>

    <RoadmapNode id="legend-header" position={[595, 30.6]} variant="header" width={68} height={17}>
      Legend
    </RoadmapNode>
    <RoadmapNode id="legend-blue" position={[599.25, 57.8]} variant="required" width={178.5} height={25.5}>
      Personal Recommendation!
    </RoadmapNode>
    <RoadmapNode
      id="legend-gray"
      position={{ direction: 'bottom', of: 'legend-blue' }}
      variant="optional"
      width={178.5}
      height={25.5}
    >
      Available Options
    </RoadmapNode>

    <RoadmapNode id="data-scientist" position={[268.6, 208.25]} variant="optional" width={94.35} height={25.5}>
      Data Scientist
    </RoadmapNode>
    <RoadmapNode
      id="machine-learning"
      position={{ direction: 'bottom', of: 'data-scientist', distance: 51.85 }}
      variant="optional"
      width={94.35}
      height={25.5}
    >
      Machine Learning
    </RoadmapNode>
    <RoadmapNode
      id="deep-learning"
      position={{ direction: 'bottom', of: 'machine-learning', distance: 51 }}
      variant="optional"
      width={94.35}
      height={25.5}
    >
      Deep Learning
    </RoadmapNode>
    <RoadmapNode id="data-engineer" position={[420.75, 208.25]} variant="optional" width={94.35} height={25.5}>
      Data Engineer
    </RoadmapNode>
    <RoadmapNode
      id="big-data-engineer"
      position={{ direction: 'bottom', of: 'data-engineer', distance: 51.85 }}
      variant="optional"
      width={94.35}
      height={25.5}
    >
      Big Data Engineer
    </RoadmapNode>

    <Draw way={['title', 'fundamentals']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />
    <Draw way={['fundamentals', 'choose']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />
    <Draw way={['data-scientist', 'machine-learning']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />
    <Draw way={['machine-learning', 'deep-learning']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />
    <Draw way={['data-engineer', 'big-data-engineer']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />
    <Draw
      way={['choose', { curve: [343.4, 170] }, [306, 165.75], { curve: [268.6, 161.5] }, 'data-scientist']}
      arrow="->"
      style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }}
    />
    <Draw
      way={['choose', { curve: [343.4, 170] }, [382.075, 165.75], { curve: [420.75, 161.5] }, 'data-engineer']}
      arrow="->"
      style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }}
    />

    {/* === Step 5：装饰层 ===
        1) 青色虚线"推荐路径"——3 段 curve 串成，{label} infix 修饰下一段；
           dashPattern=[6,6] 虚线 + arrow="<-" 把箭头放起点指向 Deep Learning */}
    <Draw
      way={[
        [214.098, 305.804],
        { label: { text: 'recommended', position: 0.2, side: 'left', distance: 16, font: { size: 12 } } },
        { curve: [170, 272] },
        [191.25, 204.85],
        { curve: [212.5, 137.7] },
        [277.95, 158.1],
        { curve: [343.4, 178.5] },
        'choose',
      ]}
      arrow="<-"
      style={{ stroke: EDGE_RECOMMEND, strokeWidth: 1.7, dashPattern: [5.1, 5.1] }}
    />

    {/* 2) "more bottom" 短虚线 — 4px 粗 + dashPattern [4,4] */}
    <Draw
      way={[
        [267.928, 328.95],
        [267.928, 371.45],
      ]}
      style={{ stroke: EDGE_BLUE, strokeWidth: 3.4, dashPattern: [3.4, 3.4] }}
    />
    <Draw
      way={[
        [420.078, 272.85],
        [420.078, 315.35],
      ]}
      style={{ stroke: EDGE_BLUE, strokeWidth: 3.4, dashPattern: [3.4, 3.4] }}
    />

    {/* 3) 红色 X — 2 条 4px 粗交叉线 */}
    <Draw
      way={[
        [164.9, 219.3],
        [207.4, 261.8],
      ]}
      style={{ stroke: EDGE_RED, strokeWidth: 3.4 }}
    />
    <Draw
      way={[
        [164.9, 261.8],
        [207.4, 219.3],
      ]}
      style={{ stroke: EDGE_RED, strokeWidth: 3.4 }}
    />
  </Layout>
);

export default Demo;
