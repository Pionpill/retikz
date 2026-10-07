import { Layout } from '@retikz/react';
import { Map } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { lifecycleOwnershipI18n } from './lifecycle-ownership.i18n';

/** 持有关系图的语言 */
export type LifecycleOwnershipProps = Readonly<{ lang?: Lang }>;

/** 按生命周期范围排列职责记录，不表示对象内存布局 */
const LifecycleOwnership: FC<LifecycleOwnershipProps> = props => {
  const { lang = 'zh' } = props;
  const text = lifecycleOwnershipI18n[lang];
  return (
    <Layout>
      <Map
        label={{ text: text.definitions, font: { size: 14 } }}
        style={{ font: { size: 14 } }}
        layout={{ height: 34, key: { width: 155 }, value: { width: 185 } }}
        entries={[
          { key: text.source, value: text.reuse },
          { key: text.computation, value: text.reuse },
          { key: text.participant, value: text.host },
        ]}
      />
      <Map
        transforms={[{ kind: 'translate', x: 375, y: 0 }]}
        label={{ text: text.instance, font: { size: 14 } }}
        style={{ font: { size: 14 } }}
        layout={{ height: 34, key: { width: 160 }, value: { width: 180 } }}
        entries={[
          { key: text.sourceState, value: text.own },
          { key: text.result, value: text.own },
          { key: text.participant, value: text.host },
        ]}
      />
      <Map
        transforms={[{ kind: 'translate', x: 180, y: 170 }]}
        label={{ text: text.transaction, font: { size: 14 } }}
        style={{ font: { size: 14 } }}
        layout={{ height: 34, key: { width: 190 }, value: { width: 200 } }}
        entries={[
          { key: text.candidate, value: text.temporary },
          { key: text.prepared, value: 'commit / rollback / dispose' },
        ]}
      />
    </Layout>
  );
};
export default LifecycleOwnership;
