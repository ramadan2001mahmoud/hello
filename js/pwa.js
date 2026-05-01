function updateOnlineStatus() {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    if (navigator.onLine) {
        if (dot) dot.className = 'status-dot';
        if (text) text.textContent = 'متصل';
    } else {
        if (dot) dot.className = 'status-dot offline';
        if (text) text.textContent = 'وضع الطيران';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    
    // PWA
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.deferredPrompt = e;
        showToast('📲 يمكنك تثبيت التطبيق على جهازك', 'info');
    });
    
    console.log('✅ PDF Master Pro - جميع الأنظمة جاهزة');
});
