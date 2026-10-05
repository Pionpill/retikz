import type { GraphStatus } from '@retikz/graph';
import { Entity, Graph } from '@retikz/graph-react';

import type { Lang } from '@/i18n';

import { entityPlaygroundI18n } from './entity-playground.i18n';

const statusValues: Readonly<Record<string, GraphStatus | undefined>> = {
  '': undefined,
  error: 'error',
  success: 'success',
  warning: 'warning',
  disabled: 'disabled',
};

/** 图形参数 */
export type EntityPlaygroundPreviewValues = {
  role: 'activity' | 'participant' | 'event' | 'state' | 'gateway' | 'resource' | 'concept';
  status: string;
  group: boolean;
  override: boolean;
  color: string;
};

/** 绘制示例图形 */
export const EntityPlaygroundPreview = (values: EntityPlaygroundPreviewValues, lang: Lang) => (
  <Graph viewBox={{ x: 0, y: 0, width: 360, height: 180 }}>
    <Entity
      role={values.role}
      status={statusValues[values.status]}
      group={values.group ? 'orders' : undefined}
      position={[180, 90]}
      style={values.override ? { color: values.color } : undefined}
    >
      {entityPlaygroundI18n[lang].defaultText}
    </Entity>
  </Graph>
);
