// ============================================
// دمج PDF
// ============================================
async function doMerge() {
    if (files.length < 2) { showToast('ارفع ملفين على الاقل', 'error'); hideProgress(); return; }
    updateProgress(10, 'جاري الدمج...');
    const { PDFDocument } = PDFLib;
    const merged = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
        updateProgress(10 + (i / files.length) * 60, 'ملف ' + (i + 1) + ' من ' + files.length);
        const buf = await readFileAB(files[i]);
        const pdf = await PDFDocument.load(buf);
        const pages = await merged.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(p => merged.addPage(p));
    }
    const bytes = await merged.save();
    resultBlob = new Blob([bytes], { type: 'application/pdf' });
    updateProgress(100, 'تم الدمج!');
    showResult('<p>تم دمج ' + files.length + ' ملفات</p>', 'merged.pdf');
}
