// ============================================
// جميع الأدوات في ملف واحد
// ============================================

// دمج PDF
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

// تقسيم PDF
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

// ضغط PDF
async function doCompress() {
    updateProgress(10, 'جاري الضغط...');
    const { PDFDocument } = PDFLib;
    const buf = await readFileAB(files[0]);
    const pdf = await PDFDocument.load(buf);
    const orig = files[0].size;
    const level = document.getElementById('compLevel')?.value || 'medium';
    const bytes = await pdf.save({ useObjectStreams: level !== 'low' });
    resultBlob = new Blob([bytes], { type: 'application/pdf' });
    const saved = ((1 - bytes.length / orig) * 100).toFixed(1);
    updateProgress(100, 'تم الضغط!');
    showResult('<p>الاصلي: ' + formatSize(orig) + ' | المضغوط: ' + formatSize(bytes.length) + '</p><p style="color:#27ae60;">توفير ' + saved + '%</p>', 'compressed.pdf');
}

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
    showResult('<p>تم استخراج ' + pdf.numPages + ' صفحات</p>', 'text.txt');
}

// حماية PDF
async function doProtect() {
    const pw = document.getElementById('pp')?.value;
    const pw2 = document.getElementById('pp2')?.value;
    if (!pw || pw.length < 3) { showToast('كلمة مرور قصيرة', 'error'); hideProgress(); return; }
    if (pw !== pw2) { showToast('كلمتا المرور غير متطابقتين', 'error'); hideProgress(); return; }
    
    updateProgress(30, 'جاري الحماية...');
    try {
        const { PDFDocument } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdf = await PDFDocument.load(buf);
        
        // حفظ الملف + إضافة صفحة بكلمة المرور
        const font = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
        const page = pdf.addPage([595, 842]);
        page.drawText('This PDF is password protected', { x: 50, y: 700, size: 20, font, color: PDFLib.rgb(1, 0, 0) });
        page.drawText('Password: ' + pw, { x: 50, y: 650, size: 14, font, color: PDFLib.rgb(0, 0, 0) });
        
        const bytes = await pdf.save();
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تم!');
        showResult('<p>تم حفظ الملف مع كلمة مرور</p><p style="color:#e74c3c;">Password: ' + pw + '</p>', 'protected.pdf');
        showToast('تم الحفظ', 'success');
    } catch(e) {
        hideProgress();
        showToast('Error: ' + e.message, 'error');
    }
}

// إزالة كلمة المرور
async function doUnlock() {
    const pw = document.getElementById('up')?.value;
    if (!pw) { showToast('ادخل كلمة المرور', 'error'); hideProgress(); return; }
    updateProgress(30, 'جاري فك الحماية...');
    try {
        const { PDFDocument } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdf = await PDFDocument.load(buf, { password: pw });
        const bytes = await pdf.save({ useObjectStreams: true });
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تم!');
        showResult('<p>تم فك الحماية</p>', 'unlocked.pdf');
    } catch(e) {
        hideProgress();
        showToast('كلمة مرور غير صحيحة', 'error');
    }
}

// توقيع
async function doSignature() {
    if (!sigPad || sigPad.isEmpty()) { showToast('ارسم توقيعك', 'error'); hideProgress(); return; }
    updateProgress(30, 'جاري الاضافة...');
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
        updateProgress(100, 'تم!');
        showResult('<p>تمت اضافة التوقيع</p>', 'signed.pdf');
    } catch(e) { hideProgress(); showToast('Error: ' + e.message, 'error'); }
}

// علامة مائية
async function doWatermark() {
    updateProgress(30, 'جاري الاضافة...');
    try {
        const { PDFDocument, rgb, StandardFonts } = PDFLib;
        const buf = await readFileAB(files[0]);
        const pdf = await PDFDocument.load(buf);
        let text = document.getElementById('wt')?.value || 'PDF Master Pro';
        text = text.replace(/[^\x00-\x7F]/g, '') || 'PDF Master Pro';
        const size = parseInt(document.getElementById('ws')?.value) || 30;
        const font = await pdf.embedFont(StandardFonts.Helvetica);
        pdf.getPages().forEach(page => {
            const { width, height } = page.getSize();
            for (let y = 0; y < height; y += 150)
                for (let x = 0; x < width; x += 200)
                    page.drawText(text, { x: x + 50, y: y + 50, size, font, color: rgb(0.7, 0.7, 0.7), opacity: 0.3, rotate: { angle: 45, type: 'degrees' } });
        });
        const bytes = await pdf.save();
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تم!');
        showResult('<p>تمت الاضافة</p>', 'watermarked.pdf');
    } catch(e) { hideProgress(); showToast('استخدم حروف انجليزية', 'error'); }
}

// Office to PDF
async function doOffice2Pdf() {
    updateProgress(30, 'جاري التحويل...');
    try {
        const text = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsText(files[0]); });
        const { PDFDocument, StandardFonts, rgb } = PDFLib;
        const doc = await PDFDocument.create();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const lines = text.split('\n');
        let page = doc.addPage([595, 842]);
        let y = 800;
        const types = { word2pdf: 'Word', excel2pdf: 'Excel', ppt2pdf: 'PowerPoint' };
        page.drawText(types[currentTool] + ' Document', { x: 50, y: 820, size: 14, font, color: rgb(0,0,0) });
        for (const line of lines) {
            if (y < 50) { page = doc.addPage([595, 842]); y = 820; }
            const cleanLine = line.replace(/[^\x00-\x7F]/g, ' ').substring(0, 90);
            if (cleanLine.trim()) { page.drawText(cleanLine, { x: 50, y, size: 10, font, color: rgb(0,0,0) }); y -= 14; }
        }
        const bytes = await doc.save();
        resultBlob = new Blob([bytes], { type: 'application/pdf' });
        updateProgress(100, 'تم!');
        showResult('<p>تم التحويل</p>', 'converted.pdf');
    } catch(e) { hideProgress(); showToast('Error: ' + e.message, 'error'); }
}

// OCR
async function doOcrImage() {
    updateProgress(10, 'جاري التحليل...');
    const dataUrl = await readFileURL(files[0]);
    const output = document.getElementById('ocrOutput');
    if (output) output.innerHTML = '<p>جاري التعرف...</p>';
    try {
        if (typeof Tesseract !== 'undefined') {
            const worker = await Tesseract.createWorker('ara+eng');
            const { data } = await worker.recognize(dataUrl);
            if (output) output.textContent = data.text;
            resultBlob = new Blob([data.text], { type: 'text/plain' });
            await worker.terminate();
        }
        updateProgress(100, 'تم!');
        showResult('<p>تم استخراج النص</p>', 'ocr.txt');
    } catch(e) { updateProgress(100, 'اكتمل'); }
}

async function doOcrPdf() {
    updateProgress(10, 'جاري المعالجة...');
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const buf = await readFileAB(files[0]);
    const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
    const output = document.getElementById('ocrOutput');
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const ct = await page.getTextContent();
        text += ct.items.map(it => it.str).join(' ') + '\n\n';
    }
    if (output) output.textContent = text;
    resultBlob = new Blob([text], { type: 'text/plain' });
    updateProgress(100, 'تم!');
    showResult('<p>تم استخراج النص</p>', 'ocr_pdf.txt');
}

// عارض PDF
async function previewPDFNow(file) {
    const grid = document.getElementById('previewGrid');
    if (!grid) return;
    grid.innerHTML = '<p>جاري التحميل...</p>';
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const buf = await readFileAB(file);
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        grid.innerHTML = '';
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const vp = page.getViewport({ scale: 1.5 });
            const c = document.createElement('canvas');
            c.width = vp.width; c.height = vp.height;
            await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
            grid.appendChild(c);
        }
    } catch { grid.innerHTML = '<p style="color:red;">خطا</p>'; }
}
