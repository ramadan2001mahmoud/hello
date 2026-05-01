// ============================================
// توقيع إلكتروني
// ============================================
async function doSignature() {
    if (!sigPad || sigPad.isEmpty()) { showToast('ارسم توقيعك اولا', 'error'); hideProgress(); return; }
    updateProgress(30, 'جاري اضافة التوقيع...');
    try {
        const sigURL = sigPad.toDataURL();
        const res = await fetch(sigURL);
        const sigBuf = await res.arrayBuffer();
        const { PDFDocument } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdf = await PDFDocument.load(buf);
        const sigImg = await pdf.embedPng(sigBuf);
        const page = pdf.getPages()[pdf.getPages().length - 1];
        page.drawImage(sigImg, { x: page.getWidth() - 200, y: 50, width: 150, height: 60 });
        const bytes = await pdf.save();
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تمت اضافة التوقيع!');
        showResult('<p>تمت اضافة التوقيع الالكتروني</p>', 'signed.pdf');
    } catch (e) {
        hideProgress();
        showToast('خطا: ' + e.message, 'error');
    }
}
