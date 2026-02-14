/**
 * 租户装修指南 - 文件浏览器
 * 动态橙色背景 + iOS 26 毛玻璃效果
 */

// ==================== 状态 ====================
let allFiles = [];
let searchQuery = '';

// ==================== DOM 元素 ====================
const elements = {
    fileList: document.getElementById('fileList'),
    searchInput: document.getElementById('searchInput'),
    searchClear: document.getElementById('searchClear'),
    emptyState: document.getElementById('emptyState'),
    previewModal: document.getElementById('previewModal'),
    previewTitle: document.getElementById('previewTitle'),
    previewBody: document.getElementById('previewBody'),
    previewClose: document.getElementById('previewClose')
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    // 从 fileData 获取所有文件
    allFiles = getAllFiles(fileData);
    
    renderFiles(allFiles);
    bindEvents();
    setupSecurity();
}

// ==================== 获取所有文件 ====================
function getAllFiles(node) {
    const files = [];
    
    if (!node.children) return files;
    
    node.children.forEach(child => {
        if (child.type === 'file') {
            files.push(child);
        } else if (child.type === 'folder' && child.children) {
            files.push(...getAllFiles(child));
        }
    });
    
    return files;
}

// ==================== 渲染文件列表 ====================
function renderFiles(files) {
    if (files.length === 0) {
        elements.fileList.innerHTML = '';
        elements.emptyState.classList.add('show');
        return;
    }
    
    elements.emptyState.classList.remove('show');
    elements.fileList.innerHTML = '';
    
    // 按名称排序
    files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    
    files.forEach((file, index) => {
        const card = createFileCard(file, index);
        elements.fileList.appendChild(card);
    });
}

// ==================== 创建文件卡片 ====================
function createFileCard(file, index) {
    const card = document.createElement('div');
    card.className = 'file-card';
    card.style.animationDelay = `${index * 0.05}s`;
    
    const ext = file.name.split('.').pop().toLowerCase();
    const iconInfo = getFileIconInfo(ext, file.mimeType);
    
    card.innerHTML = `
        <div class="file-icon ${iconInfo.class}">
            <i class="${iconInfo.icon}"></i>
        </div>
        <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-meta">${file.sizeFormatted || formatFileSize(file.size)}</div>
        </div>
        <div class="file-arrow">
            <i class="fas fa-chevron-right"></i>
        </div>
    `;
    
    card.addEventListener('click', () => openFile(file));
    
    return card;
}

// ==================== 获取文件图标信息 ====================
function getFileIconInfo(ext, mimeType) {
    const iconMap = {
        'pdf': { icon: 'fas fa-file-pdf', class: 'pdf' },
        'doc': { icon: 'fas fa-file-word', class: 'word' },
        'docx': { icon: 'fas fa-file-word', class: 'word' },
        'xls': { icon: 'fas fa-file-excel', class: 'excel' },
        'xlsx': { icon: 'fas fa-file-excel', class: 'excel' },
        'ppt': { icon: 'fas fa-file-powerpoint', class: 'ppt' },
        'pptx': { icon: 'fas fa-file-powerpoint', class: 'ppt' },
        'jpg': { icon: 'fas fa-file-image', class: '' },
        'jpeg': { icon: 'fas fa-file-image', class: '' },
        'png': { icon: 'fas fa-file-image', class: '' },
        'gif': { icon: 'fas fa-file-image', class: '' },
        'txt': { icon: 'fas fa-file-alt', class: '' },
        'mp4': { icon: 'fas fa-file-video', class: '' },
        'mp3': { icon: 'fas fa-file-audio', class: '' }
    };
    
    return iconMap[ext] || { icon: 'fas fa-file', class: '' };
}

// ==================== 打开文件 ====================
function openFile(file) {
    elements.previewTitle.textContent = file.name;
    elements.previewModal.classList.add('show');
    
    const ext = file.name.split('.').pop().toLowerCase();
    const url = 'files/' + file.name;
    
    // 显示加载提示
    showLoadingState(ext);
    
    // 所有文件都优先使用本地直接打开（最可靠）
    // PDF 文件 - 直接打开
    if (ext === 'pdf') {
        showFilePreview(url, 'pdf');
    }
    // Excel 文件 - 尝试在线预览
    else if (['xls', 'xlsx'].includes(ext)) {
        showExcelPreview(file, url);
    }
    // Word/PPT 文档 - 直接下载/打开提示
    else if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) {
        showDownloadPrompt(file, url);
    }
    // 图片文件
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
        const img = document.createElement('img');
        img.src = url;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '70vh';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '12px';
        img.onload = () => {
            elements.previewBody.innerHTML = '';
            elements.previewBody.appendChild(img);
        };
        img.onerror = () => showPreviewError('图片加载失败');
    }
    // 文本文件
    else if (['txt', 'md', 'json', 'xml', 'html', 'css', 'js'].includes(ext)) {
        fetch(url)
            .then(r => r.text())
            .then(text => {
                const pre = document.createElement('pre');
                pre.textContent = text;
                pre.style.padding = '20px';
                pre.style.background = '#f8f9fa';
                pre.style.borderRadius = '12px';
                pre.style.fontSize = '14px';
                pre.style.lineHeight = '1.6';
                pre.style.maxHeight = '70vh';
                pre.style.overflow = 'auto';
                elements.previewBody.innerHTML = '';
                elements.previewBody.appendChild(pre);
            })
            .catch(() => showPreviewError('无法读取文件'));
    }
    // 其他文件
    else {
        showDownloadPrompt(file, url);
    }
}

// 显示文件预览（PDF等）
function showFilePreview(url, type) {
    // 使用 embed 标签直接嵌入，兼容性最好
    const embed = document.createElement('embed');
    embed.src = url;
    embed.type = type === 'pdf' ? 'application/pdf' : 'application/octet-stream';
    embed.style.width = '100%';
    embed.style.height = '100%';
    embed.style.border = 'none';
    embed.style.borderRadius = '12px';
    
    // 如果 embed 失败，显示备用方案
    embed.onerror = () => {
        showDownloadPrompt({name: url.split('/').pop(), sizeFormatted: ''}, url);
    };
    
    elements.previewBody.innerHTML = '';
    elements.previewBody.appendChild(embed);
}

// 检测是否在微信内
function isWechat() {
    return /MicroMessenger/i.test(navigator.userAgent);
}

// 显示 Excel 预览
function showExcelPreview(file, url) {
    // 使用微软 Office Online 预览（需要文件可公开访问）
    // 或者使用 Google Sheets 预览
    const fullUrl = window.location.href.replace(/\/[^\/]*$/, '/') + encodeURIComponent(url);
    
    // 尝试使用 Google Sheets 预览（支持本地文件通过 data URI 方式）
    // 由于本地文件无法直接预览，提供两种选择
    elements.previewBody.innerHTML = `
        <div style="text-align: center; padding: 30px 20px;">
            <div style="width: 70px; height: 70px; margin: 0 auto 20px; background: linear-gradient(135deg, #217346 0%, #28a745 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; font-size: 32px;">
                <i class="fas fa-file-excel"></i>
            </div>
            <h3 style="font-size: 17px; color: #333; margin-bottom: 6px; font-weight: 600;">${file.name}</h3>
            <p style="color: #999; font-size: 13px; margin-bottom: 20px;">Excel 表格 · ${file.sizeFormatted || ''}</p>
            
            <div style="background: #f8f9fa; border-radius: 12px; padding: 16px; margin-bottom: 20px; text-align: left;">
                <p style="color: #666; font-size: 13px; line-height: 1.6; margin-bottom: 12px;">
                    <i class="fas fa-info-circle" style="color: #ff6b35;"></i> 
                    Excel 文件预览选项：
                </p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button onclick="openExcelWithOffice('${fullUrl}')" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; background: #217346; color: white; border: none; border-radius: 10px; font-size: 14px; cursor: pointer;">
                        <i class="fas fa-table"></i>
                        在线预览（Office Online）
                    </button>
                    <a href="${url}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 20px; background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%); color: white; border-radius: 10px; text-decoration: none; font-size: 14px;">
                        <i class="fas fa-download"></i>
                        下载后打开
                    </a>
                </div>
            </div>
            
            <p style="color: #999; font-size: 11px; line-height: 1.5;">
                <i class="fas fa-exclamation-triangle"></i>
                提示：在线预览需要文件可通过网络访问，本地文件建议下载后查看
            </p>
            
            <button onclick="closePreview()" style="margin-top: 16px; padding: 10px 24px; background: #f5f5f5; color: #666; border: none; border-radius: 10px; font-size: 14px; cursor: pointer;">
                关闭
            </button>
        </div>
    `;
}

// 使用 Office Online 打开 Excel
function openExcelWithOffice(fileUrl) {
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;
    const iframe = document.createElement('iframe');
    iframe.src = viewerUrl;
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.border = 'none';
    iframe.style.borderRadius = '12px';
    
    elements.previewBody.innerHTML = '';
    elements.previewBody.appendChild(iframe);
    
    // 显示提示
    showToast('正在加载 Excel 预览...');
}

// 显示下载/打开提示（针对无法在线预览的文件）
function showDownloadPrompt(file, url) {
    const ext = file.name.split('.').pop().toLowerCase();
    const typeNames = {
        'doc': 'Word 文档', 'docx': 'Word 文档',
        'xls': 'Excel 表格', 'xlsx': 'Excel 表格',
        'ppt': 'PPT 演示', 'pptx': 'PPT 演示'
    };
    const typeName = typeNames[ext] || '文件';
    const wechat = isWechat();
    
    // 微信环境特殊处理
    if (wechat) {
        elements.previewBody.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="width: 80px; height: 80px; margin: 0 auto 24px; background: linear-gradient(135deg, #07c160 0%, #10b981 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 36px;">
                    <i class="fab fa-weixin"></i>
                </div>
                <h3 style="font-size: 18px; color: #333; margin-bottom: 8px; font-weight: 600;">${file.name}</h3>
                <p style="color: #999; font-size: 14px; margin-bottom: 16px;">${typeName} · ${file.sizeFormatted || ''}</p>
                
                <div style="background: #f0f9f4; border: 1px solid #07c160; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: left;">
                    <p style="color: #07c160; font-size: 14px; font-weight: 600; margin-bottom: 8px;">
                        <i class="fas fa-lightbulb"></i> 微信打开提示
                    </p>
                    <p style="color: #666; font-size: 13px; line-height: 1.6;">
                        1. 点击右上角 <i class="fas fa-ellipsis-h" style="color:#999;"></i> 菜单<br>
                        2. 选择「在浏览器打开」或「用其他应用打开」<br>
                        3. 即可查看或下载文件
                    </p>
                </div>
                
                <div style="display: flex; flex-direction: column; gap: 12px; max-width: 280px; margin: 0 auto;">
                    <button onclick="copyFileUrl('${url}')" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 24px; background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%); color: white; border: none; border-radius: 12px; font-weight: 600; font-size: 16px; cursor: pointer;">
                        <i class="fas fa-link"></i>
                        复制文件链接
                    </button>
                    <button onclick="closePreview()" style="padding: 12px 24px; background: #f5f5f5; color: #666; border: none; border-radius: 12px; font-size: 15px; cursor: pointer;">
                        关闭
                    </button>
                </div>
                
                <p style="color: #999; font-size: 12px; margin-top: 20px; line-height: 1.5;">
                    <i class="fas fa-info-circle"></i>
                    提示：也可长按文件列表中的文件，选择「复制链接」后在浏览器打开
                </p>
            </div>
        `;
    } else {
        // 非微信环境
        elements.previewBody.innerHTML = `
            <div style="text-align: center; padding: 40px 20px;">
                <div style="width: 80px; height: 80px; margin: 0 auto 24px; background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%); border-radius: 20px; display: flex; align-items: center; justify-content: center; color: white; font-size: 36px;">
                    <i class="fas fa-file-${ext === 'doc' || ext === 'docx' ? 'word' : ext === 'xls' || ext === 'xlsx' ? 'excel' : 'powerpoint'}"></i>
                </div>
                <h3 style="font-size: 18px; color: #333; margin-bottom: 8px; font-weight: 600;">${file.name}</h3>
                <p style="color: #999; font-size: 14px; margin-bottom: 24px;">${typeName} · ${file.sizeFormatted || ''}</p>
                <div style="display: flex; flex-direction: column; gap: 12px; max-width: 280px; margin: 0 auto;">
                    <a href="${url}" target="_blank" style="display: flex; align-items: center; justify-content: center; gap: 8px; padding: 14px 24px; background: linear-gradient(135deg, #ff6b35 0%, #ff8c5a 100%); color: white; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 16px;">
                        <i class="fas fa-external-link-alt"></i>
                        打开文件
                    </a>
                    <button onclick="closePreview()" style="padding: 12px 24px; background: #f5f5f5; color: #666; border: none; border-radius: 12px; font-size: 15px; cursor: pointer;">
                        取消
                    </button>
                </div>
                <p style="color: #999; font-size: 12px; margin-top: 20px; line-height: 1.5;">
                    <i class="fas fa-info-circle"></i>
                    提示：手机端需要安装相应应用才能打开
                </p>
            </div>
        `;
    }
}

// 复制文件链接
function copyFileUrl(url) {
    const fullUrl = window.location.href.replace(/\/[^\/]*$/, '/') + url;
    
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(fullUrl).then(() => {
            showToast('链接已复制，请在浏览器中打开');
        }).catch(() => {
            fallbackCopy(fullUrl);
        });
    } else {
        fallbackCopy(fullUrl);
    }
}

// 备用复制方法
function fallbackCopy(text) {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    
    try {
        document.execCommand('copy');
        showToast('链接已复制，请在浏览器中打开');
    } catch (err) {
        showToast('复制失败，请手动复制链接');
    }
    
    document.body.removeChild(input);
}

// 显示提示
function showToast(msg) {
    const toast = document.createElement('div');
    toast.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 16px 24px; border-radius: 12px; font-size: 14px; z-index: 10000; white-space: nowrap;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => document.body.removeChild(toast), 300);
    }, 2000);
}

// 显示加载状态
function showLoadingState(fileType) {
    const typeNames = {
        'pdf': 'PDF 文档',
        'doc': 'Word 文档', 'docx': 'Word 文档',
        'xls': 'Excel 表格', 'xlsx': 'Excel 表格',
        'ppt': 'PPT 演示', 'pptx': 'PPT 演示',
        'jpg': '图片', 'jpeg': '图片', 'png': '图片', 'gif': '图片'
    };
    const typeName = typeNames[fileType] || '文件';
    
    elements.previewBody.innerHTML = `
        <div style="text-align: center; padding: 60px 20px;">
            <div style="width: 60px; height: 60px; margin: 0 auto 20px; border: 4px solid rgba(255,107,53,0.1); border-top-color: #ff6b35; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            <p style="color: #666; font-size: 16px; margin-bottom: 8px;">正在打开${typeName}</p>
            <p style="color: #999; font-size: 13px;">请稍候...</p>
        </div>
    `;
}

function showPreviewError(msg) {
    elements.previewBody.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #999;">
            <i class="fas fa-file" style="font-size: 64px; margin-bottom: 16px; opacity: 0.3;"></i>
            <p>${msg}</p>
        </div>
    `;
}

// ==================== 关闭预览 ====================
function closePreview() {
    elements.previewModal.classList.remove('show');
    setTimeout(() => {
        elements.previewBody.innerHTML = '';
    }, 300);
}

// ==================== 搜索功能 ====================
function handleSearch(e) {
    searchQuery = e.target.value.trim().toLowerCase();
    
    // 获取搜索框容器
    const searchContainer = document.querySelector('.search-container');
    
    if (searchQuery) {
        // 输入时停止跳动动画
        searchContainer.style.animation = 'none';
        elements.searchClear.classList.add('show');
        const filtered = allFiles.filter(file => 
            file.name.toLowerCase().includes(searchQuery)
        );
        renderFiles(filtered);
    } else {
        // 清空时恢复跳动动画
        searchContainer.style.animation = 'pulse 2s ease-in-out infinite';
        elements.searchClear.classList.remove('show');
        renderFiles(allFiles);
    }
}

function clearSearch() {
    elements.searchInput.value = '';
    elements.searchClear.classList.remove('show');
    searchQuery = '';
    renderFiles(allFiles);
    elements.searchInput.focus();
}

// ==================== 事件绑定 ====================
function bindEvents() {
    // 搜索
    elements.searchInput.addEventListener('input', handleSearch);
    elements.searchClear.addEventListener('click', clearSearch);
    
    // 预览关闭
    elements.previewClose.addEventListener('click', closePreview);
    document.querySelector('.preview-backdrop').addEventListener('click', closePreview);
    
    // 键盘事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closePreview();
    });
}

// ==================== 安全设置 ====================
function setupSecurity() {
    // 禁用右键
    document.addEventListener('contextmenu', e => e.preventDefault());
    // 禁用拖拽
    document.addEventListener('dragstart', e => e.preventDefault());
    // 禁用长按选择
    document.addEventListener('selectstart', e => e.preventDefault());
    
    // 禁止截图（iOS Safari 支持）
    setupScreenshotProtection();
}

// 禁止截图保护
function setupScreenshotProtection() {
    // 方法1: 使用 CSS 属性（iOS 15+ 支持）
    document.body.style.setProperty('-webkit-user-select', 'none');
    document.body.style.setProperty('user-select', 'none');
    
    // 方法2: 监听可见性变化（检测截屏时页面会失焦）
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            // 页面切换到后台，可能是截屏操作
            console.log('页面切换到后台');
        }
    });
    
    // 方法3: 使用 Screen Capture API 检测（如果可用）
    if ('mediaDevices' in navigator && 'getDisplayMedia' in navigator.mediaDevices) {
        // 尝试检测屏幕录制/截图
        try {
            navigator.mediaDevices.getDisplayMedia({ video: true })
                .then(stream => {
                    // 如果用户允许，说明可能在录屏/截图
                    stream.getTracks().forEach(track => track.stop());
                    showSecurityWarning('检测到屏幕录制/截图操作');
                })
                .catch(() => {
                    // 用户拒绝，正常情况
                });
        } catch (e) {
            // 不支持或出错
        }
    }
    
    // 方法4: 添加水印覆盖层，截图时会有提示
    addWatermark();
    
    // 方法5: 监听键盘事件（防止 PrintScreen）
    document.addEventListener('keydown', (e) => {
        // 阻止 PrintScreen 键
        if (e.key === 'PrintScreen') {
            e.preventDefault();
            showSecurityWarning('禁止截图');
            return false;
        }
        // 阻止 Ctrl+Shift+S (部分浏览器的截图快捷键)
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            showSecurityWarning('禁止截图');
            return false;
        }
    });
}

// 添加水印
function addWatermark() {
    const watermark = document.createElement('div');
    watermark.id = 'security-watermark';
    watermark.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 9999;
        background: repeating-linear-gradient(
            45deg,
            transparent,
            transparent 100px,
            rgba(255, 107, 53, 0.03) 100px,
            rgba(255, 107, 53, 0.03) 200px
        );
    `;
    
    // 添加文字水印
    const textWatermark = document.createElement('div');
    textWatermark.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-30deg);
        font-size: 48px;
        color: rgba(255, 107, 53, 0.08);
        font-weight: bold;
        pointer-events: none;
        white-space: nowrap;
        z-index: 9999;
    `;
    textWatermark.textContent = '仅供查看 禁止截图';
    
    document.body.appendChild(watermark);
    document.body.appendChild(textWatermark);
}

// 显示安全警告
function showSecurityWarning(msg) {
    const warning = document.createElement('div');
    warning.style.cssText = `
        position: fixed;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(255, 59, 48, 0.95);
        color: white;
        padding: 16px 32px;
        border-radius: 12px;
        font-size: 16px;
        font-weight: 600;
        z-index: 10001;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        animation: fadeInOut 2s ease-in-out;
    `;
    warning.innerHTML = `<i class="fas fa-shield-alt"></i> ${msg}`;
    document.body.appendChild(warning);
    
    setTimeout(() => {
        if (warning.parentNode) {
            document.body.removeChild(warning);
        }
    }, 2000);
}

// ==================== 工具函数 ====================
function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
