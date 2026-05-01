// ============================================
// عارض PDF
// ============================================
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
        showToast('تم عرض الملف', 'success');
    } catch { grid.innerHTML = '<p style="color:red;">خطا في العرض</p>'; }
}
