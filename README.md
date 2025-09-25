# PDF Receipt Editor

A TypeScript React application for editing PDF payment receipts. Upload a PDF receipt, modify the payment data fields, and download the modified PDF with updated information.

## Features

- 📄 PDF file upload with drag & drop support
- ✏️ Editable form fields for all payment data
- 💾 Download modified PDF with updated information
- 🎨 Modern, responsive UI design
- 🔒 Client-side processing (no data sent to servers)

## Payment Fields Supported

- Відправник (Sender)
- Банк платника (Payer Bank)
- Код банку (Bank Code)
- ЄДРПОУ платника (Payer EDRPOU)
- Код квитанції (Receipt Code)
- Сплачено (Payment Date)
- Дата валютування (Value Date)
- Рахунок відправника (Sender Account)
- Одержувач (Recipient)
- Банк одержувача (Recipient Bank)
- ЄДРПОУ одержувача (Recipient EDRPOU)
- Рахунок одержувача (Recipient Account)
- Призначення платежу (Payment Purpose)
- Сума (Amount)
- Сума комісії (Commission Amount)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:3000`

## Usage

1. **Upload PDF**: Drag and drop a PDF receipt file or click to select one
2. **Edit Fields**: Modify any of the payment data fields as needed
3. **Download**: Click "Завантажити модифікований PDF" to download the modified PDF

## Technologies Used

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **pdf-lib** - PDF manipulation library
- **Lucide React** - Icons
- **CSS3** - Modern styling with gradients and animations

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Browser Support

- Chrome/Chromium 88+
- Firefox 85+
- Safari 14+
- Edge 88+

## Notes

- All PDF processing is done client-side for privacy
- The application works best with structured PDF receipts
- Text positioning may need adjustment for different PDF layouts
