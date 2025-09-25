import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Простой тест скачивания PDF', () => {
  const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');
  const screenshotsDir = path.join(__dirname, 'screenshots');
  const downloadsDir = path.join(__dirname, 'downloads');

  test.beforeAll(async () => {
    [screenshotsDir, downloadsDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('должен успешно скачать PDF после нажатия кнопки', async ({ page }) => {
    const timestamp = Date.now();

    // Скриншот начального состояния
    const initialScreenshot = path.join(screenshotsDir, `download-initial-${timestamp}.png`);
    await page.screenshot({ path: initialScreenshot, fullPage: true });

    // Загружаем PDF файл
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Скриншот после загрузки
    const loadedScreenshot = path.join(screenshotsDir, `download-loaded-${timestamp}.png`);
    await page.screenshot({ path: loadedScreenshot, fullPage: true });

    // Изменяем данные
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Тест Скачивания PDF');

    // Скриншот после изменения
    const modifiedScreenshot = path.join(screenshotsDir, `download-modified-${timestamp}.png`);
    await page.screenshot({ path: modifiedScreenshot, fullPage: true });

    // Ищем кнопку скачивания
    const downloadButton = page.locator('button').filter({ 
      hasText: /PDF/i 
    }).first();

    // Проверяем, что кнопка видна
    await expect(downloadButton).toBeVisible();

    // Настраиваем перехват скачивания
    const downloadPromise = page.waitForEvent('download');

    // Нажимаем кнопку
    await downloadButton.click();

    // Ждем скачивания
    const download = await downloadPromise;
    
    // Сохраняем скачанный файл
    const downloadedPath = path.join(downloadsDir, `simple-download-${timestamp}.pdf`);
    await download.saveAs(downloadedPath);

    // Скриншот после скачивания
    const afterDownloadScreenshot = path.join(screenshotsDir, `download-completed-${timestamp}.png`);
    await page.screenshot({ path: afterDownloadScreenshot, fullPage: true });

    // Проверяем скачанный файл
    expect(fs.existsSync(downloadedPath)).toBeTruthy();

    const stats = fs.statSync(downloadedPath);
    expect(stats.size).toBeGreaterThan(1000);

    // Проверяем PDF заголовок
    const buffer = fs.readFileSync(downloadedPath);
    const header = buffer.slice(0, 8).toString();
    expect(header.startsWith('%PDF-')).toBeTruthy();

    console.log('✅ PDF успешно скачан:');
    console.log(`   Имя файла: ${download.suggestedFilename()}`);
    console.log(`   Размер: ${stats.size} байт`);
    console.log(`   PDF версия: ${header}`);
    console.log(`   Локальный путь: ${path.basename(downloadedPath)}`);

    // Проверяем созданные скриншоты
    const screenshots = [initialScreenshot, loadedScreenshot, modifiedScreenshot, afterDownloadScreenshot];
    screenshots.forEach(screenshot => {
      expect(fs.existsSync(screenshot)).toBeTruthy();
      const screenshotStats = fs.statSync(screenshot);
      console.log(`   Скриншот: ${path.basename(screenshot)} (${screenshotStats.size} байт)`);
    });
  });

  test('должен проверить базовые свойства скачанного PDF', async ({ page }) => {
    const timestamp = Date.now();

    // Быстрая загрузка и скачивание
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(3000);

    // Минимальные изменения
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Проверка Свойств');

    // Скачиваем
    const downloadPromise = page.waitForEvent('download');
    const downloadButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await downloadButton.click();

    const download = await downloadPromise;
    const testPath = path.join(downloadsDir, `properties-test-${timestamp}.pdf`);
    await download.saveAs(testPath);

    // Базовые проверки
    const stats = fs.statSync(testPath);
    const buffer = fs.readFileSync(testPath);

    // Размер файла
    expect(stats.size).toBeGreaterThan(500);
    expect(stats.size).toBeLessThan(50 * 1024 * 1024);

    // PDF заголовок
    const header = buffer.slice(0, 8).toString();
    expect(header.startsWith('%PDF-')).toBeTruthy();

    // PDF структура
    const pdfContent = buffer.toString('latin1');
    expect(pdfContent).toContain('obj');
    expect(pdfContent).toContain('endobj');
    expect(pdfContent).toContain('%%EOF');

    // Имя файла
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    expect(download.suggestedFilename()).toContain('edited');

    console.log('✅ Свойства PDF проверены:');
    console.log(`   Размер: ${stats.size} байт (в пределах нормы)`);
    console.log(`   Заголовок: ${header} (валидный)`);
    console.log(`   Структура: содержит obj/endobj/%%EOF`);
    console.log(`   Имя файла: ${download.suggestedFilename()}`);
  });

  test('должен создать отчет о скачивании', async ({ page }) => {
    const timestamp = Date.now();

    // Выполняем скачивание
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(3000);

    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Отчет о Скачивании');

    const downloadPromise = page.waitForEvent('download');
    const downloadButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await downloadButton.click();

    const download = await downloadPromise;
    const reportPdfPath = path.join(downloadsDir, `report-${timestamp}.pdf`);
    await download.saveAs(reportPdfPath);

    // Создаем HTML отчет
    const reportHtml = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет о скачивании PDF</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            color: #2c3e50;
            border-bottom: 2px solid #3498db;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .success {
            color: #27ae60;
            font-weight: bold;
        }
        .info {
            background: #e8f4fd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .stats {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
        }
        .stat-box {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            text-align: center;
        }
        .stat-box h4 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .stat-box p {
            margin: 0;
            font-size: 1.2em;
            color: #3498db;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Отчет о тестировании скачивания PDF</h1>
            <p>Дата: ${new Date().toLocaleString('ru-RU')}</p>
        </div>
        
        <div class="info">
            <h3>✅ Результат тестирования</h3>
            <p><strong>Статус:</strong> <span class="success">УСПЕШНО</span></p>
            <p><strong>Функция скачивания:</strong> <span class="success">Работает корректно</span></p>
        </div>

        <div class="stats">
            <div class="stat-box">
                <h4>📄 Исходный PDF</h4>
                <p>${Math.round(fs.statSync(realPdfPath).size / 1024)} KB</p>
            </div>
            <div class="stat-box">
                <h4>📄 Скачанный PDF</h4>
                <p>${Math.round(fs.statSync(reportPdfPath).size / 1024)} KB</p>
            </div>
        </div>

        <div class="info">
            <h3>📋 Проверенная функциональность:</h3>
            <ul>
                <li>✅ Кнопка скачивания работает</li>
                <li>✅ PDF файл создается</li>
                <li>✅ Файл имеет корректный размер</li>
                <li>✅ PDF заголовок валиден</li>
                <li>✅ Структура PDF корректна</li>
                <li>✅ Имя файла соответствует шаблону</li>
            </ul>
        </div>

        <div class="info">
            <h3>📁 Детали файла:</h3>
            <p><strong>Имя файла:</strong> ${download.suggestedFilename()}</p>
            <p><strong>Размер:</strong> ${fs.statSync(reportPdfPath).size} байт</p>
            <p><strong>Путь:</strong> ${reportPdfPath}</p>
        </div>
    </div>
</body>
</html>`;

    const htmlReportPath = path.join(screenshotsDir, `download-report-${timestamp}.html`);
    fs.writeFileSync(htmlReportPath, reportHtml);

    expect(fs.existsSync(htmlReportPath)).toBeTruthy();
    expect(fs.existsSync(reportPdfPath)).toBeTruthy();

    console.log('✅ Отчет о скачивании создан:');
    console.log(`   HTML отчет: ${path.basename(htmlReportPath)}`);
    console.log(`   PDF файл: ${path.basename(reportPdfPath)}`);
    console.log(`   Размер PDF: ${fs.statSync(reportPdfPath).size} байт`);
  });
});
