import fs from 'fs';
import path from 'path';

// Простая утилита для проверки PDF без внешних зависимостей
export class PDFChecker {
  
  static async checkPDFContent(filePath: string): Promise<{
    isValidPDF: boolean;
    size: number;
    hasUkrainianText: boolean;
    extractedText: string;
    containsText: (text: string) => boolean;
  }> {
    try {
      // Проверяем существование файла
      if (!fs.existsSync(filePath)) {
        throw new Error(`Файл не найден: ${filePath}`);
      }

      // Читаем файл
      const buffer = fs.readFileSync(filePath);
      const size = buffer.length;
      
      // Проверяем PDF заголовок
      const header = buffer.slice(0, 8).toString();
      const isValidPDF = header.startsWith('%PDF-');
      
      // Извлекаем текст из PDF (простой метод)
      const pdfString = buffer.toString('latin1');
      
      // Ищем текстовые объекты в PDF
      const textMatches = pdfString.match(/\(([^)]+)\)/g) || [];
      const extractedText = textMatches
        .map(match => match.slice(1, -1)) // Убираем скобки
        .filter(text => text.length > 1)
        .join(' ');

      // Проверяем наличие украинских символов
      const ukrainianRegex = /[а-яёіїєґ]/i;
      const hasUkrainianText = ukrainianRegex.test(extractedText);

      // Функция для проверки содержания текста
      const containsText = (searchText: string): boolean => {
        return extractedText.toLowerCase().includes(searchText.toLowerCase()) ||
               pdfString.toLowerCase().includes(searchText.toLowerCase());
      };

      return {
        isValidPDF,
        size,
        hasUkrainianText,
        extractedText: extractedText.substring(0, 500), // Первые 500 символов
        containsText
      };

    } catch (error) {
      console.error('Ошибка при проверке PDF:', error);
      return {
        isValidPDF: false,
        size: 0,
        hasUkrainianText: false,
        extractedText: '',
        containsText: () => false
      };
    }
  }

  static async comparePDFs(originalPath: string, modifiedPath: string): Promise<{
    originalSize: number;
    modifiedSize: number;
    sizeDifference: number;
    bothValid: boolean;
    hasChanges: boolean;
  }> {
    const original = await this.checkPDFContent(originalPath);
    const modified = await this.checkPDFContent(modifiedPath);

    return {
      originalSize: original.size,
      modifiedSize: modified.size,
      sizeDifference: Math.abs(modified.size - original.size),
      bothValid: original.isValidPDF && modified.isValidPDF,
      hasChanges: original.extractedText !== modified.extractedText
    };
  }
}
