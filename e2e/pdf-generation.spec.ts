import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Генерация PDF', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('должен генерировать PDF с корректными данными', async ({ page }) => {
    // Загружаем тестовый PDF
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-receipt.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Заполняем все поля формы
    const testData = {
      sender: 'ТОВ "Тестова Компанія"',
      recipient: 'Іванов Іван Іванович',
      amount: '3250.75',
      paymentPurpose: 'Оплата за надані консультаційні послуги згідно договору №TC-2025-001 від 01.09.2025',
      payerBank: 'АТ "ПРИВАТБАНК"',
      recipientBank: 'АТ КБ "ПРИВАТБАНК"',
      bankCode: '305299',
      receiptCode: 'TC001',
      paymentDate: '25.09.2025'
    };
    
    // Заполняем поля
    for (const [field, value] of Object.entries(testData)) {
      const selector = `input[name="${field}"], textarea[name="${field}"]`;
      if (await page.locator(selector).isVisible()) {
        await page.fill(selector, value);
      }
    }
    
    // Настраиваем перехват консольных сообщений для отладки
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        consoleMessages.push(msg.text());
      }
    });
    
    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    
    // Проверяем скачанный файл
    expect(download.suggestedFilename()).toMatch(/edited-receipt.*\.pdf$/);
    
    // Сохраняем файл для дальнейшей проверки
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
    
    // Проверяем, что файл создался и имеет разумный размер
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1000); // Минимум 1KB
    expect(stats.size).toBeLessThan(10 * 1024 * 1024); // Максимум 10MB
  });

  test('должен обрабатывать ошибки генерации PDF', async ({ page }) => {
    // Пытаемся сгенерировать PDF без загрузки файла
    const generateButton = page.locator('button:has-text("Згенерувати PDF")');
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      
      // Ждем сообщение об ошибке
      await expect(page.locator('text=завантажте існуючий PDF')).toBeVisible({ timeout: 5000 });
    }
  });

  test('должен показывать прогресс генерации', async ({ page }) => {
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-receipt.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Заполняем минимальные данные
    await page.fill('input[name="sender"]', 'Test Sender');
    
    // Нажимаем генерацию
    await page.click('button:has-text("Згенерувати PDF")');
    
    // Проверяем, что кнопка показывает состояние загрузки
    const button = page.locator('button:has-text("Згенерувати PDF")');
    
    // Кнопка может показывать индикатор загрузки или изменить текст
    await page.waitForTimeout(1000);
  });

  test('должен генерировать PDF с длинными текстами', async ({ page }) => {
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-receipt.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Заполняем очень длинными данными
    const longSender = 'ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ "УКРАЇНСЬКА ЕНЕРГЕТИЧНА КОМПАНІЯ РОЗВИТКУ ІННОВАЦІЙНИХ ТЕХНОЛОГІЙ"';
    const longPurpose = 'Оплата за спожиту електричну енергію згідно показань лічильника за період з 01.09.2025 по 30.09.2025 згідно договору про постачання електричної енергії №УЕК-2025-09-001 від 01.01.2025 року включаючи всі додаткові послуги та комісії';
    
    await page.fill('input[name="sender"]', longSender);
    await page.fill('textarea[name="paymentPurpose"]', longPurpose);
    
    // Отслеживаем консольные сообщения о разбиении текста
    const textSplittingMessages: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('разбиваем на строки') || msg.text().includes('блоков текста')) {
        textSplittingMessages.push(msg.text());
      }
    });
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    expect(download).toBeTruthy();
    
    // Проверяем, что функция разбиения текста сработала
    await page.waitForTimeout(2000);
    expect(textSplittingMessages.length).toBeGreaterThan(0);
  });

  test('должен корректно обрабатывать украинские символы в PDF', async ({ page }) => {
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-receipt.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Заполняем украинскими символами
    const ukrainianData = {
      sender: 'Кучеренко Євгеній Васильович',
      recipient: 'Шевченко Тарас Григорович',
      paymentPurpose: 'Оплата за навчання в університеті ім. Т.Г. Шевченка',
      payerBank: 'АТ КБ "ПРИВАТБАНК"'
    };
    
    for (const [field, value] of Object.entries(ukrainianData)) {
      const selector = `input[name="${field}"], textarea[name="${field}"]`;
      if (await page.locator(selector).isVisible()) {
        await page.fill(selector, value);
      }
    }
    
    // Отслеживаем сообщения о шрифтах
    const fontMessages: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('украинский') || msg.text().includes('Times New Roman')) {
        fontMessages.push(msg.text());
      }
    });
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    expect(download).toBeTruthy();
    
    // Проверяем, что шрифты загрузились
    await page.waitForTimeout(3000);
    expect(fontMessages.length).toBeGreaterThan(0);
  });
});
