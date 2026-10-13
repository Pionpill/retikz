/** 绘制解析图的双语文案 */
export const paintResolutionI18n = {
  zh: {
    input: 'fill / stroke → resolvePaint\n数值颜色已在此前确定',
    solid: '纯色字符串\n原样返回',
    gradient: '渐变对象\n保留描述并包装',
    pattern: '图案对象\n查找 Definition\n补齐尺寸、解析样式',
    color: '颜色字符串',
    gradientResult: 'PaintResolution\nkind: paint · spec',
    patternResult: 'PaintResolution\nkind: paint · spec · pattern',
    output: 'Canonical 的 fill / stroke\n交给后续编译',
  },
  en: {
    input: 'fill / stroke → resolvePaint\nNumeric colors resolved earlier',
    solid: 'Solid color string\nReturn unchanged',
    gradient: 'Gradient object\nWrap its description',
    pattern: 'Pattern object\nLook up Definition\nResolve size and styles',
    color: 'Color string',
    gradientResult: 'PaintResolution\nkind: paint · spec',
    patternResult: 'PaintResolution\nkind: paint · spec · pattern',
    output: 'Canonical fill / stroke\nPass to compilation',
  },
};
