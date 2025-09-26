import { PaymentData } from '../types/PaymentData';
import { parseReceiptText } from './textParser';

// Функция для извлечения данных из PDF (без позиций)
export const extractDataFromPDF = async (pdfBytes: Uint8Array): Promise<Partial<PaymentData>> => {
  try {
    // Создаем копию данных для избежания detached ArrayBuffer
    const pdfBytesCopy = new Uint8Array(pdfBytes.length);
    pdfBytesCopy.set(pdfBytes);

    // Используем динамический импорт для pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    
    // Настраиваем worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    
    // Загружаем PDF
    const pdf = await pdfjsLib.getDocument({ 
      data: pdfBytesCopy,
      verbosity: 0,
      stopAtErrors: false
    }).promise;
    
    // Получаем первую страницу
    const page = await pdf.getPage(1);
    
    // Извлекаем текстовое содержимое
    const textContent = await page.getTextContent();
    
    // Объединяем весь текст, исключая игнорируемые фрагменты
    const fullText = textContent.items
      .map((item: any) => item.str)
      .filter(text => !shouldIgnoreText(text)) // Фильтруем игнорируемые тексты
      .join(' ');
    
    // Парсим текст и возвращаем данные
    return parseReceiptText(fullText);
    
  } catch (error) {
    console.error('Ошибка извлечения данных из PDF:', error);
    return {};
  }
};

// Вспомогательная функция для определения меток полей
const isFieldLabelText = (text: string): boolean => {
  const labels = [
    'відправник:', 'банк платника:', 'код банку:', 'єдрпоу:', 
    'одержувач:', 'призначення платежу:'
  ];
  
  return labels.some(label => text.toLowerCase().includes(label));
};

// Вспомогательная функция для фильтрации игнорируемого текста
const shouldIgnoreText = (text: string): boolean => {
  const ignoredTexts = [
    'надання платних послуг',
    'надание платных услуг'
  ];
  
  const normalizedText = text.toLowerCase().trim();
  return ignoredTexts.some(ignored => normalizedText.includes(ignored));
};

// Функция для извлечения данных с их позициями из PDF (альбомный формат)
export const extractDataWithPositionsFromPDF = async (
  pdfBytes: Uint8Array
): Promise<Array<{field: string, value: string, x: number, y: number, width: number, height: number}>> => {
  try {
    // Создаем копию данных для избежания detached ArrayBuffer
    const pdfBytesCopy = new Uint8Array(pdfBytes.length);
    pdfBytesCopy.set(pdfBytes);

    // Используем динамический импорт для pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');
    
    // Настраиваем worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    
    // Загружаем PDF
    const pdf = await pdfjsLib.getDocument({ 
      data: pdfBytesCopy,
      verbosity: 0,
      stopAtErrors: false
    }).promise;
    
    // Получаем первую страницу
    const page = await pdf.getPage(1);
    
    // Извлекаем текстовое содержимое с позициями
    const textContent = await page.getTextContent();
    
    const foundFields: Array<{field: string, value: string, x: number, y: number, width: number, height: number}> = [];
    
    // Сначала извлекаем все данные обычным способом
    const fullText = textContent.items.map((item: any) => item.str).join(' ');
    const extractedData = parseReceiptText(fullText);
    
    console.log('Ищем позиции для найденных данных:', extractedData);
    
    // Маппинг полей к их заголовкам
    const fieldLabels: Record<string, string[]> = {
      sender: ['відправник:', 'отправитель:', 'плательщик:'],
      payerBank: ['банк платника:', 'банк плательщика:'],
      bankCode: ['код банку:', 'код банка:', 'мфо:'],
      edrpouPayer: ['єдрпоу:', 'едрпоу:', 'єдрпоу платника:', 'едрпоу плательщика:'],
      receiptCode: ['код квитанції:', 'код квитанции:', '№ документа:', 'номер документа:'],
      paymentDate: ['дата платежу:', 'дата платежа:', 'дата:'],
      valueDate: ['дата валютування:', 'дата валютирования:'],
      senderAccount: ['рахунок відправника:', 'рахунок платника:', 'счет плательщика:'],
      recipient: ['одержувач:', 'получатель:'],
      recipientBank: ['банк одержувача:', 'банк получателя:'],
      edrpouRecipient: ['єдрпоу:', 'едрпоу:', 'єдрпоу одержувача:', 'едрпоу получателя:'],
      recipientAccount: ['рахунок одержувача:', 'счет получателя:'],
      paymentPurpose: ['призначення платежу:', 'назначение платежа:'],
      paidAmount: ['сплачено:', 'оплачено:', 'уплачено:'],
      amount: ['сума:', 'сумма:'],
      commissionAmount: ['сума комісії:', 'сумма комиссии:', 'комісія:', 'комиссия:']
    };

    // Ищем позиции ЗАГОЛОВКОВ и ЗНАЧЕНИЙ полей
    Object.entries(extractedData).forEach(([field, value]) => {
      if (value && typeof value === 'string' && value.trim()) {
        console.log(`Ищем ЗАГОЛОВОК и ЗНАЧЕНИЕ для поля ${field}: "${value}"`);
        

        // 1. ИЩЕМ ЗАГОЛОВОК поля
        const labels = fieldLabels[field] || [];
        labels.forEach(label => {
          textContent.items.forEach((item: any) => {
            const itemText = item.str.trim().toLowerCase();
            
            // Игнорируем определенные тексты
            if (shouldIgnoreText(itemText)) {
              return;
            }
            
            if (itemText === label.toLowerCase() || itemText.includes(label.toLowerCase())) {
              const transform = item.transform;
              const x = transform[4];
              const y = transform[5];
              
              foundFields.push({
                field: `${field}_label`, // Добавляем суффикс _label для заголовка
                value: label,
                x: x,
                y: y,
                width: item.width || label.length * 6,
                height: item.height || 12
              });
              
              console.log(`✅ Найден ЗАГОЛОВОК для ${field}: "${label}" в (${x}, ${y})`);
            }
          });
        });

        let bestMatch: {field: string, value: string, x: number, y: number, width: number, height: number, score: number} | null = null;
        let bestMatchScore = 0;
        
        textContent.items.forEach((item: any) => {
          const itemText = item.str.trim();
          
          // Игнорируем определенные тексты
          if (shouldIgnoreText(itemText)) {
            return;
          }
          
          const transform = item.transform;
          const x = transform[4]; // Левый край значения
          const y = transform[5]; // Альбомный формат - прямые координаты
          
          // Точное совпадение имеет приоритет
          if (itemText === value && !isFieldLabelText(itemText)) {
            const match = {
              field,
              value,
              x, // Позиция НАЧАЛА значения (левый край)
              y,
              width: item.width || value.length * 6,
              height: item.height || 12,
              score: 100 // Максимальный балл за точное совпадение
            };
            
            if (match.score > bestMatchScore) {
              bestMatch = match;
              bestMatchScore = match.score;
            }
          }
          // Частичное совпадение (если точного нет)
          else if (value.includes(itemText) || itemText.includes(value)) {
            if (!isFieldLabelText(itemText)) {
              const score = (itemText.length / value.length) * 50; // Балл за частичное совпадение
              
              if (score > bestMatchScore) {
                bestMatch = {
                  field,
                  value,
                  x, // Позиция НАЧАЛА значения (левый край)
                  y,
                  width: item.width || value.length * 6,
                  height: item.height || 12,
                  score
                };
                bestMatchScore = score;
              }
            }
          }
        });
        
        // Добавляем найденную позицию значения
        if (bestMatch) {
          const match = bestMatch as {field: string, value: string, x: number, y: number, width: number, height: number, score: number};
          foundFields.push({
            field: match.field,
            value: match.value,
            x: match.x, // Левый край значения
            y: match.y,
            width: match.width,
            height: match.height
          });
          console.log(`✅ Найдено ЗНАЧЕНИЕ для ${field}: "${value}" в (${match.x}, ${match.y}) размер: ${match.width}x${match.height}, балл: ${bestMatchScore}`);
          console.log(`   Заменяем от НАЧАЛА значения (левый край) для альбомного формата`);
        } else {
          console.log(`❌ Значение не найдено для поля ${field}: "${value}"`);
        }
      }
    });
    
    return foundFields;
    
  } catch (error) {
    console.error('Ошибка извлечения данных с позициями:', error);
    return [];
  }
};
