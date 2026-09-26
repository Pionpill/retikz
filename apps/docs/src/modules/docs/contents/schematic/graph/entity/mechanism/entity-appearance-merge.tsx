import { Draw, Layout, Node } from '@retikz/react';
import { Map } from '@retikz/standard-react/container';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { entityAppearanceMergeI18n } from './entity-appearance-merge.i18n';

/** Entity 外观合并图的语言 */
export type EntityAppearanceMergeProps = { lang?: Lang };

/** 用同一实体的两段外观快照说明规则与 Source 如何逐字段覆盖 */
const EntityAppearanceMerge: FC<EntityAppearanceMergeProps> = props => {
  const { lang = 'zh' } = props;
  const t = entityAppearanceMergeI18n[lang];
  const label = (text: string) => ({ text, opacity: 0.8, font: { size: 12 } });
  const color = '#d97706';
  const entries = (entryColor: string, strokeWidth: string) => [
    { key: { content: 'color' }, value: { content: entryColor } },
    { key: { content: 'strokeWidth' }, value: { content: strokeWidth } },
  ];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Node position={[120, 18]} text={t.authorStage} style={{ fill: 'none', stroke: 'none', font: { size: 13 } }} />
      <Map
        id="status-rule"
        transforms={[{ kind: 'translate', x: 20, y: 75 }]}
        label={label(t.statusRule)}
        layout={{ height: 31, padding: 0, key: { width: 100 }, value: { width: 115 } }}
        style={{ font: { size: 12 } }}
        entries={[
          { key: { content: 'color' }, value: { content: color, style: { fill: 'darkorange', fillOpacity: 0.12 } } },
        ]}
      />
      <Map
        id="critical-rule"
        transforms={[{ kind: 'translate', x: 275, y: 75 }]}
        label={label(t.criticalRule)}
        layout={{ height: 31, padding: 0, key: { width: 100 }, value: { width: 115 } }}
        style={{ font: { size: 12 } }}
        entries={[{ key: { content: 'strokeWidth' }, value: { content: '3' } }]}
      />
      <Map
        id="projected-source"
        transforms={[{ kind: 'translate', x: 530, y: 75 }]}
        label={label(t.projectedSource)}
        layout={{ height: 31, padding: 0, key: { width: 100 }, value: { width: 115 } }}
        style={{ font: { size: 12 } }}
        entries={entries(color, '3')}
      />

      <Node position={[120, 185]} text={t.themeStage} style={{ fill: 'none', stroke: 'none', font: { size: 13 } }} />
      <Map
        id="theme-defaults"
        transforms={[{ kind: 'translate', x: 20, y: 245 }]}
        label={label(t.themeDefaults)}
        layout={{ height: 31, padding: 0, key: { width: 100 }, value: { width: 115 } }}
        style={{ font: { size: 12 } }}
        entries={entries(t.foreground, '1')}
      />
      <Map
        id="source-override"
        transforms={[{ kind: 'translate', x: 275, y: 245 }]}
        label={label(t.sourceOverride)}
        layout={{ height: 31, padding: 0, key: { width: 100 }, value: { width: 115 } }}
        style={{ font: { size: 12 } }}
        entries={entries(color, '3')}
      />
      <Map
        id="final-appearance"
        transforms={[{ kind: 'translate', x: 530, y: 245 }]}
        label={label(t.finalAppearance)}
        layout={{ height: 31, padding: 0, key: { width: 100 }, value: { width: 115 } }}
        style={{ font: { size: 12 } }}
        entries={entries(color, '3')}
      />
      <Draw way={['status-rule.right', { horizontalTo: 'critical-rule.left' }]} arrow="->" />
      <Draw way={['critical-rule.right', { horizontalTo: 'projected-source.left' }]} arrow="->" />
      <Draw way={['projected-source.bottom', { verticalTo: 'source-override.top' }]} arrow="->" />
      <Draw way={['theme-defaults.right', { horizontalTo: 'source-override.left' }]} arrow="->" />
      <Draw way={['source-override.right', { horizontalTo: 'final-appearance.left' }]} arrow="->" />
    </Layout>
  );
};

export default EntityAppearanceMerge;
