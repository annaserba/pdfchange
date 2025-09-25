// Функция для разбиения текста на блоки с переносом строк

export interface TextBlock {
  text: string;
  x: number;
  y: number;
  isFirstLine: boolean;
}

/**
 * Разбивает текст на блоки для отображения с переносом строк
 * @param fullText - полный текст для разбиения
 * @param startX - начальная X позиция
 * @param startY - начальная Y позиция  
 * @param maxCharsFirstLine - максимум символов в первой строке (по умолчанию 45)
 * @param lineHeight - высота строки (по умолчанию 12)
 * @returns массив блоков текста с позициями
 */
export const splitTextIntoBlocks = (
  fullText: string,
  startX: number,
  startY: number,
  maxCharsFirstLine: number = 45,
  lineHeight: number = 12
): TextBlock[] => {
  const blocks: TextBlock[] = [];
  
  if (!fullText || fullText.trim().length === 0) {
    return blocks;
  }

  const text = fullText.trim();
  
  // Если текст помещается в первую строку
  if (text.length <= maxCharsFirstLine) {
    blocks.push({
      text: text,
      x: startX,
      y: startY,
      isFirstLine: true
    });
    return blocks;
  }

  // Улучшенный алгоритм разбиения на строки
  const words = text.split(/\s+/); // Разбиваем по любым пробельным символам
  let currentLine = '';
  let currentY = startY;
  let isFirstLine = true;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    
    // Если слово слишком длинное для любой строки, разбиваем его
    if (word.length > maxCharsFirstLine) {
      // Сначала добавляем текущую строку, если она не пустая
      if (currentLine.trim()) {
        blocks.push({
          text: currentLine.trim(),
          x: startX,
          y: currentY,
          isFirstLine: isFirstLine
        });
        currentY -= lineHeight;
        isFirstLine = false;
        currentLine = '';
      }
      
      // Разбиваем длинное слово на части
      let remainingWord = word;
      while (remainingWord.length > 0) {
        const maxChars = isFirstLine ? maxCharsFirstLine : 60;
        const chunk = remainingWord.substring(0, maxChars);
        
        blocks.push({
          text: chunk,
          x: startX,
          y: currentY,
          isFirstLine: isFirstLine
        });
        
        remainingWord = remainingWord.substring(maxChars);
        if (remainingWord.length > 0) {
          currentY -= lineHeight;
          isFirstLine = false;
        }
      }
      continue;
    }
    
    const testLine = currentLine + (currentLine ? ' ' : '') + word;
    const maxChars = isFirstLine ? maxCharsFirstLine : 60; // Оптимальная ширина для последующих строк
    
    if (testLine.length <= maxChars) {
      // Слово помещается - добавляем к текущей строке
      currentLine = testLine;
    } else {
      // Слово не помещается - завершаем текущую строку и начинаем новую
      if (currentLine.trim()) {
        blocks.push({
          text: currentLine.trim(),
          x: startX,
          y: currentY,
          isFirstLine: isFirstLine
        });
        
        currentY -= lineHeight;
        isFirstLine = false;
      }
      
      // Начинаем новую строку с текущего слова
      currentLine = word;
    }
  }

  // Добавляем последнюю строку, если она есть
  if (currentLine.trim()) {
    blocks.push({
      text: currentLine.trim(),
      x: startX,
      y: currentY,
      isFirstLine: isFirstLine
    });
  }

  return blocks;
};

/**
 * Разбивает текст заголовок + значение с учетом переноса
 * @param label - заголовок (например, "Призначення платежу:")
 * @param value - значение
 * @param startX - начальная X позиция
 * @param startY - начальная Y позиция
 * @param maxCharsFirstLine - максимум символов в первой строке
 * @param lineHeight - высота строки
 * @returns массив блоков для отображения
 */
export const splitLabelAndValue = (
  label: string,
  value: string,
  startX: number,
  startY: number,
  maxCharsFirstLine: number = 45,
  lineHeight: number = 12
): TextBlock[] => {
  const fullText = `${label} ${value}`;
  
  // Если весь текст помещается в одну строку
  if (fullText.length <= maxCharsFirstLine) {
    return [{
      text: fullText,
      x: startX,
      y: startY,
      isFirstLine: true
    }];
  }

  const blocks: TextBlock[] = [];
  
  // Первый блок - заголовок
  blocks.push({
    text: label,
    x: startX,
    y: startY,
    isFirstLine: true
  });

  // Разбиваем значение на строки, выравнивая по левому краю заголовка
  const valueBlocks = splitTextIntoBlocks(
    value,
    startX, // Выравниваем по левому краю заголовка
    startY - lineHeight, // На строку ниже
    60, // Оптимальная ширина для значения
    lineHeight
  );

  // Добавляем блоки значения
  blocks.push(...valueBlocks.map(block => ({
    ...block,
    isFirstLine: false
  })));

  return blocks;
};

/**
 * Вычисляет общую высоту текстовых блоков
 * @param blocks - массив текстовых блоков
 * @param lineHeight - высота строки
 * @returns общая высота в пикселях
 */
export const calculateBlocksHeight = (blocks: TextBlock[], lineHeight: number = 12): number => {
  if (blocks.length === 0) return 0;
  
  const minY = Math.min(...blocks.map(block => block.y));
  const maxY = Math.max(...blocks.map(block => block.y));
  
  return maxY - minY + lineHeight;
};
