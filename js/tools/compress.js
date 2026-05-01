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
    showResult(`<p>الأصلي: ${formatSize(orig)} | المضغوط: ${formatSize(bytes.length)}</p><p style="color:#27ae60;">🎯 توفير ${saved}%</p>`, 'compressed.pdf');
}
