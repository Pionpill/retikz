import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import type { FlowDiagramProps } from '@retikz/diagram-react/flow';
import { useTheme, useThemeStyles } from '@retikz/react';
import { cloneElement, useMemo } from 'react';
import type { FC, ReactElement } from 'react';

import { buildPreviewIR } from '@/modules/docs/components/component-preview/utils';
import { browserMeasurer } from '@/modules/docs/components/component-preview/vanilla-preview';

/** 固定端点取景的曲线示例 */
export type FlowCurveViewportProps = Readonly<{ diagram: ReactElement<FlowDiagramProps>; orthogonal?: boolean }>;
/** 使用当前编译的端点中点定位，避免曲线包络改变时产生二次校正 */
export const FlowCurveViewport: FC<FlowCurveViewportProps> = props => {
  const { diagram, orthogonal = false } = props;
  const theme = useTheme();
  const themeStyles = useThemeStyles();
  const viewBox = useMemo(() => {
    const { ir, contributions } = buildPreviewIR(() => diagram);
    const result = compileToScene(
      { ...ir, theme },
      {
        ...resolveCoreProviderDependencies({ contributions }),
        themeStyles,
        measureText: browserMeasurer,
      },
    );
    const a = result.spatialHandles.entries.find(handle => handle.id === 'element:a')!.geometry.bounds;
    const b = result.spatialHandles.entries.find(handle => handle.id === 'element:b')!.geometry.bounds;
    return {
      x: (a.x + a.width / 2 + b.x + b.width / 2) / 2 - 300,
      y: a.y + a.height / 2 - (orthogonal ? 65 : 220),
      width: 600,
      height: orthogonal ? 260 : 340,
    };
  }, [diagram, theme, themeStyles, orthogonal]);
  return cloneElement(diagram, { viewBox });
};
