import React, { useState, useRef } from 'react';
import { Upload, Download, Loader } from 'lucide-react';
import { PaymentData, generateReceiptPDF, downloadPDF, extractDataFromPDF } from './pdfGenerator';

// Простая система toast-уведомлений
const toast = {
  success: (message: string) => {
    // Создаем toast элемент
    const toastEl = document.createElement('div');
    toastEl.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #10b981;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        max-width: 400px;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
      ">
        ✅ ${message}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;
    document.body.appendChild(toastEl);
    setTimeout(() => document.body.removeChild(toastEl), 4000);
  },
  error: (message: string) => {
    const toastEl = document.createElement('div');
    toastEl.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ef4444;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        max-width: 400px;
        font-size: 14px;
        animation: slideIn 0.3s ease-out;
      ">
        ❌ ${message}
      </div>
      <style>
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `;
    document.body.appendChild(toastEl);
    setTimeout(() => document.body.removeChild(toastEl), 5000);
  }
};

const initialData: PaymentData = {
  sender: '',
  payerBank: '',
  bankCode: '',
  edrpouPayer: '',
  receiptCode: '',
  paymentDate: '',
  valueDate: '',
  senderAccount: '',
  recipient: '',
  recipientBank: '',
  edrpouRecipient: '',
  recipientAccount: '',
  paymentPurpose: '',
  amount: '',
  commissionAmount: ''
};

function App() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null);
  const [formData, setFormData] = useState<PaymentData>(initialData);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (file: File) => {
    if (file.type !== 'application/pdf') {
      toast.error('Будь ласка, завантажте PDF файл');
      return;
    }

    setIsLoading(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      // Создаем независимую копию данных
      const bytesCopy = new Uint8Array(bytes.length);
      bytesCopy.set(bytes);
      
      // Проверяем, что файл действительно является PDF
      const pdfHeader = new TextDecoder().decode(bytesCopy.slice(0, 8));
      if (!pdfHeader.startsWith('%PDF-')) {
        throw new Error('Файл не є коректним PDF документом');
      }
      
      setPdfBytes(bytesCopy);
      setPdfFile(file);
      
      // Извлекаем данные из PDF и заполняем форму
      toast.success('Завантажуємо PDF та витягуємо дані...');
      
      const extractedData = await extractDataFromPDF(bytesCopy);
      
      // Обновляем форму извлеченными данными
      setFormData(prevData => ({
        ...prevData,
        ...extractedData
      }));
      
      const extractedFieldsCount = Object.keys(extractedData).length;
      if (extractedFieldsCount > 0) {
        toast.success(`PDF файл успішно завантажено! Витягнуто ${extractedFieldsCount} полів. Тепер ви можете редагувати дані.`);
      } else {
        toast.success('PDF файл успішно завантажено! Не вдалося автоматично витягти дані - заповніть поля вручну.');
      }
    } catch (err) {
      console.error('File upload error:', err);
      
      if (err instanceof Error) {
        if (err.message.includes('No PDF header found') || err.message.includes('Failed to parse PDF')) {
          toast.error('Файл пошкоджений або не є коректним PDF документом. Спробуйте інший файл.');
        } else if (err.message.includes('не є коректним PDF')) {
          toast.error(err.message);
        } else {
          toast.error(`Помилка при обробці файлу: ${err.message}`);
        }
      } else {
        toast.error('Невідома помилка при завантаженні файлу');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleInputChange = (field: keyof PaymentData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const clearForm = () => {
    setFormData(initialData);
    setPdfFile(null);
    setPdfBytes(null);
    toast.success('Форма очищена. Можете завантажити новий PDF або заповнити поля вручну.');
  };

  const downloadModifiedPDF = async () => {
    setIsLoading(true);

    try {
      // Проверяем, есть ли данные для создания PDF
      const hasData = Object.values(formData).some(value => value.trim() !== '');
      
      if (!hasData && !pdfBytes) {
        toast.error('Заповніть хоча б одне поле або завантажте PDF файл');
        return;
      }

      const fileName = pdfFile?.name 
        ? `modified_${pdfFile.name}` 
        : 'receipt.pdf';
        
      const result = await generateReceiptPDF(formData, pdfBytes || undefined);
      
      if (result.success && result.blob) {
        downloadPDF(result.blob, fileName);
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      toast.error(`Помилка при створенні PDF файлу: ${err instanceof Error ? err.message : 'Невідома помилка'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>PDF Receipt Editor</h1>
        <p>Завантажте PDF квитанцію - система автоматично витягне дані та заповнить форму</p>
      </div>


      <div 
        className={`upload-section ${isLoading ? 'loading' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload size={48} className="upload-icon" />
        <div className="upload-text">
          {pdfFile ? `Завантажено: ${pdfFile.name}` : 'Перетягніть PDF файл сюди або клікніть для вибору'}
        </div>
        <div className="upload-subtext">
          Підтримуються тільки PDF файли
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          className="file-input"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
      </div>

      <div className="form-section">
        <div className="form-group">
          <label>Відправник:</label>
          <input
            type="text"
            value={formData.sender}
            onChange={(e) => handleInputChange('sender', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Банк платника:</label>
          <input
            type="text"
            value={formData.payerBank}
            onChange={(e) => handleInputChange('payerBank', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Код банку:</label>
          <input
            type="text"
            value={formData.bankCode}
            onChange={(e) => handleInputChange('bankCode', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>ЄДРПОУ платника:</label>
          <input
            type="text"
            value={formData.edrpouPayer}
            onChange={(e) => handleInputChange('edrpouPayer', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Код квитанції:</label>
          <input
            type="text"
            value={formData.receiptCode}
            onChange={(e) => handleInputChange('receiptCode', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Сплачено:</label>
          <input
            type="text"
            value={formData.paymentDate}
            onChange={(e) => handleInputChange('paymentDate', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Дата валютування:</label>
          <input
            type="text"
            value={formData.valueDate}
            onChange={(e) => handleInputChange('valueDate', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Рахунок відправника:</label>
          <input
            type="text"
            value={formData.senderAccount}
            onChange={(e) => handleInputChange('senderAccount', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Одержувач:</label>
          <textarea
            value={formData.recipient}
            onChange={(e) => handleInputChange('recipient', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Банк одержувача:</label>
          <textarea
            value={formData.recipientBank}
            onChange={(e) => handleInputChange('recipientBank', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>ЄДРПОУ одержувача:</label>
          <input
            type="text"
            value={formData.edrpouRecipient}
            onChange={(e) => handleInputChange('edrpouRecipient', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Рахунок одержувача:</label>
          <input
            type="text"
            value={formData.recipientAccount}
            onChange={(e) => handleInputChange('recipientAccount', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Призначення платежу:</label>
          <textarea
            value={formData.paymentPurpose}
            onChange={(e) => handleInputChange('paymentPurpose', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Сума:</label>
          <input
            type="text"
            value={formData.amount}
            onChange={(e) => handleInputChange('amount', e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Сума комісії:</label>
          <input
            type="text"
            value={formData.commissionAmount}
            onChange={(e) => handleInputChange('commissionAmount', e.target.value)}
          />
        </div>
      </div>

      <div className="download-section">
        <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            className="button"
            onClick={downloadModifiedPDF}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader size={20} className="animate-spin" />
                Обробка...
              </>
            ) : (
              <>
                <Download size={20} />
                {pdfFile ? 'Завантажити відредагований PDF' : 'Створити та завантажити PDF'}
              </>
            )}
          </button>
          
          <button
            className="button"
            onClick={clearForm}
            disabled={isLoading}
            style={{ 
              background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
              minWidth: '150px'
            }}
          >
            Очистити форму
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
