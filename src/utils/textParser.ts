import { PaymentData } from '../types/PaymentData';

// Функция для парсинга текста квитанции
export const parseReceiptText = (text: string): Partial<PaymentData> => {
  const data: Partial<PaymentData> = {};
  
  // Убираем игнорируемые тексты перед обработкой
  let cleanedText = text;
  const ignoredTexts = [
    'надання платних послуг',
    'надание платных услуг'
  ];
  
  ignoredTexts.forEach(ignored => {
    const regex = new RegExp(ignored, 'gi');
    if (regex.test(cleanedText)) {
      console.log(`🚫 Игнорируем текст: "${ignored}"`);
      cleanedText = cleanedText.replace(regex, '');
    }
  });
  
  // Нормализуем текст - убираем лишние пробелы и переносы строк
  const normalizedText = cleanedText.replace(/\s+/g, ' ').trim();
  
  // Логируем полный текст для отладки
  console.log('Полный текст из PDF (после очистки):', normalizedText + '...');
  
  // Паттерны для поиска данных (порядок важен - более специфичные сначала!)
  const patterns = {
    sender: /(?:відправник|отправитель|плательщик)[:\s]*([^,\n]+?)(?=\s*(?:банк|код|єдрпоу|$))/i,
    payerBank: /(?:банк\s*платника|банк\s*плательщика)[:\s]*([^,\n]+?)(?=\s*(?:код|єдрпоу|$))/i,
    bankCode: /(?:код\s*банку|код\s*банка|мфо)[:\s]*(\d+)/i,
    receiptCode: /(?:код\s*квитанції|код\s*квитанции|№\s*документа|номер\s*документа|код\s*документа)[:\s]*([^\s,\n]+)/i,
    paymentDate: /(?:дата\s*платежу|дата\s*платежа|дата)[:\s]*(\d{2}[.\/-]\d{2}[.\/-]\d{4})/i,
    valueDate: /(?:дата\s*валютування|дата\s*валютирования)[:\s]*(\d{4}-\d{2}-\d{2}|[^,\n]+)/i,
    senderAccount: /(?:рахунок\s*відправника|рахунок\s*платника|счет\s*плательщика|счет\s*отправителя)[:\s]*([^\s,\n]+)/i,
    recipient: /(?:одержувач|получатель)[:\s]*([^,\n]+?)(?=\s*(?:банк|єдрпоу|рахунок|$))/i,
    recipientBank: /(?:банк\s*одержувача|банк\s*получателя)[:\s]*([^\n]+?)(?=\s*(?:єдрпоу|рахунок|$))/i,
    // ЄДРПОУ одержувача ПЕРЕД ЄДРПОУ платника (более специфичный)
    edrpouRecipient: /(?:єдрпоу\s*одержувача|едрпоу\s*получателя|єдрпоу\s*отримувача|(?:єдрпоу|едрпоу)(?!\s*платника|\s*плательщика))[:\s]*(\d+)/i,
    // ЄДРПОУ платника (менее специфичный, обрабатывается после)
    edrpouPayer: /(?:єдрпоу\s*платника|едрпоу\s*плательщика)[:\s]*(\d+)/i,
    recipientAccount: /(?:рахунок\s*одержувача|счет\s*получателя)[:\s]*([^\s,\n]+)/i,
    paymentPurpose: /(?:призначення\s*платежу|назначение\s*платежа)[:\s]*([^,\n]+?)(?=\s*(?:сума|сумма|сплачено|єдрпоу|банк|$))/i,
    paidAmount: /(?:сплачено|оплачено|уплачено|сплачено\s*всього|оплачено\s*всего)[\s:]*(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}|[^,\n]+?)(?=\s*(?:дата|$))/i,
    amount: /(?:сума|сумма)[\s:]+(\d+(?:[.,]\d{1,2})?)/i,
    commissionAmount: /(?:сума\s*комісії|сумма\s*комиссии|комісія|комиссия)[\s:]+(\d+(?:[.,]\d{1,2})?)/i
  };

  // Специальная обработка для двух полей ЄДРПОУ
  const edrpouMatches = [...normalizedText.matchAll(/(?:єдрпоу|едрпоу)[:\s]*(\d+)/gi)];
  if (edrpouMatches.length >= 2) {
    // Первый ЄДРПОУ - платник
    data.edrpouPayer = edrpouMatches[0][1].trim();
    console.log(`✅ Найдено поле edrpouPayer (первый ЄДРПОУ): "${data.edrpouPayer}"`);
    
    // Второй ЄДРПОУ - одержувач
    data.edrpouRecipient = edrpouMatches[1][1].trim();
    console.log(`✅ Найдено поле edrpouRecipient (второй ЄДРПОУ): "${data.edrpouRecipient}"`);
  } else if (edrpouMatches.length === 1) {
    // Если только один ЄДРПОУ, определяем по контексту
    const singleEdrpou = edrpouMatches[0][1].trim();
    const edrpouIndex = normalizedText.indexOf(edrpouMatches[0][0]);
    const beforeEdrpou = normalizedText.substring(Math.max(0, edrpouIndex - 100), edrpouIndex);
    
    // Если перед ЄДРПОУ есть упоминание одержувача/банка одержувача - это ЄДРПОУ одержувача
    if (/(?:одержувач|банк\s*одержувача|получатель|банк\s*получателя)/i.test(beforeEdrpou)) {
      data.edrpouRecipient = singleEdrpou;
      console.log(`✅ Найдено поле edrpouRecipient (по контексту): "${data.edrpouRecipient}"`);
    } else {
      data.edrpouPayer = singleEdrpou;
      console.log(`✅ Найдено поле edrpouPayer (по контексту): "${data.edrpouPayer}"`);
    }
  }

  // Применяем остальные паттерны для извлечения данных (исключая ЄДРПОУ)
  Object.entries(patterns).forEach(([key, pattern]) => {
    // Пропускаем ЄДРПОУ поля - они обработаны выше
    if (key === 'edrpouPayer' || key === 'edrpouRecipient') {
      return;
    }
    
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      let value = match[1].trim();
      
      // Очищаем значение от лишних символов
      value = value.replace(/[,;]+$/, '').trim();
      
      // Дополнительная очистка для числовых полей (суммы) - удалено
      
      // Дополнительная очистка для полей с датами
      if (['valueDate', 'paidAmount'].includes(key)) {
        // Убираем лишние пробелы и символы в конце
        value = value.replace(/\s+$/, '').trim();
      }
      
      // Дополнительная очистка для полей сумм
      if (['amount', 'commissionAmount'].includes(key)) {
        // Убираем валютные обозначения и лишние пробелы
        value = value.replace(/\s*(грн\.?|UAH)\s*$/i, '').trim();
        // Нормализуем десятичный разделитель
        value = value.replace(',', '.');
        console.log(`💰 Очищено поле суммы ${key}: "${value}"`);
      }
      
        data[key as keyof PaymentData] = value;
    } else {
      // Логируем поля, которые не найдены
      const problemFields = ['valueDate', 'paidAmount', 'senderAccount', 'recipientBank', 'edrpouRecipient', 'paymentPurpose'];
      if (problemFields.includes(key)) {
        console.log(`❌ Не найдено поле ${key}, паттерн: ${pattern}`);
      }
    }
  });

  // Дополнительная очистка данных
  if (data.sender) {
    // Очищаем имя отправителя от информации о банке
    data.sender = data.sender.replace(/банк\s*платника.*$/i, '').trim();
  }
  
  if (data.payerBank) {
    // Очищаем название банка от лишнего текста
    data.payerBank = data.payerBank.replace(/код\s*банку.*$/i, '').trim();
  }
  if (data.recipient) {
    // Очищаем название получателя
    data.recipient = data.recipient.replace(/банк\s*одержувача.*$/i, '').trim();
  }

  console.log('Извлеченные данные:', data);


  return data;
};
