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

// 分镜头脚本生成API端点
app.post('/generate-script', async (req, res) => {
    const { story_concept } = req.body;
    
    if (!story_concept) {
        return res.status(400).json({ error: '缺少故事概念参数' });
    }
    
    if (story_concept.length < 10) {
        return res.status(400).json({ error: '故事概念太短，请提供更详细的描述' });
    }
    
    try {
        console.log('开始生成分镜头脚本，故事概念:', story_concept);
        
        // 读取ScriptDirector系统提示词
        const scriptDirectorPath = path.join(__dirname, 'system_prompts', 'ScriptDirector.md');
        if (!fs.existsSync(scriptDirectorPath)) {
            return res.status(500).json({ error: 'ScriptDirector系统提示词文件不存在' });
        }
        
        const systemPrompt = fs.readFileSync(scriptDirectorPath, 'utf-8');
        
        // 构建完整的提示词
        const fullPrompt = `${systemPrompt.trim()}\n\n用户输入: "${story_concept}"`;
        
        // 调用豆包API
        const scriptData = await callDoubaoAPI(fullPrompt);
        
        // 解析和验证JSON响应
        const parsedScript = parseScriptResponse(scriptData);
        
        // 保存到story目录
        const filePath = await saveScriptToStoryDir(parsedScript);
        
        console.log('分镜头脚本生成成功，保存路径:', filePath);
        
        res.json({
            success: true,
            script_data: parsedScript,
            file_path: filePath
        });
        
    } catch (error) {
        console.error('生成分镜头脚本失败:', error);
        res.status(500).json({ 
            error: error.message || '生成分镜头脚本失败，请稍后重试'
        });
    }
});

// 分镜头脚本生成API端点（流式输出版本）
app.post('/generate-script-stream', async (req, res) => {
    const { story_concept } = req.body;
    
    if (!story_concept) {
        return res.status(400).json({ error: '缺少故事概念参数' });
    }
    
    if (story_concept.length < 10) {
        return res.status(400).json({ error: '故事概念太短，请提供更详细的描述' });
    }
    
    try {
        console.log('开始流式生成分镜头脚本，故事概念:', story_concept);
        
        // 设置响应头为流式输出
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('Transfer-Encoding', 'chunked');
        
        // 读取ScriptDirector系统提示词
        const scriptDirectorPath = path.join(__dirname, 'system_prompts', 'ScriptDirector.md');
        if (!fs.existsSync(scriptDirectorPath)) {
            const errorMsg = JSON.stringify({ type: 'error', message: 'ScriptDirector系统提示词文件不存在' }) + '\n';
            res.write(errorMsg);
            return res.end();
        }
        
        const systemPrompt = fs.readFileSync(scriptDirectorPath, 'utf-8');
        
        // 构建完整的提示词
        const fullPrompt = `${systemPrompt.trim()}\n\n用户输入: "${story_concept}"`;
        
        // 发送进度消息
        const progressMsg = JSON.stringify({ type: 'progress', message: '正在分析故事概念...' }) + '\n';
        res.write(progressMsg);
        
        // 模拟处理过程（实际应该调用AI API）
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const progressMsg2 = JSON.stringify({ type: 'progress', message: '正在生成分镜头结构...' }) + '\n';
        res.write(progressMsg2);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const progressMsg3 = JSON.stringify({ type: 'progress', message: '正在创建详细分镜描述...' }) + '\n';
        res.write(progressMsg3);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 发送内容片段（模拟AI生成过程）
        const chunkMsg1 = JSON.stringify({ 
            type: 'chunk', 
            content: '✓ 故事标题生成完成'
        }) + '\n';
        res.write(chunkMsg1);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const chunkMsg2 = JSON.stringify({ 
            type: 'chunk', 
            content: '✓ 主要角色设定完成'
        }) + '\n';
        res.write(chunkMsg2);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const chunkMsg3 = JSON.stringify({ 
            type: 'chunk', 
            content: '✓ 分镜头序列规划完成'
        }) + '\n';
        res.write(chunkMsg3);
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 调用豆包API获取实际的脚本数据
        const scriptData = await callDoubaoAPI(fullPrompt);
        
        // 解析和验证JSON响应
        const parsedScript = parseScriptResponse(scriptData);
        
        // 保存到story目录
        const filePath = await saveScriptToStoryDir(parsedScript);
        
        console.log('分镜头脚本生成成功，保存路径:', filePath);
        
        // 发送完成消息
        const completeMsg = JSON.stringify({
            type: 'complete',
            script_data: parsedScript,
            file_path: filePath
        }) + '\n';
        res.write(completeMsg);
        
        res.end();
        
    } catch (error) {
        console.error('流式生成分镜头脚本失败:', error);
        const errorMsg = JSON.stringify({ 
            type: 'error', 
            message: error.message || '生成分镜头脚本失败，请稍后重试'
        }) + '\n';
        res.write(errorMsg);
        res.end();
    }
});

app.post('/generate-image', async (req, res) => {
    const { prompt, size, style = 'comic_american' } = req.body;
    
    // 生成唯一的会话ID
    const sessionId = uuidv4();
    const sessionDir = path.join(tempDir, sessionId);
    
    // 创建会话目录
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    
    console.log('生成会话ID:', sessionId);
    console.log('临时目录:', sessionDir);
    console.log('使用风格:', style);
    
    await generateComicImage(prompt, size, sessionId, res, sessionDir, style);
});

app.post('/generate-batch-image', async (req, res) => {
    const { prompt, size, sessionId: providedSessionId, iscover, style = 'comic_american' } = req.body;
    
    console.log('收到批量生成请求:');
    console.log('- 前端提供的sessionId:', providedSessionId);
    console.log('- 是否为封面:', iscover);
    console.log('- 使用风格:', style);
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
    
    await generateComicImage(prompt, size, sessionId, res, sessionDir, style);
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
                    // 对于PDF生成，我们不需要精确的图片尺寸，可以使用默认的A4页面
                    // 假设大多数漫画图片都是接近方形的比例
                    const imageRatio = 1.0; // 默认使用方形比例
                    
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

// DeepSeek API调用函数
async function callDoubaoAPI(prompt) {
    const apiKey = process.env.DOUBAO_API_KEY;
    if (!apiKey) {
        throw new Error('豆包API密钥未配置，请在.env文件中设置DOUBAO_API_KEY');
    }
    
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
    
    try {
        const response = await fetchWithRetry(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: 'doubao-seed-1-6-251015',
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的AI助手，请严格按照用户的要求生成JSON格式的分镜头脚本。'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 4000
            }),
        }, 3, 60000); // 3次重试，60秒超时

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`豆包API Error: Status ${response.status}, Body: ${errorBody}`);
            throw new Error(`豆包API调用失败: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
            throw new Error('豆包API返回的数据格式不正确');
        }
        
        return data.choices[0].message.content;
        
    } catch (error) {
        console.error('豆包API调用失败:', error);
        throw new Error(`豆包API调用失败: ${error.message}`);
    }
}

// 解析脚本响应函数
function parseScriptResponse(scriptData) {
    console.log('解析脚本响应 - 数据类型:', typeof scriptData);
    
    try {
        let parsed;
        
        // 如果scriptData已经是对象，直接使用
        if (typeof scriptData === 'object' && scriptData !== null) {
            parsed = scriptData;
            console.log('直接使用对象格式数据');
        } else {
            // 否则尝试解析字符串
            console.log('尝试解析字符串数据，长度:', scriptData.length);
            console.log('数据开头:', scriptData.substring(0, 100));
            console.log('数据结尾:', scriptData.substring(scriptData.length - 50));
            
            // 检查JSON完整性
            if (!isCompleteJSON(scriptData)) {
                console.log('检测到可能不完整的JSON，尝试修复');
                const repaired = tryRepairJSON(scriptData);
                parsed = JSON.parse(repaired);
            } else {
                parsed = JSON.parse(scriptData);
            }
            console.log('JSON解析成功');
        }
        
        // 验证基本结构 - 检查是否是API响应格式
        if (parsed.choices && parsed.choices[0] && 
            parsed.choices[0].message && 
            parsed.choices[0].message.content) {
            
            console.log('检测到API响应格式，提取内容');
            const content = parsed.choices[0].message.content;
            console.log('API内容长度:', content.length);
            console.log('API内容开头:', content.substring(0, 100));
            console.log('API内容结尾:', content.substring(content.length - 50));
            
            // 尝试解析内容中的JSON
            try {
                let jsonContent;
                if (!isCompleteJSON(content)) {
                    console.log('API内容可能不完整，尝试修复');
                    const repaired = tryRepairJSON(content);
                    jsonContent = JSON.parse(repaired);
                } else {
                    jsonContent = JSON.parse(content);
                }
                console.log('内容JSON解析成功');
                
                // 验证storyboard结构
                if (jsonContent.storyboard && Array.isArray(jsonContent.storyboard)) {
                    validateStoryboard(jsonContent.storyboard);
                    return jsonContent;
                }
            } catch (contentError) {
                console.log('内容JSON解析失败，尝试智能提取:', contentError.message);
                
                // 智能JSON提取策略
                const extractionStrategies = [
                    // 从Markdown代码块中提取
                    /```(?:json)?\s*([\s\S]*?)\s*```/,
                    // 查找完整的JSON对象
                    /\{[\s\S]*?\}(?=\s*$|\s*[^\}])/
                ];
                
                for (const strategy of extractionStrategies) {
                    const match = content.match(strategy);
                    if (match) {
                        try {
                            let extracted = match[1] || match[0];
                            extracted = extracted.replace(/^\s*json\s*\n?/i, '').trim();
                            
                            console.log('提取的内容:', extracted.substring(0, 100));
                            
                            const jsonContent = JSON.parse(extracted);
                            console.log('智能提取成功');
                            
                            if (jsonContent.storyboard && Array.isArray(jsonContent.storyboard)) {
                                validateStoryboard(jsonContent.storyboard);
                                return jsonContent;
                            }
                        } catch (parseError) {
                            console.log('提取失败:', parseError.message);
                            continue;
                        }
                    }
                }
                
                throw new Error('API返回的内容不包含有效的JSON数据');
            }
        }
        
        // 如果不是API响应格式，直接检查是否是storyboard格式
        if (parsed.storyboard && Array.isArray(parsed.storyboard)) {
            console.log('检测到直接storyboard格式');
            validateStoryboard(parsed.storyboard);
            return parsed;
        }
        
        // 检查是否是新的panels格式（API实际返回的格式）
        if (parsed.panels && Array.isArray(parsed.panels)) {
            console.log('检测到panels格式，转换为storyboard格式');
            
            // 转换panels格式到storyboard格式
            const storyboard = parsed.panels.map(panel => {
                // 使用第一个frame的数据
                const frame = panel.frames && panel.frames[0] ? panel.frames[0] : {};
                
                return {
                    scene_number: panel.panel_number || 0,
                    description: frame.visual_description || panel.layout_description || '',
                    visual_elements: `${frame.visual_description || ''} ${frame.dialogue || ''} ${frame.sound_effects || ''} ${frame.style_notes || ''}`.trim()
                };
            });
            
            validateStoryboard(storyboard);
            
            // 返回转换后的数据，保持原始数据的其他字段
            return {
                ...parsed,
                storyboard: storyboard
            };
        }
        
        throw new Error('API返回的数据格式无法识别');
        
    } catch (error) {
        console.error('解析脚本响应失败:', error);
        console.error('原始数据类型:', typeof scriptData);
        if (typeof scriptData === 'string') {
            console.error('原始数据完整内容:');
            console.error(scriptData);
        }
        throw new Error(`解析脚本响应失败: ${error.message}`);
    }
}

// 检查JSON是否完整
function isCompleteJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        // 检查是否缺少闭合括号
        const openBraces = (str.match(/\{/g) || []).length;
        const closeBraces = (str.match(/\}/g) || []).length;
        const openBrackets = (str.match(/\[/g) || []).length;
        const closeBrackets = (str.match(/\]/g) || []).length;
        
        return openBraces === closeBraces && openBrackets === closeBrackets;
    }
}

// 尝试修复不完整的JSON
function tryRepairJSON(str) {
    // 添加缺失的闭合括号
    let repaired = str;
    const openBraces = (repaired.match(/\{/g) || []).length;
    const closeBraces = (repaired.match(/\}/g) || []).length;
    const openBrackets = (repaired.match(/\[/g) || []).length;
    const closeBrackets = (repaired.match(/\]/g) || []).length;
    
    // 添加缺失的闭合大括号
    for (let i = 0; i < openBraces - closeBraces; i++) {
        repaired += '}';
    }
    
    // 添加缺失的闭合中括号
    for (let i = 0; i < openBrackets - closeBrackets; i++) {
        repaired += ']';
    }
    
    console.log('修复后的JSON:', repaired.substring(0, 100));
    return repaired;
}

// 验证storyboard数组结构
function validateStoryboard(storyboard) {
    storyboard.forEach((shot, index) => {
        if (!shot.scene_number || !shot.description || !shot.visual_elements) {
            throw new Error(`分镜头 ${index + 1} 缺少必要字段`);
        }
    });
}

// 保存脚本到story目录函数
async function saveScriptToStoryDir(scriptData) {
    const storyDir = path.join(__dirname, 'story');
    
    // 确保story目录存在
    if (!fs.existsSync(storyDir)) {
        fs.mkdirSync(storyDir, { recursive: true });
    }
    
    // 生成文件名（使用时间戳和故事标题）
    const title = scriptData.story_title || 'untitled_story';
    const safeTitle = title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `${safeTitle}_${timestamp}.json`;
    const filePath = path.join(storyDir, fileName);
    
    // 保存文件
    fs.writeFileSync(filePath, JSON.stringify(scriptData, null, 2), 'utf-8');
    
    return filePath;
}

async function generateComicImage(prompt, size, sessionId, res, sessionDir, style = 'comic_american') {
    const apiKey = process.env.DOUBAO_API_KEY;
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

    try {
        // 根据风格选择加载不同的系统提示词文件
        const systemPromptPath = path.join(__dirname, 'system_prompts', `${style}.md`);
        let systemPrompt;
        
        // 如果指定的风格文件不存在，使用默认的美式漫画风格
        if (!fs.existsSync(systemPromptPath)) {
            console.warn(`风格文件 ${style}.md 不存在，使用默认美式漫画风格`);
            const defaultPromptPath = path.join(__dirname, 'system_prompts', 'comic_american.md');
            systemPrompt = fs.readFileSync(defaultPromptPath, 'utf-8');
        } else {
            systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
        }
        
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
                watermark: false,

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

// 获取可用风格列表的API
app.get('/api/available-styles', (req, res) => {
    try {
        const stylesDir = path.join(__dirname, 'system_prompts');
        
        if (!fs.existsSync(stylesDir)) {
            return res.json({ styles: ['comic_american'] });
        }
        
        const files = fs.readdirSync(stylesDir);
        const styles = files
            .filter(file => file.endsWith('.md'))
            .map(file => file.replace('.md', ''))
            .sort();
        
        res.json({ styles });
    } catch (error) {
        console.error('获取风格列表失败:', error);
        res.status(500).json({ error: '获取风格列表失败' });
    }
});

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