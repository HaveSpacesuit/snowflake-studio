import { PRINT_CONFIG, type PrintPaperSize } from "./config.ts";

const CSS_PIXELS_PER_MM = 96 / 25.4;

function makeInstructionsFilename() {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  const stamp =
    `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-` +
    `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `snowflake-instructions-${stamp}.pdf`;
}

export async function saveInstructionsPdf(printSheet: HTMLElement, paperSize: PrintPaperSize) {
  const paper = PRINT_CONFIG.paperSizes[paperSize];
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf")
  ]);
  await document.fonts?.ready;

  const canvas = await html2canvas(printSheet, {
    backgroundColor: "#ffffff",
    logging: false,
    scale: 2,
    useCORS: true,
    windowWidth: Math.ceil(paper.widthMm * CSS_PIXELS_PER_MM),
    windowHeight: Math.ceil(paper.heightMm * CSS_PIXELS_PER_MM),
    onclone: (clonedDocument) => {
      const clonedSheet = clonedDocument.querySelector<HTMLElement>("[data-print-sheet]");
      if (!clonedSheet) throw new Error("Print sheet was not found in the cloned document.");
      clonedSheet.classList.add("printSheet--capture");
    }
  });

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: [paper.widthMm, paper.heightMm],
    compress: true
  });
  pdf.addImage(canvas, "PNG", 0, 0, paper.widthMm, paper.heightMm, undefined, "FAST");

  const filename = makeInstructionsFilename();
  pdf.save(filename);
  return filename;
}
