import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Базовые E2E тесты', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('должен загрузить главную страницу', async ({ page }) => {
    // Проверяем заголовок страницы
    await expect(page).toHaveTitle(/PDF Receipt Editor/);
    
    // Проверяем основные элементы
    await expect(page.locator('h1')).toContainText('PDF Receipt Editor');
    await expect(page.locator('text=Завантажте PDF файл')).toBeVisible();
    
    // Проверяем кнопку загрузки файла
    const uploadButton = page.locator('input[type="file"]');
    await expect(uploadButton).toBeVisible();
  });

  test('должен показать форму после загрузки PDF', async ({ page }) => {
    // Используем реальный PDF файл
    const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');
    
    // Загружаем файл
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    
    // Ждем появления формы (увеличенный timeout)
    await expect(page.locator('form')).toBeVisible({ timeout: 20000 });
    
    // Проверяем основные поля формы
    await expect(page.locator('input[name="sender"]')).toBeVisible();
    await expect(page.locator('input[name="recipient"]')).toBeVisible();
    await expect(page.locator('input[name="amount"]')).toBeVisible();
  });

  test('должен заполнить форму и сгенерировать PDF', async ({ page }) => {
    const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');
    
    // Загружаем PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    
    // Ждем загрузки формы
    await page.waitForSelector('form', { timeout: 20000 });
    
    // Заполняем основные поля
    await page.fill('input[name="sender"]', 'E2E Test Sender');
    await page.fill('input[name="recipient"]', 'E2E Test Recipient');
    await page.fill('input[name="amount"]', '1500.00');
    
    // Проверяем, что значения заполнились
    await expect(page.locator('input[name="sender"]')).toHaveValue('E2E Test Sender');
    await expect(page.locator('input[name="amount"]')).toHaveValue('1500.00');
    
    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    
    // Проверяем скачивание
    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    
    // Сохраняем файл для проверки
    const downloadPath = path.join(__dirname, 'downloads', `basic-test-${Date.now()}.pdf`);
    await download.saveAs(downloadPath);
    
    console.log('✅ Базовый тест прошел успешно, PDF сохранен:', downloadPath);
  });

  test('должен обрабатывать украинские символы', async ({ page }) => {
    const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    
    await page.waitForSelector('form', { timeout: 20000 });
    
    // Заполняем украинскими символами
    const ukrainianText = 'Кучеренко Євгеній Васильович';
    await page.fill('input[name="sender"]', ukrainianText);
    
    await expect(page.locator('input[name="sender"]')).toHaveValue(ukrainianText);
    
    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    expect(download).toBeTruthy();
    
    console.log('✅ Украинские символы обработаны корректно');
  });
});
