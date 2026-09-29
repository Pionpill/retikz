import { Coordinate, Draw, Layout, Node } from '@retikz/react';

import type { Lang } from '@/i18n';

import { coordinateFoldJunctionI18n } from './coordinate-fold-junction.i18n';

/** 图形参数 */
export type CoordinateFoldJunctionPreviewValues = {
  junctionX: number;
  junctionY: number;
};

/** 绘制示例图形 */
export const CoordinateFoldJunctionPreview = (values: CoordinateFoldJunctionPreviewValues, lang: Lang) => {
  const i18n = coordinateFoldJunctionI18n[lang];
  return (
    <Layout>
      <Node id="A" position={[-120, -55]}>
        A
      </Node>
      <Node id="B" position={[-120, 55]}>
        B
      </Node>
      <Coordinate id="junction" position={[values.junctionX, values.junctionY]} />
      <Node id="out" position={[120, 0]} shape="diamond">
        {i18n.merged}
      </Node>
      {/* 两条线先各自走到 junction，再合并到 out */}
      <Draw way={['A', 'junction', 'out']} arrow="->" style={{ stroke: 'gray' }} />
      <Draw way={['B', 'junction']} style={{ stroke: 'gray' }} />
    </Layout>
  );
};
