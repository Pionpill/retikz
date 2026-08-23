import type { FC } from 'react';

import { defineEntityKind, defineEntityPredicate, defineEntityRole } from '@retikz/graph';
import { Entity, Graph } from '@retikz/graph-react';
import { z } from 'zod';

import { defineControlledPreview, withGraphPreviewSource } from '@/modules/docs/preview';

import { entityDefinitionControls, previewControlContract } from './entity-definition.controls';

export const previewControls = entityDefinitionControls;

const serviceRole = defineEntityRole({
  role: 'service',
  description: '提供稳定接口的服务主体',
  shape: 'rectangle',
  padding: { x: 14, y: 10 },
  cornerRadius: 10,
  minimumSize: { width: 110, height: 46 },
});

const gatewayKind = defineEntityKind({
  kind: 'service.gateway',
  role: 'service',
  description: '面向外部请求的服务网关',
});

const statusColors = {
  available: '#16a34a',
  degraded: '#d97706',
  offline: '#dc2626',
} as const;

const availabilityPredicate = defineEntityPredicate({
  name: 'service.availability',
  role: 'service',
  kinds: ['service.gateway'],
  description: '服务可用性与关键程度',
  paramsSchema: z.strictObject({
    status: z.enum(['available', 'degraded', 'offline']),
    critical: z.boolean(),
  }),
});

const controlledPreview = defineControlledPreview(previewControlContract, values => (
  <Graph
    width={420}
    height={170}
    viewBox={{ x: 0, y: 0, width: 420, height: 170 }}
    entityRoles={[serviceRole]}
    entityKinds={[gatewayKind]}
    entityPredicates={[availabilityPredicate]}
    graphTheme={{
      rules: [
        {
          type: 'entity',
          selector: { predicate: { name: 'service.availability' } },
          appearance: {
            color: statusColors[values.status],
            stroke: statusColors[values.status],
            strokeWidth: values.critical ? 3 : 1.5,
          },
        },
      ],
    }}
  >
    <Entity
      id="gateway"
      role="service"
      kind="service.gateway"
      predicate={{
        name: 'service.availability',
        params: { status: values.status, critical: values.critical },
      }}
      position={[210, 85]}
    >
      {values.content}
    </Entity>
  </Graph>
));

export const previewSource = withGraphPreviewSource(controlledPreview.source);

/** 用可控制 params 展示 Entity predicate 的 schema、Source 与外观解析闭环 */
const Demo: FC = controlledPreview.Component;

export default Demo;
