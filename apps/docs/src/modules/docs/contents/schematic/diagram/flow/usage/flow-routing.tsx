import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { useTheme, useThemeStyles } from '@retikz/react';
import type { FC } from 'react';
import { useMemo } from 'react';

import type { Lang } from '@/i18n';
import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import { browserMeasurer } from '@/modules/docs/components/component-preview/vanilla-preview';
import type { PreviewControlValuesFor } from '@/modules/docs/preview';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-routing.controls';
import { renderFlowRoutingPreview } from './flow-routing.preview';

export { previewControls };

/** 路由试验场的实时参数 */
export type RoutingSceneProps = Readonly<{ values: PreviewControlValuesFor<typeof previewControls> }>;

/** 绘制前同步测量 A，路径与取景使用同一组参数 */
const RoutingScene: FC<RoutingSceneProps> = props => {
  const { values } = props;
  const theme = useTheme();
  const themeStyles = useThemeStyles();
  const viewBox = useMemo(() => {
    const { ir, contributions } = buildPreviewIR(() => renderFlowRoutingPreview(values));
    const result = compileToScene(
      { ...ir, theme },
      {
        ...resolveCoreProviderDependencies({ contributions }),
        themeStyles,
        measureText: browserMeasurer,
      },
    );
    const bounds = result.spatialHandles.entries.find(handle => handle.id === 'element:a')!.geometry.bounds;

    return { x: bounds.x + bounds.width / 2 - 120, y: bounds.y + bounds.height / 2 - 140, width: 400, height: 330 };
  }, [values, theme, themeStyles]);

  return renderFlowRoutingPreview(values, { viewBox });
};

const createPreview = (lang: Lang) => {
  const contract = createPreviewControlContract(lang);
  const controlled = defineControlledPreview(contract, values => <RoutingScene values={values} />);

  return {
    ...controlled,
    source: { ...controlled.source, canonicalRender: () => renderFlowRoutingPreview(contract.canonicalValues) },
  };
};

const previews = { zh: createPreview('zh'), en: createPreview('en') };

export const previewSource = previews.zh.source;

/** 当前语言的连线路由交互示例 */
export type FlowRoutingProps = Readonly<{ lang?: Lang }>;

/** 比较直线、折线与三类曲线路由 */
const Demo: FC<FlowRoutingProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};
export default Demo;
