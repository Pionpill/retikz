import { RibbonPathKindDefinition } from '@retikz/extension';
import { Layout, Path, Step } from '@retikz/react';

/** Ribbon 标注图形参数 */
export type RibbonLabelPreviewValues = {
  placement: 'inside' | 'side';
  side: 'top' | 'bottom';
  position: number;
  sloped: boolean;
};

/** 绘制 Ribbon 标注示例 */
export const renderRibbonLabelPreview = (values: RibbonLabelPreviewValues, lang: 'zh' | 'en') => {
  const placement =
    values.placement === 'inside' ? ({ placement: 'inside' } as const) : ({ side: values.side } as const);

  return (
    <Layout
      viewBox={{ x: -280, y: -130, width: 560, height: 260 }}
      extensions={{ pathKinds: [RibbonPathKindDefinition] }}
      rootScope={{ style: { color: '#172033' } }}
    >
      <Path
        kind="ribbon"
        kindOptions={{ start: { width: 42 }, end: { width: 20 }, interpolation: 'smooth', samples: true }}
        label={{
          text: lang === 'zh' ? '128 件' : '128 items',
          position: values.position,
          ...placement,
          sloped: values.sloped,
          textColor: '#0f172a',
          font: { size: 14, weight: 'bold' },
        }}
        style={{ fill: '#38bdf8', fillOpacity: 0.62 }}
      >
        <Step kind="move" to={[-210, -48]} />
        <Step kind="cubic" control1={[-80, -100]} control2={[80, 38]} to={[210, 16]} />
      </Path>
    </Layout>
  );
};
