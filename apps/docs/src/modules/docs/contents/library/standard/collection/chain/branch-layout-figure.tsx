import { Layout } from '@retikz/react';
import { Chain } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { branchLayoutFigureI18n } from './branch-layout-figure.i18n';

/** 分支布局图属性 */
export type BranchLayoutFigureProps = { lang?: Lang };

/** 相同内容与比例下比较总宽居中和离散步骤轨道 */
const BranchLayoutFigure: FC<BranchLayoutFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = branchLayoutFigureI18n[lang];
  return (
    <Layout style={{ maxWidth: '100%', height: 'auto' }}>
      {(['independent', 'steps'] as const).map((spacing, index) => (
        <Chain
          key={spacing}
          transforms={[{ kind: 'translate', x: index * 340, y: 0 }]}
          skeleton={{ items: ['A', { branches: [['Bbbbbbbb', 'C', 'D'], ['E']] }, 'F'] }}
          layout={{ spacing, justify: 'center', branchAlign: 'center' }}
          style={{ font: { size: 14 } }}
          label={{ text: t[spacing], position: 'top', font: { size: 12 }, opacity: 0.8 }}
        />
      ))}
    </Layout>
  );
};

export default BranchLayoutFigure;
