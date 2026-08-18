import type { FC } from 'react';

import { FoldStepVia } from '@retikz/core';
import { Container, ContainerHeader, ContainerSection, Entity, Relation } from '@retikz/graph-react';
import { Layout, Node, Scope, Step } from '@retikz/react';

/** Documentation-only Process recipe built from the public Graph vocabulary */
const Demo: FC = () => (
  <Layout width={640} height={260}>
    <Scope transforms={[{ kind: 'translate', x: 24, y: 18 }]}>
      <Container id="process-block" padding={12} rowGap={4}>
        <ContainerHeader>
          <Node position={[0, 0]} text="Process" />
        </ContainerHeader>
        <ContainerSection sectionKey="body">
          <Node position={[0, 0]} text="Input → transform → result" />
        </ContainerSection>
      </Container>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 72, y: 164 }]}>
      <Entity id="process-start" role="terminal" position={[0, 0]}>
        Start
      </Entity>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 278, y: 164 }]}>
      <Entity id="process-step" role="stage" position={[0, 0]}>
        Transform
      </Entity>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 490, y: 164 }]}>
      <Entity id="process-check" role="decision" position={[0, 0]}>
        Valid?
      </Entity>
    </Scope>
    <Relation id="process-edge-1" role="flow" way={['process-start', 'process-step']} />
    <Relation id="process-edge-2" role="branch">
      <Step kind="move" to="process-step" />
      <Step kind="fold" via={FoldStepVia.HorizontalThenVertical} to="process-check" />
    </Relation>
  </Layout>
);

export default Demo;
