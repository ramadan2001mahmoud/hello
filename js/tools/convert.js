// ============================================
// أدوات التحويل
// ============================================

// PDF إلى صور
async function doPdf2Image() {
    updateProgress(10, 'جاري التحويل...');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await readFileAB(files[0]);
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const fmt = document.getElementById('imgFormat')?.value || 'png';
    const grid = document.getElementById('previewGrid');
    if (grid) grid.innerHTML = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        updateProgress(10 + (i / pdf.numPages) * 70, 'صفحة ' + i + '/' + pdf.numPages);
        const page = await pdf.getPage(i);
        const vp = page.getViewport({ scale: 2 });
        const c = document.createElement('canvas');
        c.width = vp.width; c.height = vp.height;
        await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
        if (grid) grid.appendChild(c);
        if (i === 1) {
            const dataUrl = c.toDataURL('image/' + fmt);
            resultBlob = await (await fetch(dataUrl)).blob();
        }
    }
    updateProgress(100, 'تم!');
    showResult('<p>تم تحويل ' + pdf.numPages + ' صفحات</p>', 'صفحة_1.' + fmt);
}

// صور إلى PDF
async function doImages2Pdf() {
    updateProgress(5, 'جاري التحويل...');
    const { PDFDocument } = PDFLib;
    const doc = await PDFDocument.create();
    for (let i = 0; i < files.length; i++) {
        updateProgress(5 + (i / files.length) * 80, 'صورة ' + (i + 1) + '/' + files.length);
        const buf = await readFileAB(files[i]);
        let img;
        if (files[i].type === 'image/png') img = await doc.embedPng(buf);
        else img = await doc.embedJpg(buf);
        const page = doc.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
    }
    const bytes = await doc.save();
    resultBlob = new Blob([bytes], { type: 'application/pdf' });
    updateProgress(100, 'تم!');
    showResult('<p>تم تحويل ' + files.length + ' صور</p>', 'images.pdf');
}

// تدوير PDF
async function doRotate() {
    updateProgress(10, 'جاري التدوير...');
    const { PDFDocument } = PDFLib;
    const buf = await readFileAB(files[0]);
    const pdf = await PDFDocument.load(buf);
    const angle = parseInt(document.getElementById('rotAngle')?.value) || 90;
    pdf.getPages().forEach(p => p.setRotation({ angle: p.getRotation().angle + angle }));
    const bytes = await pdf.save();
    resultBlob = new Blob([bytes], { type: 'application/pdf' });
    updateProgress(100, 'تم!');
    showResult('<p>تم التدوير ' + angle + '°</p>', 'rotated.pdf');
}

// PDF إلى نص
async function doPdf2Text() {
    updateProgress(20, 'جاري استخراج النص...');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await readFileAB(files[0]);
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const ct = await page.getTextContent();
        text += ct.items.map(it => it.str).join(' ') + '\n\n';
    }
    resultBlob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    updateProgress(100, 'تم!');
    showResult('<p>تم استخراج ' + pdf.numPages + ' صفحات</p>', 'extracted_text.txt');
}
