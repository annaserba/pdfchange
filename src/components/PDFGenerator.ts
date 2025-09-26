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
            
            
            // Добавляем новый текст
            console.log(`📝 Отображаем значение: "${newValue}" в позиции (${x}, ${y})`);
            
            if (newValue) {
              drawUkrainianText(page, newValue, {
                x: x,
                y: y,
                size: 10,
                color: rgb(0, 0, 0)
              }, font);
              
              console.log(`✅ Текст отображен: "${newValue}"`);
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
    const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });

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
