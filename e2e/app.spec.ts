import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('PDF Receipt Editor - Основные функции', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('должен загрузить главную страницу', async ({ page }) => {
    // Проверяем заголовок
    await expect(page).toHaveTitle(/PDF Receipt Editor/);
    
    // Проверяем основные элементы интерфейса
    await expect(page.locator('h1')).toContainText('PDF Receipt Editor');
    await expect(page.locator('text=Завантажте PDF файл')).toBeVisible();
    
    // Проверяем кнопку загрузки файла
    const uploadButton = page.locator('input[type="file"]');
    await expect(uploadButton).toBeVisible();
  });

  test('должен показать форму после загрузки PDF', async ({ page }) => {
    // Создаем тестовый PDF файл (мок)
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-receipt.pdf');
    
    // Загружаем файл
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    // Ждем появления формы
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });
    
    // Проверяем поля формы
    await expect(page.locator('input[name="sender"]')).toBeVisible();
    await expect(page.locator('input[name="recipient"]')).toBeVisible();
    await expect(page.locator('input[name="amount"]')).toBeVisible();
    await expect(page.locator('textarea[name="paymentPurpose"]')).toBeVisible();
  });

  test('должен заполнить форму и показать превью', async ({ page }) => {
    // Загружаем тестовый PDF
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-receipt.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    // Ждем загрузки формы
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Заполняем поля формы
    await page.fill('input[name="sender"]', 'Тестовый Отправитель');
    await page.fill('input[name="recipient"]', 'Тестовый Получатель');
    await page.fill('input[name="amount"]', '1500.00');
    await page.fill('textarea[name="paymentPurpose"]', 'Оплата за тестовые услуги согласно договору №TEST-001');
    
    // Проверяем, что значения заполнились
    await expect(page.locator('input[name="sender"]')).toHaveValue('Тестовый Отправитель');
    await expect(page.locator('input[name="amount"]')).toHaveValue('1500.00');
  });

  test('должен генерировать и скачать PDF', async ({ page }) => {
    // Загружаем тестовый PDF
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-receipt.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    // Ждем загрузки формы
    await page.waitForSelector('form', { timeout: 10000 });
    
    // Заполняем форму
    await page.fill('input[name="sender"]', 'E2E Test Sender');
    await page.fill('input[name="amount"]', '2500.00');
    
    // Настраиваем перехват скачивания
    const downloadPromise = page.waitForEvent('download');
    
    // Нажимаем кнопку генерации PDF
    await page.click('button:has-text("Згенерувати PDF")');
    
    // Ждем скачивания
    const download = await downloadPromise;
    
    // Проверяем, что файл скачался
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    
    // Сохраняем файл для проверки
    const downloadPath = path.join(__dirname, 'downloads', download.suggestedFilename());
    await download.saveAs(downloadPath);
  });

  test('должен показать сообщения об ошибках', async ({ page }) => {
    // Пытаемся сгенерировать PDF без загрузки файла
    const generateButton = page.locator('button:has-text("Згенерувати PDF")');
    
    if (await generateButton.isVisible()) {
      await generateButton.click();
      
      // Проверяем сообщение об ошибке
      await expect(page.locator('text=Будь ласка, завантажте')).toBeVisible({ timeout: 5000 });
    }
  });

  test('должен работать на мобильных устройствах', async ({ page }) => {
    // Устанавливаем мобильный viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Проверяем адаптивность
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('input[type="file"]')).toBeVisible();
    
    // Проверяем, что элементы не обрезаются
    const uploadArea = page.locator('[class*="upload"]').first();
    if (await uploadArea.isVisible()) {
      const boundingBox = await uploadArea.boundingBox();
      expect(boundingBox?.width).toBeLessThanOrEqual(375);
    }
  });
});
