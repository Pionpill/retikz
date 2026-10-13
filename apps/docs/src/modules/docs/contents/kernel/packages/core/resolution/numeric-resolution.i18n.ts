/** 属性解析图的双语文案 */
export const numericResolutionI18n = {
  zh: {
    base: '基准色 color\n作为前景颜色',
    theme: '主题 mode 决定背景\nLight 白色 · Dark 黑色',
    weight: '数值颜色 w\n作为混合权重',
    blend: '按权重预合成\n基准色 × w\n+ 背景色 × (1 − w)',
    result: '不透明颜色字符串\n写入对应颜色属性',
  },
  en: {
    base: 'Base color: color\nForeground',
    theme: 'Theme mode selects backdrop\nLight: white · Dark: black',
    weight: 'Numeric color w\nBlending weight',
    blend: 'Composite by weight\nbase × w\n+ backdrop × (1 − w)',
    result: 'Opaque color string\nAssigned to the color property',
  },
};
