import { Layout } from '@retikz/react';
import { Map, Stack, StackItem } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { namespaceStackI18n } from './namespace-stack.i18n';

/** 名称栈示意图的语言 */
export type NamespaceStackProps = { lang?: Lang };

/** 展示布局完成但 Scope 尚未闭合时的两层命名空间摘录 */
const NamespaceStack: FC<NamespaceStackProps> = props => {
  const { lang = 'zh' } = props;
  const text = namespaceStackI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Stack
        layout={{ width: 322, height: 'auto', padding: { top: 28, bottom: 4, left: 0, right: 0 }, gap: 12 }}
        padding={4}
        style={{ fill: 'none' }}
        label={[
          { text: text.lookup, position: 'top', font: { size: 12 } },
          { text: text.lifecycle, position: 'bottom', font: { size: 12 }, textColor: 'gray' },
        ]}
      >
        <StackItem>
          <Map
            layout={{ height: 32, key: { width: 80 }, value: { width: 240 } }}
            label={{ text: text.root, position: 'top', font: { size: 12 }, textColor: 'gray' }}
            entries={[
              { key: 'A', value: 'resolved · [0, 0]' },
              { key: 'cluster', value: 'scope-placeholder' },
            ]}
          />
        </StackItem>
        <StackItem>
          <Map
            layout={{ height: 32, key: { width: 80 }, value: { width: 240 } }}
            label={{ text: text.local, position: 'top', font: { size: 12 }, textColor: 'gray' }}
            entries={[
              {
                key: { content: 'A', style: { fill: 'dodgerblue' } },
                value: { content: 'resolved · [180, -40]', style: { fill: 'dodgerblue', fillOpacity: 0.2 } },
              },
              { key: 'B', value: 'resolved · [300, -40]' },
              { key: 'C', value: 'resolved · [180, 40]' },
            ]}
          />
        </StackItem>
      </Stack>
    </Layout>
  );
};

export default NamespaceStack;
