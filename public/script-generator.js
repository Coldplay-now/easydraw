// 漫画分镜头脚本生成器 - 前端JavaScript逻辑

document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
    const storyInput = document.getElementById('storyInput');
    const generateBtn = document.getElementById('generateBtn');
    const loadingSection = document.getElementById('loadingSection');
    const resultSection = document.getElementById('resultSection');
    const jsonDisplay = document.getElementById('jsonDisplay');
    const downloadBtn = document.getElementById('downloadBtn');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    const fileInfo = document.getElementById('fileInfo');

    // 生成按钮点击事件
    generateBtn.addEventListener('click', async function() {
        const storyConcept = storyInput.value.trim();
        
        // 验证输入
        if (!storyConcept) {
            showError('请输入故事概念或情节描述');
            return;
        }
        
        if (storyConcept.length < 10) {
            showError('请提供更详细的故事描述（至少10个字符）');
            return;
        }
        
        // 开始生成
        startGeneration();
        
        try {
            // 调用后端API生成分镜头脚本（流式输出）
            const response = await fetch('/generate-script-stream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    story_concept: storyConcept
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedData = '';
            let scriptData = null;
            let filePath = null;
            
            // 显示流式输出容器
            const streamOutput = document.getElementById('streamOutput');
            if (streamOutput) {
                streamOutput.style.display = 'block';
                streamOutput.innerHTML = '<div class="stream-content"></div>';
            }
            
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    break;
                }
                
                // 解码并处理数据
                const chunk = decoder.decode(value, { stream: true });
                accumulatedData += chunk;
                
                // 处理可能的多条消息
                const lines = accumulatedData.split('\n');
                accumulatedData = lines.pop() || ''; // 保存未完成的行
                
                for (const line of lines) {
                    if (line.trim()) {
                        try {
                            const parsed = JSON.parse(line);
                            
                            if (parsed.type === 'progress') {
                                // 更新进度信息
                                updateStreamOutput(parsed.message, 'progress');
                            } else if (parsed.type === 'chunk') {
                                // 显示生成的内容片段
                                updateStreamOutput(parsed.content, 'chunk');
                            } else if (parsed.type === 'complete') {
                                // 完成生成
                                scriptData = parsed.script_data;
                                filePath = parsed.file_path;
                                updateStreamOutput('✓ 分镜头脚本生成完成！', 'complete');
                            } else if (parsed.type === 'error') {
                                // 错误处理
                                throw new Error(parsed.message);
                            }
                        } catch (e) {
                            console.warn('Failed to parse JSON:', line, e);
                        }
                    }
                }
            }
            
            if (scriptData) {
                // 生成成功
                showSuccess('分镜头脚本生成成功！');
                displayScriptResult(scriptData, filePath);
            } else {
                throw new Error('生成失败：未收到完整数据');
            }
            
        } catch (error) {
            console.error('生成错误:', error);
            showError(error.message || '网络错误或服务器异常，请稍后重试');
        } finally {
            // 结束生成状态
            endGeneration();
        }
    });

    // 下载按钮点击事件
    downloadBtn.addEventListener('click', function() {
        const scriptData = jsonDisplay.textContent;
        if (!scriptData) {
            showError('没有可下载的内容');
            return;
        }
        
        try {
            // 解析JSON数据获取故事标题
            const scriptObj = JSON.parse(scriptData);
            const storyTitle = scriptObj.story_title || '漫画分镜头脚本';
            
            // 创建下载链接
            const blob = new Blob([scriptData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            
            // 格式化文件名（移除特殊字符）
            const fileName = `${storyTitle.replace(/[\\/:*?"<>|]/g, '_')}_${getFormattedDate()}.json`;
            
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showSuccess(`文件已下载: ${fileName}`);
            
        } catch (error) {
            console.error('下载错误:', error);
            showError('文件下载失败');
        }
    });

    // 显示错误信息
    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        successMessage.style.display = 'none';
        fileInfo.style.display = 'none';
        
        // 5秒后自动隐藏
        setTimeout(() => {
            errorMessage.style.display = 'none';
        }, 5000);
    }

    // 显示成功信息
    function showSuccess(message) {
        successMessage.textContent = message;
        successMessage.style.display = 'block';
        errorMessage.style.display = 'none';
        
        // 5秒后自动隐藏
        setTimeout(() => {
            successMessage.style.display = 'none';
        }, 5000);
    }

    // 显示文件信息
    function showFileInfo(message) {
        fileInfo.textContent = message;
        fileInfo.style.display = 'block';
    }

    // 开始生成状态
    function startGeneration() {
        generateBtn.disabled = true;
        generateBtn.textContent = '生成中...';
        loadingSection.style.display = 'block';
        resultSection.style.display = 'none';
        errorMessage.style.display = 'none';
        successMessage.style.display = 'none';
        fileInfo.style.display = 'none';
    }

    // 结束生成状态
    function endGeneration() {
        generateBtn.disabled = false;
        generateBtn.textContent = '生成分镜头脚本';
        loadingSection.style.display = 'none';
    }

    // 更新流式输出
    function updateStreamOutput(content, type = 'chunk') {
        const streamOutput = document.getElementById('streamOutput');
        if (!streamOutput) return;
        
        const streamContent = streamOutput.querySelector('.stream-content') || streamOutput;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `stream-message stream-${type}`;
        
        switch (type) {
            case 'progress':
                messageDiv.innerHTML = `<span class="stream-icon">⏳</span> ${content}`;
                messageDiv.style.color = '#4f46e5';
                break;
            case 'chunk':
                messageDiv.innerHTML = `<span class="stream-icon">📝</span> ${content}`;
                messageDiv.style.color = '#111827';
                break;
            case 'complete':
                messageDiv.innerHTML = `<span class="stream-icon">✅</span> ${content}`;
                messageDiv.style.color = '#166534';
                messageDiv.style.fontWeight = '600';
                break;
            default:
                messageDiv.textContent = content;
        }
        
        streamContent.appendChild(messageDiv);
        
        // 自动滚动到底部
        streamContent.scrollTop = streamContent.scrollHeight;
    }

    // 显示脚本结果
    function displayScriptResult(scriptData, filePath) {
        // 格式化JSON显示
        const formattedJson = JSON.stringify(scriptData, null, 2);
        jsonDisplay.textContent = formattedJson;
        
        // 语法高亮（简单版本）
        highlightJson();
        
        // 显示结果区域
        resultSection.style.display = 'block';
        
        // 隐藏流式输出容器
        const streamOutput = document.getElementById('streamOutput');
        if (streamOutput) {
            streamOutput.style.display = 'none';
        }
        
        // 显示文件保存信息
        if (filePath) {
            showFileInfo(`文件已保存至: ${filePath}`);
        }
    }

    // 专业的JSON语法高亮
    function highlightJson() {
        const text = jsonDisplay.textContent;
        
        // 使用更专业的语法高亮
        let highlighted = text
            // 键（带引号的字符串）
            .replace(/("(?:\\.|[^"\\])*")(\s*:)/g, '<span class="json-key">$1</span>$2')
            // 字符串值
            .replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span class="json-string">$1</span>')
            // 布尔值
            .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
            // null值
            .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
            // 数字
            .replace(/:\s*(\d+)/g, ': <span class="json-number">$1</span>')
            // 数字（浮点数）
            .replace(/:\s*(\d+\.\d+)/g, ': <span class="json-number">$1</span>')
            // 大括号和方括号
            .replace(/([\[\]{}])/g, '<span class="json-bracket">$1</span>')
            // 冒号和逗号
            .replace(/([:,])/g, '<span class="json-punctuation">$1</span>');
        
        jsonDisplay.innerHTML = highlighted;
        
        // 添加行号（可选功能）
        addLineNumbers();
    }
    
    // 添加行号显示
    function addLineNumbers() {
        const lines = jsonDisplay.textContent.split('\n');
        if (lines.length > 10) { // 只在内容较多时显示行号
            const lineNumbers = lines.map((_, index) => 
                `<div class="line-number">${index + 1}</div>`
            ).join('');
            
            const lineNumbersContainer = document.createElement('div');
            lineNumbersContainer.className = 'line-numbers';
            lineNumbersContainer.innerHTML = lineNumbers;
            
            // 包装现有内容
            const wrapper = document.createElement('div');
            wrapper.className = 'json-display-wrapper';
            wrapper.appendChild(lineNumbersContainer);
            wrapper.appendChild(jsonDisplay.cloneNode(true));
            
            jsonDisplay.parentNode.replaceChild(wrapper, jsonDisplay);
            
            // 更新引用
            const newJsonDisplay = wrapper.querySelector('.json-display');
            if (newJsonDisplay) {
                // 重新设置高亮
                const text = newJsonDisplay.textContent;
                newJsonDisplay.innerHTML = text
                    .replace(/("(?:\\.|[^"\\])*")(\s*:)/g, '<span class="json-key">$1</span>$2')
                    .replace(/:\s*("(?:\\.|[^"\\])*")/g, ': <span class="json-string">$1</span>')
                    .replace(/:\s*(true|false)/g, ': <span class="json-boolean">$1</span>')
                    .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>')
                    .replace(/:\s*(\d+)/g, ': <span class="json-number">$1</span>')
                    .replace(/:\s*(\d+\.\d+)/g, ': <span class="json-number">$1</span>')
                    .replace(/([\[\]{}])/g, '<span class="json-bracket">$1</span>')
                    .replace(/([:,])/g, '<span class="json-punctuation">$1</span>');
            }
        }
    }

    // 获取格式化日期
    function getFormattedDate() {
        const now = new Date();
        return now.toISOString().slice(0, 10).replace(/-/g, '') + 
               now.toTimeString().slice(0, 8).replace(/:/g, '');
    }

    // 添加输入框的实时字数统计
    storyInput.addEventListener('input', function() {
        const charCount = storyInput.value.length;
        const charCountDisplay = document.getElementById('charCount') || createCharCountDisplay();
        charCountDisplay.textContent = `${charCount} 字符`;
        
        if (charCount < 10) {
            charCountDisplay.style.color = '#dc3545';
        } else if (charCount < 50) {
            charCountDisplay.style.color = '#ffc107';
        } else {
            charCountDisplay.style.color = '#28a745';
        }
    });

    function createCharCountDisplay() {
        const container = document.createElement('div');
        container.style.marginTop = '8px';
        container.style.fontSize = '14px';
        container.style.color = '#666';
        container.id = 'charCount';
        storyInput.parentNode.appendChild(container);
        return container;
    }

    // 添加键盘快捷键支持
    document.addEventListener('keydown', function(e) {
        // Ctrl+Enter 生成脚本
        if (e.ctrlKey && e.key === 'Enter') {
            e.preventDefault();
            generateBtn.click();
        }
        
        // Ctrl+S 保存文件
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            if (resultSection.style.display === 'block') {
                downloadBtn.click();
            }
        }
    });

    console.log('漫画分镜头脚本生成器前端已加载');
});