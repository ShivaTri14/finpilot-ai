import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

async function testPdfJsNode() {
  console.log("Testing pdfjs-dist in Node.js...");
  try {
    if (pdfjs.GlobalWorkerOptions) {
      pdfjs.GlobalWorkerOptions.workerSrc = "";
    }
    console.log("pdfjs-dist workerSrc initialized successfully!");
  } catch (err: any) {
    console.error("pdfjs-dist error:", err);
  }
}

testPdfJsNode();
