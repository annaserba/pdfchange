import { PaymentData } from '../types/PaymentData';

// Функция для парсинга текста квитанции
export const parseReceiptText = (text: string): Partial<PaymentData> => {
  const data: Partial<PaymentData> = {};
  
  // Нормализуем текст - убираем лишние пробелы и переносы строк
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  // Паттерны для поиска данных
  const patterns = {
    sender: /(?:відправник|отправитель|плательщик)[:\s]*([^,\n]+?)(?=\s*(?:банк|код|єдрпоу|$))/i,
    payerBank: /(?:банк\s*платника|банк\s*плательщика)[:\s]*([^,\n]+?)(?=\s*(?:код|єдрпоу|$))/i,
    bankCode: /(?:код\s*банку|код\s*банка|мфо)[:\s]*(\d+)/i,
    edrpouPayer: /(?:єдрпоу|едрпоу)[:\s]*(\d+)/i,
    receiptCode: /(?:№\s*документа|номер\s*документа)[:\s]*([^\s,\n]+)/i,
    paymentDate: /(?:дата)[:\s]*(\d{2}[.\/-]\d{2}[.\/-]\d{4})/i,
    valueDate: /(?:дата\s*валютування|дата\s*валютирования)[:\s]*(\d{2}[.\/-]\d{2}[.\/-]\d{4})/i,
    senderAccount: /(?:рахунок\s*платника|счет\s*плательщика)[:\s]*([^\s,\n]+)/i,
    recipient: /(?:одержувач|получатель)[:\s]*([^,\n]+?)(?=\s*(?:банк|єдрпоу|рахунок|$))/i,
    recipientBank: /(?:банк\s*одержувача|банк\s*получателя)[:\s]*([^,\n]+?)(?=\s*(?:єдрпоу|рахунок|$))/i,
    edrpouRecipient: /(?:єдрпоу\s*одержувача|едрпоу\s*получателя)[:\s]*(\d+)/i,
    recipientAccount: /(?:рахунок\s*одержувача|счет\s*получателя)[:\s]*([^\s,\n]+)/i,
    paymentPurpose: /(?:призначення\s*платежу|назначение\s*платежа)[:\s]*([^,\n]+?)(?=\s*(?:сума|комісія|$))/i,
    amount: /(?:сума|сумма)[:\s]*([0-9.,\s]+(?:грн|uah)?)/i,
    commissionAmount: /(?:комісія|комиссия)[:\s]*([0-9.,\s]+(?:грн|uah)?)/i
  };

  // Применяем паттерны для извлечения данных
  Object.entries(patterns).forEach(([key, pattern]) => {
    const match = normalizedText.match(pattern);
    if (match && match[1]) {
      let value = match[1].trim();
      
      // Очищаем значение от лишних символов
      value = value.replace(/[,;]+$/, '').trim();
      
      if (value) {
        data[key as keyof PaymentData] = value;
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
