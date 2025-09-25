import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Валидация содержимого PDF', () => {
  const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('должен создать валидный PDF файл', async ({ page }) => {
    // Загружаем исходный PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Заполняем тестовые данные
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Test PDF Creator');

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const downloadPath = path.join(__dirname, 'downloads', `content-validation-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);

    // Базовые проверки файла
    expect(fs.existsSync(downloadPath)).toBeTruthy();
    
    const stats = fs.statSync(downloadPath);
    expect(stats.size).toBeGreaterThan(1000); // Минимум 1KB
    expect(stats.size).toBeLessThan(50 * 1024 * 1024); // Максимум 50MB

    // Проверяем PDF заголовок
    const buffer = fs.readFileSync(downloadPath);
    const header = buffer.slice(0, 8).toString();
    expect(header.startsWith('%PDF-')).toBeTruthy();

    // Проверяем, что файл не пустой и содержит PDF структуру
    const pdfContent = buffer.toString('latin1');
    expect(pdfContent).toContain('obj');
    expect(pdfContent).toContain('endobj');
    expect(pdfContent).toContain('%%EOF');

    console.log('✅ PDF файл создан и валиден');
    console.log(`Размер файла: ${stats.size} байт`);
    console.log(`PDF версия: ${header}`);
  });

  test('должен сохранить изменения в PDF', async ({ page }) => {
    // Получаем размер исходного файла
    const originalStats = fs.statSync(realPdfPath);
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Вносим изменения
    const testData = 'Modified Content Test';
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(testData);

    // Генерируем измененный PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const modifiedPath = path.join(__dirname, 'downloads', `modified-content-${Date.now()}.pdf`);
    await download.saveAs(modifiedPath);

    // Сравниваем файлы
    const modifiedStats = fs.statSync(modifiedPath);
    
    // Оба файла должны быть валидными PDF
    const originalBuffer = fs.readFileSync(realPdfPath);
    const modifiedBuffer = fs.readFileSync(modifiedPath);
    
    expect(originalBuffer.slice(0, 8).toString().startsWith('%PDF-')).toBeTruthy();
    expect(modifiedBuffer.slice(0, 8).toString().startsWith('%PDF-')).toBeTruthy();

    // Размеры могут отличаться
    expect(modifiedStats.size).toBeGreaterThan(500);
    
    // Файлы должны отличаться (разные изменения)
    expect(Buffer.compare(originalBuffer, modifiedBuffer)).not.toBe(0);

    console.log('✅ Изменения сохранены в PDF');
    console.log(`Исходный размер: ${originalStats.size} байт`);
    console.log(`Измененный размер: ${modifiedStats.size} байт`);
    console.log(`Разница: ${Math.abs(modifiedStats.size - originalStats.size)} байт`);
  });

  test('должен обрабатывать украинские символы', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Вводим украинский текст
    const ukrainianText = 'Кучеренко Євгеній Васильович';
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(ukrainianText);

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
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const ukrainianPath = path.join(__dirname, 'downloads', `ukrainian-content-${Date.now()}.pdf`);
    await download.saveAs(ukrainianPath);

    // Проверяем файл
    const stats = fs.statSync(ukrainianPath);
    expect(stats.size).toBeGreaterThan(1000);

    const buffer = fs.readFileSync(ukrainianPath);
    expect(buffer.slice(0, 8).toString().startsWith('%PDF-')).toBeTruthy();

    // Проверяем, что были сообщения о шрифтах (значит, украинский текст обрабатывался)
    await page.waitForTimeout(2000);
    expect(fontMessages.length).toBeGreaterThan(0);

    console.log('✅ Украинские символы обработаны');
    console.log(`Размер PDF с украинским текстом: ${stats.size} байт`);
    console.log(`Сообщений о шрифтах: ${fontMessages.length}`);
  });

  test('должен обрабатывать длинные тексты', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Длинный текст
    const longText = 'Це дуже довгий текст для тестування системи розбиття на рядки. '.repeat(10);
    
    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill(longText);
    }

    // Отслеживаем сообщения о разбиении текста
    const textSplittingMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('разбиваем') || text.includes('блоков') || text.includes('Длинный')) {
        textSplittingMessages.push(text);
      }
    });

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const longTextPath = path.join(__dirname, 'downloads', `long-text-content-${Date.now()}.pdf`);
    await download.saveAs(longTextPath);

    // Проверяем результат
    const stats = fs.statSync(longTextPath);
    expect(stats.size).toBeGreaterThan(2000); // Больше из-за длинного текста

    const buffer = fs.readFileSync(longTextPath);
    expect(buffer.slice(0, 8).toString().startsWith('%PDF-')).toBeTruthy();

    // Ждем завершения обработки
    await page.waitForTimeout(3000);

    console.log('✅ Длинный текст обработан');
    console.log(`Размер PDF с длинным текстом: ${stats.size} байт`);
    console.log(`Сообщений о разбиении: ${textSplittingMessages.length}`);
    
    if (textSplittingMessages.length > 0) {
      console.log('Примеры сообщений:', textSplittingMessages.slice(0, 3));
    }
  });

  test('должен создать PDF с корректной структурой', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Минимальные данные
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Structure Test');

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const structurePath = path.join(__dirname, 'downloads', `structure-test-${Date.now()}.pdf`);
    await download.saveAs(structurePath);

    // Детальная проверка PDF структуры
    const buffer = fs.readFileSync(structurePath);
    const pdfContent = buffer.toString('latin1');

    // Обязательные элементы PDF
    expect(pdfContent).toContain('%PDF-'); // Заголовок
    expect(pdfContent).toContain('obj'); // Объекты
    expect(pdfContent).toContain('endobj'); // Конец объектов
    expect(pdfContent).toContain('xref'); // Таблица ссылок
    expect(pdfContent).toContain('trailer'); // Трейлер
    expect(pdfContent).toContain('%%EOF'); // Конец файла

    // Проверяем наличие текстовых элементов
    expect(pdfContent).toContain('BT'); // Begin Text
    expect(pdfContent).toContain('ET'); // End Text

    const stats = fs.statSync(structurePath);
    
    console.log('✅ PDF структура корректна');
    console.log(`Размер: ${stats.size} байт`);
    console.log('Найдены обязательные элементы: заголовок, объекты, ссылки, трейлер');
  });
});
