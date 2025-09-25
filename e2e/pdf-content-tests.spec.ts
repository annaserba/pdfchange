import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { PDFContentChecker } from './utils/pdf-content-checker';

test.describe('Проверка содержимого PDF файлов', () => {
  const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');
  const screenshotsDir = path.join(__dirname, 'screenshots');

  test.beforeAll(async () => {
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('должен создать скриншоты исходного и измененного PDF', async ({ page }) => {
    // Загружаем исходный PDF и изменяем данные
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Изменяем отправителя
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('ТОВ "PDF Content Test"');

    // Генерируем измененный PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const modifiedPdfPath = path.join(__dirname, 'downloads', `content-test-${Date.now()}.pdf`);
    await download.saveAs(modifiedPdfPath);

    // Создаем полный отчет сравнения
    const report = await PDFContentChecker.createComparisonReport(
      page,
      realPdfPath,
      modifiedPdfPath,
      'content-comparison'
    );

    // Проверяем результаты
    expect(fs.existsSync(report.reportPath)).toBeTruthy();
    
    console.log('✅ Отчет сравнения PDF создан:');
    console.log(`   HTML отчет: ${path.basename(report.reportPath)}`);
    console.log(`   Скриншоты созданы: ${report.success ? 'Да' : 'Нет'}`);
    
    if (report.success) {
      expect(fs.existsSync(report.beforeScreenshot)).toBeTruthy();
      expect(fs.existsSync(report.afterScreenshot)).toBeTruthy();
      
      const beforeStats = fs.statSync(report.beforeScreenshot);
      const afterStats = fs.statSync(report.afterScreenshot);
      
      console.log(`   Размер скриншота "до": ${beforeStats.size} байт`);
      console.log(`   Размер скриншота "после": ${afterStats.size} байт`);
    }
  });

  test('должен извлечь и проверить текст из PDF', async ({ page }) => {
    // Создаем тестовый PDF с известным содержимым
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    const testData = {
      sender: 'Тестовий Відправник',
      recipient: 'Тестовий Одержувач',
      amount: '1234.56',
      purpose: 'Тестове призначення платежу з українськими символами'
    };

    // Заполняем поля
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(testData.sender);
    
    if (await textInputs.nth(1).isVisible()) {
      await textInputs.nth(1).fill(testData.recipient);
    }

    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill(testData.purpose);
    }

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const testPdfPath = path.join(__dirname, 'downloads', `text-extraction-${Date.now()}.pdf`);
    await download.saveAs(testPdfPath);

    // Извлекаем текст из созданного PDF
    const extractedData = await PDFContentChecker.extractTextFromPDF(testPdfPath);

    // Проверяем извлеченный текст
    expect(extractedData.pages).toBeGreaterThan(0);
    expect(extractedData.hasUkrainianText).toBeTruthy();
    expect(extractedData.wordCount).toBeGreaterThan(5);

    // Проверяем наличие наших данных в тексте
    const text = extractedData.text.toLowerCase();
    expect(text.includes(testData.sender.toLowerCase()) || 
           text.includes('тестовий') || 
           text.includes('відправник')).toBeTruthy();

    console.log('✅ Текст из PDF извлечен и проверен:');
    console.log(`   Страниц: ${extractedData.pages}`);
    console.log(`   Слов: ${extractedData.wordCount}`);
    console.log(`   Украинский текст: ${extractedData.hasUkrainianText ? 'Да' : 'Нет'}`);
    console.log(`   Первые 200 символов: ${extractedData.text.substring(0, 200)}`);
  });

  test('должен сравнить содержимое исходного и измененного PDF', async ({ page }) => {
    // Создаем измененный PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Вносим значительные изменения
    const changes = {
      sender: 'Новый Отправитель Для Сравнения',
      recipient: 'Новый Получатель',
      purpose: 'Совершенно новое назначение платежа для тестирования системы сравнения содержимого PDF документов'
    };

    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(changes.sender);
    
    if (await textInputs.nth(1).isVisible()) {
      await textInputs.nth(1).fill(changes.recipient);
    }

    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill(changes.purpose);
    }

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const comparisonPdfPath = path.join(__dirname, 'downloads', `comparison-${Date.now()}.pdf`);
    await download.saveAs(comparisonPdfPath);

    // Сравниваем содержимое
    const comparison = await PDFContentChecker.comparePDFContent(realPdfPath, comparisonPdfPath);

    // Проверяем результаты сравнения
    expect(comparison.hasChanges).toBeTruthy();
    expect(comparison.textDifferences.length).toBeGreaterThan(0);

    console.log('✅ Сравнение содержимого PDF завершено:');
    console.log(`   Изменения обнаружены: ${comparison.hasChanges ? 'Да' : 'Нет'}`);
    console.log(`   Количество различий: ${comparison.textDifferences.length}`);
    console.log(`   Сводка: ${comparison.changesSummary}`);
    
    if (comparison.textDifferences.length > 0) {
      console.log('   Первые 5 изменений:');
      comparison.textDifferences.slice(0, 5).forEach((diff, index) => {
        console.log(`     ${index + 1}. ${diff}`);
      });
    }
  });

  test('должен проверить украинские символы в PDF', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Заполняем украинскими символами с диакритическими знаками
    const ukrainianData = {
      sender: 'Кучеренко Євгеній Васильович',
      recipient: 'Шевченко Тарас Григорович',
      purpose: 'Оплата за навчання в Київському національному університеті імені Тараса Шевченка на факультеті комп\'ютерних наук'
    };

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
    const ukrainianPdfPath = path.join(__dirname, 'downloads', `ukrainian-${Date.now()}.pdf`);
    await download.saveAs(ukrainianPdfPath);

    // Извлекаем и проверяем украинский текст
    const extractedData = await PDFContentChecker.extractTextFromPDF(ukrainianPdfPath);

    expect(extractedData.hasUkrainianText).toBeTruthy();

    // Проверяем специальные украинские символы
    const specialChars = ['Є', 'є', 'І', 'і', 'Ї', 'ї', 'Ґ', 'ґ'];
    const foundSpecialChars = specialChars.filter(char => 
      extractedData.text.includes(char)
    );

    expect(foundSpecialChars.length).toBeGreaterThan(0);

    // Создаем скриншот для визуальной проверки
    const screenshotPath = path.join(screenshotsDir, `ukrainian-pdf-${Date.now()}.png`);
    const screenshotSuccess = await PDFContentChecker.createPDFScreenshot(
      page, 
      ukrainianPdfPath, 
      screenshotPath
    );

    console.log('✅ Проверка украинских символов в PDF:');
    console.log(`   Украинский текст обнаружен: ${extractedData.hasUkrainianText ? 'Да' : 'Нет'}`);
    console.log(`   Найдено специальных символов: ${foundSpecialChars.length}`);
    console.log(`   Символы: ${foundSpecialChars.join(', ')}`);
    console.log(`   Скриншот создан: ${screenshotSuccess ? 'Да' : 'Нет'}`);
    
    if (screenshotSuccess) {
      const screenshotStats = fs.statSync(screenshotPath);
      console.log(`   Размер скриншота: ${screenshotStats.size} байт`);
    }
  });

  test('должен создать детальный отчет о качестве PDF', async ({ page }) => {
    // Создаем PDF с разнообразным содержимым
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    const complexData = {
      sender: 'ТОВ "Комплексний Тест PDF Якості" (ЄДРПОУ: 12345678)',
      recipient: 'Іванов Іван Іванович (ІПН: 1234567890)',
      amount: '15,750.25',
      purpose: 'Комплексна оплата за надані послуги включаючи: 1) консультації з питань IT, 2) розробку програмного забезпечення, 3) тестування системи, 4) навчання персоналу. Всього послуг на суму п\'ятнадцять тисяч сімсот п\'ятдесят грн 25 коп.'
    };

    // Заполняем все поля
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(complexData.sender);
    
    if (await textInputs.nth(1).isVisible()) {
      await textInputs.nth(1).fill(complexData.recipient);
    }

    // Ищем поле суммы
    const inputCount = await textInputs.count();
    if (inputCount > 2) {
      await textInputs.nth(inputCount - 2).fill(complexData.amount);
    }

    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill(complexData.purpose);
    }

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const qualityTestPdfPath = path.join(__dirname, 'downloads', `quality-test-${Date.now()}.pdf`);
    await download.saveAs(qualityTestPdfPath);

    // Создаем полный отчет
    const report = await PDFContentChecker.createComparisonReport(
      page,
      realPdfPath,
      qualityTestPdfPath,
      'quality-test'
    );

    // Дополнительный анализ качества
    const extractedData = await PDFContentChecker.extractTextFromPDF(qualityTestPdfPath);
    
    // Проверяем качественные показатели
    const qualityMetrics = {
      hasUkrainianText: extractedData.hasUkrainianText,
      wordCount: extractedData.wordCount,
      hasNumbers: /\d/.test(extractedData.text),
      hasSpecialChars: /[№(),:;]/.test(extractedData.text),
      textLength: extractedData.text.length
    };

    expect(qualityMetrics.hasUkrainianText).toBeTruthy();
    expect(qualityMetrics.wordCount).toBeGreaterThan(20);
    expect(qualityMetrics.hasNumbers).toBeTruthy();
    expect(qualityMetrics.textLength).toBeGreaterThan(100);

    console.log('✅ Отчет о качестве PDF создан:');
    console.log(`   HTML отчет: ${path.basename(report.reportPath)}`);
    console.log(`   Метрики качества:`);
    console.log(`     Украинский текст: ${qualityMetrics.hasUkrainianText ? '✅' : '❌'}`);
    console.log(`     Количество слов: ${qualityMetrics.wordCount}`);
    console.log(`     Числа: ${qualityMetrics.hasNumbers ? '✅' : '❌'}`);
    console.log(`     Спец. символы: ${qualityMetrics.hasSpecialChars ? '✅' : '❌'}`);
    console.log(`     Длина текста: ${qualityMetrics.textLength} символов`);
  });
});
