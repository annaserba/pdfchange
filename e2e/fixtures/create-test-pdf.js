// Скрипт для создания тестового PDF файла
const fs = require('fs');
const path = require('path');

// Простой PDF контент (минимальный валидный PDF)
const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 200
>>
stream
BT
/F1 12 Tf
50 750 Td
(Відправник: Кучеренко Євгеній) Tj
0 -20 Td
(Одержувач: Іванов Іван) Tj
0 -20 Td
(Сума: 1500.00 грн) Tj
0 -20 Td
(Призначення платежу: Оплата за послуги) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000053 00000 n 
0000000125 00000 n 
0000000348 00000 n 
0000000565 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
640
%%EOF`;

// Создаем директорию fixtures если её нет
const fixturesDir = path.join(__dirname);
if (!fs.existsSync(fixturesDir)) {
  fs.mkdirSync(fixturesDir, { recursive: true });
}

// Создаем тестовый PDF файл
const pdfPath = path.join(fixturesDir, 'test-receipt.pdf');
fs.writeFileSync(pdfPath, pdfContent);

console.log('Тестовый PDF файл создан:', pdfPath);
console.log('Размер файла:', fs.statSync(pdfPath).size, 'байт');
