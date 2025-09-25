import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('E2E тесты с реальным PDF файлом', () => {
  const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('должен загрузить реальный PDF и извлечь данные', async ({ page }) => {
    // Загружаем реальный PDF файл
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    
    // Ждем появления формы и извлечения данных
    await page.waitForSelector('form', { timeout: 15000 });
    
    // Проверяем, что форма появилась
    await expect(page.locator('form')).toBeVisible();
    
    // Проверяем основные поля формы
    await expect(page.locator('input[name="sender"]')).toBeVisible();
    await expect(page.locator('input[name="recipient"]')).toBeVisible();
    await expect(page.locator('input[name="amount"]')).toBeVisible();
    
    // Ждем немного для завершения извлечения данных
    await page.waitForTimeout(3000);
    
    // Проверяем, что данные были извлечены (поля не пустые)
    const senderValue = await page.locator('input[name="sender"]').inputValue();
    const recipientValue = await page.locator('input[name="recipient"]').inputValue();
    const amountValue = await page.locator('input[name="amount"]').inputValue();
    
    console.log('Извлеченные данные:');
    console.log('Отправитель:', senderValue);
    console.log('Получатель:', recipientValue);
    console.log('Сумма:', amountValue);
    
    // Проверяем, что хотя бы одно поле заполнилось
    const hasExtractedData = senderValue.length > 0 || recipientValue.length > 0 || amountValue.length > 0;
    expect(hasExtractedData).toBeTruthy();
  });

  test('должен редактировать данные в реальном PDF', async ({ page }) => {
    // Загружаем реальный PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    
    await page.waitForSelector('form', { timeout: 15000 });
    
    // Редактируем данные
    const newData = {
      sender: 'ТОВ "Нова Компанія"',
      recipient: 'Петренко Петро Петрович',
      amount: '5000.00',
      paymentPurpose: 'Оплата за консультаційні послуги згідно договору №NK-2025-001 від 25.09.2025 року за період з 01.09.2025 по 30.09.2025 включно',
      payerBank: 'АТ "УКРСИББАНК"',
      recipientBank: 'АТ КБ "ПРИВАТБАНК"'
    };
    
    // Заполняем поля новыми данными
    for (const [fieldName, value] of Object.entries(newData)) {
      const selector = `input[name="${fieldName}"], textarea[name="${fieldName}"]`;
      const field = page.locator(selector);
      
      if (await field.isVisible()) {
        await field.clear();
        await field.fill(value);
        
        // Проверяем, что значение установилось
        await expect(field).toHaveValue(value);
      }
    }
    
    // Генерируем PDF с новыми данными
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/edited-receipt.*\.pdf$/);
    
    // Сохраняем отредактированный файл
    const downloadPath = path.join(__dirname, 'downloads', `edited-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);
    
    console.log('Отредактированный PDF сохранен:', downloadPath);
  });

  test('должен корректно обрабатывать длинные тексты в реальном PDF', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    
    await page.waitForSelector('form', { timeout: 15000 });
    
    // Вводим очень длинный текст назначения платежа
    const longPurpose = 'Оплата за надання консультаційних послуг у сфері інформаційних технологій та розробки програмного забезпечення згідно договору про надання послуг №IT-CONSULT-2025-001 від 01.09.2025 року за період з 01.09.2025 по 30.09.2025 року включно, включаючи аналіз вимог, проектування архітектури, розробку технічного завдання, тестування та впровадження системи управління документообігом для підприємства з урахуванням всіх специфічних вимог замовника та діючого законодавства України';
    
    const purposeField = page.locator('textarea[name="paymentPurpose"]');
    if (await purposeField.isVisible()) {
      await purposeField.clear();
      await purposeField.fill(longPurpose);
      
      await expect(purposeField).toHaveValue(longPurpose);
    }
    
    // Отслеживаем сообщения о разбиении текста
    const textSplittingMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('разбиваем на строки') || text.includes('блоков текста') || text.includes('Длинный текст')) {
        textSplittingMessages.push(text);
      }
    });
    
    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    expect(download).toBeTruthy();
    
    // Ждем завершения обработки
    await page.waitForTimeout(3000);
    
    // Проверяем, что функция разбиения текста сработала
    expect(textSplittingMessages.length).toBeGreaterThan(0);
    console.log('Сообщения о разбиении текста:', textSplittingMessages);
  });

  test('должен сохранять украинские символы при редактировании реального PDF', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    
    await page.waitForSelector('form', { timeout: 15000 });
    
    // Заполняем поля украинскими символами с различными диакритическими знаками
    const ukrainianData = {
      sender: 'Кучеренко Євгеній Васильович',
      recipient: 'Шевченко Тарас Григорович',
      paymentPurpose: 'Оплата за навчання в Київському національному університеті імені Тараса Шевченка на факультеті інформаційних технологій',
      payerBank: 'АТ КБ "ПРИВАТБАНК"',
      recipientBank: 'АБ "УКРГАЗБАНК"'
    };
    
    // Заполняем поля
    for (const [fieldName, value] of Object.entries(ukrainianData)) {
      const selector = `input[name="${fieldName}"], textarea[name="${fieldName}"]`;
      const field = page.locator(selector);
      
      if (await field.isVisible()) {
        await field.clear();
        await field.fill(value);
        await expect(field).toHaveValue(value);
      }
    }
    
    // Отслеживаем сообщения о шрифтах
    const fontMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('украинский') || text.includes('Times New Roman') || text.includes('шрифт')) {
        fontMessages.push(text);
      }
    });
    
    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    expect(download).toBeTruthy();
    
    // Сохраняем файл с украинскими символами
    const downloadPath = path.join(__dirname, 'downloads', `ukrainian-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);
    
    await page.waitForTimeout(3000);
    console.log('Сообщения о шрифтах:', fontMessages);
  });

  test('должен обрабатывать различные типы номеров счетов', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    
    await page.waitForSelector('form', { timeout: 15000 });
    
    // Тестируем различные форматы украинских IBAN
    const accountNumbers = [
      'UA213223130000026007233566778899001122334455',
      'UA21 3223 1300 0002 6007 2335 6677 8899 0011 2233 4455',
      '26007233566778899001122334455',
      'UA903052992990004149123456789'
    ];
    
    for (const account of accountNumbers) {
      // Заполняем поле счета
      const accountField = page.locator('input[name="recipientAccount"]');
      if (await accountField.isVisible()) {
        await accountField.clear();
        await accountField.fill(account);
        await expect(accountField).toHaveValue(account);
        
        // Генерируем PDF для каждого формата
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Згенерувати PDF")');
        
        const download = await downloadPromise;
        expect(download).toBeTruthy();
        
        // Сохраняем файл
        const downloadPath = path.join(__dirname, 'downloads', `account-${Date.now()}.pdf`);
        await download.saveAs(downloadPath);
        
        await page.waitForTimeout(1000);
      }
    }
  });

  test('должен корректно работать с реальными суммами', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    
    await page.waitForSelector('form', { timeout: 15000 });
    
    // Тестируем различные форматы сумм
    const amounts = [
      '1500.00',
      '15000,50',
      '1 500.00',
      '15 000,50',
      '150000.99',
      '0.01',
      '999999.99'
    ];
    
    for (const amount of amounts) {
      const amountField = page.locator('input[name="amount"]');
      if (await amountField.isVisible()) {
        await amountField.clear();
        await amountField.fill(amount);
        await expect(amountField).toHaveValue(amount);
        
        // Также заполняем назначение платежа с суммой
        const purposeField = page.locator('textarea[name="paymentPurpose"]');
        if (await purposeField.isVisible()) {
          await purposeField.clear();
          await purposeField.fill(`Оплата на суму ${amount} грн згідно договору`);
        }
        
        // Генерируем PDF
        const downloadPromise = page.waitForEvent('download');
        await page.click('button:has-text("Згенерувати PDF")');
        
        const download = await downloadPromise;
        expect(download).toBeTruthy();
        
        await page.waitForTimeout(500);
      }
    }
  });
});
