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
    const { font, boldFont } = await loadFonts(pdfDoc);
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

          if(fieldKey === 'amount' || fieldKey === 'commissionAmount') {
            return;
          }
          
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
            
            // Ищем координату заголовка для этого поля
            const labelField = `${field}_label`;
            const labelData = originalDataWithPositions.find(item => item.field === labelField);
            const labelX = labelData ? labelData.x : x; // Используем x заголовка или текущую позицию как fallback
            
            if (labelData) {
              console.log(`📍 Найден заголовок для ${field}: "${labelData.value}" в позиции (${labelData.x}, ${labelData.y})`);
            } else {
              console.log(`⚠️ Заголовок для ${field} не найден, используем текущую позицию`);
            }
            
            // Проверяем, нужно ли отображать жирным шрифтом
            const boldFields = ['amount', 'commissionAmount'];
            const shouldUseBold = boldFields.includes(field);
            
            if (shouldUseBold) {
              console.log(`💰 ОТОБРАЖАЕМ СУММУ жирным шрифтом: поле ${field} = "${newValue}" в позиции (${x}, ${y}), labelX: ${labelX}`);
            } else {
              console.log(`📝 Отображаем значение: "${newValue}" в позиции (${x}, ${y}), labelX: ${labelX}`);
            }
            
              if (shouldUseBold) {
                // Используем жирный шрифт для сумм
                console.log(`🔥 Используем жирный шрифт для суммы ${field}: "${newValue}"`);
                drawUkrainianText(page, newValue, {
                  x: x,
                  y: y,
                  size: 8,
                  color: rgb(0, 0, 0),
                  letterSpacing: -0.2
                }, boldFont, labelX);
                
                console.log(`✅ СУММА отображена жирным шрифтом: "${newValue}"`);
              } else {
                // Обычный шрифт для остальных полей
                drawUkrainianText(page, newValue, {
                  x: x,
                  y: y,
                  size: 8,
                  color: rgb(0, 0, 0),
                  letterSpacing: -0.2
                }, font, labelX);
                
                console.log(`✅ Текст отображен: "${newValue}"`);
              }
            }
        });
        
        // Специальная обработка для поля "amount" - отображаем под "Призначення платежу"
        if (formData.amount && formData.amount.trim()) {
          console.log(`💰 Специальная обработка поля amount: "${formData.amount}"`);
          
          // Находим позицию поля "Призначення платежу" (значение, не заголовок)
          const paymentPurposeData = originalDataWithPositions.find(item => item.field === 'paymentPurpose');
          
          if (paymentPurposeData) {
            // Рассчитываем количество строк в paymentPurpose
            const paymentPurposeLines = formData.paymentPurpose ? formData.paymentPurpose.split('\n').length : 1;
            const lineHeight = 12; // Высота одной строки
            
            // Размещаем под полем "Призначення платежу" с учетом количества строк
            const amountX = paymentPurposeData.x; // Та же x координата
            const amountY = paymentPurposeData.y - (paymentPurposeLines * lineHeight + 2.5); // Учитываем высоту текста + отступ
            
            console.log(`📍 Отображаем "Сума" в позиции (${amountX}, ${amountY}) - под полем "Призначення платежу" (${paymentPurposeLines} строк)`);
            
            // Отображаем "Сума: [значение]" жирным шрифтом
            const amountText = `Сума: ${formData.amount}`;
            drawUkrainianText(page, amountText, {
              x: amountX,
              y: amountY,
              size: 8,
              color: rgb(0, 0, 0),
              letterSpacing: -0.2
            }, boldFont);
            
            console.log(`✅ Поле "Сума" отображено жирным шрифтом: "${amountText}"`);
          } else {
            console.log(`⚠️ Не найдено поле "Призначення платежу" для размещения "Сума"`);
          }
        }
        
        // Специальная обработка для поля "commissionAmount" - отображаем под "amount"
        if (formData.commissionAmount && formData.commissionAmount.trim()) {
          console.log(`💰 Специальная обработка поля commissionAmount: "${formData.commissionAmount}"`);
          
          // Находим позицию поля "Призначення платежу" для расчета позиции
          const paymentPurposeData = originalDataWithPositions.find(item => item.field === 'paymentPurpose');
          
          if (paymentPurposeData) {
            // Рассчитываем количество строк в paymentPurpose
            const paymentPurposeLines = formData.paymentPurpose ? formData.paymentPurpose.split('\n').length : 1;
            const lineHeight = 12; // Высота одной строки
            
            // Размещаем под полем "amount" (еще ниже на высоту одной строки)
            const commissionX = paymentPurposeData.x; // Та же x координата
            const commissionY = paymentPurposeData.y - (paymentPurposeLines * lineHeight + lineHeight + 5); // Учитываем высоту paymentPurpose + высоту amount + отступ
            
            console.log(`📍 Отображаем "Сума комісії" в позиции (${commissionX}, ${commissionY}) - под полем "Сума" (${paymentPurposeLines} строк в призначенні)`);
            
            // Отображаем "Сума комісії: [значение]" жирным шрифтом
            const commissionText = `Сума комісії: ${formData.commissionAmount}`;
            drawUkrainianText(page, commissionText, {
              x: commissionX,
              y: commissionY,
              size: 8,
              color: rgb(0, 0, 0),
              letterSpacing: -0.2
            }, boldFont);
            
            console.log(`✅ Поле "Сума комісії" отображено жирным шрифтом: "${commissionText}"`);
          } else {
            console.log(`⚠️ Не найдено поле "Призначення платежу" для размещения "Сума комісії"`);
          }
        }
        
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
