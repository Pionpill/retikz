import type { Lang } from '@/i18n';

import type { PreviewFigureType } from '../types';

export type FigureGuideContent = {
  title: string;
  introduction: string;
  sections: Array<{ title: string; items: Array<string> }>;
};

export const figureGuideI18n: Record<Lang, Record<PreviewFigureType, FigureGuideContent>> = {
  zh: {
    flow: {
      title: '流程图说明',
      introduction: '形态表达 Entity 的角色，颜色表达 Docs 逻辑图中稳定的内容类别。',
      sections: [
        {
          title: '形态',
          items: [
            '六边形：参与方或服务',
            '圆角矩形：处理步骤',
            '圆形：事件',
            '胶囊：状态',
            '菱形：分支判断',
            '圆柱：资源',
            '椭圆：概念',
          ],
        },
        {
          title: '颜色',
          items: ['蓝色：重要逻辑', '橙色：数据、状态或 schema', '紫色：算法或复杂逻辑', '灰色：辅助或背景信息'],
        },
      ],
    },
    illustration: {
      title: '示意图说明',
      introduction: '颜色用于区分同一张图里的角色类别，不表示 Retikz 的全局 API 语义。',
      sections: [
        {
          title: '阅读方式',
          items: [
            '先按颜色区分角色，再读节点文字和连线',
            '灰色通常表示辅助标注、参考线或背景信息',
            '具体颜色含义以当前图的标签和邻近正文为准',
          ],
        },
      ],
    },
  },
  en: {
    flow: {
      title: 'Flow guide',
      introduction: 'Shapes express Entity roles. Colors express stable content categories in Docs logic figures.',
      sections: [
        {
          title: 'Shapes',
          items: [
            'Hexagon: participant or service',
            'Rounded rectangle: activity',
            'Circle: event',
            'Capsule: state',
            'Diamond: gateway',
            'Cylinder: resource',
            'Ellipse: concept',
          ],
        },
        {
          title: 'Colors',
          items: [
            'Blue: important logic',
            'Orange: data, state, or schema',
            'Purple: algorithmic or complex logic',
            'Gray: secondary or background content',
          ],
        },
      ],
    },
    illustration: {
      title: 'Illustration guide',
      introduction: 'Colors distinguish roles within this figure; they are not global Retikz API semantics.',
      sections: [
        {
          title: 'How to read it',
          items: [
            'Use color to separate roles, then read nodes and connectors',
            'Gray usually marks annotations, reference lines, or background context',
            'Read each color through the labels and nearby prose for this figure',
          ],
        },
      ],
    },
  },
};
