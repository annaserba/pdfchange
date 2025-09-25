import fs from 'fs';
import path from 'path';
import { Page } from '@playwright/test';

export class PDFContentChecker {
  
  /**
   * Создает скриншот PDF используя встроенный PDF viewer браузера
   */
  static async createPDFScreenshot(
    page: Page, 
    pdfPath: string, 
    outputPath: string
  ): Promise<boolean> {
    try {
      if (!fs.existsSync(pdfPath)) {
        console.error(`PDF файл не найден: ${pdfPath}`);
        return false;
      }

      const outputDir = path.dirname(outputPath);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Читаем PDF как base64
      const pdfBuffer = fs.readFileSync(pdfPath);
      const pdfBase64 = pdfBuffer.toString('base64');
      
      // Создаем data URL
      const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;
      
      // Открываем PDF через data URL
      await page.goto(pdfDataUrl);
      
      // Ждем загрузки PDF
      await page.waitForTimeout(5000);
      
      // Делаем скриншот
      await page.screenshot({
        path: outputPath,
        fullPage: true,
        type: 'png'
      });

      console.log(`✅ Скриншот PDF создан: ${outputPath}`);
      return true;

    } catch (error) {
      console.error(`❌ Ошибка создания скриншота PDF: ${error}`);
      
      // Попробуем альтернативный способ - через HTML embed
      try {
        const pdfBuffer = fs.readFileSync(pdfPath);
        const pdfBase64 = pdfBuffer.toString('base64');
        
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { margin: 0; padding: 20px; background: #f0f0f0; }
              .pdf-container { 
                width: 100%; 
                height: 100vh; 
                background: white;
                border: 1px solid #ccc;
                border-radius: 8px;
                overflow: hidden;
              }
              embed { width: 100%; height: 100%; }
            </style>
          </head>
          <body>
            <div class="pdf-container">
              <embed src="data:application/pdf;base64,${pdfBase64}" type="application/pdf" />
            </div>
          </body>
          </html>
        `;
        
        // Создаем временный HTML файл
        const tempHtmlPath = path.join(path.dirname(outputPath), 'temp-pdf-viewer.html');
        fs.writeFileSync(tempHtmlPath, htmlContent);
        
        await page.goto(`file://${path.resolve(tempHtmlPath)}`);
        await page.waitForTimeout(5000);
        
        await page.screenshot({
          path: outputPath,
          fullPage: true,
          type: 'png'
        });
        
        // Удаляем временный файл
        fs.unlinkSync(tempHtmlPath);
        
        console.log(`✅ Скриншот PDF создан (альтернативный метод): ${outputPath}`);
        return true;
        
      } catch (altError) {
        console.error(`❌ Альтернативный метод также не сработал: ${altError}`);
        return false;
      }
    }
  }

  /**
   * Извлекает текст из PDF файла
   */
  static async extractTextFromPDF(pdfPath: string): Promise<{
    text: string;
    pages: number;
    hasUkrainianText: boolean;
    wordCount: number;
  }> {
    try {
      const pdfParse = await import('pdf-parse');
      const buffer = fs.readFileSync(pdfPath);
      const data = await pdfParse.default(buffer);
      
      const text = data.text || '';
      const hasUkrainianText = /[а-яёіїєґ]/i.test(text);
      const wordCount = text.split(/\s+/).filter(word => word.length > 0).length;
      
      return {
        text,
        pages: data.numpages || 0,
        hasUkrainianText,
        wordCount
      };
      
    } catch (error) {
      console.error(`Ошибка извлечения текста из PDF: ${error}`);
      return {
        text: '',
        pages: 0,
        hasUkrainianText: false,
        wordCount: 0
      };
    }
  }

  /**
   * Сравнивает содержимое двух PDF файлов
   */
  static async comparePDFContent(
    originalPath: string, 
    modifiedPath: string
  ): Promise<{
    originalText: string;
    modifiedText: string;
    textDifferences: string[];
    hasChanges: boolean;
    changesSummary: string;
  }> {
    const original = await this.extractTextFromPDF(originalPath);
    const modified = await this.extractTextFromPDF(modifiedPath);
    
    // Простое сравнение текста
    const originalWords = original.text.toLowerCase().split(/\s+/);
    const modifiedWords = modified.text.toLowerCase().split(/\s+/);
    
    const differences: string[] = [];
    
    // Ищем новые слова в измененном PDF
    modifiedWords.forEach(word => {
      if (word.length > 2 && !originalWords.includes(word)) {
        differences.push(`+ ${word}`);
      }
    });
    
    // Ищем удаленные слова
    originalWords.forEach(word => {
      if (word.length > 2 && !modifiedWords.includes(word)) {
        differences.push(`- ${word}`);
      }
    });
    
    const hasChanges = differences.length > 0;
    const changesSummary = hasChanges 
      ? `Найдено ${differences.length} изменений`
      : 'Изменений не обнаружено';
    
    return {
      originalText: original.text.substring(0, 500),
      modifiedText: modified.text.substring(0, 500),
      textDifferences: differences.slice(0, 10), // Первые 10 изменений
      hasChanges,
      changesSummary
    };
  }

  /**
   * Создает полный отчет сравнения PDF
   */
  static async createComparisonReport(
    page: Page,
    originalPath: string,
    modifiedPath: string,
    testName: string
  ): Promise<{
    reportPath: string;
    beforeScreenshot: string;
    afterScreenshot: string;
    success: boolean;
  }> {
    const timestamp = Date.now();
    const screenshotsDir = path.join(__dirname, '..', 'screenshots');
    
    const beforeScreenshot = path.join(screenshotsDir, `${testName}-before-${timestamp}.png`);
    const afterScreenshot = path.join(screenshotsDir, `${testName}-after-${timestamp}.png`);
    const reportPath = path.join(screenshotsDir, `${testName}-report-${timestamp}.html`);
    
    try {
      // Создаем скриншоты PDF
      console.log('📸 Создаем скриншот исходного PDF...');
      const beforeSuccess = await this.createPDFScreenshot(page, originalPath, beforeScreenshot);
      
      console.log('📸 Создаем скриншот измененного PDF...');
      const afterSuccess = await this.createPDFScreenshot(page, modifiedPath, afterScreenshot);
      
      // Анализируем содержимое
      const comparison = await this.comparePDFContent(originalPath, modifiedPath);
      
      // Создаем HTML отчет
      const reportHtml = `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PDF Comparison Report - ${testName}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 2.5em;
            font-weight: 300;
        }
        .comparison-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            padding: 30px;
        }
        .pdf-section {
            text-align: center;
        }
        .pdf-section h2 {
            margin: 0 0 20px 0;
            font-size: 1.5em;
        }
        .pdf-section.before h2 {
            color: #e74c3c;
        }
        .pdf-section.after h2 {
            color: #27ae60;
        }
        .pdf-image {
            width: 100%;
            max-width: 600px;
            height: auto;
            border: 3px solid #ecf0f1;
            border-radius: 10px;
            box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .analysis {
            padding: 30px;
            background: #f8f9fa;
            margin: 0;
        }
        .analysis h3 {
            color: #2c3e50;
            margin-bottom: 20px;
        }
        .changes-list {
            background: white;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #3498db;
        }
        .change-item {
            padding: 5px 0;
            font-family: monospace;
        }
        .change-item.added {
            color: #27ae60;
        }
        .change-item.removed {
            color: #e74c3c;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            padding: 30px;
        }
        .stat-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid #e9ecef;
        }
        .stat-card h4 {
            margin: 0 0 10px 0;
            color: #2c3e50;
        }
        .stat-card p {
            margin: 0;
            font-size: 1.2em;
            font-weight: bold;
            color: #3498db;
        }
        @media (max-width: 768px) {
            .comparison-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 PDF Comparison Report</h1>
            <p>Тест: ${testName}</p>
            <p>Дата: ${new Date().toLocaleString('ru-RU')}</p>
        </div>
        
        <div class="comparison-grid">
            <div class="pdf-section before">
                <h2>🔴 До изменений</h2>
                ${beforeSuccess ? `<img src="file://${path.resolve(beforeScreenshot)}" alt="PDF до изменений" class="pdf-image">` : '<p>Скриншот не создан</p>'}
                <p>Файл: ${path.basename(originalPath)}</p>
                <p>Размер: ${Math.round(fs.statSync(originalPath).size / 1024)} KB</p>
            </div>
            <div class="pdf-section after">
                <h2>🟢 После изменений</h2>
                ${afterSuccess ? `<img src="file://${path.resolve(afterScreenshot)}" alt="PDF после изменений" class="pdf-image">` : '<p>Скриншот не создан</p>'}
                <p>Файл: ${path.basename(modifiedPath)}</p>
                <p>Размер: ${Math.round(fs.statSync(modifiedPath).size / 1024)} KB</p>
            </div>
        </div>
        
        <div class="analysis">
            <h3>📝 Анализ изменений</h3>
            <p><strong>Статус:</strong> ${comparison.changesSummary}</p>
            
            ${comparison.textDifferences.length > 0 ? `
                <div class="changes-list">
                    <h4>Обнаруженные изменения:</h4>
                    ${comparison.textDifferences.map(change => {
                        const isAdded = change.startsWith('+');
                        const className = isAdded ? 'added' : 'removed';
                        return `<div class="change-item ${className}">${change}</div>`;
                    }).join('')}
                </div>
            ` : '<p>Текстовых изменений не обнаружено</p>'}
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <h4>📄 Исходный PDF</h4>
                <p>${Math.round(fs.statSync(originalPath).size / 1024)} KB</p>
            </div>
            <div class="stat-card">
                <h4>📄 Измененный PDF</h4>
                <p>${Math.round(fs.statSync(modifiedPath).size / 1024)} KB</p>
            </div>
            <div class="stat-card">
                <h4>🔄 Изменения</h4>
                <p>${comparison.textDifferences.length}</p>
            </div>
            <div class="stat-card">
                <h4>📸 Скриншоты</h4>
                <p>${(beforeSuccess && afterSuccess) ? '✅ Созданы' : '❌ Ошибка'}</p>
            </div>
        </div>
    </div>
</body>
</html>`;

      fs.writeFileSync(reportPath, reportHtml);
      
      return {
        reportPath,
        beforeScreenshot,
        afterScreenshot,
        success: beforeSuccess && afterSuccess
      };
      
    } catch (error) {
      console.error(`❌ Ошибка создания отчета: ${error}`);
      return {
        reportPath,
        beforeScreenshot,
        afterScreenshot,
        success: false
      };
    }
  }
}
