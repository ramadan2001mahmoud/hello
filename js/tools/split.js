// ============================================
// تقسيم PDF
// ============================================
async function doSplit() {
    updateProgress(10, 'جاري التقسيم...');
    const { PDFDocument } = PDFLib;
    const buf = await readFileAB(files[0]);
    const src = await PDFDocument.load(buf);
    const total = src.getPageCount();
    resultBlobs = [];
    for (let i = 0; i < total; i++) {
        updateProgress(10 + (i / total) * 70, 'صفحة ' + (i + 1) + ' من ' + total);
        const np = await PDFDocument.create();
        const pp = await np.copyPages(src, [i]);
        pp.forEach(p => np.addPage(p));
        const b = await np.save();
        resultBlobs.push({ blob: new Blob([b], { type: 'application/pdf' }), name: 'صفحة_' + (i + 1) + '.pdf' });
    }
    if (resultBlobs.length > 0) resultBlob = resultBlobs[0].blob;
    updateProgress(100, 'تم التقسيم!');
    showResult('<p>تم تقسيم ' + total + ' صفحات</p>', 'صفحة_1.pdf');
}
