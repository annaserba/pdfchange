// Отображение украинского текста с Times New Roman
export const safeDrawText = (page: any, text: string, options: any, font: any) => {
  try {
    console.log(`Отображаем украинский текст: "${text}"`);
    page.drawText(text, {
      ...options,
      font
    });
    console.log('✅ Украинский текст успешно отображен с Times New Roman');
  } catch (error) {
    console.error('❌ Ошибка отображения украинского текста:', error);
    throw error; // Прокидываем ошибку дальше, без fallback'ов
  }
};

// Функция для безопасного отображения украинского текста
export const drawUkrainianText = (page: any, text: string, options: any, font: any) => {
  // Проверяем, содержит ли текст украинские символы
  const hasUkrainianChars = /[а-яёіїєґ]/i.test(text);
  
  if (hasUkrainianChars) {
    console.log(`Отображаем украинский текст: "${text}"`);
    // Используем наш Unicode шрифт для украинского текста
    safeDrawText(page, text, options, font);
  } else {
    // Для английского текста и цифр можем использовать стандартный шрифт
    safeDrawText(page, text, options, font);
  }
};

// Функция для отображения жирного украинского текста
export const drawBoldUkrainianText = (page: any, text: string, options: any, font: any, boldFont: any) => {
  if (boldFont) {
    // Используем жирный шрифт если доступен
    console.log(`Отображаем ЖИРНЫЙ украинский текст: "${text}"`);
    safeDrawText(page, text, options, boldFont);
  } else {
    // Имитируем жирность через повторное отображение с небольшим смещением
    console.log(`Имитируем жирность для текста: "${text}"`);
    safeDrawText(page, text, options, font);
    safeDrawText(page, text, { ...options, x: options.x + 0.5 }, font);
  }
};
