import type { NodeEvalCase } from '../suite';

/** 布局 */
export const layoutCases: Array<NodeEvalCase> = [
  {
    id: 'NG001',
    task: '设置未缩放的可见边框宽度恰为 120 个用户单位，不含外间距；最小尺寸统一后备值 40，只将最小宽度改为 80、最小高度改为 30。',
    expected: {
      type: 'node',
      layout: {
        width: 120,
        minimumSize: {
          default: 40,
          width: 80,
          height: 30,
        },
      },
    },
  },
  {
    id: 'NG002',
    task: '节点可随内容增长，但宽高都至少为 50 个用户单位；不要设置精确宽度。',
    expected: {
      type: 'node',
      layout: {
        minimumSize: 50,
      },
    },
    mustOmit: ['layout.width'],
  },
  {
    id: 'NG003',
    task: '保留最小尺寸层级：统一后备为 20 个用户单位，只将最小宽度覆盖为 40；高度继续用统一后备，不显式填写。',
    expected: {
      type: 'node',
      layout: {
        minimumSize: {
          default: 20,
          width: 40,
        },
      },
    },
    mustOmit: ['layout.minimumSize.height', 'layout.width'],
    counterexample: {
      expected: {
        type: 'node',
        layout: {
          width: 40,
          minimumSize: 20,
        },
      },
      reason: '把下限误作精确宽度，丢失可增长语义',
    },
  },
  {
    id: 'NG004',
    task: '内容与边框之间四边留 6 个用户单位，连接边界外围四边再偏移 10 个用户单位；不改变文字折行宽度。',
    expected: {
      type: 'node',
      layout: {
        padding: 6,
        margin: 10,
      },
    },
    mustOmit: ['layout.width', 'layout.maxTextWidth'],
    counterexample: {
      expected: {
        type: 'node',
        layout: {
          padding: 10,
          margin: 6,
        },
      },
      reason: '内外间距互换；不能靠 schema 合法算通过',
    },
  },
  {
    id: 'NG005',
    task: '内容到边框的内间距配置需要保留层级：统一后备 2，水平后备 4，垂直后备 6，左边 8，右边 10，上边 12，下边 14，具体边覆盖轴和统一后备。',
    expected: {
      type: 'node',
      layout: {
        padding: {
          default: 2,
          x: 4,
          y: 6,
          left: 8,
          right: 10,
          top: 12,
          bottom: 14,
        },
      },
    },
  },
  {
    id: 'NG006',
    task: '连接边界之外的外偏移配置需要保留层级：统一后备 2，水平后备 4，垂直后备 6，左边 8，右边 10，上边 12，下边 14，具体边覆盖轴和统一后备。',
    expected: {
      type: 'node',
      layout: {
        margin: {
          default: 2,
          x: 4,
          y: 6,
          left: 8,
          right: 10,
          top: 12,
          bottom: 14,
        },
      },
    },
  },
  {
    id: 'NG007',
    task: '内间距统一后备 2，水平后备 5，垂直后备 7，只将左边覆盖为 0、下边覆盖为 9；右边和上边保持轴级继承，不显式填入。',
    expected: {
      type: 'node',
      layout: {
        padding: {
          default: 2,
          x: 5,
          y: 7,
          left: 0,
          bottom: 9,
        },
      },
    },
    mustOmit: ['layout.padding.right', 'layout.padding.top'],
  },
  {
    id: 'NG008',
    task: '内间距统一后备 2，只覆盖水平后备为 5、左边为 0；上边和下边继续用统一后备，不显式填写垂直或边值。',
    expected: {
      type: 'node',
      layout: {
        padding: {
          default: 2,
          x: 5,
          left: 0,
        },
      },
    },
    mustOmit: ['layout.padding.y', 'layout.padding.top', 'layout.padding.bottom'],
  },
  {
    id: 'NG009',
    task: '外偏移统一后备 2，水平后备 5，垂直后备 7，只将左边覆盖为 0、下边覆盖为 9；右边和上边保持轴级继承，不显式填入。',
    expected: {
      type: 'node',
      layout: {
        margin: {
          default: 2,
          x: 5,
          y: 7,
          left: 0,
          bottom: 9,
        },
      },
    },
    mustOmit: ['layout.margin.right', 'layout.margin.top'],
  },
  {
    id: 'NG010',
    task: '外偏移统一后备 2，只覆盖水平后备为 5、左边为 0；上边和下边继续用统一后备，不显式填写垂直或边值。',
    expected: {
      type: 'node',
      layout: {
        margin: {
          default: 2,
          x: 5,
          left: 0,
        },
      },
    },
    mustOmit: ['layout.margin.y', 'layout.margin.top', 'layout.margin.bottom'],
  },
  {
    id: 'NG011',
    task: '正文有两行“第一”“第二”，块内左对齐，行高 20、自动折行上限 80 个用户单位；不要设置节点可见边框精确宽度。',
    expected: {
      type: 'node',
      text: ['第一', '第二'],
      layout: {
        textAlign: 'start',
        lineHeight: 20,
        maxTextWidth: 80,
      },
    },
    mustOmit: ['layout.width'],
  },
  {
    id: 'NG012',
    task: '正文两行“甲”“乙”，字体大小 20；文本对齐、行高和自动折行采用默认，不物化默认字段。',
    expected: {
      type: 'node',
      text: ['甲', '乙'],
      style: {
        font: {
          size: 20,
        },
      },
    },
    mustOmit: ['layout.textAlign', 'layout.lineHeight', 'layout.maxTextWidth'],
  },
];
