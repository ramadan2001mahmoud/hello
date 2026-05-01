// استخراج النص من PDF
async function doPdf2Text() {
    updateProgress(20, 'جاري استخراج النص...');
    
    try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const buf = await readFileAB(files[0]);
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        let text = '';
        
        for (let i = 1; i <= pdf.numPages; i++) {
            updateProgress(20 + (i / pdf.numPages) * 60, 'صفحة ' + i + ' من ' + pdf.numPages);
            const page = await pdf.getPage(i);
            const ct = await page.getTextContent();
            text += ct.items.map(it => it.str).join(' ') + '\n\n';
        }
        
        resultBlob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        updateProgress(100, 'تم!');
        
        showResult(
            '<p>تم استخراج النص بنجاح</p>' +
            '<p style="color:#666;">عدد الصفحات: ' + pdf.numPages + '</p>',
            'extracted_text.txt'
        );
        showToast('تم استخراج النص', 'success');
        
    } catch (e) {
        hideProgress();
        console.error('Text extraction error:', e);
        showToast('Error extracting text: ' + e.message, 'error');
    }
}
