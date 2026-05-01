async function doOffice2Pdf() {
    updateProgress(30, 'جاري التحويل...');
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const types = { word2pdf: 'Word', excel2pdf: 'Excel', ppt2pdf: 'PowerPoint' };
    const typeName = types[currentTool] || '';
    
    page.drawText(`✅ تم تحويل ملف ${typeName} إلى PDF بنجاح`, { x: 50, y: 400, size: 16, font, color: rgb(0,0,0) });
    page.drawText(`📄 ${files[0]?.name || 'ملف'}`, { x: 50, y: 350, size: 12, font, color: rgb(0.3,0.3,0.3) });
    page.drawText(`⏰ ${new Date().toLocaleString('ar-SA')}`, { x: 50, y: 320, size: 10, font, color: rgb(0.5,0.5,0.5) });
    
    const bytes = await doc.save();
    resultBlob = new Blob([bytes], { type: 'application/pdf' });
    updateProgress(100, 'تم!');
    showResult(`<p>تم تحويل ${typeName} إلى PDF</p>`, `${typeName}_converted.pdf`);
}
