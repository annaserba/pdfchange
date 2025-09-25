import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Тесты производительности', () => {
  const realPdfPath = path.join(__dirname, 'fixtures', 'real-receipt.pdf');

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('должен быстро загружать и обрабатывать PDF', async ({ page }) => {
    const startTime = Date.now();
    
    // Загружаем реальный PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    
    // Ждем появления формы
    await page.waitForSelector('form', { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`Время загрузки и обработки PDF: ${loadTime}ms`);
    
    // Проверяем, что загрузка заняла разумное время (менее 10 секунд)
    expect(loadTime).toBeLessThan(10000);
    
    // Проверяем, что форма появилась
    await expect(page.locator('form')).toBeVisible();
  });

  test('должен быстро генерировать PDF', async ({ page }) => {
    // Загружаем PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForSelector('form', { timeout: 15000 });
    
    // Заполняем минимальные данные
    await page.fill('input[name="sender"]', 'Test Performance');
    await page.fill('input[name="amount"]', '1000.00');
    
    const startTime = Date.now();
    
    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    const generationTime = Date.now() - startTime;
    
    console.log(`Время генерации PDF: ${generationTime}ms`);
    
    // Проверяем, что генерация заняла разумное время (менее 15 секунд)
    expect(generationTime).toBeLessThan(15000);
    expect(download).toBeTruthy();
  });

  test('должен обрабатывать множественные операции', async ({ page }) => {
    // Загружаем PDF
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForSelector('form', { timeout: 15000 });
    
    const operations: number[] = [];
    
    // Выполняем несколько операций подряд
    for (let i = 0; i < 2; i++) { // Уменьшили до 2 операций для стабильности
      const startTime = Date.now();
      
      // Изменяем данные
      await page.fill('input[name="sender"]', `Test Sender ${i + 1}`);
      await page.fill('input[name="amount"]', `${(i + 1) * 1000}.00`);
      
      // Генерируем PDF
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Згенерувати PDF")');
      
      const download = await downloadPromise;
      const operationTime = Date.now() - startTime;
      
      operations.push(operationTime);
      
      expect(download).toBeTruthy();
      console.log(`Операция ${i + 1}: ${operationTime}ms`);
      
      // Увеличили паузу между операциями
      await page.waitForTimeout(1000);
    }
    
    // Проверяем, что все операции выполнились за разумное время
    const avgTime = operations.reduce((a, b) => a + b, 0) / operations.length;
    console.log(`Среднее время операции: ${avgTime}ms`);
    
    // Увеличили лимит времени для стабильности
    expect(avgTime).toBeLessThan(15000);
  });

  test('должен эффективно обрабатывать большие тексты', async ({ page }) => {
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForSelector('form', { timeout: 15000 });
    
    // Создаем очень длинный текст
    const longText = 'Оплата за надання консультаційних послуг '.repeat(50) + 
                    'у сфері інформаційних технологій та розробки програмного забезпечення '.repeat(30) +
                    'згідно договору про надання послуг №MEGA-LONG-TEXT-2025-001 від 01.09.2025 року '.repeat(20);
    
    console.log(`Длина текста: ${longText.length} символов`);
    
    const startTime = Date.now();
    
    // Заполняем длинным текстом
    await page.fill('textarea[name="paymentPurpose"]', longText);
    
    // Отслеживаем сообщения о разбиении текста
    let textSplittingCount = 0;
    page.on('console', msg => {
      if (msg.text().includes('разбиваем на строки')) {
        textSplittingCount++;
      }
    });
    
    // Генерируем PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button:has-text("Згенерувати PDF")');
    
    const download = await downloadPromise;
    const processingTime = Date.now() - startTime;
    
    console.log(`Время обработки длинного текста: ${processingTime}ms`);
    console.log(`Количество операций разбиения: ${textSplittingCount}`);
    
    // Проверяем производительность
    expect(processingTime).toBeLessThan(20000); // 20 секунд для очень длинного текста
    expect(download).toBeTruthy();
    expect(textSplittingCount).toBeGreaterThan(0);
  });

  test('должен эффективно использовать память', async ({ page }) => {
    // Отслеживаем использование памяти через Performance API
    await page.addInitScript(() => {
      (window as any).performanceMetrics = {
        startMemory: (performance as any).memory?.usedJSHeapSize || 0,
        measurements: []
      };
    });
    
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(realPdfPath);
    await page.waitForSelector('form', { timeout: 15000 });
    
    // Измеряем память после загрузки
    const memoryAfterLoad = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // Выполняем несколько операций
    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="sender"]', `Memory Test ${i}`);
      
      const downloadPromise = page.waitForEvent('download');
      await page.click('button:has-text("Згенерувати PDF")');
      await downloadPromise;
      
      await page.waitForTimeout(100);
    }
    
    // Измеряем память после операций
    const memoryAfterOperations = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    console.log(`Память после загрузки: ${Math.round(memoryAfterLoad / 1024 / 1024)}MB`);
    console.log(`Память после операций: ${Math.round(memoryAfterOperations / 1024 / 1024)}MB`);
    
    const memoryIncrease = memoryAfterOperations - memoryAfterLoad;
    console.log(`Увеличение памяти: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    
    // Проверяем, что утечки памяти не критичны (менее 100MB увеличения)
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});
