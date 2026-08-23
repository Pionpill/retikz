import type { FC } from 'react';

import { defineRelationKind, defineRelationPredicate } from '@retikz/graph';
import { Entity, Graph, Relation } from '@retikz/graph-react';
import { z } from 'zod';

import { createGraphPreviewSource } from '@/modules/docs/preview';

const feedbackKind = defineRelationKind({
  kind: 'workflow.feedback',
  role: 'flow',
  description: '把结果送回前序活动的反馈流',
  directions: {
    forward: { dashPattern: [6, 4] },
  },
});

const priorityPredicate = defineRelationPredicate({
  name: 'workflow.priority',
  role: 'flow',
  kinds: ['workflow.feedback'],
  description: '标记需要优先处理的反馈流',
  paramsSchema: z.strictObject({ urgent: z.boolean() }),
});

/** 自定义 Relation kind 与 predicate 共享 Graph resolve 路径 */
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
      审核
    </Entity>
    <Entity id="revise" role="activity" position={[350, 90]}>
      修订
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
