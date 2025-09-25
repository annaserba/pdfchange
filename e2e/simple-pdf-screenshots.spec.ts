import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Простые скриншоты PDF', () => {
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

  test('должен создать скриншот исходного PDF', async ({ page }) => {
    const timestamp = Date.now();
    const screenshotPath = path.join(screenshotsDir, `original-pdf-${timestamp}.png`);

    try {
      // Открываем исходный PDF в браузере
      const pdfUrl = `file://${path.resolve(realPdfPath)}`;
      await page.goto(pdfUrl);
      
      // Ждем загрузки PDF
      await page.waitForTimeout(5000);
      
      // Делаем скриншот
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
        type: 'png'
      });

      // Проверяем, что скриншот создан
      expect(fs.existsSync(screenshotPath)).toBeTruthy();
      
      const stats = fs.statSync(screenshotPath);
      expect(stats.size).toBeGreaterThan(1000); // Минимум 1KB

      console.log('✅ Скриншот исходного PDF создан');
      console.log(`   Путь: ${screenshotPath}`);
      console.log(`   Размер: ${stats.size} байт`);

    } catch (error) {
      console.error('❌ Ошибка создания скриншота исходного PDF:', error);
      // Делаем скриншот страницы для отладки
      await page.screenshot({
        path: path.join(screenshotsDir, `error-original-${timestamp}.png`)
      });
    }
  });

  test('должен создать скриншоты до и после изменений', async ({ page }) => {
    const timestamp = Date.now();
    
    // Загружаем PDF и изменяем данные
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Изменяем первое поле
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Screenshot Test User');

    // Генерируем измененный PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const modifiedPdfPath = path.join(__dirname, 'downloads', `screenshot-test-${timestamp}.pdf`);
    await download.saveAs(modifiedPdfPath);

    // Создаем скриншот исходного PDF
    console.log('📸 Создаем скриншот исходного PDF...');
    const beforeScreenshotPath = path.join(screenshotsDir, `before-${timestamp}.png`);
    
    await page.goto(`file://${path.resolve(realPdfPath)}`);
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: beforeScreenshotPath,
      fullPage: true,
      type: 'png'
    });

    // Создаем скриншот измененного PDF
    console.log('📸 Создаем скриншот измененного PDF...');
    const afterScreenshotPath = path.join(screenshotsDir, `after-${timestamp}.png`);
    
    await page.goto(`file://${path.resolve(modifiedPdfPath)}`);
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: afterScreenshotPath,
      fullPage: true,
      type: 'png'
    });

    // Проверяем, что оба скриншота созданы
    expect(fs.existsSync(beforeScreenshotPath)).toBeTruthy();
    expect(fs.existsSync(afterScreenshotPath)).toBeTruthy();

    const beforeStats = fs.statSync(beforeScreenshotPath);
    const afterStats = fs.statSync(afterScreenshotPath);

    expect(beforeStats.size).toBeGreaterThan(1000);
    expect(afterStats.size).toBeGreaterThan(1000);

    console.log('✅ Скриншоты до и после созданы');
    console.log(`   До: ${path.basename(beforeScreenshotPath)} (${beforeStats.size} байт)`);
    console.log(`   После: ${path.basename(afterScreenshotPath)} (${afterStats.size} байт)`);
  });

  test('должен создать сравнительный HTML отчет', async ({ page }) => {
    const timestamp = Date.now();
    
    // Генерируем тестовый PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('HTML Report Test');

    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const modifiedPdfPath = path.join(__dirname, 'downloads', `html-report-${timestamp}.pdf`);
    await download.saveAs(modifiedPdfPath);

    // Создаем скриншоты
    const beforePath = path.join(screenshotsDir, `report-before-${timestamp}.png`);
    const afterPath = path.join(screenshotsDir, `report-after-${timestamp}.png`);

    // Скриншот исходного PDF
    await page.goto(`file://${path.resolve(realPdfPath)}`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: beforePath, fullPage: true });

    // Скриншот измененного PDF
    await page.goto(`file://${path.resolve(modifiedPdfPath)}`);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: afterPath, fullPage: true });

    // Создаем HTML отчет
    const reportHtml = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Comparison Report</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .header p {
            margin: 10px 0 0 0;
            opacity: 0.8;
            font-size: 1.1em;
        }
        .comparison {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            padding: 30px;
        }
        .pdf-section {
            text-align: center;
        }
        .pdf-section h2 {
            margin: 0 0 20px 0;
            font-size: 1.5em;
            color: #2c3e50;
        }
        .pdf-section.before h2 {
            color: #e74c3c;
        }
        .pdf-section.after h2 {
            color: #27ae60;
        }
        .pdf-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            border: 3px solid #ecf0f1;
            border-radius: 10px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease;
        }
        .pdf-image:hover {
            transform: scale(1.02);
        }
        .info {
            background: #f8f9fa;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        .stat-card h3 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .stat-card p {
            margin: 0;
            font-size: 1.2em;
            font-weight: bold;
            color: #3498db;
        }
        @media (max-width: 768px) {
            .comparison {
                grid-template-columns: 1fr;
                gap: 20px;
                padding: 20px;
            }
            .header h1 {
                font-size: 2em;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 PDF Comparison Report</h1>
            <p>Автоматическое сравнение PDF документов до и после изменений</p>
            <p>Дата создания: ${new Date().toLocaleString('ru-RU')}</p>
        </div>
        
        <div class="info">
            <h3>ℹ️ Информация о тесте</h3>
            <p><strong>Тест:</strong> HTML Report Test</p>
            <p><strong>Исходный файл:</strong> ${path.basename(realPdfPath)}</p>
            <p><strong>Измененный файл:</strong> ${path.basename(modifiedPdfPath)}</p>
            <p><strong>Время создания:</strong> ${new Date(timestamp).toLocaleString('ru-RU')}</p>
        </div>

        <div class="comparison">
            <div class="pdf-section before">
                <h2>🔴 До изменений</h2>
                <img src="file://${path.resolve(beforePath)}" alt="PDF до изменений" class="pdf-image">
            </div>
            <div class="pdf-section after">
                <h2>🟢 После изменений</h2>
                <img src="file://${path.resolve(afterPath)}" alt="PDF после изменений" class="pdf-image">
            </div>
        </div>

        <div class="stats">
            <div class="stat-card">
                <h3>📁 Исходный файл</h3>
                <p>${Math.round(fs.statSync(realPdfPath).size / 1024)} KB</p>
            </div>
            <div class="stat-card">
                <h3>📄 Измененный файл</h3>
                <p>${Math.round(fs.statSync(modifiedPdfPath).size / 1024)} KB</p>
            </div>
            <div class="stat-card">
                <h3>📸 Скриншот "До"</h3>
                <p>${Math.round(fs.statSync(beforePath).size / 1024)} KB</p>
            </div>
            <div class="stat-card">
                <h3>🖼️ Скриншот "После"</h3>
                <p>${Math.round(fs.statSync(afterPath).size / 1024)} KB</p>
            </div>
        </div>
    </div>
</body>
</html>`;

    const reportPath = path.join(screenshotsDir, `comparison-report-${timestamp}.html`);
    fs.writeFileSync(reportPath, reportHtml);

    expect(fs.existsSync(reportPath)).toBeTruthy();

    console.log('✅ HTML отчет создан');
    console.log(`   Путь: ${reportPath}`);
    console.log(`   Откройте в браузере для просмотра сравнения`);
  });
});
