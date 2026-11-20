import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import * as IR from '@retikz/core';
import { z } from 'zod';

import { SCHEMA_REGISTRY } from '../../src/modules/docs/components/mdx-content/zod-schema/schema-registry';

/** 节点家族拥有的 schema 与中文说明；共享引用不递归收录 */
export const nodeSchemas = {
  NodeSchema: {
    description: '带位置、可选文字和视觉形状的节点',
    descriptions: {
      type: '判别字段，固定为 node',
      id: '可选引用标识，路径或其它节点通过它引用本节点',
      aliasIds: '同一节点的额外引用 id；要求主 id，别名非空白、互不重复且不同于主 id，不生成额外图元',
      shape:
        '视觉形状名称或带参数引用；省略时继承 Scope.defaults.node.shape，无继承值时使用 rectangle，未注册名称在编译时失败',
      boundary: '连线使用的连接面；可由单个路径端点覆盖，不改变节点外观',
      position:
        '笛卡尔、极坐标、相对、偏移、比例或锚点对齐位置；省略时为当前局部坐标系的 [0, 0]，非笛卡尔形式在编译时求值',
      rotate: '绕节点中心的旋转角度，正值顺时针',
      text: '正文字符串或行数组，支持行级样式及文字与公式混排；公式需要 lowerTex',
      cornerRadius: '仅 rectangle 使用的顶层圆角半径，单位为用户单位',
      scale: '缩放节点，同时影响路径在节点上的附着位置',
      label: '附着于节点的一个或多个标签',
      zIndex: '同层元素栈序，大者在上，同值保持声明顺序',
      style: '逐字段覆盖继承默认值的节点视觉配置',
      layout: '节点尺寸、间距与文字排布配置',
      meta: '透传至输出图元的 JSON 元数据，不参与编译计算',
      animations: '元素动画轨道，透传至输出图元，不参与布局且不跨 Scope 继承',
    },
  },
  NodeStyleSchema: {
    description: '节点视觉覆盖；每个字段独立覆盖继承值',
    descriptions: {
      color: '图元主色，未单独覆盖的描边、填充和标签可由它派生',
      fill: '填充：精确颜色、主色权重或 Paint',
      stroke: '描边：精确颜色、主色权重或 Paint',
      opacity: '整体透明度或独立的 overall、fill、stroke 因子',
      shadow: '投影预设或投影配置，不影响节点形状尺寸',
      blendMode: '图元与背景的混合模式',
      strokeWidth: '边框宽度，单位为用户单位；省略时默认 1',
      dashed: '虚线预设，被显式 dashPattern 覆盖',
      dotted: '点线预设，被 dashPattern 或 dashed 覆盖',
      dashPattern: '显式虚线段与间隔长度，优先于 dashed 和 dotted',
      dashOffset: '虚线起点偏移，允许正数、零或负数',
      lineCap: '描边端帽形状',
      lineJoin: '描边拐角连接形状',
      textColor: '文字颜色或主色权重；contrast 根据静态填充选择黑白，缺省为 currentColor',
      font: '正文字体覆盖，缺省字段沿用文字默认值',
    },
  },
  NodeLayoutSchema: {
    description: '节点的尺寸、内外间距和文字排布',
    descriptions: {
      textAlign: '多行文字块内的水平对齐，缺省为 middle',
      lineHeight: '行高，单位为用户单位；省略时使用字号的 1.2 倍',
      maxTextWidth: '自动折行阈值，单位为用户单位；省略时不自动折行',
      width: '缩放前可见边框的精确宽度，不含 margin，不能小于有效最小宽度',
      minimumSize: '节点可见边框的尺寸下限，以用户单位计',
      padding: '正文到边框的内间距',
      margin: '连接面外间距',
    },
  },
  NodeLabelSchema: {
    description: '添加独立于节点正文的标签，不影响节点本身的尺寸',
    descriptions: {
      text: '标签文本块：字符串支持换行，非空行数组支持逐行样式与混排片段',
      textColor: '标签文字颜色，缺省时回退到 currentColor',
      opacity: '与节点整体透明度相乘',
      textAlign: '文本块内部行对齐，缺省 middle；独立于边界附着 align',
      lineHeight: '最小行槽高度，缺省为有效字号的 1.2 倍，实际内容更高时扩展',
      maxTextWidth: '自动折行宽度；过长文字按字素拆分，公式保持完整',
      font: '未指定的字体字段继承节点字体',
      align: '标签视觉框沿附着点切线的对齐方式，缺省 middle',
      position: '缺省为 top；取 center 时，placement、distance 和 align 不影响标签摆放',
      placement: '缺省为 outside',
      distance: '节点边框到旋转后标签框的净距，以用户单位计；缺省时使用 labelDistance',
      rotate: '标签绕自身中心旋转；radial 沿附着点的外向方向，tangent 在此基础上加 90°',
      keepUpright: '若旋转会使标签倒置，则将其翻转 180°',
      pin: '设为 true 或传入样式对象时绘制引线；placement 为 inside 时不能启用',
    },
  },
  NodeLabelSidePositionSchema: {
    description: '将标签附着在盒状节点一条边上的指定位置',
    descriptions: { fraction: '水平边从左向右递增，垂直边从上向下递增；缺省为 0.5' },
  },
  NodeLabelPinSchema: {
    description: '外侧节点标签的引线样式',
    descriptions: {
      opacity: '与宿主透明度相乘的引线因子；省略时使用标签有效透明度，不受行或片段影响',
      stroke: '引线颜色或由标签主色派生的权重',
      strokeWidth: '引线宽度，单位为用户单位；默认 1',
      dashPattern: '引线虚线段与间隔长度',
      dashOffset: '虚线起点偏移，允许正数、零或负数',
      lineCap: '描边端帽形状',
      lineJoin: '描边拐角连接形状',
    },
  },
  CoordinateSchema: {
    description: '不绘制可见内容的命名位置，可作为路径端点或相对定位参照',
    descriptions: {
      type: '',
      id: '该坐标的唯一引用名',
      position: '',
    },
  },
  BoundarySchema: {
    description: '节点或路径端点使用的连接面引用；字符串名称或带 JSON 参数的引用',
    descriptions: {},
  },
} as const;

/** 生成节点 Schema 页面；字段结构由 ZodSchema 读取公开源码，中文说明由此配置维护 */
export const writeNodeSchemaReferenceMdx = (outputDirectory: string): void => {
  for (const name of Object.keys(nodeSchemas) as Array<keyof typeof nodeSchemas>) {
    if (!(name in IR)) continue;
    const schema = SCHEMA_REGISTRY[name].schema;
    if (!(schema instanceof z.ZodObject)) continue;

    const fields = Object.keys(schema.shape);
    const translatedFields = Object.keys(nodeSchemas[name].descriptions);
    if (
      fields.some(field => !translatedFields.includes(field)) ||
      translatedFields.some(field => !fields.includes(field))
    ) {
      throw new Error(`Node schema translation fields do not match public schema: ${name}`);
    }
  }

  mkdirSync(outputDirectory, { recursive: true });

  for (const lang of ['zh', 'en'] as const) {
    const zh = lang === 'zh';
    const intro = zh
      ? '本页仅收录节点家族拥有的输入 Schema，来自 `@retikz/core`。共享的位置、形状、文字、字体、颜色和几何 Schema 只保留引用名称，不递归展开。React 的 Text 是行级语法糖，没有独立持久化 Schema。首次使用见[基础用法](/kernel/components/node/usage)。\n\nNode.position 可省略，Core 解析时使用局部原点 [0, 0]；直接 schema parse 会物化此默认值。Node 的 style / layout 和标签配置按需提供；字段省略时继续参与继承与编译默认值解析，不代表已写入固定值。显式字段覆盖继承值；label 的实际距离还取决于编译配置 labelDistance。Schema 表中的默认值只展示源码声明的默认。'
      : 'This page includes only input schemas owned by the node family, exported by `@retikz/core`. Shared position, shape, text, font, paint, and geometry schemas remain named references. React Text is line syntax with no separate persistent schema. Start with [Basic usage](/kernel/components/node/usage).\n\nNode.position is optional and resolves to the local origin [0, 0] in Core; direct schema parsing materializes this default. Provide Node style / layout and label options as needed. Omitted fields remain subject to inheritance and compile defaults; they are not materialized fixed values. Explicit fields override inherited values, and label distance also depends on compile labelDistance. Default columns show only defaults declared by the schema.';
    const sections = Object.entries(nodeSchemas)
      .filter(([name]) => name in IR)
      .map(
        ([name, config]) =>
          `## ${name}\n\n<ZodSchema name="${name}"${zh ? ` description=${JSON.stringify(config.description)} descriptions={${JSON.stringify(config.descriptions, null, 2)}}` : ''} />`,
      );
    writeFileSync(
      path.resolve(outputDirectory, `schemas.${lang}.mdx`),
      `{/* Generated by pnpm generate:node-schema. Do not edit manually. */}\n\n${intro}\n\n${sections.join('\n\n')}\n\n## BoundaryLabelSchema\n\n${zh ? 'Kernel 共享的边界标签契约。Node 复用其中的旋转、放置和对齐字段，同时保留自己的位置、引线、文本块及默认值；Ribbon 端点直接使用此 Schema。' : 'The shared Kernel boundary-label contract. Node reuses its rotation, placement, and alignment fields while retaining its own position, leader, text blocks, and defaults. Ribbon endpoints use this schema directly.'}\n\n<ZodSchema shallow name="BoundaryLabelSchema" />\n`,
      'utf8',
    );
  }
};
