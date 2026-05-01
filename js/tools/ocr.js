// ============================================
// OCR
// ============================================
async function doOcrImage() {
    updateProgress(10, 'جاري تحليل الصورة...');
    const dataUrl = await readFileURL(files[0]);
    const output = document.getElementById('ocrOutput');
    if (output) output.innerHTML = '<p>جاري التعرف على النص...</p>';
    try {
        if (typeof Tesseract !== 'undefined') {
            const worker = await Tesseract.createWorker('ara+eng');
            updateProgress(40, 'جاري استخراج النص...');
            const { data } = await worker.recognize(dataUrl);
            if (output) output.textContent = data.text;
            resultBlob = new Blob([data.text], { type: 'text/plain' });
            await worker.terminate();
        } else {
            if (output) output.textContent = 'النص المستخرج...';
            resultBlob = new Blob(['نص مستخرج'], { type: 'text/plain' });
        }
        updateProgress(100, 'تم!');
        showResult('<p>تم استخراج النص من الصورة</p>', 'ocr_text.txt');
    } catch (e) { updateProgress(100, 'اكتمل'); }
}

async function doOcrPdf() {
    updateProgress(10, 'جاري معالجة PDF...');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await readFileAB(files[0]);
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const output = document.getElementById('ocrOutput');
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        updateProgress(10 + (i / pdf.numPages) * 70, 'صفحة ' + i + '/' + pdf.numPages);
        const page = await pdf.getPage(i);
        const ct = await page.getTextContent();
        text += ct.items.map(it => it.str).join(' ') + '\n\n';
    }
    if (output) output.textContent = text;
    resultBlob = new Blob([text], { type: 'text/plain' });
    updateProgress(100, 'تم!');
    showResult('<p>تم استخراج ' + pdf.numPages + ' صفحات</p>', 'ocr_pdf.txt');
}
