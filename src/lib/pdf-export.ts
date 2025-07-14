import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export interface PdfExportOptions {
  documentTitle?: string;
  showToast?: boolean;
  margins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  format?: "a4" | "letter";
  orientation?: "portrait" | "landscape";
}

export async function exportToPdf(
  options: PdfExportOptions = {},
): Promise<void> {
  const {
    documentTitle = "document",
    showToast = true,
    margins = { top: 10, right: 10, bottom: 10, left: 10 },
    format = "a4",
    orientation = "portrait",
  } = options;

  const editorContent = document.querySelector<HTMLElement>(".ProseMirror");
  if (!editorContent) {
    if (showToast) {
      toast.error("Editor content not found");
    }
    throw new Error("Editor content not found");
  }

  if (showToast) {
    toast.loading("Generating PDF...");
  }

  const elementsToHide = document.querySelectorAll<HTMLElement>(".no-export");
  elementsToHide.forEach((el) => {
    el.style.display = "none";
  });

  try {
    // Create a clone of the editor content to avoid affecting the original
    const clonedEditor = editorContent.cloneNode(true) as HTMLElement;

    // Create a temporary container for the cloned content
    const tempContainer = document.createElement("div");
    tempContainer.style.position = "absolute";
    tempContainer.style.left = "-9999px";
    tempContainer.style.top = "-9999px";
    tempContainer.style.width = "816px"; // Match the editor width
    tempContainer.style.backgroundColor = "#ffffff";
    tempContainer.style.padding = "40px 56px"; // Match editor padding
    tempContainer.style.fontFamily = "inherit";
    tempContainer.style.fontSize = "inherit";
    tempContainer.style.lineHeight = "inherit";
    tempContainer.style.color = "#000000";

    // Style the cloned editor
    clonedEditor.style.minHeight = "auto";
    clonedEditor.style.height = "auto";
    clonedEditor.style.border = "none";
    clonedEditor.style.outline = "none";
    clonedEditor.style.boxShadow = "none";
    clonedEditor.style.width = "100%";

    tempContainer.appendChild(clonedEditor);
    document.body.appendChild(tempContainer);

    // Wait for fonts to load
    await document.fonts.ready;

    const canvas = await html2canvas(tempContainer, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: tempContainer.scrollWidth,
      height: tempContainer.scrollHeight,
      logging: false,
      allowTaint: true,
      imageTimeout: 10000,
      removeContainer: false,
      onclone: (clonedDoc) => {
        const clonedContainer = clonedDoc.querySelector(
          '[style*="position: absolute"]',
        );
        if (clonedContainer) {
          (clonedContainer as HTMLElement).style.position = "static";
          (clonedContainer as HTMLElement).style.left = "auto";
          (clonedContainer as HTMLElement).style.top = "auto";
        }
      },
    });

    // Clean up temp container
    document.body.removeChild(tempContainer);

    const imgData = canvas.toDataURL("image/png", 1.0);
    const pdf = new jsPDF({
      orientation: orientation === "portrait" ? "p" : "l",
      unit: "mm",
      format: format,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    // Calculate content area after margins
    const contentWidth = pdfWidth - margins.left - margins.right;
    const contentHeight = pdfHeight - margins.top - margins.bottom;

    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const ratio = canvasWidth / canvasHeight;

    // Calculate image dimensions to fit within content area
    const imgWidth = contentWidth;
    const imgHeight = imgWidth / ratio;

    // If image is taller than one page, we need to split it
    if (imgHeight > contentHeight) {
      // Calculate how many pages we need
      const pageScale = contentWidth / canvasWidth;
      const scaledCanvasHeight = canvasHeight * pageScale;
      const pagesNeeded = Math.ceil(scaledCanvasHeight / contentHeight);

      for (let i = 0; i < pagesNeeded; i++) {
        if (i > 0) {
          pdf.addPage();
        }

        // Calculate the portion of the canvas to show on this page
        const sourceY = (i * contentHeight) / pageScale;
        const sourceHeight = Math.min(
          contentHeight / pageScale,
          canvasHeight - sourceY,
        );

        // Create a canvas for this page
        const pageCanvas = document.createElement("canvas");
        const pageCtx = pageCanvas.getContext("2d");
        pageCanvas.width = canvasWidth;
        pageCanvas.height = sourceHeight;

        if (pageCtx) {
          pageCtx.drawImage(
            canvas,
            0,
            sourceY,
            canvasWidth,
            sourceHeight,
            0,
            0,
            canvasWidth,
            sourceHeight,
          );
          const pageImgData = pageCanvas.toDataURL("image/png", 1.0);
          pdf.addImage(
            pageImgData,
            "PNG",
            margins.left,
            margins.top,
            contentWidth,
            sourceHeight * pageScale,
          );
        }
      }
    } else {
      // Single page
      pdf.addImage(
        imgData,
        "PNG",
        margins.left,
        margins.top,
        imgWidth,
        imgHeight,
      );
    }

    const fileName = `${documentTitle.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim() || "document"}.pdf`;
    pdf.save(fileName);

    if (showToast) {
      toast.success("PDF exported successfully!");
    }
  } catch (error) {
    console.error("Error exporting to PDF:", error);
    if (showToast) {
      toast.error("Failed to export PDF. Please try again.");
    }
    throw error;
  } finally {
    elementsToHide.forEach((el) => {
      el.style.display = "";
    });
  }
}

export function getDocumentTitle(): string {
  // Try to get document title from various sources
  const titleSelectors = [
    'h1[contenteditable="true"]',
    'input[type="text"]',
    "h1",
    "[data-document-title]",
    "title",
  ];

  for (const selector of titleSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      const title = element.textContent ?? (element as HTMLInputElement).value;
      if (title?.trim()) {
        return title.trim();
      }
    }
  }

  return "document";
}
