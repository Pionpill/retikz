import { Draw, Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { outputResourcesI18n } from './output-resources.i18n';

/** 编译产物示意图 */
export type OutputResourcesProps = { lang?: Lang };
/** 编译产物示意图 */
const Figure: FC<OutputResourcesProps> = props => {
  const { lang = 'zh' } = props;
  const t = outputResourcesI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {[t.first, t.second].map((title, index) => (
        <Map
          key={title}
          position={[0, index * 150]}
          label={{ text: title, position: 'top', font: { size: 14 } }}
          entries={[
            { key: 'kind', value: 'resourceRef' },
            { key: 'id', value: { id: `ref-${index}`, content: 'paint-1' } },
          ]}
          defaultCell={{
            layout: { height: 30 },
            style: { font: { size: 12 } },
            key: { layout: { width: 64 } },
            value: { layout: { width: 116 } },
          }}
        />
      ))}
      <Map
        position={[320, 55]}
        label={{ text: t.resource, position: 'top', font: { size: 14 } }}
        entries={[
          { key: 'kind', value: 'paint' },
          { key: { id: 'resource-id', content: 'id' }, value: 'paint-1' },
          { key: 'spec.kind', value: 'linearGradient' },
          { key: 'spec.stops', value: t.stops },
        ]}
        defaultCell={{
          layout: { height: 30 },
          style: { font: { size: 12 } },
          key: { layout: { width: 100 } },
          value: { layout: { width: 165 } },
        }}
      />
      <Draw way={['ref-0.right', '-|-', 'resource-id.left']} arrow="->" />
      <Draw way={['ref-1.right', '-|-', 'resource-id.left']} arrow="->" />
    </Layout>
  );
};
export default Figure;
