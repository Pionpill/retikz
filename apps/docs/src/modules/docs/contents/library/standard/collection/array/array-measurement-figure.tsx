import { Layout } from '@retikz/react';
import { Array } from '@retikz/standard-react/collection';
import type { FC } from 'react';

import type { Lang } from '@/i18n';

import { arrayMeasurementFigureI18n } from './array-measurement-figure.i18n';

/** Array 宽度模式与独立索引带示意图属性 */
export type ArrayMeasurementFigureProps = { lang?: Lang };

/** 用相同内容对比共享最大宽度与逐格内容宽度 */
const ArrayMeasurementFigure: FC<ArrayMeasurementFigureProps> = props => {
  const { lang = 'zh' } = props;
  const t = arrayMeasurementFigureI18n[lang];
  const items = [t.short, t.long];
  const style = { stroke: 'gray', fill: 'dodgerblue', fillOpacity: 0.14, font: { size: 16 } };

  return (
    <Layout viewBox={{ x: -160, y: -65, width: 380, height: 165 }} style={{ maxWidth: '100%', height: 'auto' }}>
      <Array
        transforms={[{ kind: 'translate', x: -125, y: 0 }]}
        label={{ text: t.auto, position: 'top', distance: 10, font: { size: 12 }, opacity: 0.8 }}
        items={items}
        index={{ position: 'after' }}
        layout={{ width: 'auto', height: 40, padding: 6, gap: 8 }}
        style={style}
      />
      <Array
        transforms={[{ kind: 'translate', x: 80, y: 0 }]}
        label={{ text: t.content, position: 'top', distance: 10, font: { size: 12 }, opacity: 0.8 }}
        items={items}
        index={{ position: 'after' }}
        layout={{ width: 'content', height: 40, padding: 6, gap: 8 }}
        style={style}
      />
    </Layout>
  );
};

export default ArrayMeasurementFigure;
