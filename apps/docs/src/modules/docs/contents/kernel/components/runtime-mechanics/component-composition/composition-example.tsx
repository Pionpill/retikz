import { ConnectedScatterChart } from '@retikz/chart-react/point';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { compositionExampleData } from './composition-example.data';
import { compositionExampleI18n } from './composition-example.i18n';

/** 折线案例的语言选项 */
export type CompositionExampleProps = { lang?: Lang };
/** 以固定外部尺寸展示标题与 Plot 的真实组合结果 */
const CompositionExample: FC<CompositionExampleProps> = props => {
  const { lang = 'zh' } = props;
  const t = compositionExampleI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <ConnectedScatterChart
        rows={compositionExampleData}
        layout={{ width: 480, height: 320, padding: 16 }}
        presentation={{ title: { text: t.title } }}
        recipe={{
          encodings: { x: 'x', y: 'y', order: 'x' },
          properties: { point: { size: 3 }, path: { strokeWidth: 2 } },
        }}
      />
    </Layout>
  );
};
export default CompositionExample;
