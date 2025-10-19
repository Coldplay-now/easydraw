require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const PDFDocument = require('pdfkit');

// 创建临时目录
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/temp', express.static(tempDir));
app.use(express.json());

app.post('/generate-image', async (req, res) => {
    const { prompt, size } = req.body;
    
    // 生成唯一的会话ID
    const sessionId = uuidv4();
    const sessionDir = path.join(tempDir, sessionId);
    
    // 创建会话目录
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    console.log('生成会话ID:', sessionId);
    console.log('临时目录:', sessionDir);
    
    await generateComicImage(prompt, size, sessionId, res, sessionDir);
});

app.post('/generate-batch-image', async (req, res) => {
    const { prompt, size, sessionId: providedSessionId, iscover } = req.body;
    
    console.log('收到批量生成请求:');
    console.log('- 前端提供的sessionId:', providedSessionId);
    console.log('- 是否为封面:', iscover);
    console.log('- 请求体:', JSON.stringify(req.body, null, 2));
    
    // 如果前端提供了sessionId，使用它；否则生成新的
    const sessionId = providedSessionId || uuidv4();
    const sessionDir = path.join(tempDir, sessionId);
    
    // 创建会话目录
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    console.log('最终使用的会话ID:', sessionId);
    console.log('临时目录:', sessionDir);
    
    await generateComicImage(prompt, size, sessionId, res, sessionDir);
});

// 下载单张图片
app.post('/download-image', async (req, res) => {
    const { sessionId, fileName, targetDir } = req.body;
    
    try {
        const sourcePath = path.join(tempDir, sessionId, fileName);
        
        if (!fs.existsSync(sourcePath)) {
            return res.status(404).json({ error: '图片文件不存在' });
        }
        
        // 确保目标目录存在
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        const targetPath = path.join(targetDir, fileName);
        fs.copyFileSync(sourcePath, targetPath);
        
        console.log('图片下载成功:', targetPath);
        res.json({ success: true, path: targetPath });
    } catch (error) {
        console.error('下载图片失败:', error);
        res.status(500).json({ error: '下载失败' });
    }
});

// 批量下载图片
app.post('/download-batch', async (req, res) => {
    const { sessionId, targetDir } = req.body;
    
    try {
        const sourceDir = path.join(tempDir, sessionId);
        
        if (!fs.existsSync(sourceDir)) {
            return res.status(404).json({ error: '会话目录不存在' });
        }
        
        // 确保目标目录存在
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        const files = fs.readdirSync(sourceDir);
        const copiedFiles = [];
        
        for (const file of files) {
            if (file.endsWith('.png')) {
                const sourcePath = path.join(sourceDir, file);
                const targetPath = path.join(targetDir, file);
                fs.copyFileSync(sourcePath, targetPath);
                copiedFiles.push(targetPath);
            }
        }
        
        console.log('批量下载完成，共', copiedFiles.length, '个文件');
        res.json({ success: true, files: copiedFiles, count: copiedFiles.length });
    } catch (error) {
        console.error('批量下载失败:', error);
        res.status(500).json({ error: '批量下载失败' });
    }
});

// ZIP打包下载图片
app.get('/download-zip/:sessionId', async (req, res) => {
    const { sessionId } = req.params;
    
    try {
        const sourceDir = path.join(tempDir, sessionId);
        
        if (!fs.existsSync(sourceDir)) {
            return res.status(404).json({ error: '会话目录不存在' });
        }
        
        const files = fs.readdirSync(sourceDir);
        const imageFiles = files.filter(file => file.endsWith('.png'));
        
        if (imageFiles.length === 0) {
            return res.status(404).json({ error: '没有找到可下载的图片' });
        }
        
        // 设置响应头
        const zipFileName = `images_${sessionId}_${Date.now()}.zip`;
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
        
        // 创建archiver实例
        const archive = archiver('zip', {
            zlib: { level: 9 } // 设置压缩级别
        });
        
        // 监听错误事件
        archive.on('error', (err) => {
            console.error('ZIP创建错误:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'ZIP创建失败' });
            }
        });
        
        // 将archive流连接到响应
        archive.pipe(res);
        
        // 添加文件到ZIP
        for (const file of imageFiles) {
            const filePath = path.join(sourceDir, file);
            archive.file(filePath, { name: file });
        }
        
        console.log(`正在创建ZIP文件，包含 ${imageFiles.length} 张图片`);
        
        // 完成ZIP创建
        await archive.finalize();
        
        console.log(`ZIP下载完成: ${zipFileName}`);
        
    } catch (error) {
        console.error('ZIP下载失败:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'ZIP下载失败' });
        }
    }
});

// PDF下载端点
app.post('/download-pdf', async (req, res) => {
    try {
        const { sessionId, storyTitle } = req.body;
        
        if (!sessionId) {
            return res.status(400).json({ error: '缺少sessionId参数' });
        }

        const sessionDir = path.join(tempDir, sessionId);
        
        if (!fs.existsSync(sessionDir)) {
            return res.status(404).json({ error: '会话目录不存在' });
        }

        // 获取所有PNG图片文件
        const files = fs.readdirSync(sessionDir);
        const imageFiles = files.filter(file => file.endsWith('.png')).sort();
        
        if (imageFiles.length === 0) {
            return res.status(404).json({ error: '没有找到图片文件' });
        }

        // 生成PDF文件名
        const sanitizedTitle = (storyTitle || 'comic').replace(/[^\u4e00-\u9fa5\w\s]/g, '');
        const pdfFileName = `《${sanitizedTitle}》.pdf`;
        
        // 设置响应头
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(pdfFileName)}`);

        // 创建PDF文档
        const doc = new PDFDocument({
            size: 'A4',
            margin: 20,
            autoFirstPage: false
        });

        // 将PDF流传输到响应
        doc.pipe(res);

        // 为每张图片创建一页
        for (let i = 0; i < imageFiles.length; i++) {
            const imagePath = path.join(sessionDir, imageFiles[i]);
            
            if (fs.existsSync(imagePath)) {
                try {
                    // 获取图片尺寸信息
                    const imageInfo = doc._getImageInfo(imagePath);
                    const imageWidth = imageInfo.width;
                    const imageHeight = imageInfo.height;
                    const imageRatio = imageWidth / imageHeight;
                    
                    // 根据图片比例选择页面方向
                    // 4:3 比例 ≈ 1.33, 3:4 比例 ≈ 0.75
                    let pageOrientation = 'portrait'; // 默认竖版
                    if (imageRatio > 1.2) { // 横版图片 (4:3 等)
                        pageOrientation = 'landscape';
                    }
                    
                    // 添加新页面，根据图片比例选择方向
                    doc.addPage({
                        size: 'A4',
                        layout: pageOrientation,
                        margin: 20
                    });
                    
                    // 计算图片尺寸以适应页面
                    const pageWidth = doc.page.width - 40; // 减去边距
                    const pageHeight = doc.page.height - 40; // 减去边距
                    
                    // 添加图片到PDF，优化适配
                    doc.image(imagePath, 20, 20, {
                        fit: [pageWidth, pageHeight],
                        align: 'center',
                        valign: 'center'
                    });
                } catch (imageError) {
                    console.error(`处理图片失败 ${imageFiles[i]}:`, imageError);
                    // 如果图片处理失败，添加默认页面和错误文本
                    doc.addPage();
                    doc.fontSize(12).text(`图片加载失败: ${imageFiles[i]}`, 20, 20);
                }
            }
        }

        // 完成PDF生成
        doc.end();
        
        console.log(`PDF生成成功: ${pdfFileName}, 包含 ${imageFiles.length} 张图片`);

    } catch (error) {
        console.error('PDF生成失败:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: 'PDF生成失败' });
        }
    }
});

// 带重试机制的fetch函数
async function fetchWithRetry(url, options, maxRetries = 3, timeout = 30000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // 创建AbortController用于超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(url, {
                ...options,
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            console.error(`请求尝试 ${attempt}/${maxRetries} 失败:`, error.message);
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // 等待一段时间后重试（指数退避）
            const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
            console.log(`等待 ${delay}ms 后重试...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

async function generateComicImage(prompt, size, sessionId, res, sessionDir) {
    const apiKey = process.env.DOUBAO_API_KEY;
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

    try {
        const systemPromptPath = path.join(__dirname, 'system_prompt.md');
        const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
        const fullPrompt = `${systemPrompt.trim()}, ${prompt}`;

        console.log('开始生成图片，提示词:', prompt);

        const response = await fetchWithRetry(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'doubao-seedream-4-0-250828',
                prompt: fullPrompt,
                n: 1,
                size: size,
                logo: false
            }),
        }, 3, 60000); // 3次重试，60秒超时

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Doubao API Error: Status ${response.status}, Body: ${errorBody}`);
            return res.status(response.status).json({ 
                error: `生成图片失败。API返回状态: ${response.status}，错误信息: ${errorBody}` 
            });
        }

        const data = await response.json();
        
        if (!data.data || !data.data[0] || !data.data[0].url) {
            console.error('API返回数据格式错误:', data);
            return res.status(500).json({ error: 'API返回的数据格式不正确' });
        }

        const imageUrl = data.data[0].url;
        console.log('获取到图片URL，开始下载:', imageUrl);

        const imageResponse = await fetchWithRetry(imageUrl, {}, 3, 30000); // 3次重试，30秒超时
        
        if (!imageResponse.ok) {
            console.error(`图片下载失败: Status ${imageResponse.status}`);
            return res.status(500).json({ error: '图片下载失败' });
        }

        const buffer = await imageResponse.buffer();
        const imageName = `${Date.now()}.png`;
        const imagePath = path.join(sessionDir, imageName);
        
        fs.writeFileSync(imagePath, buffer);
        console.log('图片保存成功:', imagePath);

        // 构建访问URL
        const accessPath = `/temp/${sessionId}/${imageName}`;
        
        console.log('图片访问路径:', accessPath);
        res.json({ 
            imagePath: accessPath,
            sessionId: sessionId,
            fileName: imageName
        });
    } catch (error) {
        console.error('Server Error:', error);
        
        // 提供更详细的错误信息
        let errorMessage = '服务器错误，生成图片失败。';
        if (error.name === 'AbortError') {
            errorMessage = '请求超时，请检查网络连接后重试。';
        } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET') {
            errorMessage = '网络连接超时，请稍后重试。';
        } else if (error.code === 'ENOTFOUND') {
            errorMessage = '无法连接到服务器，请检查网络连接。';
        }
        
        res.status(500).json({ error: errorMessage });
    }
}

// 获取会话图片列表的API
app.get('/api/list-session-images', (req, res) => {
    try {
        const { sessionId } = req.query;
        if (!sessionId) {
            return res.status(400).json({ error: '缺少sessionId参数' });
        }

        const sessionDir = path.join(__dirname, 'temp', sessionId);
        if (!fs.existsSync(sessionDir)) {
            return res.status(404).json({ error: '会话不存在' });
        }

        const files = fs.readdirSync(sessionDir).filter(file => 
            file.toLowerCase().endsWith('.png') || 
            file.toLowerCase().endsWith('.jpg') || 
            file.toLowerCase().endsWith('.jpeg')
        );

        res.json({ files });
    } catch (error) {
        console.error('获取图片列表失败:', error);
        res.status(500).json({ error: '获取图片列表失败' });
    }
});

// 临时文件清理机制
function cleanupTempFiles() {
    const tempDir = path.join(__dirname, 'temp');
    if (!fs.existsSync(tempDir)) return;

    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24小时

    try {
        const sessions = fs.readdirSync(tempDir);
        sessions.forEach(sessionId => {
            const sessionPath = path.join(tempDir, sessionId);
            const stats = fs.statSync(sessionPath);
            
            // 如果文件夹超过24小时，删除它
            if (now - stats.mtime.getTime() > maxAge) {
                fs.rmSync(sessionPath, { recursive: true, force: true });
                console.log(`已清理过期临时文件: ${sessionId}`);
            }
        });
    } catch (error) {
        console.error('清理临时文件时出错:', error);
    }
}

// 每小时执行一次清理
setInterval(cleanupTempFiles, 60 * 60 * 1000);

// 启动时执行一次清理
cleanupTempFiles();

app.listen(port, () => {
    console.log(`服务器运行在 http://localhost:${port}`);
});