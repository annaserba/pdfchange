import { rgb } from "pdf-lib";
const letterSpacing = 0.3;

// Отображение украинского текста по букве с заданным letterSpacing
export const safeDrawText = (page: any, text: string, options: any, font: any) => {
  try {
    console.log(`Отображаем украинский текст по букве: "${text}"`);
    
    const { x: startX, y, size, ...otherOptions } = options;
    let currentX = startX;
    
    // Рисуем каждую букву отдельно с учетом letterSpacing
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      
      // Вычисляем ширину и высоту текущей буквы
      const charWidth = font.widthOfTextAtSize(char, size);
      const charHeight = size;
      
      // Рисуем белую подложку для буквы
      page.drawRectangle({
        x: currentX, // Небольшой отступ слева
        y: y - 2, // Небольшой отступ снизу
        width: charWidth + 1, // Ширина буквы + отступы
        height: charHeight + 1, // Высота буквы + отступы
        color: rgb(1, 1, 1), // Белый цвет подложки
        borderColor: rgb(0.9, 0.9, 0.9), // Светло-серая граница (опционально)
        //borderWidth: 0.5
      });
      
      // Рисуем текущую букву поверх подложки
      page.drawText(char, {
        x: currentX,
        y: y,
        size: size,
        font: font,
        color: rgb(0, 0, 0),
        ...otherOptions
      });
      
      // Перемещаем позицию для следующей буквы с учетом letterSpacing
      currentX += charWidth + letterSpacing;
    }
    
    console.log(`✅ Украинский текст отображен по букве с letterSpacing: ${letterSpacing}`);
  } catch (error) {
    console.error('❌ Ошибка отображения украинского текста:', error);
    throw error; // Прокидываем ошибку дальше, без fallback'ов
  }
};

// Функция для безопасного отображения украинского текста с поддержкой переносов строк
export const drawUkrainianText = (page: any, text: string, options: any, font: any, labelX?: number) => {
  // Проверяем, содержит ли текст переносы строк
  const lines = text.split(/\r?\n/);
  
  if (lines.length > 1) {
    console.log(`Отображаем многострочный текст (${lines.length} строк): "${text}"`);
    
    // Отображаем каждую строку с отступом вниз
    lines.forEach((line, index) => {
      if (line.trim()) { // Пропускаем пустые строки
        const lineOptions = {
          ...options,
          // Первая строка - в исходной позиции, вторая и далее - с координаты заголовка
          x: index === 0 ? options.x : (labelX || options.x),
          y: options.y - (index * (options.size + 2)) // Отступ между строками
        };
        
        console.log(`  Строка ${index + 1}: "${line}" в позиции (${lineOptions.x}, ${lineOptions.y})`);
        safeDrawText(page, line, lineOptions, font);
      }
    });
  } else {
    // Обычный однострочный текст
    const hasUkrainianChars = /[а-яёіїєґ]/i.test(text);
    
    if (hasUkrainianChars) {
      console.log(`Отображаем украинский текст: "${text}"`);
    } else {
      console.log(`Отображаем текст: "${text}"`);
    }
    
    safeDrawText(page, text, options, font);
  }
};

