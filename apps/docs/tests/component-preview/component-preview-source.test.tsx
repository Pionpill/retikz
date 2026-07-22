import type { FC, ReactNode } from 'react';

import { fadeIn } from '@retikz/core';
import { Layout, Node } from '@retikz/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { ComponentPreviewCardProps } from '../../src/modules/docs/components/component-preview/ComponentPreviewCard';
import type {
  PreviewControlContract,
  PreviewControlRuntime,
  PreviewControlSlot,
} from '../../src/modules/docs/components/component-preview/types';

import i18n from '../../src/i18n';
import * as componentPreviewExports from '../../src/modules/docs/components/component-preview';
import { definePreviewControls } from '../../src/modules/docs/components/component-preview';
import { ComponentPreview } from '../../src/modules/docs/components/component-preview/ComponentPreview';
import { DemoLocationContext } from '../../src/modules/docs/components/component-preview/context';
import {
  buildControlsKey,
  buildKey,
  controlModules,
  demoModules,
  demoSources,
} from '../../src/modules/docs/components/component-preview/registry';

const RegistryAnimatedDemo: FC = () => (
  <Layout width={40} height={20}>
    <Node id="animated" position={[0, 0]} animations={[fadeIn()]} />
  </Layout>
);

const fixtureSegments = ['kernel', 'components', 'test'];

const replaceRegistryValue = <T,>(record: Record<string, T | undefined>, key: string, value: T): (() => void) => {
  const hadOwnValue = Object.hasOwn(record, key);
  const previousValue = record[key];
  record[key] = value;

  return () => {
    if (hadOwnValue) record[key] = previousValue;
    else delete record[key];
  };
};

const installDemoRegistryFixture = (
  name: string,
  previewControls: NonNullable<(typeof demoModules)[string]>['previewControls'],
): (() => void) => {
  const key = buildKey(fixtureSegments, name);
  const restoreModule = replaceRegistryValue(demoModules, key, {
    default: RegistryAnimatedDemo,
    previewControls,
  });
  const restoreSource = replaceRegistryValue(demoSources, key, 'export default RegistryAnimatedDemo;');

  return () => {
    restoreSource();
    restoreModule();
  };
};

const installDemoRegistryContractFixture = (
  name: string,
  previewControlContract: PreviewControlContract,
): (() => void) => {
  const key = buildKey(fixtureSegments, name);
  const restoreModule = replaceRegistryValue(demoModules, key, {
    default: RegistryAnimatedDemo,
    previewControlContract,
  });
  const restoreSource = replaceRegistryValue(demoSources, key, 'export default RegistryAnimatedDemo;');

  return () => {
    restoreSource();
    restoreModule();
  };
};

const capture = vi.hoisted(() => {
  let props: ComponentPreviewCardProps | null = null;
  return {
    set: (next: ComponentPreviewCardProps) => {
      props = next;
    },
    reset: () => {
      props = null;
    },
    read: (): ComponentPreviewCardProps => {
      if (props === null) throw new Error('ComponentPreviewCard props were not captured.');
      return props;
    },
  };
});
const previewControlRuntime: PreviewControlRuntime = {
  remount: () => undefined,
  rendererMode: 'svg',
  renderPane: null,
  hovered: false,
  pinned: true,
  expanded: false,
  active: () => false,
  setActive: () => undefined,
  value: () => undefined,
  setValue: () => undefined,
};

vi.mock('../../src/modules/docs/components/component-preview/ComponentPreviewCard', () => ({
  ComponentPreviewCard: (props: ComponentPreviewCardProps) => {
    capture.set(props);
    return null;
  },
}));

vi.mock('../../src/modules/docs/layout', () => ({
  docPathSegments: () => ['kernel', 'components', 'test'],
  useDocLocation: () => ({ moduleId: 'kernel', sectionId: 'components', pageId: 'test' }),
}));

beforeAll(async () => {
  await i18n.changeLanguage('zh');
});

const renderPreview = (segments: Array<string>, node: ReactNode): ComponentPreviewCardProps => {
  capture.reset();
  renderToStaticMarkup(<DemoLocationContext.Provider value={segments}>{node}</DemoLocationContext.Provider>);
  return capture.read();
};

describe('ComponentPreview Vanilla source', () => {
  it('不再从组件预览根 barrel 暴露旧卡片入口', () => {
    expect(componentPreviewExports).not.toHaveProperty(['Component', 'Render'].join(''));
  });

  it('Tier 2 Plot composite 自动生成 Vanilla 源码与真实 SVG', () => {
    const props = renderPreview(['viz', 'get-start'], <ComponentPreview files="time-axis" />);

    expect(props.source?.vanilla?.files[0]?.code).toContain("from '@retikz/plot-vanilla'");
    expect(props.source?.vanilla?.render).toBeTypeOf('function');
  });

  it('原手写 Plot 示例改由统一管线自动生成 Vanilla', () => {
    const props = renderPreview(['viz', 'get-start'], <ComponentPreview files="line-scatter" />);

    expect(props.source?.vanilla?.files[0].filename).toBe('line-scatter.vanilla.ts');
    expect(props.source?.vanilla?.files[0].code).toContain("import { renderPlot } from '@retikz/plot-vanilla'");
    expect(props.source?.vanilla?.render).toBeTypeOf('function');
  });

  it('自动 Core Vanilla view 使用真实 SVG 并固定 renderer', () => {
    const props = renderPreview(
      ['kernel', 'components', 'effects', 'custom-animation'],
      <ComponentPreview files="custom-property" />,
    );

    expect(props.source?.vanilla?.files[0].filename).toBe('custom-property.vanilla.ts');
    expect(props.source?.vanilla?.render).toBeTypeOf('function');
    expect(props.source?.vanilla?.rendererMode).toBe('svg');
  });

  it('controls demo 使用默认状态提供 React、IR 与 Vanilla 视图', () => {
    const props = renderPreview(
      ['kernel', 'components', 'node', 'coordinate'],
      <ComponentPreview files="coordinate-between" />,
    );

    expect(props.source?.react).toBeDefined();
    expect(props.source?.ir).toBeDefined();
    expect(props.source?.vanilla).toBeDefined();
  });
});

describe('ComponentPreview localized controls', () => {
  it('将 previewClassName 透传给卡片且不再传旧名称', () => {
    const props = renderPreview(
      ['viz', 'grammar', 'mark', 'path'],
      <ComponentPreview files="line-basic" previewClassName="outer-preview-class" />,
    );

    expect(props).toHaveProperty('previewClassName', 'outer-preview-class');
    expect(props).not.toHaveProperty(['component', 'ClassName'].join(''));
    expect(props).not.toHaveProperty(['render', 'AsComponent'].join(''));
    expect(props).not.toHaveProperty('interactive');
  });

  it('自动合并 animation provider 与局部 slots', () => {
    const localSlot: PreviewControlSlot = {
      id: 'local-control',
      visibility: 'always',
      render: () => <button aria-label="Local control" />,
    };
    const props = renderPreview(
      ['viz', 'grammar', 'mark', 'path'],
      <ComponentPreview files="line-basic" controls={{ animation: true, slots: [localSlot] }} />,
    );

    expect(props.controlSlots?.map(slot => slot.id)).toEqual(['animation-controls', 'local-control']);
  });

  it('按 provider、overlay field、definition slot、local slot 顺序组合真实预览 controls', () => {
    const moduleSlot: PreviewControlSlot = {
      id: 'module-raw-slot',
      visibility: 'always',
      render: () => <button aria-label="Module raw slot" />,
    };
    const localSlot: PreviewControlSlot = {
      id: 'local-slot',
      visibility: 'always',
      render: () => <button aria-label="Local slot" />,
    };
    const definition = definePreviewControls({
      presentation: 'overlay',
      controls: [
        {
          kind: 'text',
          id: 'configured-config',
          label: 'Configured config',
          defaultValue: 'fixture',
          visibility: 'hover',
        },
      ],
      slots: [moduleSlot],
    });
    const restore = installDemoRegistryFixture('control-order-fixture', definition);

    try {
      const props = renderPreview(
        fixtureSegments,
        <ComponentPreview files="control-order-fixture" controls={{ slots: [localSlot] }} />,
      );

      expect(props.controlSlots?.map(slot => slot.id)).toEqual([
        'animation-controls',
        'configured-config',
        'module-raw-slot',
        'local-slot',
      ]);
      expect(props.controlSlots?.find(slot => slot.id === 'configured-config')?.visibility).toBe('hover');
      expect(props.controlDefinition).toBe(definition);
    } finally {
      restore();
    }
  });

  it('拒绝 configured config 与 demo raw slot 的中间 group 重复 id', () => {
    const duplicateSlot: PreviewControlSlot = {
      id: 'duplicate-middle-slot',
      visibility: 'always',
      render: () => <button aria-label="Duplicate middle slot" />,
    };
    const restore = installDemoRegistryFixture(
      'control-duplicate-fixture',
      definePreviewControls({
        presentation: 'overlay',
        controls: [
          {
            kind: 'text',
            id: duplicateSlot.id,
            label: 'Duplicate config',
            defaultValue: 'fixture',
            visibility: 'hover',
          },
        ],
        slots: [duplicateSlot],
      }),
    );

    try {
      expect(() => renderPreview(fixtureSegments, <ComponentPreview files="control-duplicate-fixture" />)).toThrow(
        'Duplicate preview control slot id: "duplicate-middle-slot".',
      );
    } finally {
      restore();
    }
  });

  it('panel definition 到达 Card 且不生成字段 slot', () => {
    const definition = definePreviewControls({
      presentation: 'panel',
      sections: [{ controls: [{ kind: 'text', id: 'text', label: 'Text', defaultValue: 'Node' }] }],
    });
    const restore = installDemoRegistryFixture('control-panel-fixture', definition);

    try {
      const props = renderPreview(fixtureSegments, <ComponentPreview files="control-panel-fixture" />);

      expect(props.controlDefinition).toBe(definition);
      expect(props.controlSlots?.map(slot => slot.id)).toEqual(['animation-controls']);
    } finally {
      restore();
    }
  });

  it('文件化 controls 优先于 demo 内联的兜底定义', () => {
    const name = 'localized-control-panel-fixture';
    const fallbackDefinition = definePreviewControls({
      presentation: 'panel',
      title: 'Fallback panel',
      sections: [{ controls: [{ kind: 'text', id: 'text', label: 'Fallback', defaultValue: 'Node' }] }],
    });
    const localizedDefinition = definePreviewControls({
      presentation: 'panel',
      title: 'Localized panel',
      sections: [{ controls: [{ kind: 'text', id: 'text', label: 'Localized', defaultValue: 'Node' }] }],
    });
    const restoreDemo = installDemoRegistryFixture(name, fallbackDefinition);
    const restoreControls = replaceRegistryValue(controlModules, buildControlsKey(fixtureSegments, name), {
      previewControls: localizedDefinition,
    });

    try {
      const props = renderPreview(fixtureSegments, <ComponentPreview files={name} />);

      expect(props.controlDefinition).toBe(localizedDefinition);
    } finally {
      restoreControls();
      restoreDemo();
    }
  });

  it('将 canonical values 与 presets 随完整 contract 传给 Card', () => {
    const contract = {
      controls: definePreviewControls({
        presentation: 'panel',
        sections: [
          { controls: [{ kind: 'number' as const, id: 'strokeWidth', label: 'Stroke width', defaultValue: 2 }] },
        ],
      }),
      canonicalValues: { strokeWidth: 3 },
      presets: [{ id: 'bold', label: 'Bold', values: { strokeWidth: 6 } }],
      relatedApis: ['Node.strokeWidth'],
    };
    const restore = installDemoRegistryContractFixture('control-contract-fixture', contract);

    try {
      const props = renderPreview(fixtureSegments, <ComponentPreview files="control-contract-fixture" />);

      expect(props.controlContract).toBe(contract);
      expect(props.controlDefinition).toBe(contract.controls);
    } finally {
      restore();
    }
  });

  it('为 node-styled 解析真实 panel definition', () => {
    const props = renderPreview(['kernel', 'components', 'node', 'overview'], <ComponentPreview files="node-styled" />);

    expect(props.controlDefinition).toMatchObject({
      presentation: 'panel',
      title: '属性',
    });
    expect(props.controlSlots?.map(slot => slot.id)).not.toContain('text');
  });

  it('英文页面使用英文声明式 controls', async () => {
    await i18n.changeLanguage('en');

    try {
      const props = renderPreview(['viz', 'grammar', 'mark', 'path'], <ComponentPreview files="line-curve" />);
      const control = props.controlSlots?.[0];

      expect(control).toBeDefined();
      const markup = renderToStaticMarkup(control?.render(previewControlRuntime));
      expect(markup).toContain('aria-label="Connection"');
      expect(markup).toContain('Linear');
      expect(markup).not.toContain('连接方式');
    } finally {
      await i18n.changeLanguage('zh');
    }
  });

  it('英文页面可显式复用另一个 demo 的英文 controls', async () => {
    await i18n.changeLanguage('en');

    try {
      const props = renderPreview(
        ['viz', 'grammar', 'mark', 'path'],
        <ComponentPreview files="line-basic" controls={{ name: 'line-curve' }} />,
      );
      const control = props.controlSlots?.[0];

      expect(control).toBeDefined();
      const markup = renderToStaticMarkup(control?.render(previewControlRuntime));
      expect(markup).toContain('aria-label="Connection"');
      expect(markup).not.toContain('连接方式');
    } finally {
      await i18n.changeLanguage('zh');
    }
  });

  it('可通过 name=false 禁用内容 controls', () => {
    const props = renderPreview(
      ['viz', 'grammar', 'mark', 'path'],
      <ComponentPreview files="line-curve" controls={{ name: false }} />,
    );

    expect(props.controlSlots?.map(slot => slot.id)).not.toContain('path-curve');
  });

  it('拒绝局部 slot 与内容 controls 使用重复 id', () => {
    const localSlot: PreviewControlSlot = {
      id: 'path-curve',
      visibility: 'always',
      render: () => <button aria-label="Duplicate control" />,
    };

    expect(() =>
      renderPreview(
        ['viz', 'grammar', 'mark', 'path'],
        <ComponentPreview files="line-curve" controls={{ slots: [localSlot] }} />,
      ),
    ).toThrow('Duplicate preview control slot id: "path-curve".');
  });
});

describe('ComponentPreview files source', () => {
  it('将主文件对象的 diffFrom 用作 React 主源码 baseline', () => {
    const props = renderPreview(
      ['kernel', 'examples', 'learning-path'],
      <ComponentPreview files={{ file: 'learning-path-02-spine', diffFrom: 'learning-path-01-title' }} />,
    );

    expect(props.name).toBe('learning-path-02-spine');
    expect(props.source?.react?.files[0]).toMatchObject({
      isMain: true,
      filename: 'learning-path-02-spine.demo.tsx',
    });
    expect(props.source?.react?.files[0].diff).toBeDefined();
  });

  it('将附加文件对象的 diffFrom 用作该文件自己的 baseline', () => {
    const props = renderPreview(
      ['kernel', 'examples', 'ohms-law-circuit'],
      <ComponentPreview
        files={['circuit-01-meters', { file: 'circuit-01-meters.meter.tsx', diffFrom: 'circuit-01-meters.meter.tsx' }]}
      />,
    );

    expect(props.source?.react?.files[1]).toMatchObject({
      filename: 'circuit-01-meters.meter.tsx',
    });
    expect(props.source?.react?.files[1].diff).toBeDefined();
  });

  it('主文件有 baseline 时继续为同前缀附加文件推导 baseline 文件名', () => {
    const props = renderPreview(
      ['kernel', 'examples', 'ohms-law-circuit'],
      <ComponentPreview
        files={[{ file: 'circuit-01-meters', diffFrom: 'circuit-01-meters' }, 'circuit-01-meters.meter.tsx']}
      />,
    );

    expect(props.source?.react?.files[1].diff).toBeDefined();
  });
});
