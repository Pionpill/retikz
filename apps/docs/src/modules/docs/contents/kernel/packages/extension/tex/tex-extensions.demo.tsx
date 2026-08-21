import type { LowerTex } from '@retikz/core';
import type { MathJaxExtensionValue } from '@retikz/tex';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { useLowerTex } from '@retikz/tex/react';
import { useEffect } from 'react';

import type { PreviewControlValuesFor } from '@/modules/docs/preview';

import { usePreviewControlContext } from '@/modules/docs/components/component-preview/context';
import { defineControlledPreview, usePreviewControls } from '@/modules/docs/preview';

import {
  getRequiredTexExtensionControlId,
  isTexExtensionControlActive,
  previewControlContract,
  TexExtensionExample,
  TexExtensionsControlId,
  texExtensionsControls,
} from './tex-extensions.controls';

export const previewControls = texExtensionsControls;

type TexExtensionsValues = PreviewControlValuesFor<typeof texExtensionsControls>;

const extensionValues: Array<{ id: keyof typeof TexExtensionsControlId; value: MathJaxExtensionValue }> = [
  { id: 'Ams', value: 'ams' },
  { id: 'Newcommand', value: 'newcommand' },
  { id: 'Boldsymbol', value: 'boldsymbol' },
  { id: 'Braket', value: 'braket' },
  { id: 'Cancel', value: 'cancel' },
  { id: 'Cases', value: 'cases' },
  { id: 'Centernot', value: 'centernot' },
  { id: 'Mathtools', value: 'mathtools' },
  { id: 'Color', value: 'color' },
];

const resolveExtensions = (values: TexExtensionsValues): Array<MathJaxExtensionValue> =>
  extensionValues
    .filter(({ id }) => isTexExtensionControlActive(values, TexExtensionsControlId[id]))
    .map(({ value }) => value);

/** 在 MathJax 配置切换期间保留稳定取景，不把原始 TeX 当普通文本显示 */
const renderTexExtensionsLoading = () => (
  <Layout width={420} height={260} viewBox={{ x: -220, y: -135, width: 440, height: 270 }} />
);

/** 根据 profile、extensions 和公式示例展示 MathJax 配置效果 */
const renderTexExtensions = (values: TexExtensionsValues, lowerTex?: LowerTex) => {
  const source = TexExtensionExample[values.example];
  const activeExtensions = resolveExtensions(values);
  const extensionLines = activeExtensions.reduce<Array<string>>(
    (lines, extension) => {
      const current = lines[lines.length - 1] ?? '';
      const next = current.length === 0 ? extension : `${current}, ${extension}`;
      return current.length > 0 && next.length > 34 ? [...lines, extension] : [...lines.slice(0, -1), next];
    },
    activeExtensions.length === 0 ? ['none'] : [],
  );
  const extensionStatus = [
    {
      runs: [{ text: 'Profile: ', font: { weight: 'bold' as const } }, { text: values.profile }],
    },
    {
      runs: [{ text: 'Extension: ', font: { weight: 'bold' as const } }, { text: extensionLines[0] ?? 'none' }],
    },
    ...extensionLines.slice(1).map(line => ({ runs: [{ text: line }] })),
  ];

  return (
    <Layout width={420} height={260} viewBox={{ x: -220, y: -135, width: 440, height: 270 }} lowerTex={lowerTex}>
      <Node position={[0, -78]} stroke="none" padding={0} font={{ size: 14 }} text={extensionStatus} />
      <Node position={[0, 20]} stroke="none" padding={0} font={{ size: 22 }}>
        {`$$${source}$$`}
      </Node>
    </Layout>
  );
};

const controlledPreview = defineControlledPreview(previewControlContract, values => renderTexExtensions(values));

export const previewSource = controlledPreview.source;

/** 在固定取景中查看不同 MathJax 扩展的公式结果 */
const Demo: FC = () => {
  const values = usePreviewControls(texExtensionsControls);
  const { values: rawValues, setValue } = usePreviewControlContext();
  const requiredExtensionControlId = getRequiredTexExtensionControlId(values.example);

  useEffect(() => {
    if (requiredExtensionControlId === undefined || rawValues[requiredExtensionControlId] === true) return;
    setValue(requiredExtensionControlId, true);
  }, [rawValues, requiredExtensionControlId, setValue]);

  const lowerTexState = useLowerTex({ profile: values.profile, extensions: resolveExtensions(values) });
  return lowerTexState.status === 'ready'
    ? renderTexExtensions(values, lowerTexState.lowerTex)
    : renderTexExtensionsLoading();
};

export default Demo;
