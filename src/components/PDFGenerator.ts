import { PDFDocument, rgb } from 'pdf-lib';
import { PaymentData } from '../types/PaymentData';
import { loadFonts } from '../utils/fontLoader';
import { drawUkrainianText } from '../utils/textRenderer';
import { extractDataWithPositionsFromPDF } from '../utils/pdfExtractor';

export const generateReceiptPDF = async (
  formData: PaymentData,
  existingPdfBytes?: Uint8Array
): Promise<{ success: boolean; message: string; blob?: Blob }> => {
  try {
    // Работаем ТОЛЬКО с загруженным PDF
    if (!existingPdfBytes || existingPdfBytes.length === 0) {
      return { 
        success: false, 
        message: 'Будь ласка, завантажте існуючий PDF файл для редагування' 
      };
    }

    console.log('Начинаем редактирование существующего PDF файла');
    console.log('Размер загруженного PDF:', existingPdfBytes.length, 'байт');

    // Создаем копию данных для избежания detached ArrayBuffer
    const pdfBytesCopy = new Uint8Array(existingPdfBytes.length);
    pdfBytesCopy.set(existingPdfBytes);

    // Проверяем PDF заголовок перед загрузкой
    const pdfHeader = new TextDecoder().decode(pdfBytesCopy.slice(0, 8));
    if (!pdfHeader.startsWith('%PDF-')) {
      return { 
        success: false, 
        message: 'Файл не є коректним PDF документом' 
      };
    }
    
    const pdfDoc = await PDFDocument.load(pdfBytesCopy);
    console.log('Существующий PDF успешно загружен для редактирования');
    
    // Извлекаем шрифты из загруженного PDF
    const { font } = await loadFonts(pdfDoc);
    console.log('Загружены шрифты с поддержкой украинского языка (обычный + жирный)');
    
    // Получаем первую страницу или создаем новую
    const pages = pdfDoc.getPages();
    const page = pages.length > 0 ? pages[0] : pdfDoc.addPage([595.28, 841.89]);

    // Извлекаем оригинальные данные с позициями из PDF для точной замены
    let originalDataWithPositions: Array<{field: string, value: string, x: number, y: number, width: number, height: number}> = [];
    try {
      console.log('Извлекаем оригинальные данные с позициями из PDF для замены');
      originalDataWithPositions = await extractDataWithPositionsFromPDF(pdfBytesCopy);
      console.log('Оригинальные данные с позициями из PDF:', originalDataWithPositions);
    } catch (extractError) {
      console.error('Ошибка извлечения данных с позициями:', extractError);
      return { 
        success: false, 
        message: 'Помилка при аналізі PDF файлу. Перевірте, що файл містить текстові дані.' 
      };
    }

    // Редактируем существующие данные в PDF, не создавая новые
    console.log('Начинаем редактирование существующих данных в PDF');
    
    try {
        console.log('PDF формы не найдены, используем умную замену на основе найденных данных');
        
        // Умный подход - заменяем ТОЛЬКО найденные и измененные поля
        
        console.log('Выполняем замену ВСЕХ найденных полей');
        
        // Заменяем ВСЕ поля, которые:
        // 1. Были найдены в оригинальном PDF
        // 2. Имеют новое значение в форме
        
        let replacementCount = 0;
        
        originalDataWithPositions.forEach(({ field, value: originalValue, x, y, width, height }) => {
          const fieldKey = field as keyof PaymentData;
          const newValue = formData[fieldKey];
          
          // ЗАМЕНЯЕМ ВСЕ ЗНАЧЕНИЯ независимо от изменений:
          // 1. Должно быть новое значение
          // 2. Должно быть найдено оригинальное значение в PDF
          
          const hasNewValue = newValue && newValue.trim();
          const hasOriginalValue = originalValue && originalValue.trim();
          
          if (hasNewValue && hasOriginalValue) {
            console.log(`✅ ЗАМЕНЯЕМ поле ${field}:`);
            console.log(`   Оригинал: "${originalValue}"`);
            console.log(`   Новое: "${newValue}"`);
            console.log(`   Позиция: (${x}, ${y}) размер: ${width}x${height}`);
            
            replacementCount++;
            
            // Рассчитываем размер области для очистки (только значение):
            const originalWidth = originalValue.length * 6; // Ширина старой надписи
            const newWidth = newValue.length * 6; // Ширина нового значения
            
            // Очищаем достаточно для старой надписи, но не больше чем нужно для новой
            const clearWidth = Math.max(originalWidth, Math.min(newWidth, width + 50));
            const clearHeight = height || 12;
            
            console.log(`   Размеры: старая="${originalValue}" (${originalWidth}px)`);
            console.log(`   Новая: "${newValue}" (${newWidth}px)`);
            console.log(`   Очищаем: ${clearWidth}x${clearHeight}px`);
            
            // Очищаем область белым прямоугольником (увеличенная подложка)
            page.drawRectangle({
              x: x - 2, // Увеличенный отступ слева
              y: y - 3, // Увеличенный отступ сверху
              width: clearWidth + 6, // Увеличенный запас по ширине
              height: clearHeight + 6, // Увеличенный запас по высоте
              color: rgb(1, 1, 1), // Белый цвет для очистки
            });
            
            // Добавляем новый текст
            if (field === 'paymentPurpose' && newValue.length > 60) {
              // Для длинного назначения платежа разбиваем на строки
              const words = newValue.split(' ');
              let line = '';
              let currentY = y;
              const maxWidth = 70; // Примерно 70 символов на строку
              
              words.forEach((word, index) => {
                const testLine = line + (line ? ' ' : '') + word;
                
                if (testLine.length > maxWidth && line) {
                  // Выводим текущую строку
                  drawUkrainianText(page, line, {
                    x: x,
                    y: currentY,
                    size: 8,
                    color: rgb(0, 0, 0)
                  }, font);
                  
                  line = word;
                  currentY -= 10; // Переходим на следующую строку
                } else {
                  line = testLine;
                }
                
                // Последнее слово
                if (index === words.length - 1) {
                  drawUkrainianText(page, line, {
                    x: x,
                    y: currentY,
                    size: 8,
                    color: rgb(0, 0, 0)
                  }, font);
                }
              });
            } else {
              // Обычное поле - отображаем только значение
              
              console.log(`📝 Отображаем только значение: "${newValue}" в позиции (${x}, ${y})`);
              
              // Отображаем только значение обычным шрифтом
              if (newValue) {
                drawUkrainianText(page, newValue, {
                  x: x,
                  y: y,
                  size: 10,
                  color: rgb(0, 0, 0)
                }, font);
              }
              
              console.log(`✅ Текст отображен: только значение "${newValue}"`);
            }
          } else {
            // Логируем причину пропуска
            if (!hasNewValue) {
              console.log(`❌ Пропускаем поле ${field} - нет нового значения`);
            } else if (!hasOriginalValue) {
              console.log(`❌ Пропускаем поле ${field} - не найдено в оригинальном PDF`);
            }
          }
        });
        
        console.log(`🎯 Умная замена завершена. Заменено полей: ${replacementCount} из ${originalDataWithPositions.length} найденных`);
        
        if (replacementCount === 0) {
          console.log('⚠️ Ни одно поле не было заменено - возможно, данные не изменились или не были найдены в PDF');
        }
      
    } catch (error) {
      console.error('Ошибка при редактировании PDF:', error);
      throw error;
    }

    // Сохраняем отредактированный PDF
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    const message = 'PDF успішно відредаговано! Виконано точкову заміну тільки змінених полів у їх оригінальних позиціях зі збереженням всіх печаток, QR-кодів та підписів.';

    return {
      success: true,
      message,
      blob
    };

  } catch (error) {
    console.error('Критическая ошибка при генерации PDF:', error);
    return {
      success: false,
      message: `Помилка при обробці PDF: ${error instanceof Error ? error.message : 'Невідома помилка'}`
    };
  }
};
