import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Тестирование разбиения текста', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('должен правильно разбивать длинный текст на строки', async ({ page }) => {
    // Загружаем тестовый PDF
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-receipt.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    // Ждем загрузки формы
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Вводим длинный текст в поле назначения платежа
    const longText = 'Оплата за надані послуги згідно договору №123 від 15.09.2025 за період з 01.09.2025 по 30.09.2025 включно за всі види робіт';
    await page.fill('textarea[name="paymentPurpose"]', longText);
    
    // Проверяем, что текст введен
    await expect(page.locator('textarea[name="paymentPurpose"]')).toHaveValue(longText);
    
    // Генерируем PDF и проверяем консольные сообщения
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log' && msg.text().includes('разбиваем на строки')) {
        consoleMessages.push(msg.text());
      }
    });
    
    await page.click('button:has-text("Згенерувати PDF")');
    
    // Ждем обработки
    await page.waitForTimeout(3000);
    
    // Проверяем, что функция разбиения была вызвана
    expect(consoleMessages.length).toBeGreaterThan(0);
  });

  test('должен корректно обрабатывать короткий текст', async ({ page }) => {
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-receipt.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Вводим короткий текст
    const shortText = '1500.00 грн';
    await page.fill('input[name="amount"]', shortText);
    
    await expect(page.locator('input[name="amount"]')).toHaveValue(shortText);
    
    // Проверяем генерацию PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });
});
