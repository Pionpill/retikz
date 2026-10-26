import { Layout } from '@retikz/react';
import { normalizeScene, renderToSvgString } from '@retikz/vanilla';
import type { FC } from 'react';

import { RawSvgFrame } from '@/modules/docs/components/component-preview/source-panel';
import { defineControlledPreview } from '@/modules/docs/preview';
import type { PreviewSourceConfig } from '@/modules/docs/preview';

import { customMarkControls, previewControlContract } from './custom-mark.controls';
import { CustomMarkPreview } from './custom-mark.preview';
import { ringScene } from './custom-mark.vanilla';
import vanillaCode from './custom-mark.vanilla.ts?raw';
import { ringMark } from './ring-mark';

/** 预览器使用的默认控件 */
export const previewControls = customMarkControls;

const controlledPreview = defineControlledPreview(previewControlContract, values => <CustomMarkPreview {...values} />);

/** 源码视图与交互预览共用的渲染入口 */
export const previewSource = {
  ...controlledPreview.source,
  buildViews: ({ theme }) => {
    const input = { ...ringScene, ...(theme === undefined ? {} : { theme }) };
    const ir = normalizeScene(input).ir;
    const svg = renderToSvgString(input, { compile: { marks: [ringMark] } });
    return {
      ir: {
        files: [{ filename: 'custom-mark.ir.json', code: JSON.stringify(ir, null, 2), lang: 'json' as const }],
        render: mode => <Layout ir={ir} renderer={mode} extensions={{ marks: [ringMark] }} />,
      },
      vanilla: {
        files: [{ filename: 'custom-mark.vanilla.ts', code: vanillaCode.trimEnd(), lang: 'ts' as const }],
        rendererMode: 'svg' as const,
        render: () => <RawSvgFrame svg={svg} />,
      },
    };
  },
} satisfies PreviewSourceConfig;

/** 自定义标记交互预览 */
const Demo: FC = controlledPreview.Component;

export default Demo;
