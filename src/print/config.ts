export const PRINT_CONFIG = {
  supportedSideCount: 6,
  trisectAngleDeg: 15,
  cutEdgeInsetMm: 2.54,
  previewPaddingRatio: 0.01,
  paperSizes: {
    letter: {
      widthMm: 215.9,
      heightMm: 279.4
    },
    a4: {
      widthMm: 210,
      heightMm: 297
    }
  }
} as const;

export type PrintPaperSize = keyof typeof PRINT_CONFIG.paperSizes;

export const DEFAULT_PRINT_PAPER_SIZE: PrintPaperSize = "letter";

export function isPrintPaperSize(value: string): value is PrintPaperSize {
  return value === "letter" || value === "a4";
}

export function normalizePrintPaperSize(value: string): PrintPaperSize {
  return isPrintPaperSize(value) ? value : DEFAULT_PRINT_PAPER_SIZE;
}
