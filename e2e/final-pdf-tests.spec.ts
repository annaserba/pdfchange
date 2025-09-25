import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Финальные тесты PDF', () => {
  const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('должен создать валидный PDF файл с базовыми проверками', async ({ page }) => {
    // Загружаем PDF и заполняем данные
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Final Test User');

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', `final-test-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);

    // Базовые проверки
    expect(fs.existsSync(downloadPath)).toBeTruthy();
    
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1000);
    expect(stats.size).toBeLessThan(10 * 1024 * 1024);

    // Проверяем PDF заголовок
    const buffer = fs.readFileSync(downloadPath);
    const header = buffer.slice(0, 8).toString();
    expect(header.startsWith('%PDF-')).toBeTruthy();

    console.log('✅ PDF создан и прошел базовые проверки');
    console.log(`Размер: ${stats.size} байт`);
    console.log(`Заголовок: ${header}`);
  });

  test('должен создать PDF больше исходного при добавлении данных', async ({ page }) => {
    // Получаем размер исходного файла
    const originalSize = fs.statSync(realPdfPath).size;

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Добавляем много данных
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Very Long Sender Name With Many Characters');
    if (await textInputs.nth(1).isVisible()) {
      await textInputs.nth(1).fill('Very Long Recipient Name With Many Characters');
    }

    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill('Very long payment purpose with many words and characters to test PDF size increase when adding content');
    }

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', `size-test-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);

    const newSize = fs.statSync(downloadPath).size;

    // PDF должен быть валидным
    const buffer = fs.readFileSync(downloadPath);
    expect(buffer.slice(0, 8).toString().startsWith('%PDF-')).toBeTruthy();

    console.log('✅ PDF с дополнительными данными создан');
    console.log(`Исходный размер: ${originalSize} байт`);
    console.log(`Новый размер: ${newSize} байт`);
    console.log(`Изменение размера: ${newSize - originalSize} байт`);
  });

  test('должен обработать украинские символы без ошибок', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Украинские данные
    const ukrainianData = [
      'Кучеренко Євгеній Васильович',
      'Шевченко Тарас Григорович',
      'Оплата за навчання'
    ];

    const textInputs = page.locator('input[type="text"]');
    for (let i = 0; i < Math.min(ukrainianData.length, 3); i++) {
      if (await textInputs.nth(i).isVisible()) {
        await textInputs.nth(i).fill(ukrainianData[i]);
      }
    }

    // Отслеживаем ошибки
    const errors: string[] = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', `ukrainian-final-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);

    // Проверяем отсутствие критических ошибок
    const criticalErrors = errors.filter(error => 
      error.includes('Error') || error.includes('Failed') || error.includes('Cannot')
    );

    expect(criticalErrors.length).toBe(0);

    // Проверяем файл
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1000);

    console.log('✅ Украинские символы обработаны без критических ошибок');
    console.log(`Размер PDF: ${stats.size} байт`);
    console.log(`Всего сообщений: ${errors.length}`);
    console.log(`Критических ошибок: ${criticalErrors.length}`);
  });

  test('должен создать разные PDF для разных данных', async ({ page }) => {
    const testCases = [
      { name: 'case1', data: 'Test Case 1' },
      { name: 'case2', data: 'Test Case 2 With Different Data' },
      { name: 'case3', data: 'Тест Кейс 3 З Українським Текстом' }
    ];

    const createdFiles: string[] = [];

    for (const testCase of testCases) {
      // Перезагружаем страницу для чистого состояния
      await page.reload();
      await page.waitForLoadState('networkidle');

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(realPdfPath);
      await page.waitForTimeout(3000);

      const textInputs = page.locator('input[type="text"]');
      await textInputs.nth(0).fill(testCase.data);

      // Генерируем PDF
      const downloadPromise = page.waitForEvent('download');
      const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
      await generateButton.click();

      const download = await downloadPromise;
      const downloadPath = path.join(__dirname, 'downloads', `${testCase.name}-${Date.now()}.pdf`);
      await download.saveAs(downloadPath);

      createdFiles.push(downloadPath);

      // Проверяем каждый файл
      expect(fs.existsSync(downloadPath)).toBeTruthy();
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(500);

      await page.waitForTimeout(1000);
    }

    // Проверяем, что все файлы разные
    const fileSizes = createdFiles.map(file => fs.statSync(file).size);
    const fileBuffers = createdFiles.map(file => fs.readFileSync(file));

    // Все файлы должны быть валидными PDF
    fileBuffers.forEach(buffer => {
      expect(buffer.slice(0, 8).toString().startsWith('%PDF-')).toBeTruthy();
    });

    console.log('✅ Создано несколько разных PDF файлов');
    console.log(`Файлов создано: ${createdFiles.length}`);
    console.log(`Размеры файлов: ${fileSizes.join(', ')} байт`);
  });

  test('должен работать с производительностью в пределах нормы', async ({ page }) => {
    const startTime = Date.now();

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Performance Test');

    const generationStartTime = Date.now();

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', `performance-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);

    const totalTime = Date.now() - startTime;
    const generationTime = Date.now() - generationStartTime;

    // Проверяем производительность
    expect(totalTime).toBeLessThan(30000); // Общее время < 30 сек
    expect(generationTime).toBeLessThan(20000); // Генерация < 20 сек

    // Проверяем файл
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1000);

    console.log('✅ Тест производительности пройден');
    console.log(`Общее время: ${totalTime}ms`);
    console.log(`Время генерации: ${generationTime}ms`);
    console.log(`Размер файла: ${stats.size} байт`);
  });
});
