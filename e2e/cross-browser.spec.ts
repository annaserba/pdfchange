import { test, expect, devices } from '@playwright/test';
import path from 'path';

const browsers = ['chromium', 'firefox', 'webkit'];

browsers.forEach(browserName => {
  test.describe(`Кроссбраузерное тестирование - ${browserName}`, () => {
    const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
    });

    test(`должен работать в ${browserName}`, async ({ page }) => {
      // Загружаем PDF
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(realPdfPath);
      
      // Ждем загрузки (больше времени для Safari)
      const timeout = browserName === 'webkit' ? 20000 : 15000;
      await page.waitForSelector('form', { timeout });
      
      // Проверяем основные элементы
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[name="sender"]')).toBeVisible();
      await expect(page.locator('button:has-text("Згенерувати PDF")')).toBeVisible();
      
      // Заполняем данные
      await page.fill('input[name="sender"]', `Test ${browserName}`);
      await page.fill('input[name="amount"]', '1500.00');
      
      // Генерируем PDF
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Згенерувати PDF")');
      
      const download = await downloadPromise;
      expect(download).toBeTruthy();
      expect(download.suggestedFilename()).toMatch(/\.pdf$/);
      
      console.log(`${browserName}: PDF успешно сгенерирован`);
    });

    test(`должен корректно отображать украинские символы в ${browserName}`, async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(realPdfPath);
      
      const timeout = browserName === 'webkit' ? 20000 : 15000;
      await page.waitForSelector('form', { timeout });
      
      // Заполняем украинскими символами
      const ukrainianText = 'Кучеренко Євгеній Васильович';
      await page.fill('input[name="sender"]', ukrainianText);
      
      // Проверяем, что текст корректно отображается
      await expect(page.locator('input[name="sender"]')).toHaveValue(ukrainianText);
      
      // Генерируем PDF
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Згенерувати PDF")');
      
      const download = await downloadPromise;
      expect(download).toBeTruthy();
      
      console.log(`${browserName}: Украинские символы обработаны корректно`);
    });

    test(`должен обрабатывать длинные тексты в ${browserName}`, async ({ page }) => {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(realPdfPath);
      
      const timeout = browserName === 'webkit' ? 20000 : 15000;
      await page.waitForSelector('form', { timeout });
      
      const longText = 'Оплата за надані послуги згідно договору №123 від 15.09.2025 за період з 01.09.2025 по 30.09.2025 включно за всі види робіт та послуг';
      
      const purposeField = page.locator('textarea[name="paymentPurpose"]');
      if (await purposeField.isVisible()) {
        await purposeField.fill(longText);
        await expect(purposeField).toHaveValue(longText);
      }
      
      // Отслеживаем сообщения о разбиении текста
      let hasTextSplitting = false;
      page.on('console', msg => {
        if (msg.text().includes('разбиваем на строки')) {
          hasTextSplitting = true;
        }
      });
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Згенерувати PDF")');
      
      const download = await downloadPromise;
      expect(download).toBeTruthy();
      
      await page.waitForTimeout(2000);
      
      console.log(`${browserName}: Длинный текст обработан, разбиение: ${hasTextSplitting}`);
    });
  });
});

// Тесты для мобильных устройств
test.describe('Мобильная совместимость', () => {
  const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');
  
  const mobileDevices = [
    { name: 'iPhone 12', device: devices['iPhone 12'] },
    { name: 'Pixel 5', device: devices['Pixel 5'] },
    { name: 'iPad', device: devices['iPad Pro'] }
  ];

  mobileDevices.forEach(({ name, device }) => {
    test(`должен работать на ${name}`, async ({ browser }) => {
      const context = await browser.newContext({
        ...device,
      });
      const page = await context.newPage();
      
      await page.goto('/');
      
      // Загружаем PDF
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(realPdfPath);
      
      await page.waitForSelector('form', { timeout: 20000 });
      
      // Проверяем адаптивность
      await expect(page.locator('form')).toBeVisible();
      
      // Заполняем данные (может потребоваться скролл на мобильных)
      await page.fill('input[name="sender"]', `Mobile Test ${name}`);
      
      // Скроллим к кнопке если нужно
      await page.locator('button:has-text("Згенерувати PDF")').scrollIntoViewIfNeeded();
      
      // Генерируем PDF
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Згенерувати PDF")');
      
      const download = await downloadPromise;
      expect(download).toBeTruthy();
      
      console.log(`${name}: Мобильная версия работает корректно`);
      
      await context.close();
    });
  });
});
