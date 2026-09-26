import { defineEntityRole, defineEntityKind, defineEntityPredicate } from '@retikz/graph';
import type { IRGraphRule } from '@retikz/graph';
import { z } from 'zod';

/** 服务角色独占的基础结构 */
export const serviceRole = defineEntityRole({
  role: 'service',
  description: '提供稳定接口的服务主体',
  shape: 'rectangle',
  padding: { x: 14, y: 10 },
  cornerRadius: 8,
  minimumSize: { width: 110, height: 46 },
});
/** 服务角色内的网关子类型 */
export const gatewayKind = defineEntityKind({
  role: 'service',
  kind: 'service.gateway',
  description: '面向外部请求的服务网关',
});
/** 使用 schema 约束可持久化的可用性参数 */
export const availabilityPredicate = defineEntityPredicate({
  name: 'service.availability',
  role: 'service',
  kinds: ['service.gateway'],
  description: '服务可用性与关键程度',
  paramsSchema: z.strictObject({ status: z.enum(['available', 'degraded', 'offline']), critical: z.boolean() }),
});
/** 固定规则匹配已解析的 predicate，不读取控件状态 */
export const availabilityRules: Array<IRGraphRule> = [
  {
    type: 'entity',
    selector: { predicate: { name: 'service.availability', params: { status: 'available' } } },
    style: { color: '#16a34a' },
  },
  {
    type: 'entity',
    selector: { predicate: { name: 'service.availability', params: { status: 'degraded' } } },
    style: { color: '#d97706' },
  },
  {
    type: 'entity',
    selector: { predicate: { name: 'service.availability', params: { status: 'offline' } } },
    style: { color: '#dc2626' },
  },
  {
    type: 'entity',
    selector: { predicate: { name: 'service.availability', params: { critical: true } } },
    style: { strokeWidth: 3 },
  },
];
