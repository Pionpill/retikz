/**
 * 文本换行解析器，将文本根据特定字符分割成数组
 * 默认的换行标识为：\n
 * @param text 原始文本
 * @param breakMark 换行标识
 */
export const textWrapParse = (text: string, breakMark: string = "\\n"): string[] => {
    const textArray = text.split(breakMark);
    console.log('textArray', textArray)
    return textArray;
};
