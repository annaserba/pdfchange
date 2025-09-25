import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test.describe('Скриншоты формы до и после изменений', () => {
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

  test('должен создать скриншоты формы до и после загрузки PDF', async ({ page }) => {
    const timestamp = Date.now();

    // Скриншот пустой формы
    const emptyFormPath = path.join(screenshotsDir, `empty-form-${timestamp}.png`);
    await page.screenshot({
      path: emptyFormPath,
      fullPage: true
    });

    // Загружаем PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Скриншот заполненной формы
    const filledFormPath = path.join(screenshotsDir, `filled-form-${timestamp}.png`);
    await page.screenshot({
      path: filledFormPath,
      fullPage: true
    });

    // Проверяем скриншоты
    expect(fs.existsSync(emptyFormPath)).toBeTruthy();
    expect(fs.existsSync(filledFormPath)).toBeTruthy();

    const emptyStats = fs.statSync(emptyFormPath);
    const filledStats = fs.statSync(filledFormPath);

    console.log('✅ Скриншоты формы созданы');
    console.log(`   Пустая форма: ${path.basename(emptyFormPath)} (${emptyStats.size} байт)`);
    console.log(`   Заполненная форма: ${path.basename(filledFormPath)} (${filledStats.size} байт)`);
  });

  test('должен создать скриншоты процесса редактирования', async ({ page }) => {
    const timestamp = Date.now();
    const screenshots: string[] = [];

    // 1. Исходное состояние
    let screenshotPath = path.join(screenshotsDir, `step1-initial-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    // 2. После загрузки PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    screenshotPath = path.join(screenshotsDir, `step2-loaded-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    // 3. После изменения первого поля
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill('Измененный Отправитель');

    screenshotPath = path.join(screenshotsDir, `step3-sender-changed-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    // 4. После изменения суммы
    const inputCount = await textInputs.count();
    if (inputCount > 2) {
      await textInputs.nth(inputCount - 2).fill('9999.99');
    }

    screenshotPath = path.join(screenshotsDir, `step4-amount-changed-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    // 5. После изменения назначения платежа
    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill('Новое назначение платежа для демонстрации изменений в системе');
    }

    screenshotPath = path.join(screenshotsDir, `step5-purpose-changed-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    // 6. Процесс генерации PDF
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();
    await page.waitForTimeout(1000);

    screenshotPath = path.join(screenshotsDir, `step6-generating-${timestamp}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    screenshots.push(screenshotPath);

    // Проверяем все скриншоты
    screenshots.forEach(path => {
      expect(fs.existsSync(path)).toBeTruthy();
    });

    console.log('✅ Скриншоты процесса редактирования созданы:');
    screenshots.forEach((path, index) => {
      const stats = fs.statSync(path);
      console.log(`   Шаг ${index + 1}: ${path.basename(path)} (${stats.size} байт)`);
    });
  });

  test('должен создать скриншоты с разными данными', async ({ page }) => {
    const timestamp = Date.now();
    const testCases = [
      {
        name: 'ukrainian-data',
        data: {
          sender: 'Кучеренко Євгеній Васильович',
          purpose: 'Оплата за навчання в університеті'
        }
      },
      {
        name: 'long-text',
        data: {
          sender: 'ТОВ "Дуже Довга Назва Компанії"',
          purpose: 'Дуже довге призначення платежу з багатьма словами для тестування системи розбиття тексту на декілька рядків'
        }
      },
      {
        name: 'numbers-symbols',
        data: {
          sender: 'Company №123 & Co.',
          purpose: 'Payment #456 for services (2025) - 100% complete'
        }
      }
    ];

    for (const testCase of testCases) {
      // Перезагружаем страницу
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Загружаем PDF
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(realPdfPath);
      await page.waitForTimeout(3000);

      // Заполняем данные
      const textInputs = page.locator('input[type="text"]');
      await textInputs.nth(0).fill(testCase.data.sender);

      const textarea = page.locator('textarea');
      if (await textarea.isVisible()) {
        await textarea.fill(testCase.data.purpose);
      }

      // Делаем скриншот
      const screenshotPath = path.join(screenshotsDir, `${testCase.name}-${timestamp}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      expect(fs.existsSync(screenshotPath)).toBeTruthy();

      console.log(`✅ Скриншот ${testCase.name} создан: ${path.basename(screenshotPath)}`);
    }
  });

  test('должен создать HTML галерею скриншотов', async ({ page }) => {
    const timestamp = Date.now();
    const screenshots: Array<{name: string, path: string, description: string}> = [];

    // Создаем несколько скриншотов для галереи
    const scenarios = [
      { name: 'empty', description: 'Пустая форма', action: null },
      { name: 'loaded', description: 'После загрузки PDF', action: 'load' },
      { name: 'edited', description: 'После редактирования', action: 'edit' }
    ];

    for (const scenario of scenarios) {
      if (scenario.action === 'load') {
        const fileInput = page.locator('input[type="file"]');
        await fileInput.setInputFiles(realPdfPath);
        await page.waitForTimeout(3000);
      } else if (scenario.action === 'edit') {
        const textInputs = page.locator('input[type="text"]');
        await textInputs.nth(0).fill('Галерея Тест');
      }

      const screenshotPath = path.join(screenshotsDir, `gallery-${scenario.name}-${timestamp}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true
      });

      screenshots.push({
        name: scenario.name,
        path: screenshotPath,
        description: scenario.description
      });
    }

    // Создаем HTML галерею
    const galleryHtml = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Editor Screenshots Gallery</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }
        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }
        .header p {
            opacity: 0.9;
            font-size: 1.1em;
        }
        .gallery {
            padding: 40px;
        }
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 30px;
        }
        .screenshot-card {
            background: #f8f9fa;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        .screenshot-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.15);
        }
        .screenshot-card img {
            width: 100%;
            height: 250px;
            object-fit: cover;
            border-bottom: 3px solid #3498db;
        }
        .screenshot-info {
            padding: 20px;
        }
        .screenshot-info h3 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 1.3em;
        }
        .screenshot-info p {
            color: #7f8c8d;
            line-height: 1.6;
        }
        .stats {
            background: #ecf0f1;
            padding: 30px;
            text-align: center;
        }
        .stats h2 {
            color: #2c3e50;
            margin-bottom: 20px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat-item {
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 5px 10px rgba(0,0,0,0.1);
        }
        .stat-item h4 {
            color: #3498db;
            font-size: 1.5em;
            margin-bottom: 5px;
        }
        .stat-item p {
            color: #7f8c8d;
        }
        @media (max-width: 768px) {
            .gallery-grid {
                grid-template-columns: 1fr;
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
            <h1>📸 PDF Editor Screenshots</h1>
            <p>Галерея скриншотов процесса редактирования PDF документов</p>
            <p>Создано: ${new Date().toLocaleString('ru-RU')}</p>
        </div>
        
        <div class="gallery">
            <div class="gallery-grid">
                ${screenshots.map(screenshot => `
                    <div class="screenshot-card">
                        <img src="file://${path.resolve(screenshot.path)}" alt="${screenshot.description}">
                        <div class="screenshot-info">
                            <h3>${screenshot.description}</h3>
                            <p>Файл: ${path.basename(screenshot.path)}</p>
                            <p>Размер: ${Math.round(fs.statSync(screenshot.path).size / 1024)} KB</p>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="stats">
            <h2>📊 Статистика</h2>
            <div class="stats-grid">
                <div class="stat-item">
                    <h4>${screenshots.length}</h4>
                    <p>Скриншотов создано</p>
                </div>
                <div class="stat-item">
                    <h4>${Math.round(screenshots.reduce((sum, s) => sum + fs.statSync(s.path).size, 0) / 1024)} KB</h4>
                    <p>Общий размер</p>
                </div>
                <div class="stat-item">
                    <h4>${new Date().toLocaleDateString('ru-RU')}</h4>
                    <p>Дата создания</p>
                </div>
            </div>
        </div>
    </div>
</body>
</html>`;

    const galleryPath = path.join(screenshotsDir, `gallery-${timestamp}.html`);
    fs.writeFileSync(galleryPath, galleryHtml);

    expect(fs.existsSync(galleryPath)).toBeTruthy();

    console.log('✅ HTML галерея скриншотов создана');
    console.log(`   Путь: ${galleryPath}`);
    console.log(`   Скриншотов в галерее: ${screenshots.length}`);
    console.log(`   Откройте в браузере для просмотра`);
  });
});
