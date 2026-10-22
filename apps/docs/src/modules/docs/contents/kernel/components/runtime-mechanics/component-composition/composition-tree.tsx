import { Layout } from '@retikz/react';
import { Tree } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { compositionTreeI18n } from './composition-tree.i18n';

/** 组合结构图的语言选项 */
export type CompositionTreeProps = { lang?: Lang };
/** 展示 Chart 生成的子声明层级，省略布局项包装 */
const CompositionTree: FC<CompositionTreeProps> = props => {
  const { lang = 'zh' } = props;
  const t = compositionTreeI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      <Tree
        defaultNode={{ shape: 'rectangle', style: { fill: 'none', font: { size: 14 } }, layout: { padding: 10 } }}
        root={{ content: t.surface, children: [{ content: t.flex, children: [t.title, t.plot] }] }}
      />
    </Layout>
  );
};
export default CompositionTree;
