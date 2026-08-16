import type { FC } from 'react';

import { FoldStepVia } from '@retikz/core';
import { GraphConnector, GraphFrame, GraphFrameHeader, GraphFrameSection, GraphNode } from '@retikz/graph-react';
import { Layout, Node, Scope, Step } from '@retikz/react';

/** 只存在于文档的 Process recipe，由公开 Graph 词汇组合而成 */
const Demo: FC = () => (
  <Layout width={640} height={260}>
    <Scope transforms={[{ kind: 'translate', x: 24, y: 18 }]}>
      <GraphFrame id="process-block" padding={12} rowGap={4}>
        <GraphFrameHeader>
          <Node position={[0, 0]} text="Process" />
        </GraphFrameHeader>
        <GraphFrameSection sectionKey="body">
          <Node position={[0, 0]} text="Input → transform → result" />
        </GraphFrameSection>
      </GraphFrame>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 72, y: 164 }]}>
      <GraphNode id="process-start" role="terminal" position={[0, 0]}>
        Start
      </GraphNode>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 278, y: 164 }]}>
      <GraphNode id="process-step" role="stage" position={[0, 0]}>
        Transform
      </GraphNode>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 490, y: 164 }]}>
      <GraphNode id="process-check" role="decision" position={[0, 0]}>
        Valid?
      </GraphNode>
    </Scope>
    <GraphConnector id="process-edge-1" role="flow" way={['process-start', 'process-step']} />
    <GraphConnector id="process-edge-2" role="branch">
      <Step kind="move" to="process-step" />
      <Step kind="fold" via={FoldStepVia.HorizontalThenVertical} to="process-check" />
    </GraphConnector>
  </Layout>
);

export default Demo;
