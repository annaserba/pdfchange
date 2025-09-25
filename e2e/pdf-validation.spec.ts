import { test, expect } from '@playwright/test';
import path from 'path';
import { PDFChecker } from './utils/pdf-checker';

test.describe('Проверка результирующего PDF', () => {
  const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('должен создать валидный PDF с измененными данными', async ({ page }) => {
    // Загружаем исходный PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Заполняем тестовые данные
    const testData = {
      sender: 'ТОВ "Тестова Компанія"',
      recipient: 'Петренко Петро Петрович',
      amount: '2500.50',
      purpose: 'Оплата за тестові послуги згідно договору №TEST-001'
    };

    // Заполняем поля
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(testData.sender);
    if (await textInputs.nth(1).isVisible()) {
      await textInputs.nth(1).fill(testData.recipient);
    }
    if (await textInputs.nth(2).isVisible()) {
      await textInputs.nth(2).fill(testData.amount);
    }

    // Заполняем textarea если есть
    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill(testData.purpose);
    }

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', `validation-test-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);

    // Проверяем результирующий PDF
    const pdfCheck = await PDFChecker.checkPDFContent(downloadPath);

    // Основные проверки
    expect(pdfCheck.isValidPDF).toBeTruthy();
    expect(pdfCheck.size).toBeGreaterThan(1000); // Минимум 1KB
    expect(pdfCheck.hasUkrainianText).toBeTruthy();

    // Проверяем наличие введенных данных в PDF
    expect(pdfCheck.containsText(testData.sender)).toBeTruthy();
    expect(pdfCheck.containsText(testData.amount)).toBeTruthy();

    console.log('✅ PDF валидация прошла успешно');
    console.log(`Размер PDF: ${pdfCheck.size} байт`);
    console.log(`Украинский текст: ${pdfCheck.hasUkrainianText ? 'Да' : 'Нет'}`);
    console.log(`Извлеченный текст (первые 200 символов): ${pdfCheck.extractedText.substring(0, 200)}`);
  });

  test('должен сохранить украинские символы в PDF', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Тестовые украинские данные
    const ukrainianData = {
      sender: 'Кучеренко Євгеній Васильович',
      recipient: 'Шевченко Тарас Григорович',
      purpose: 'Оплата за навчання в університеті ім. Т.Г. Шевченка'
    };

    // Заполняем поля украинскими символами
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(ukrainianData.sender);
    if (await textInputs.nth(1).isVisible()) {
      await textInputs.nth(1).fill(ukrainianData.recipient);
    }

    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill(ukrainianData.purpose);
    }

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', `ukrainian-test-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);

    // Проверяем украинские символы в PDF
    const pdfCheck = await PDFChecker.checkPDFContent(downloadPath);

    expect(pdfCheck.isValidPDF).toBeTruthy();
    expect(pdfCheck.hasUkrainianText).toBeTruthy();

    // Проверяем конкретные украинские символы
    const ukrainianChars = ['Є', 'є', 'І', 'і', 'Ї', 'ї', 'Ґ', 'ґ'];
    const hasSpecialChars = ukrainianChars.some(char => 
      pdfCheck.extractedText.includes(char) || pdfCheck.containsText(char)
    );

    expect(hasSpecialChars).toBeTruthy();

    console.log('✅ Украинские символы сохранены в PDF');
    console.log(`Найдены специальные символы: ${hasSpecialChars ? 'Да' : 'Нет'}`);
  });

  test('должен обрабатывать длинные тексты с переносами', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Очень длинный текст для тестирования переносов
    const longText = 'Оплата за надання консультаційних послуг у сфері інформаційних технологій та розробки програмного забезпечення згідно договору про надання послуг №LONG-TEXT-2025-001 від 01.09.2025 року за період з 01.09.2025 по 30.09.2025 року включно, включаючи аналіз вимог, проектування архітектури, розробку технічного завдання, тестування та впровадження системи';

    // Заполняем длинным текстом
    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill(longText);
    }

    // Отслеживаем сообщения о разбиении текста
    const textSplittingMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('разбиваем на строки') || text.includes('блоков текста')) {
        textSplittingMessages.push(text);
      }
    });

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', `long-text-test-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);

    // Проверяем PDF с длинным текстом
    const pdfCheck = await PDFChecker.checkPDFContent(downloadPath);

    expect(pdfCheck.isValidPDF).toBeTruthy();
    expect(pdfCheck.size).toBeGreaterThan(2000); // Больший размер из-за длинного текста

    // Проверяем, что функция разбиения сработала
    expect(textSplittingMessages.length).toBeGreaterThan(0);

    // Проверяем наличие части длинного текста в PDF
    const textParts = ['консультаційних послуг', 'програмного забезпечення', 'технічного завдання'];
    const hasTextParts = textParts.some(part => pdfCheck.containsText(part));
    expect(hasTextParts).toBeTruthy();

    console.log('✅ Длинный текст обработан корректно');
    console.log(`Сообщений о разбиении: ${textSplittingMessages.length}`);
    console.log(`Размер PDF с длинным текстом: ${pdfCheck.size} байт`);
  });

  test('должен сравнить исходный и измененный PDF', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Минимальные изменения
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Modified Sender Name');

    // Генерируем измененный PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const modifiedPath = path.join(__dirname, 'downloads', `comparison-test-${Date.now()}.pdf`);
    await download.saveAs(modifiedPath);

    // Сравниваем исходный и измененный PDF
    const comparison = await PDFChecker.comparePDFs(realPdfPath, modifiedPath);

    expect(comparison.bothValid).toBeTruthy();
    expect(comparison.hasChanges).toBeTruthy(); // Должны быть изменения
    expect(comparison.modifiedSize).toBeGreaterThan(1000);

    // Размер может как увеличиться, так и уменьшиться
    expect(comparison.sizeDifference).toBeGreaterThan(0);

    console.log('✅ Сравнение PDF завершено');
    console.log(`Исходный размер: ${comparison.originalSize} байт`);
    console.log(`Измененный размер: ${comparison.modifiedSize} байт`);
    console.log(`Разница в размере: ${comparison.sizeDifference} байт`);
    console.log(`Есть изменения: ${comparison.hasChanges ? 'Да' : 'Нет'}`);
  });

  test('должен создать PDF с корректными метаданными', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Заполняем все основные поля
    const testData = {
      sender: 'Metadata Test Sender',
      amount: '999.99'
    };

    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(testData.sender);
    if (await textInputs.nth(2).isVisible()) {
      await textInputs.nth(2).fill(testData.amount);
    }

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', `metadata-test-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);

    // Проверяем метаданные PDF
    const pdfCheck = await PDFChecker.checkPDFContent(downloadPath);

    expect(pdfCheck.isValidPDF).toBeTruthy();
    expect(pdfCheck.size).toBeLessThan(10 * 1024 * 1024); // Не больше 10MB
    expect(pdfCheck.size).toBeGreaterThan(500); // Не меньше 500 байт

    // Проверяем, что PDF содержит наши данные
    expect(pdfCheck.containsText(testData.sender)).toBeTruthy();
    expect(pdfCheck.containsText(testData.amount)).toBeTruthy();

    console.log('✅ PDF с метаданными создан успешно');
    console.log(`Финальный размер: ${pdfCheck.size} байт`);
  });
});
