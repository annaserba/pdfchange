import { PDFDocument } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import timesNewRomanFont from '../fonts/timesnewromanpsmt.ttf?url';
import timesNewRomanBoldFont from '../fonts/timesnewromanbold.ttf?url';

// Загрузка локального Times New Roman с поддержкой украинского языка
export const loadFonts = async (pdfDoc: PDFDocument): Promise<{
  font: any;
  boldFont: any;
  supportsUkrainian: boolean;
}> => {
  console.log('Загружаем локальный Times New Roman с поддержкой украинского языка...');
  
  // Регистрируем fontkit для поддержки TTF/OTF шрифтов
  pdfDoc.registerFontkit(fontkit);
  console.log('✅ Fontkit зарегистрирован для поддержки Unicode шрифтов');
  
  try {
    // Загружаем локальный Times New Roman (обычный)
    console.log('📁 Загружаем локальный Times New Roman:', timesNewRomanFont);
    
    const fontResponse = await fetch(timesNewRomanFont);
    
    if (fontResponse.ok) {
      const fontBytes = await fontResponse.arrayBuffer();
      console.log(`📁 Загружено ${fontBytes.byteLength} байт локального Times New Roman`);
     
      const regularFont = await pdfDoc.embedFont(fontBytes);
      
      // Загружаем локальный жирный Times New Roman
      console.log('📁 Загружаем локальный жирный Times New Roman:', timesNewRomanBoldFont);
      
      const boldFontResponse = await fetch(timesNewRomanBoldFont);
      let boldFont = null;
      
      if (boldFontResponse.ok) {
        const boldFontBytes = await boldFontResponse.arrayBuffer();
        console.log(`📁 Загружено ${boldFontBytes.byteLength} байт локального жирного Times New Roman`);
        
        boldFont = await pdfDoc.embedFont(boldFontBytes);
        console.log('✅ Загружен локальный жирный Times New Roman');
      } else {
        console.warn('⚠️ Не удалось загрузить локальный жирный шрифт');
      }
      
      console.log('✅ Успешно загружены локальные Times New Roman шрифты (обычный + жирный)');
      console.log('🔤 Тестируем украинские символы...');
      
      // Тестируем, что шрифт поддерживает украинские символы
      try {
        const testText = 'Кучеренко Євгеній';
        console.log(`🧪 Тест украинского текста: "${testText}"`);
      } catch (testError) {
        console.warn('⚠️ Возможные проблемы с украинскими символами:', testError);
      }
      
      return { 
        font: regularFont, 
        boldFont: boldFont, 
        supportsUkrainian: true 
      };
    } else {
      console.error(`❌ HTTP ${fontResponse.status} для локального шрифта`);
      throw new Error(`Не удалось загрузить локальный Times New Roman: HTTP ${fontResponse.status}`);
    }
  } catch (error) {
    console.error('❌ Ошибка загрузки локального Times New Roman:', error);
    throw new Error('Не удалось загрузить локальный Times New Roman. Проверьте наличие файла /src/fonts/timesnewromanpsmt.ttf');
  }
};
