import { FlowEntities, FlowLayout } from '@retikz/diagram-react/flow';
import type { FlowDirectionValue } from '@retikz/diagram/flow';
import type { FC } from 'react';

import type { Lang } from '@/i18n';
import { PreviewFlowDiagram } from '@/modules/docs/components/component-preview/theme';
import { defineControlledPreview } from '@/modules/docs/preview';

import { createPreviewControlContract, previewControls } from './flow-linear.controls';
import { flowLinearI18n } from './flow-linear.i18n';

export { previewControls };

const directions: ReadonlyArray<FlowDirectionValue> = ['right', 'left'];

/** 将面板值收窄为公开的 Flow 排列方向 */
const directionOf = (value: string): FlowDirectionValue => {
  const direction = directions.find(candidate => candidate === value);
  if (direction === undefined) throw new Error(`Unsupported Flow direction: ${value}`);
  return direction;
};

const createPreview = (lang: Lang) =>
  defineControlledPreview(createPreviewControlContract(lang), values => {
    const copy = flowLinearI18n[lang];
    return (
      <PreviewFlowDiagram viewBox={{ x: -24, y: -34, width: 380, height: 140 }}>
        <FlowLayout kind="linear" id="stages" direction={directionOf(values.direction)} gap={values.gap}>
          <FlowEntities
            items={[
              { id: 'input', text: copy.input },
              { id: 'validate', text: copy.validate },
              { id: 'output', text: copy.output },
            ]}
          />
        </FlowLayout>
      </PreviewFlowDiagram>
    );
  });

const previews = { zh: createPreview('zh'), en: createPreview('en') };
export const previewSource = previews.zh.source;

/** 线性排列示例语言 */
export type FlowLinearProps = Readonly<{ lang?: Lang }>;
/** 线性排列交互示例 */
const Demo: FC<FlowLinearProps> = props => {
  const { lang = 'zh' } = props;
  const Preview = previews[lang].Component;
  return <Preview />;
};

export default Demo;
