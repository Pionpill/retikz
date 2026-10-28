import { ribbonPathDefinition } from '@retikz/extension';
import type { IRRibbonLabel } from '@retikz/extension';
import { Layout, Path, Step } from '@retikz/react';

/** Ribbon 标注图形参数 */
export type RibbonLabelPreviewValues = {
  placement: 'inside' | 'outside';
  side: 'top' | 'bottom' | 'left' | 'right';
  position: number;
  sloped: boolean;
};

/** 绘制 Ribbon 标注示例 */
export const renderRibbonLabelPreview = (values: RibbonLabelPreviewValues, lang: 'zh' | 'en') => {
  const placement: Pick<IRRibbonLabel, 'placement' | 'side'> =
    values.placement === 'inside'
      ? ({ placement: 'inside' } as const)
      : ({ placement: 'outside', side: values.side } as const);

  return (
    <Layout viewBox={{ x: -280, y: -130, width: 560, height: 260 }} extensions={{ paths: [ribbonPathDefinition] }}>
      <Path
        kind="ribbon"
        kindOptions={{
          label: {
            text: lang === 'zh' ? '128 件' : '128 items',
            position: values.position,
            ...placement,
            sloped: values.sloped,
            textColor: 'currentColor',
            font: { size: 14, weight: 'bold' },
          },
          width: { kind: 'taper', start: 42, end: 20, interpolation: 'smooth' },
          sampling: { kind: 'fixed', samples: 64 },
        }}

        style={{ fill: '#38bdf8', opacity: { fill: 0.62 } }}
      >
        <Step kind="move" to={[-210, -48]} />
        <Step kind="cubic" control1={[-80, -100]} control2={[80, 38]} to={[210, 16]} />
      </Path>
    </Layout>
  );
};
