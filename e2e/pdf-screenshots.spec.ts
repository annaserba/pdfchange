import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { PDFScreenshot } from './utils/pdf-screenshot';

test.describe('E2E тесты с скриншотами PDF', () => {
  const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');
  const screenshotsDir = path.join(__dirname, 'screenshots');

  test.beforeAll(async () => {
    // Создаем директорию для скриншотов
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('должен создать скриншоты PDF до и после изменения отправителя', async ({ page }) => {
    // Загружаем исходный PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Изменяем отправителя
    const newSender = 'ТОВ "Нова Тестова Компанія"';
    const textInputs = page.locator('input[type="text"]');
    await textInputs.nth(0).fill(newSender);

    // Генерируем измененный PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const modifiedPdfPath = path.join(__dirname, 'downloads', `sender-change-${Date.now()}.pdf`);
    await download.saveAs(modifiedPdfPath);

    // Создаем полный набор скриншотов
    const screenshots = await PDFScreenshot.createFullScreenshotSet(
      page,
      realPdfPath,
      modifiedPdfPath,
      'sender-change'
    );

    // Проверяем, что скриншоты созданы
    expect(screenshots.success).toBeTruthy();
    expect(fs.existsSync(screenshots.beforePath)).toBeTruthy();
    expect(fs.existsSync(screenshots.afterPath)).toBeTruthy();
    expect(fs.existsSync(screenshots.comparisonPath)).toBeTruthy();

    console.log('✅ Скриншоты изменения отправителя созданы:');
    console.log(`   До: ${path.basename(screenshots.beforePath)}`);
    console.log(`   После: ${path.basename(screenshots.afterPath)}`);
    console.log(`   Сравнение: ${path.basename(screenshots.comparisonPath)}`);
  });

  test('должен создать скриншоты PDF до и после изменения суммы', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Изменяем сумму
    const newAmount = '9999.99';
    const textInputs = page.locator('input[type="text"]');
    
    // Ищем поле суммы (обычно одно из последних полей)
    const inputCount = await textInputs.count();
    if (inputCount > 2) {
      await textInputs.nth(inputCount - 2).fill(newAmount); // Предпоследнее поле
    }

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const modifiedPdfPath = path.join(__dirname, 'downloads', `amount-change-${Date.now()}.pdf`);
    await download.saveAs(modifiedPdfPath);

    // Создаем скриншоты
    const screenshots = await PDFScreenshot.createFullScreenshotSet(
      page,
      realPdfPath,
      modifiedPdfPath,
      'amount-change'
    );

    expect(screenshots.success).toBeTruthy();

    console.log('✅ Скриншоты изменения суммы созданы:');
    console.log(`   До: ${path.basename(screenshots.beforePath)}`);
    console.log(`   После: ${path.basename(screenshots.afterPath)}`);
    console.log(`   Сравнение: ${path.basename(screenshots.comparisonPath)}`);
  });

  test('должен создать скриншоты PDF до и после изменения назначения платежа', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Изменяем назначение платежа
    const newPurpose = 'Оплата за тестування системи генерації PDF документів згідно договору №TEST-2025-001 від 25.09.2025 року за період з 01.09.2025 по 30.09.2025 включно';
    
    const textarea = page.locator('textarea');
    if (await textarea.isVisible()) {
      await textarea.fill(newPurpose);
    }

    // Отслеживаем сообщения о разбиении текста
    const textSplittingMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('разбиваем') || text.includes('блоков')) {
        textSplittingMessages.push(text);
      }
    });

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const modifiedPdfPath = path.join(__dirname, 'downloads', `purpose-change-${Date.now()}.pdf`);
    await download.saveAs(modifiedPdfPath);

    // Создаем скриншоты
    const screenshots = await PDFScreenshot.createFullScreenshotSet(
      page,
      realPdfPath,
      modifiedPdfPath,
      'purpose-change'
    );

    expect(screenshots.success).toBeTruthy();

    // Ждем завершения обработки
    await page.waitForTimeout(2000);

    console.log('✅ Скриншоты изменения назначения платежа созданы:');
    console.log(`   До: ${path.basename(screenshots.beforePath)}`);
    console.log(`   После: ${path.basename(screenshots.afterPath)}`);
    console.log(`   Сравнение: ${path.basename(screenshots.comparisonPath)}`);
    console.log(`   Сообщений о разбиении текста: ${textSplittingMessages.length}`);
  });

  test('должен создать скриншоты PDF до и после изменения украинских данных', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Изменяем на украинские данные
    const ukrainianData = {
      sender: 'Кучеренко Євгеній Васильович',
      recipient: 'Шевченко Тарас Григорович',
      purpose: 'Оплата за навчання в Київському національному університеті імені Тараса Шевченка на факультеті комп\'ютерних наук та кібернетики'
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

    // Отслеживаем сообщения о шрифтах
    const fontMessages: string[] = [];
    page.on('console', msg => {
      const text = msg.text();
      if (text.includes('украинский') || text.includes('Times New Roman')) {
        fontMessages.push(text);
      }
    });

    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    const generateButton = page.locator('button').filter({ hasText: /PDF/i }).first();
    await generateButton.click();

    const download = await downloadPromise;
    const modifiedPdfPath = path.join(__dirname, 'downloads', `ukrainian-change-${Date.now()}.pdf`);
    await download.saveAs(modifiedPdfPath);

    // Создаем скриншоты
    const screenshots = await PDFScreenshot.createFullScreenshotSet(
      page,
      realPdfPath,
      modifiedPdfPath,
      'ukrainian-change'
    );

    expect(screenshots.success).toBeTruthy();

    await page.waitForTimeout(3000);

    console.log('✅ Скриншоты изменения украинских данных созданы:');
    console.log(`   До: ${path.basename(screenshots.beforePath)}`);
    console.log(`   После: ${path.basename(screenshots.afterPath)}`);
    console.log(`   Сравнение: ${path.basename(screenshots.comparisonPath)}`);
    console.log(`   Сообщений о шрифтах: ${fontMessages.length}`);
  });

  test('должен создать скриншоты PDF до и после множественных изменений', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForTimeout(5000);

    // Множественные изменения
    const changes = {
      sender: 'ТОВ "Комплексні Зміни"',
      recipient: 'Іванов Іван Іванович',
      amount: '15000.50',
      purpose: 'Комплексна оплата за надані послуги включаючи консультації, розробку, тестування та впровадження системи управління документообігом'
    };

    // Заполняем все поля
    const textInputs = page.locator('input[type="text"]');
    const inputCount = await textInputs.count();
    
    await textInputs.nth(0).fill(changes.sender);
    
    if (inputCount > 1) {
      await textInputs.nth(1).fill(changes.recipient);
    }
    
    if (inputCount > 2) {
      await textInputs.nth(inputCount - 2).fill(changes.amount);
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
    const modifiedPdfPath = path.join(__dirname, 'downloads', `multiple-changes-${Date.now()}.pdf`);
    await download.saveAs(modifiedPdfPath);

    // Создаем скриншоты
    const screenshots = await PDFScreenshot.createFullScreenshotSet(
      page,
      realPdfPath,
      modifiedPdfPath,
      'multiple-changes'
    );

    expect(screenshots.success).toBeTruthy();

    console.log('✅ Скриншоты множественных изменений созданы:');
    console.log(`   До: ${path.basename(screenshots.beforePath)}`);
    console.log(`   После: ${path.basename(screenshots.afterPath)}`);
    console.log(`   Сравнение: ${path.basename(screenshots.comparisonPath)}`);
    
    // Проверяем размеры файлов скриншотов
    const beforeStats = fs.statSync(screenshots.beforePath);
    const afterStats = fs.statSync(screenshots.afterPath);
    const comparisonStats = fs.statSync(screenshots.comparisonPath);
    
    console.log(`   Размеры скриншотов:`);
    console.log(`     До: ${beforeStats.size} байт`);
    console.log(`     После: ${afterStats.size} байт`);
    console.log(`     Сравнение: ${comparisonStats.size} байт`);
  });
});
