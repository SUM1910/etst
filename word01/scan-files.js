/**
 * 文件扫描脚本
 * 运行此脚本自动扫描 files 文件夹内容，生成 file-index.json
 * 
 * 使用方法:
 * 1. 将文件放入 files/ 下的对应分类文件夹
 * 2. 运行: node scan-files.js
 * 3. 刷新浏览器即可看到更新
 */

const fs = require('fs');
const path = require('path');

const FILES_DIR = path.join(__dirname, 'files');
const OUTPUT_FILE = path.join(__dirname, 'file-index.json');

/**
 * 获取文件 MIME 类型
 */
function getMimeType(fileName) {
    const ext = path.extname(fileName).toLowerCase();
    const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.xls': 'application/vnd.ms-excel',
        '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        '.ppt': 'application/vnd.ms-powerpoint',
        '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.bmp': 'image/bmp',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogg': 'video/ogg',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.html': 'text/html',
        '.css': 'text/css',
        '.js': 'application/javascript',
        '.zip': 'application/zip',
        '.rar': 'application/x-rar-compressed',
        '.7z': 'application/x-7z-compressed',
        '.dwg': 'application/acad',
        '.dxf': 'application/dxf'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * 扫描单个文件夹
 */
function scanFolder(folderPath, relativePath = '') {
    const items = [];
    
    try {
        const entries = fs.readdirSync(folderPath, { withFileTypes: true });
        
        // 分离文件夹和文件
        const folders = entries.filter(e => e.isDirectory());
        const files = entries.filter(e => e.isFile());
        
        // 先处理文件夹（按名称排序）
        folders.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        for (const entry of folders) {
            const fullPath = path.join(folderPath, entry.name);
            const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            
            // 递归扫描子文件夹
            const children = scanFolder(fullPath, relPath);
            
            // 解析分类名称（去掉编号前缀）
            const category = parseCategory(entry.name);
            
            items.push({
                id: `folder-${Buffer.from(relPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`,
                name: category.name,
                folderName: entry.name,
                type: 'folder',
                path: relPath,
                children: children,
                isEmpty: children.length === 0
            });
        }
        
        // 再处理文件（按名称排序）
        files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
        for (const entry of files) {
            const fullPath = path.join(folderPath, entry.name);
            const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            
            const stats = fs.statSync(fullPath);
            items.push({
                id: `file-${Buffer.from(relPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`,
                name: entry.name,
                type: 'file',
                mimeType: getMimeType(entry.name),
                size: stats.size,
                sizeFormatted: formatFileSize(stats.size),
                path: relPath,
                url: `files/${relPath}`,
                modifiedTime: stats.mtime.toISOString()
            });
        }
    } catch (error) {
        console.error(`扫描文件夹失败: ${folderPath}`, error.message);
    }
    
    return items;
}

/**
 * 解析分类配置
 */
function parseCategory(folderName) {
    // 匹配格式: "01-装修流程" 或 "装修流程"
    const match = folderName.match(/^(\d+[-_])?(.+)$/);
    if (match) {
        return {
            prefix: match[1] || '',
            name: match[2] || folderName,
            sortOrder: match[1] ? parseInt(match[1]) : 999
        };
    }
    return { prefix: '', name: folderName, sortOrder: 999 };
}

/**
 * 生成文件索引
 */
function generateFileIndex() {
    console.log('🔍 开始扫描 files 文件夹...\n');
    
    if (!fs.existsSync(FILES_DIR)) {
        console.error('❌ files 文件夹不存在！');
        console.log('💡 请先创建 files 文件夹并添加文件');
        process.exit(1);
    }
    
    const rootData = {
        id: "root",
        name: "租户装修指南",
        type: "folder",
        scanTime: new Date().toISOString(),
        totalFiles: 0,
        totalFolders: 0,
        children: []
    };
    
    // 扫描 files 目录下的直接子项（分类文件夹）
    const entries = fs.readdirSync(FILES_DIR, { withFileTypes: true });
    
    // 过滤出文件夹并排序
    const folders = entries
        .filter(entry => entry.isDirectory())
        .map(entry => ({
            name: entry.name,
            fullPath: path.join(FILES_DIR, entry.name),
            category: parseCategory(entry.name)
        }))
        .sort((a, b) => a.category.sortOrder - b.category.sortOrder);
    
    console.log(`📁 发现 ${folders.length} 个分类文件夹:\n`);
    
    for (const folder of folders) {
        console.log(`  📂 ${folder.name}`);
        
        const children = scanFolder(folder.fullPath, folder.name);
        const fileCount = countFiles(children);
        
        rootData.children.push({
            id: `folder-${Buffer.from(folder.name).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`,
            name: folder.category.name,
            folderName: folder.name,
            type: 'folder',
            description: '', // 可在配置中添加描述
            path: folder.name,
            fileCount: fileCount,
            children: children
        });
        
        rootData.totalFolders++;
        rootData.totalFiles += fileCount;
        
        console.log(`     └─ ${fileCount} 个文件\n`);
    }
    
    // 写入索引文件
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rootData, null, 2), 'utf8');
    
    console.log('✅ 文件索引生成成功！');
    console.log(`📊 统计: ${rootData.totalFolders} 个分类, ${rootData.totalFiles} 个文件`);
    console.log(`💾 输出: ${OUTPUT_FILE}\n`);
    console.log('🌐 请刷新浏览器查看更新');
}

/**
 * 统计文件数量
 */
function countFiles(items) {
    let count = 0;
    for (const item of items) {
        if (item.type === 'file') {
            count++;
        } else if (item.children) {
            count += countFiles(item.children);
        }
    }
    return count;
}

// 执行扫描
generateFileIndex();

// 监听文件变化（开发模式）
if (process.argv.includes('--watch')) {
    console.log('👀 正在监听文件变化...');
    fs.watch(FILES_DIR, { recursive: true }, (eventType, filename) => {
        console.log(`\n📝 检测到变化: ${filename}`);
        console.log('⏳ 重新生成索引...\n');
        setTimeout(generateFileIndex, 500);
    });
}
