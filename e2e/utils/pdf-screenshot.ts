import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';

export class PDFScreenshot {
  
  /**
   * Создает скриншот PDF файла используя браузер
   */
  static async createPDFScreenshot(
    page: Page, 
    pdfPath: string, 
    outputPath: string
  ): Promise<boolean> {
    try {
      // Проверяем существование PDF файла
      if (!fs.existsSync(pdfPath)) {
        console.error(`PDF файл не найден: ${pdfPath}`);
        return false;
      }

      // Создаем директорию для скриншота если её нет
      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Открываем PDF в браузере
      const pdfUrl = `file://${path.resolve(pdfPath)}`;
      await page.goto(pdfUrl);
      
      // Ждем загрузки PDF
      await page.waitForTimeout(3000);
      
      // Делаем скриншот всей страницы
      await page.screenshot({
        path: outputPath,
        fullPage: true,
        type: 'png'
      });

      console.log(`✅ Скриншот PDF создан: ${outputPath}`);
      return true;

    } catch (error) {
      console.error(`❌ Ошибка создания скриншота PDF: ${error}`);
      return false;
    }
  }

  /**
   * Создает скриншоты до и после изменений
   */
  static async createBeforeAfterScreenshots(
    page: Page,
    originalPdfPath: string,
    modifiedPdfPath: string,
    screenshotsDir: string,
    testName: string
  ): Promise<{
    beforePath: string;
    afterPath: string;
    success: boolean;
  }> {
    const timestamp = Date.now();
    const beforePath = path.join(screenshotsDir, `${testName}-before-${timestamp}.png`);
    const afterPath = path.join(screenshotsDir, `${testName}-after-${timestamp}.png`);

    try {
      // Создаем директорию для скриншотов
      if (!fs.existsSync(screenshotsDir)) {
        fs.mkdirSync(screenshotsDir, { recursive: true });
      }

      // Скриншот исходного PDF
      console.log('📸 Создаем скриншот исходного PDF...');
      const beforeSuccess = await this.createPDFScreenshot(page, originalPdfPath, beforePath);

      // Скриншот измененного PDF
      console.log('📸 Создаем скриншот измененного PDF...');
      const afterSuccess = await this.createPDFScreenshot(page, modifiedPdfPath, afterPath);

      const success = beforeSuccess && afterSuccess;

      if (success) {
        console.log('✅ Скриншоты до и после созданы успешно');
        console.log(`   До: ${beforePath}`);
        console.log(`   После: ${afterPath}`);
      }

      return {
        beforePath,
        afterPath,
        success
      };

    } catch (error) {
      console.error(`❌ Ошибка создания скриншотов: ${error}`);
      return {
        beforePath,
        afterPath,
        success: false
      };
    }
  }

  /**
   * Создает сравнительный скриншот (side-by-side)
   */
  static async createComparisonScreenshot(
    page: Page,
    beforeImagePath: string,
    afterImagePath: string,
    comparisonPath: string
  ): Promise<boolean> {
    try {
      // Проверяем существование исходных изображений
      if (!fs.existsSync(beforeImagePath) || !fs.existsSync(afterImagePath)) {
        console.error('Исходные изображения не найдены');
        return false;
      }

      // Создаем HTML страницу для сравнения
      const comparisonHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>PDF Comparison</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              background: #f5f5f5;
            }
            .comparison-container {
              display: flex;
              gap: 20px;
              justify-content: center;
              align-items: flex-start;
            }
            .pdf-container {
              background: white;
              border: 2px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              box-shadow: 0 4px 8px rgba(0,0,0,0.1);
            }
            .pdf-container h3 {
              margin: 0 0 15px 0;
              text-align: center;
              color: #333;
            }
            .pdf-container.before h3 {
              color: #e74c3c;
            }
            .pdf-container.after h3 {
              color: #27ae60;
            }
            img {
              max-width: 600px;
              height: auto;
              border: 1px solid #ccc;
              border-radius: 4px;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2c3e50;
              margin-bottom: 10px;
            }
            .header p {
              color: #7f8c8d;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>📊 PDF Comparison</h1>
            <p>Сравнение PDF до и после изменений</p>
          </div>
          <div class="comparison-container">
            <div class="pdf-container before">
              <h3>🔴 До изменений</h3>
              <img src="file://${path.resolve(beforeImagePath)}" alt="PDF до изменений" />
            </div>
            <div class="pdf-container after">
              <h3>🟢 После изменений</h3>
              <img src="file://${path.resolve(afterImagePath)}" alt="PDF после изменений" />
            </div>
          </div>
        </body>
        </html>
      `;

      // Создаем временный HTML файл
      const tempHtmlPath = path.join(path.dirname(comparisonPath), 'temp-comparison.html');
      fs.writeFileSync(tempHtmlPath, comparisonHtml);

      // Открываем HTML страницу в браузере
      await page.goto(`file://${path.resolve(tempHtmlPath)}`);
      await page.waitForTimeout(2000);

      // Делаем скриншот сравнения
      await page.screenshot({
        path: comparisonPath,
        fullPage: true,
        type: 'png'
      });

      // Удаляем временный HTML файл
      fs.unlinkSync(tempHtmlPath);

      console.log(`✅ Сравнительный скриншот создан: ${comparisonPath}`);
      return true;

    } catch (error) {
      console.error(`❌ Ошибка создания сравнительного скриншота: ${error}`);
      return false;
    }
  }

  /**
   * Создает полный набор скриншотов для теста
   */
  static async createFullScreenshotSet(
    page: Page,
    originalPdfPath: string,
    modifiedPdfPath: string,
    testName: string
  ): Promise<{
    beforePath: string;
    afterPath: string;
    comparisonPath: string;
    success: boolean;
  }> {
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    const timestamp = Date.now();
    
    const beforePath = path.join(screenshotsDir, `${testName}-before-${timestamp}.png`);
    const afterPath = path.join(screenshotsDir, `${testName}-after-${timestamp}.png`);
    const comparisonPath = path.join(screenshotsDir, `${testName}-comparison-${timestamp}.png`);

    try {
      // Создаем скриншоты до и после
      const { success: screenshotsSuccess } = await this.createBeforeAfterScreenshots(
        page,
        originalPdfPath,
        modifiedPdfPath,
        screenshotsDir,
        testName
      );

      if (!screenshotsSuccess) {
        return { beforePath, afterPath, comparisonPath, success: false };
      }

      // Создаем сравнительный скриншот
      const comparisonSuccess = await this.createComparisonScreenshot(
        page,
        beforePath,
        afterPath,
        comparisonPath
      );

      return {
        beforePath,
        afterPath,
        comparisonPath,
        success: comparisonSuccess
      };

    } catch (error) {
      console.error(`❌ Ошибка создания полного набора скриншотов: ${error}`);
      return {
        beforePath,
        afterPath,
        comparisonPath,
        success: false
      };
    }
  }
}
