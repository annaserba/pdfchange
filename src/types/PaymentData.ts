export interface PaymentData {
  sender: string;
  payerBank: string;
  bankCode: string;
  edrpouPayer: string;
  receiptCode: string;
  paymentDate: string;
  valueDate: string;
  senderAccount: string;
  recipient: string;
  recipientBank: string;
  edrpouRecipient: string;
  recipientAccount: string;
  paymentPurpose: string;
  amount: string;
  commissionAmount: string;
  paidAmount: string;
}
