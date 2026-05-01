// Global State
let currentTool = '';
let files = [];
let resultBlob = null;
let resultBlobs = [];
let sigPad = null;

// File Helpers
function readFileAB(file) {
    return new Promise(r => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result);
        fr.readAsArrayBuffer(file);
    });
}

function readFileURL(file) {
    return new Promise(r => {
        const fr = new FileReader();
        fr.onload = () => r(fr.result);
        fr.readAsDataURL(file);
    });
}

function formatSize(b) {
    if (!b) return '0 B';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
    return (b / 1048576).toFixed(2) + ' MB';
}

// Open Tool
function openTool(toolName) {
    currentTool = toolName;
    files = [];
    resultBlob = null;
    resultBlobs = [];

    const titles = {
        'merge': '🔗 دمج PDF', 'split': '✂️ تقسيم PDF', 'compress': '📦 ضغط PDF',
        'pdf2image': '🖼️ PDF إلى صور', 'image2pdf': '📸 صور إلى PDF', 'rotate': '🔄 تدوير PDF',
        'unlock': '🔓 إزالة كلمة المرور', 'protect': '🔒 حماية PDF',
        'signature': '✍️ توقيع إلكتروني', 'watermark': '💧 علامة مائية',
        'word2pdf': '📝 Word → PDF', 'excel2pdf': '📊 Excel → PDF', 'ppt2pdf': '📽️ PowerPoint → PDF',
        'pdf2text': '📃 PDF → نص', 'ocr-image': '🔍 OCR من صورة', 'ocr-pdf': '📖 OCR من PDF',
        'viewer': '👁️ عارض PDF'
    };

    document.getElementById('workspaceTitle').textContent = titles[toolName] || 'أداة';
    document.getElementById('workspace').classList.add('active');
    buildWorkspace();
    document.getElementById('workspace').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeWorkspace() {
    document.getElementById('workspace').classList.remove('active');
    currentTool = '';
    files = [];
    if (sigPad) { sigPad.off(); sigPad = null; }
}

function buildWorkspace() {
    const body = document.getElementById('workspaceContent');
    
    let accept = '.pdf', multi = true, uploadMsg = 'ارفع ملفات PDF';
    
    if (currentTool === 'image2pdf') { accept = 'image/*'; uploadMsg = 'ارفع صور (JPG, PNG)'; }
    if (currentTool === 'ocr-image') { accept = 'image/*'; uploadMsg = 'ارفع صورة لاستخراج النص'; multi = false; }
    if (currentTool === 'word2pdf') { accept = '.doc,.docx'; uploadMsg = 'ارفع ملف Word'; multi = false; }
    if (currentTool === 'excel2pdf') { accept = '.xls,.xlsx,.csv'; uploadMsg = 'ارفع ملف Excel'; multi = false; }
    if (currentTool === 'ppt2pdf') { accept = '.ppt,.pptx'; uploadMsg = 'ارفع ملف PowerPoint'; multi = false; }
    if (['protect','unlock','rotate','compress','pdf2image','split','watermark','signature','pdf2text','ocr-pdf','viewer'].includes(currentTool)) multi = false;

    let html = `
        <div class="drop-zone" id="theDropZone">
            <span class="dz-icon">📁</span>
            <span class="dz-text">${uploadMsg}</span>
            <span class="dz-hint">اسحب وأفلت الملفات أو اضغط للاختيار</span>
            <input type="file" id="theFileInput" accept="${accept}" ${multi ? 'multiple' : ''} style="display:none;" onchange="handleFiles(event)">
        </div>
        <div class="file-list" id="fileList"></div>
        ${getOptions()}
        ${currentTool === 'signature' ? '<div class="sig-box"><canvas id="sigCanvas"></canvas><div class="sig-ctrl"><button class="btn" onclick="clearSig()" style="width:auto;padding:0.5rem;">🗑️ مسح</button><small style="color:#999;">✍️ ارسم توقيعك</small></div></div>' : ''}
        ${['ocr-image','ocr-pdf'].includes(currentTool) ? '<div class="ocr-box" id="ocrOutput"><p style="color:#999;text-align:center;">النص المستخرج يظهر هنا...</p></div>' : ''}
        <button class="btn btn-process" id="processBtn" disabled onclick="processNow()">⚡ معالجة</button>
        <div class="progress-wrap" id="progressWrap">
            <div class="progress-bar"><div class="progress-fill" id="progressFill"></div></div>
            <div class="progress-txt" id="progressText">جاري المعالجة...</div>
        </div>
        <div class="result-box" id="resultBox">
            <div style="font-size:4rem;">✅</div>
            <h3 style="color:#27ae60;">تم بنجاح!</h3>
            <div id="resultInfo"></div>
            <button class="btn btn-download" onclick="downloadNow()">⬇ تحميل</button>
        </div>
        <div class="preview-grid" id="previewGrid"></div>
    `;
    
    body.innerHTML = html;
    
    setTimeout(() => {
        const dz = document.getElementById('theDropZone');
        if (!dz) return;
        dz.addEventListener('click', () => document.getElementById('theFileInput').click());
        dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('active'); });
        dz.addEventListener('dragleave', () => dz.classList.remove('active'));
        dz.addEventListener('drop', e => { e.preventDefault(); dz.classList.remove('active'); if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files)); });
        if (currentTool === 'signature') initSig();
    }, 100);
}

function getOptions() {
    switch (currentTool) {
        case 'compress': return '<div class="options-box"><h4>مستوى الضغط</h4><select id="compLevel"><option value="low">منخفض</option><option value="medium" selected>متوسط</option><option value="high">عالي</option></select></div>';
        case 'rotate': return '<div class="options-box"><h4>زاوية التدوير</h4><select id="rotAngle"><option value="90">90°</option><option value="180">180°</option><option value="270">270°</option></select></div>';
        case 'pdf2image': return '<div class="options-box"><h4>تنسيق الصورة</h4><select id="imgFormat"><option value="png">PNG</option><option value="jpeg">JPEG</option></select></div>';
        case 'protect': return '<div class="options-box"><h4>كلمة المرور</h4><input type="password" id="pdfPass" placeholder="أدخل كلمة المرور"><input type="password" id="pdfPass2" placeholder="تأكيد كلمة المرور" style="margin-top:0.5rem;"></div>';
        case 'unlock': return '<div class="options-box"><h4>كلمة مرور الملف</h4><input type="password" id="unlockPass" placeholder="أدخل كلمة المرور"></div>';
        case 'watermark': return '<div class="options-box"><h4>نص العلامة</h4><input type="text" id="wmText" value="PDF Master Pro"><div class="opt-row" style="margin-top:0.5rem;"><span class="opt-label">الحجم:</span><input type="number" id="wmSize" value="30" min="10" max="80"></div></div>';
        default: return '';
    }
}

function handleFiles(event) {
    if (event.target.files.length) addFiles(Array.from(event.target.files));
}

function addFiles(newFiles) {
    const imgTools = ['image2pdf','ocr-image'], wordTools = ['word2pdf'], excelTools = ['excel2pdf'], pptTools = ['ppt2pdf'];
    if (imgTools.includes(currentTool)) files = newFiles.filter(f => f.type.startsWith('image/'));
    else if (wordTools.includes(currentTool)) files = newFiles.filter(f => f.name.match(/\.(doc|docx)$/i));
    else if (excelTools.includes(currentTool)) files = newFiles.filter(f => f.name.match(/\.(xls|xlsx|csv)$/i));
    else if (pptTools.includes(currentTool)) files = newFiles.filter(f => f.name.match(/\.(ppt|pptx)$/i));
    else if (currentTool === 'viewer') files = newFiles.filter(f => f.type === 'application/pdf').slice(0,1);
    else files = newFiles.filter(f => f.type === 'application/pdf');
    
    if (!files.length) { showToast('⚠️ نوع ملف غير صحيح', 'error'); return; }
    refreshFileList();
    document.getElementById('processBtn').disabled = false;
    showToast(`✅ تم تحميل ${files.length} ملف`, 'success');
    if (currentTool === 'viewer') previewPDFNow(files[0]);
}

function refreshFileList() {
    const list = document.getElementById('fileList');
    if (!list) return;
    list.innerHTML = files.map((f,i) => {
        let icon = '📄';
        if (f.type.startsWith('image/')) icon = '🖼️';
        if (f.name.match(/\.(doc|docx)$/i)) icon = '📝';
        if (f.name.match(/\.(xls|xlsx|csv)$/i)) icon = '📊';
        if (f.name.match(/\.(ppt|pptx)$/i)) icon = '📽️';
        return `<div class="file-item"><span class="fi-icon">${icon}</span><div class="fi-info"><div class="fi-name">${f.name}</div><div class="fi-size">${formatSize(f.size)}</div></div><button class="fi-del" onclick="delFile(${i})">✕</button></div>`;
    }).join('');
}

function delFile(i) { files.splice(i,1); refreshFileList(); if (!files.length) document.getElementById('processBtn').disabled = true; }

function showProgress() {
    document.getElementById('progressWrap').classList.add('active');
    document.getElementById('resultBox').classList.remove('active');
    document.getElementById('progressFill').style.width = '0%';
}

function updateProgress(pct, txt) {
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressText').textContent = txt;
}

function hideProgress() {
    setTimeout(() => document.getElementById('progressWrap').classList.remove('active'), 300);
}

function showResult(info, filename) {
    hideProgress();
    document.getElementById('progressFill').style.width = '100%';
    setTimeout(() => {
        document.getElementById('resultBox').classList.add('active');
        if (info) document.getElementById('resultInfo').innerHTML = info;
        document.getElementById('resultBox').setAttribute('data-filename', filename || 'result.pdf');
        showToast('✅ تم بنجاح!', 'success');
    }, 400);
}

function downloadNow() {
    const fn = document.getElementById('resultBox').getAttribute('data-filename') || 'result.pdf';
    function save(blob, name) {
        if (typeof saveAs !== 'undefined') saveAs(blob, name);
        else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = name;
            document.body.appendChild(a); a.click(); document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
    if (resultBlob) save(resultBlob, fn);
    else if (resultBlobs.length) {
        resultBlobs.forEach((rb,i) => setTimeout(() => save(rb.blob, rb.name), i*200));
        showToast('✅ جاري تحميل ' + resultBlobs.length + ' ملفات', 'success');
    }
}

function openCloudPicker() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,image/*';
    input.multiple = true;
    input.onchange = e => { if (e.target.files.length) addFiles(Array.from(e.target.files)); };
    input.click();
}

function initSig() {
    const canvas = document.getElementById('sigCanvas');
    if (!canvas || typeof SignaturePad === 'undefined') return;
    canvas.width = canvas.parentElement.offsetWidth || 500;
    canvas.height = 200;
    sigPad = new SignaturePad(canvas, { backgroundColor: 'white', penColor: '#333' });
}

function clearSig() { if (sigPad) sigPad.clear(); }

// Process router
async function processNow() {
    if (!files.length) { showToast('⚠️ ارفع ملفات أولاً', 'error'); return; }
    showProgress();
    const routes = {
        'merge': doMerge, 'split': doSplit, 'compress': doCompress,
        'pdf2image': doPdf2Image, 'image2pdf': doImages2Pdf, 'rotate': doRotate,
        'unlock': doUnlock, 'protect': doProtect, 'signature': doSignature,
        'watermark': doWatermark, 'word2pdf': doOffice2Pdf, 'excel2pdf': doOffice2Pdf,
        'ppt2pdf': doOffice2Pdf, 'pdf2text': doPdf2Text, 'ocr-image': doOcrImage, 'ocr-pdf': doOcrPdf
    };
    const fn = routes[currentTool];
    if (fn) try { await fn(); } catch(e) { hideProgress(); showToast('❌ خطأ: ' + e.message, 'error'); console.error(e); }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWorkspace(); });
