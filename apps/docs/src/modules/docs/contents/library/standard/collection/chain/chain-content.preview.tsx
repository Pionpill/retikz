import { Layout } from '@retikz/react';
import { Chain, ChainCell, ChainParallel, ChainBranch, Matrix } from '@retikz/standard-react/collection';
/** 本节交互参数 */
export type ChainPreviewValues = { width: number; overflow: 'clip' | 'visible' };
/** 由公开参数绘制链 */
export const renderChainPreview = (values: ChainPreviewValues) => (
  <Layout>
    <Chain layout={{ width: values.width, overflow: values.overflow }}>
      <ChainCell text="A" />
      <ChainParallel>
        <ChainBranch>
          <ChainCell>
            <Matrix skeleton={{ rows: 2, columns: 2 }} />
          </ChainCell>
        </ChainBranch>
        <ChainBranch>
          <ChainCell text="B" />
          <ChainParallel>
            <ChainBranch>
              <ChainCell text="C" />
            </ChainBranch>
            <ChainBranch>
              <ChainCell text="D" />
            </ChainBranch>
          </ChainParallel>
          <ChainCell text="E" />
        </ChainBranch>
      </ChainParallel>
      <ChainCell text="F" />
    </Chain>
  </Layout>
);
