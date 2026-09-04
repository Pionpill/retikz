import type { FC } from 'react';

import { FlowEntity, FlowRelation } from '@retikz/diagram-react/flow';

import { PreviewFlowDiagram as FlowDiagram } from '@/modules/docs/components/component-preview/theme';

const textOnly = { fill: 'none', stroke: 'none' } as const;
const planned = { ...textOnly, textColor: 'gray' } as const;

/** 简介页由 Flow Source 自动布局的“IR 居中”逻辑图 */
const Demo: FC = () => (
  <FlowDiagram
    width={760}
    height="auto"
    style={{ maxWidth: '100%', height: 'auto' }}
    presentation={{ description: '灰色 = 计划中未支持' }}
    diagramTheme={{ presentation: { description: { textColor: 'gray', font: { size: 12 } } } }}
    flowTheme={{
      layout: { direction: 'right', nodeGap: 14, rankGap: 38 },
      entity: { style: textOnly },
      relation: { style: { stroke: 'gray', strokeWidth: 1 } },
    }}
  >
    <FlowEntity id="sugar" text="Sugar JSX" rank={0} />
    <FlowEntity id="kernel" text="Kernel JSX" rank={0} />
    <FlowEntity id="dsl" text="Text DSL*" rank={0} style={planned} />
    <FlowEntity id="ai" text="AI / LLM" rank={0} />
    <FlowEntity id="ir" text="IR (JSON)" rank={1} />
    <FlowEntity id="scene" text="Scene" rank={2} />
    <FlowEntity id="persist" text="持久化 / 编辑" rank={2} />
    <FlowEntity id="react" text="React + SVG" rank={3} />
    <FlowEntity id="svg" text="pure SVG 字符串" rank={3} />
    <FlowEntity id="canvas" text="Canvas" rank={3} />
    <FlowEntity id="native" text="Native (Skia/RN) / PDF" rank={3} style={planned} />
    <FlowEntity id="raster" text="PNG/JPEG/WebP" rank={4} />

    <FlowRelation source="sugar" target="ir" />
    <FlowRelation source="kernel" target="ir" />
    <FlowRelation source="dsl" target="ir" style={{ stroke: 'gray' }} />
    <FlowRelation source="ai" target="ir" />
    <FlowRelation source="ir" target="scene" />
    <FlowRelation source="ir" target="persist" direction="both" />
    <FlowRelation source="scene" target="react" />
    <FlowRelation source="scene" target="svg" />
    <FlowRelation source="scene" target="canvas" />
    <FlowRelation source="scene" target="native" style={{ stroke: 'gray' }} />
    <FlowRelation source="canvas" target="raster" />
  </FlowDiagram>
);

export default Demo;
