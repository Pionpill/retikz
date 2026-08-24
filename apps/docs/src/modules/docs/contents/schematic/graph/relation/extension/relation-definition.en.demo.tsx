import type { FC } from 'react';

import { defineRelationKind, defineRelationPredicate } from '@retikz/graph';
import { Entity, Graph, Relation } from '@retikz/graph-react';
import { z } from 'zod';

import { createGraphPreviewSource } from '@/modules/docs/preview';

const feedbackKind = defineRelationKind({
  kind: 'workflow.feedback',
  role: 'flow',
  description: 'A feedback flow returning results to an earlier activity',
  directions: {
    forward: { dashPattern: [6, 4] },
  },
});

const priorityPredicate = defineRelationPredicate({
  name: 'workflow.priority',
  role: 'flow',
  kinds: ['workflow.feedback'],
  description: 'Marks a feedback flow that requires priority handling',
  paramsSchema: z.strictObject({ urgent: z.boolean() }),
});

/** Custom Relation kind and predicate share the Graph resolve path */
const Demo: FC = () => (
  <Graph
    width={460}
    height={180}
    relationKinds={[feedbackKind]}
    relationPredicates={[priorityPredicate]}
    graphTheme={{
      rules: [
        {
          type: 'relation',
          selector: { predicate: { name: 'workflow.priority', params: { urgent: true } } },
          appearance: { stroke: '#dc2626', strokeWidth: 3 },
        },
      ],
    }}
  >
    <Entity id="review" role="activity" position={[110, 90]}>
      Review
    </Entity>
    <Entity id="revise" role="activity" position={[350, 90]}>
      Revise
    </Entity>
    <Relation
      id="feedback"
      role="flow"
      kind="workflow.feedback"
      predicate={{ name: 'workflow.priority', params: { urgent: true } }}
      source={{ id: 'review' }}
      target={{ id: 'revise' }}
      way={['review', 'revise']}
    />
  </Graph>
);

export const previewSource = createGraphPreviewSource(() => Demo({}));

export default Demo;
