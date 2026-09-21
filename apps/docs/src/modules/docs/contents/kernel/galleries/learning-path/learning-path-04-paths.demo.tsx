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

    <Draw way={['title', 'fundamentals']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />
    <Draw way={['fundamentals', 'choose']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />

    {/* === Step 4：5 个 Path 按钮（2 子列 3 + 2）+ 段间 / 段内连线 ===
        段头 (316, 245) / (495, 245) 绝对坐标；子列内 AtPosition 紧贴堆叠（distance 61 / 60） */}

    {/* Left sub-col */}
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

    {/* Right sub-col */}
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

    {/* 子列内 3 条短直线：Draw way=[源 id, 目标 id]，retikz 自动锚到节点边框 */}
    <Draw way={['data-scientist', 'machine-learning']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />
    <Draw way={['machine-learning', 'deep-learning']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />
    <Draw way={['data-engineer', 'big-data-engineer']} arrow="->" style={{ stroke: EDGE_BLUE, strokeWidth: 1.7 }} />

    {/* Choose → 2 子列段顶的合并曲线：way 数组中 { curve: [cx, cy] } infix 算子修饰下一段；
        2 段 quadratic 串联（对应 intro.svg path d= 里的 M ... Q ... Q ...） */}
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
  </Layout>
);

export default Demo;
