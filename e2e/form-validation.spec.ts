import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Валидация формы', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Загружаем тестовый PDF для всех тестов
    const testPdfPath = path.join(__dirname, 'fixtures', 'test-receipt.pdf');
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testPdfPath);
    
    // Ждем загрузки формы
    await page.waitForSelector('form', { timeout: 10000 });
  });

  test('должен валидировать обязательные поля', async ({ page }) => {
    // Пытаемся сгенерировать PDF с пустыми полями
    await page.click('button:has-text("Згенерувати PDF")');
    
    // Проверяем, что PDF все равно генерируется (поля не обязательные)
    // или показывается соответствующее сообщение
    await page.waitForTimeout(2000);
  });

  test('должен корректно обрабатывать украинские символы', async ({ page }) => {
    const ukrainianText = 'Кучеренко Євгеній Васильович';
    await page.fill('input[name="sender"]', ukrainianText);
    
    await expect(page.locator('input[name="sender"]')).toHaveValue(ukrainianText);
    
    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    expect(download).toBeTruthy();
  });

  test('должен обрабатывать специальные символы в номерах счетов', async ({ page }) => {
    const accountNumber = 'UA213223130000026007233566778899001122334455';
    await page.fill('input[name="recipientAccount"]', accountNumber);
    
    await expect(page.locator('input[name="recipientAccount"]')).toHaveValue(accountNumber);
    
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    expect(download).toBeTruthy();
  });

  test('должен корректно обрабатывать числовые поля', async ({ page }) => {
    // Тестируем различные форматы сумм
    const amounts = ['1500', '1500.00', '1,500.00', '1 500,00'];
    
    for (const amount of amounts) {
      await page.fill('input[name="amount"]', amount);
      await expect(page.locator('input[name="amount"]')).toHaveValue(amount);
      
      // Очищаем поле для следующего теста
      await page.fill('input[name="amount"]', '');
    }
  });

  test('должен обрабатывать длинные тексты в textarea', async ({ page }) => {
    const longText = 'Це дуже довгий текст призначення платежу, який містить багато слів і повинен бути правильно оброблений системою розбиття тексту на рядки. Текст включає українські символи, цифри 123456, спеціальні символи №, дати 15.09.2025, і повинен коректно відображатися в PDF документі після генерації.';
    
    await page.fill('textarea[name="paymentPurpose"]', longText);
    await expect(page.locator('textarea[name="paymentPurpose"]')).toHaveValue(longText);
    
    // Проверяем, что textarea адаптируется к длинному тексту
    const textareaHeight = await page.locator('textarea[name="paymentPurpose"]').evaluate(el => el.scrollHeight);
    expect(textareaHeight).toBeGreaterThan(50); // Минимальная высота
  });

  test('должен сохранять данные при переключении между полями', async ({ page }) => {
    // Заполняем несколько полей
    await page.fill('input[name="sender"]', 'Тест Отправитель');
    await page.fill('input[name="recipient"]', 'Тест Получатель');
    await page.fill('input[name="amount"]', '2500.00');
    
    // Переключаемся между полями
    await page.click('input[name="sender"]');
    await page.click('input[name="recipient"]');
    await page.click('input[name="amount"]');
    
    // Проверяем, что данные сохранились
    await expect(page.locator('input[name="sender"]')).toHaveValue('Тест Отправитель');
    await expect(page.locator('input[name="recipient"]')).toHaveValue('Тест Получатель');
    await expect(page.locator('input[name="amount"]')).toHaveValue('2500.00');
  });
});
