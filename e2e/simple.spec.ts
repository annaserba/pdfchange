import { test, expect } from '@playwright/test';

test.describe('Простые E2E тесты', () => {
  test('должен загрузить главную страницу', async ({ page }) => {
    await page.goto('http://localhost:3000');
    
    // Ждем загрузки страницы
    await page.waitForLoadState('networkidle');
    
    // Проверяем, что страница загрузилась
    const title = await page.title();
    console.log('Заголовок страницы:', title);
    
    // Проверяем наличие основных элементов
    const h1 = page.locator('h1').first();
    if (await h1.isVisible()) {
      const h1Text = await h1.textContent();
      console.log('Заголовок H1:', h1Text);
    }
    
    // Проверяем наличие input[type="file"]
    const fileInput = page.locator('input[type="file"]');
    const fileInputVisible = await fileInput.isVisible();
    console.log('Кнопка загрузки файла видна:', fileInputVisible);
    
    expect(fileInputVisible).toBeTruthy();
  });

  test('должен показать элементы интерфейса', async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Делаем скриншот для отладки
    await page.screenshot({ path: 'e2e/downloads/homepage-screenshot.png' });
    
    // Ищем любые видимые элементы
    const allElements = await page.locator('*').count();
    console.log('Общее количество элементов:', allElements);
    
    // Проверяем наличие body
    const body = page.locator('body');
    await expect(body).toBeVisible();
    
    // Проверяем наличие root элемента React
    const root = page.locator('#root');
    const rootVisible = await root.isVisible();
    console.log('Root элемент видим:', rootVisible);
    
    if (rootVisible) {
      const rootContent = await root.textContent();
      console.log('Содержимое root:', rootContent?.substring(0, 200));
    }
  });
});
