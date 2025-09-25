// Главный файл PDF генератора - экспортирует все необходимые функции и типы

// Экспорт типов
export type { PaymentData } from './types/PaymentData';

// Экспорт основной функции генерации
export { generateReceiptPDF } from './components/PDFGenerator';

// Экспорт утилит
export { downloadPDF } from './utils/pdfUtils';
export { parseReceiptText } from './utils/textParser';
export { extractDataWithPositionsFromPDF, extractDataFromPDF } from './utils/pdfExtractor';
export { splitTextIntoBlocks, splitLabelAndValue, calculateBlocksHeight } from './utils/textSplitter';
export type { TextBlock } from './utils/textSplitter';
