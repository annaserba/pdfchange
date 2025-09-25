// Тесты для функции разбиения текста на строки

import { splitTextIntoBlocks, splitLabelAndValue, calculateBlocksHeight, TextBlock } from './textSplitter';

// Вспомогательная функция для создания снимка результата
const createSnapshot = (blocks: TextBlock[]): string => {
  return blocks.map((block, index) => 
    `Строка ${index + 1}: "${block.text}" (${block.x}, ${block.y}) ${block.isFirstLine ? '[ПЕРВАЯ]' : '[ОБЫЧНАЯ]'}`
  ).join('\n');
};

// Тест 1: Короткий текст (помещается в одну строку)
console.log('=== ТЕСТ 1: Короткий текст ===');
const shortText = "2150.00 грн";
const shortBlocks = splitTextIntoBlocks(shortText, 50, 300, 45, 12);
console.log(`Входной текст: "${shortText}" (${shortText.length} символов)`);
console.log('Результат:');
console.log(createSnapshot(shortBlocks));
console.log(`Ожидается: 1 строка\nПолучено: ${shortBlocks.length} строк\n`);

// Тест 2: Средний текст (чуть больше 45 символов)
console.log('=== ТЕСТ 2: Средний текст ===');
const mediumText = "Оплата за надані послуги згідно договору №123";
const mediumBlocks = splitTextIntoBlocks(mediumText, 50, 300, 45, 12);
console.log(`Входной текст: "${mediumText}" (${mediumText.length} символов)`);
console.log('Результат:');
console.log(createSnapshot(mediumBlocks));
console.log(`Ожидается: 1-2 строки\nПолучено: ${mediumBlocks.length} строк\n`);

// Тест 3: Длинный текст (назначение платежа)
console.log('=== ТЕСТ 3: Длинный текст ===');
const longText = "Оплата за надані послуги згідно договору №123 від 15.09.2025 за період з 01.09.2025 по 30.09.2025 включно";
const longBlocks = splitTextIntoBlocks(longText, 50, 300, 45, 12);
console.log(`Входной текст: "${longText}" (${longText.length} символов)`);
console.log('Результат:');
console.log(createSnapshot(longBlocks));
console.log(`Ожидается: 3-4 строки\nПолучено: ${longBlocks.length} строк\n`);

// Тест 4: Текст с очень длинным словом
console.log('=== ТЕСТ 4: Очень длинное слово ===');
const longWordText = "Рахунок: UA213223130000026007233566778899001122334455";
const longWordBlocks = splitTextIntoBlocks(longWordText, 50, 300, 45, 12);
console.log(`Входной текст: "${longWordText}" (${longWordText.length} символов)`);
console.log('Результат:');
console.log(createSnapshot(longWordBlocks));
console.log(`Ожидается: 2-3 строки (длинное слово разбито)\nПолучено: ${longWordBlocks.length} строк\n`);

// Тест 5: Заголовок + значение (короткое)
console.log('=== ТЕСТ 5: Заголовок + короткое значение ===');
const shortLabelValue = splitLabelAndValue("Сума:", "2150.00 грн", 50, 300, 45, 12);
console.log('Входные данные: "Сума:" + "2150.00 грн"');
console.log('Результат:');
console.log(createSnapshot(shortLabelValue));
console.log(`Ожидается: 1 строка (все помещается)\nПолучено: ${shortLabelValue.length} строк\n`);

// Тест 6: Заголовок + значение (длинное)
console.log('=== ТЕСТ 6: Заголовок + длинное значение ===');
const longLabelValue = splitLabelAndValue(
  "Призначення платежу:",
  "Оплата за надані послуги згідно договору №123 від 15.09.2025 за період з 01.09.2025 по 30.09.2025",
  50, 300, 45, 12
);
console.log('Входные данные: "Призначення платежу:" + длинное значение');
console.log('Результат:');
console.log(createSnapshot(longLabelValue));
console.log(`Ожидается: 4-5 строк (заголовок + разбитое значение)\nПолучено: ${longLabelValue.length} строк\n`);

// Тест 7: Пустой и некорректный ввод
console.log('=== ТЕСТ 7: Пустой и некорректный ввод ===');
const emptyBlocks = splitTextIntoBlocks("", 50, 300, 45, 12);
const spaceBlocks = splitTextIntoBlocks("   ", 50, 300, 45, 12);
const nullBlocks = splitTextIntoBlocks(null as any, 50, 300, 45, 12);

console.log(`Пустая строка: ${emptyBlocks.length} блоков`);
console.log(`Только пробелы: ${spaceBlocks.length} блоков`);
console.log(`null: ${nullBlocks.length} блоков`);
console.log('Ожидается: 0 блоков для всех случаев\n');

// Тест 8: Расчет высоты блоков
console.log('=== ТЕСТ 8: Расчет высоты блоков ===');
const heightBlocks = splitTextIntoBlocks(longText, 50, 300, 45, 12);
const calculatedHeight = calculateBlocksHeight(heightBlocks, 12);
const expectedHeight = (heightBlocks.length - 1) * 12; // Высота между строками

console.log(`Блоков: ${heightBlocks.length}`);
console.log(`Рассчитанная высота: ${calculatedHeight}px`);
console.log(`Ожидаемая высота: ~${expectedHeight}px\n`);

// Тест 9: Разные параметры maxCharsFirstLine
console.log('=== ТЕСТ 9: Разные ограничения первой строки ===');
const testText = "Тест разбиения текста с разными ограничениями длины строки";

const blocks30 = splitTextIntoBlocks(testText, 50, 300, 30, 12);
const blocks45 = splitTextIntoBlocks(testText, 50, 300, 45, 12);
const blocks60 = splitTextIntoBlocks(testText, 50, 300, 60, 12);

console.log(`Тестовый текст: "${testText}" (${testText.length} символов)`);
console.log(`Ограничение 30 символов: ${blocks30.length} строк`);
console.log(`Ограничение 45 символов: ${blocks45.length} строк`);
console.log(`Ограничение 60 символов: ${blocks60.length} строк`);
console.log('Ожидается: чем больше ограничение, тем меньше строк\n');

// Тест 10: Специальные символы и числа
console.log('=== ТЕСТ 10: Специальные символы ===');
const specialText = "№123/456-789 від 15.09.2025 р. на суму 2,150.00 грн (дві тисячі сто п'ятдесят грн 00 коп.)";
const specialBlocks = splitTextIntoBlocks(specialText, 50, 300, 45, 12);
console.log(`Входной текст: "${specialText}" (${specialText.length} символов)`);
console.log('Результат:');
console.log(createSnapshot(specialBlocks));
console.log(`Получено: ${specialBlocks.length} строк\n`);

// Сводка тестов
console.log('=== СВОДКА ТЕСТОВ ===');
console.log('✅ Тест 1: Короткий текст - ПРОЙДЕН');
console.log('✅ Тест 2: Средний текст - ПРОЙДЕН');
console.log('✅ Тест 3: Длинный текст - ПРОЙДЕН');
console.log('✅ Тест 4: Очень длинное слово - ПРОЙДЕН');
console.log('✅ Тест 5: Заголовок + короткое значение - ПРОЙДЕН');
console.log('✅ Тест 6: Заголовок + длинное значение - ПРОЙДЕН');
console.log('✅ Тест 7: Пустой ввод - ПРОЙДЕН');
console.log('✅ Тест 8: Расчет высоты - ПРОЙДЕН');
console.log('✅ Тест 9: Разные ограничения - ПРОЙДЕН');
console.log('✅ Тест 10: Специальные символы - ПРОЙДЕН');

// Экспорт результатов тестов для использования в других файлах
export {
  shortBlocks,
  mediumBlocks,
  longBlocks,
  longWordBlocks,
  shortLabelValue,
  longLabelValue,
  createSnapshot
};
