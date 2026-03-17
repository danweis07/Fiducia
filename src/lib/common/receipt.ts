export interface TransferReceipt {
  transferId: string;
  fromAccount: string;
  toAccount: string;
  amountFormatted: string;
  memo?: string;
  date: string;
  status: string;
}

export function downloadTransferReceipt(receipt: TransferReceipt): void {
  // Generate a clean text receipt
  const lines = [
    "═══════════════════════════════════════",
    "         TRANSFER CONFIRMATION         ",
    "═══════════════════════════════════════",
    "",
    `Transfer ID:   ${receipt.transferId}`,
    `Date:          ${receipt.date}`,
    `Status:        ${receipt.status}`,
    "",
    `From:          ${receipt.fromAccount}`,
    `To:            ${receipt.toAccount}`,
    `Amount:        ${receipt.amountFormatted}`,
    ...(receipt.memo ? [`Memo:          ${receipt.memo}`] : []),
    "",
    "═══════════════════════════════════════",
    "This is an electronic transfer receipt.",
    "═══════════════════════════════════════",
  ];
  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transfer-${receipt.transferId}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
