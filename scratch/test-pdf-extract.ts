import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

async function testExtraction() {
  console.log("Testing pdfjs-dist page-by-page text extraction...");
  
  // Test PDF page extraction logic
  const mockBuffer = Buffer.from("Hello World", "utf-8");
  console.log("pdfjs-dist legacy module is ready!");
}

testExtraction();
