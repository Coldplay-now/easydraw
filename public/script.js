document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const promptTextarea = document.getElementById('prompt');
    const imageContainer = document.getElementById('image-container');
    const loader = document.querySelector('.loader');
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const singleMode = document.getElementById('single-mode');
    const batchMode = document.getElementById('batch-mode');
    const fileSelectBtn = document.getElementById('file-select-btn');
    const jsonFileInput = document.getElementById('json-file');
    const fileName = document.getElementById('file-name');
    const progressContainer = document.getElementById('progress-container');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    let selectedJsonFile = null;

    // 模式切换
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'single') {
                singleMode.style.display = 'block';
                batchMode.style.display = 'none';
            } else {
                singleMode.style.display = 'none';
                batchMode.style.display = 'block';
            }
        });
    });

    // 文件选择
    fileSelectBtn.addEventListener('click', () => {
        jsonFileInput.click();
    });

    jsonFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && file.name.endsWith('.json')) {
            selectedJsonFile = file;
            fileName.textContent = file.name;
            
            // 读取JSON文件并显示图片数量
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const comicData = JSON.parse(event.target.result);
                    const totalPanels = comicData.panels.length;
                    const hasCover = comicData.cover ? 1 : 0;
                    const totalImages = totalPanels + hasCover;
                    
                    // 在网页上显示图片数量信息
                    const panelCountInfo = document.getElementById('panel-count-info');
                    if (hasCover) {
                        panelCountInfo.textContent = `选择的JSON脚本包含 1 个封面 + ${totalPanels} 个分镜，将生成 ${totalImages} 张图片`;
                    } else {
                        panelCountInfo.textContent = `选择的JSON脚本包含 ${totalPanels} 个分镜，将生成 ${totalImages} 张图片`;
                    }
                    panelCountInfo.style.display = 'block';
                } catch (error) {
                    console.error('解析JSON文件失败:', error);
                    const panelCountInfo = document.getElementById('panel-count-info');
                    panelCountInfo.textContent = '解析JSON文件失败，请检查文件格式';
                    panelCountInfo.style.display = 'block';
                }
            };
            reader.readAsText(file);
        } else {
            selectedJsonFile = null;
            fileName.textContent = '请选择有效的JSON文件';
        }
    });



    // 漫画风格卡片选择事件
    const styleCards = document.querySelectorAll('.style-card');
    const styleSelect = document.getElementById('style-select');
    
    // 设置默认选中美式漫画风格
    styleCards[0].classList.add('selected');
    
    styleCards.forEach(card => {
        card.addEventListener('click', () => {
            // 移除所有选中状态
            styleCards.forEach(c => c.classList.remove('selected'));
            
            // 添加当前选中状态
            card.classList.add('selected');
            
            // 更新隐藏的input值
            styleSelect.value = card.dataset.value;
        });
    });

    // 生成图片
    generateBtn.addEventListener('click', async () => {
        const mode = document.querySelector('input[name="mode"]:checked').value;
        const size = document.querySelector('input[name="size"]:checked').value;
        const style = styleSelect.value;

        if (mode === 'single') {
            const prompt = promptTextarea.value;
            if (!prompt) {
                alert('请输入提示词！');
                return;
            }
            await generateSingleImage(prompt, size, style);
        } else {
            if (!selectedJsonFile) {
                alert('请选择JSON脚本文件！');
                return;
            }
            await generateBatchImages(selectedJsonFile, size, style);
        }
    });

    // 单图生成
    async function generateSingleImage(prompt, size, style) {
        // 使用统一的加载状态
        setButtonLoadingState(true, { text: '生成中' });

        try {
            const response = await fetch('/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, size, style }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '生成图片失败');
            }

            const data = await response.json();
            
            // 创建图片容器
            const imageWrapper = document.createElement('div');
            imageWrapper.style.textAlign = 'center';
            imageWrapper.style.marginBottom = '20px';
            
            const img = document.createElement('img');
            img.src = data.imagePath;
            img.alt = prompt;
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            
            // 创建下载按钮
            const downloadBtn = document.createElement('button');
            downloadBtn.textContent = '下载图片';
            downloadBtn.className = 'btn-primary btn-small';
            downloadBtn.style.marginTop = '10px';
            
            downloadBtn.addEventListener('click', (event) => {
                downloadSingleImage(data.sessionId, data.fileName, event.target);
            });
            
            imageWrapper.appendChild(img);
            imageWrapper.appendChild(document.createElement('br'));
            imageWrapper.appendChild(downloadBtn);
            
            imageContainer.innerHTML = '';
            imageContainer.appendChild(imageWrapper);
        } catch (error) {
            console.error('Error:', error);
            
            // 提供更友好的错误信息
            let friendlyError = error.message;
            if (error.message.includes('超时')) {
                friendlyError = '网络连接超时，请检查网络连接后重试';
            } else if (error.message.includes('网络')) {
                friendlyError = '网络连接异常，请稍后重试';
            } else if (error.message.includes('服务器错误')) {
                friendlyError = 'AI服务暂时不可用，请稍后重试';
            } else if (error.message.includes('API')) {
                friendlyError = 'AI服务调用失败，请稍后重试';
            }
            
            imageContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: #e74c3c;">
                    <p><strong>生成失败</strong></p>
                    <p>${friendlyError}</p>
                    <p style="font-size: 14px; color: #7f8c8d; margin-top: 10px;">
                        建议：检查网络连接，稍后重试，或联系技术支持
                    </p>
                </div>
            `;
        } finally {
            // 恢复按钮正常状态
            setButtonLoadingState(false);
        }
    }

    // 批量生成
    // 生成UUID的简单函数
    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    // 带重试功能的图片生成函数
    async function generateImageWithRetry(prompt, size, sessionId, isCover = false, panelNumber = null, maxRetries = 3, style = 'comic_american') {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch('/generate-batch-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    size: size,
                    sessionId: sessionId,
                    iscover: isCover,
                    style: style
                })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    
                    // 检查是否是敏感内容检测错误
                    if (response.status === 400 && 
                        errorData.error && 
                        (errorData.error.includes('OutputImageSensitiveContentDetected') || 
                         errorData.error.includes('sensitive'))) {
                        
                        if (attempt < maxRetries) {
                            console.log(`敏感内容检测失败，第${attempt}次重试中... (${panelNumber ? `分镜 ${panelNumber}` : '封面'})`);
                            // 等待3-5秒后重试
                            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
                            continue;
                        } else {
                            throw new Error(`敏感内容检测失败，已重试${maxRetries}次。请尝试修改提示词内容。`);
                        }
                    }
                    // 检查是否是服务器内部错误（500错误）
                    else if (response.status === 500) {
                        if (attempt < maxRetries) {
                            console.log(`服务器内部错误（500），第${attempt}次重试中... (${panelNumber ? `分镜 ${panelNumber}` : '封面'})`);
                            // 等待5-8秒后重试，给服务器更多恢复时间
                            await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 3000));
                            continue;
                        } else {
                            throw new Error(`服务器暂时不可用（500错误），已重试${maxRetries}次。请稍后再试或联系服务提供商。`);
                        }
                    } else {
                        throw new Error(errorData.error || '生成图片失败');
                    }
                }

                const result = await response.json();
                return result;
                
            } catch (error) {
                if (attempt < maxRetries && 
                    (error.message.includes('网络') || error.message.includes('超时') || error.message.includes('fetch'))) {
                    console.log(`网络错误，第${attempt}次重试中... (${panelNumber ? `分镜 ${panelNumber}` : '封面'})`);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    continue;
                } else if (attempt === maxRetries) {
                    throw error;
                } else {
                    throw error;
                }
            }
        }
    }

    // 统一的按钮状态管理系统
    function setButtonLoadingState(isLoading, options = {}) {
        const {
            text = '生成中',
            showProgress = false,
            progress = 0,
            total = 0
        } = options;

        if (isLoading) {
            // 设置按钮为加载状态
            generateBtn.disabled = true;
            generateBtn.innerHTML = `
                <span class="loading-spinner"></span>
                ${text}${showProgress ? `... (${progress}/${total})` : '...'}
            `;
            
            // 显示对应的进度容器
            if (showProgress) {
                progressContainer.style.display = 'block';
                progressFill.style.width = total > 0 ? `${(progress / total) * 100}%` : '0%';
                progressText.textContent = `${progress}/${total}`;
            } else {
                loader.style.display = 'block';
                loader.textContent = `${text}...`;
                imageContainer.innerHTML = '';
                imageContainer.appendChild(loader);
            }
        } else {
            // 恢复按钮正常状态
            generateBtn.disabled = false;
            generateBtn.innerHTML = '生成图片';
            
            // 隐藏所有进度显示
            loader.style.display = 'none';
            progressContainer.style.display = 'none';
        }
    }

    // 更新进度状态（仅用于多图生成）
    function updateProgressState(progress, total, text = '生成中') {
        if (generateBtn.disabled) {
            generateBtn.innerHTML = `
                <span class="loading-spinner"></span>
                ${text}... (${progress}/${total})
            `;
            progressFill.style.width = total > 0 ? `${(progress / total) * 100}%` : '0%';
            progressText.textContent = `${progress}/${total}`;
        }
    }

    // 实时更新统计数字
    function updateRealTimeStatistics(successCount, errorCount) {
        const successElement = document.getElementById('success-count');
        const errorElement = document.getElementById('error-count');
        
        if (successElement) successElement.textContent = successCount;
        if (errorElement) errorElement.textContent = errorCount;
    }

    async function generateBatchImages(jsonFile, size, style) {
        try {
            const jsonContent = await readFileAsText(jsonFile);
            const comicData = JSON.parse(jsonContent);
            
            if (!comicData.panels || !Array.isArray(comicData.panels)) {
                throw new Error('无效的JSON格式：缺少panels数组');
            }

            const totalPanels = comicData.panels.length;
            const hasCover = comicData.cover ? 1 : 0;
            const totalImages = totalPanels + hasCover;
            
            if (totalImages === 0) {
                throw new Error('JSON文件中没有找到可生成的内容');
            }

            // 使用统一的加载状态（多图模式）
            setButtonLoadingState(true, { 
                text: '批量生成中', 
                showProgress: true, 
                progress: 0, 
                total: totalImages 
            });
            imageContainer.innerHTML = '';

            const results = [];
            let completed = 0;
            const sessionId = generateUUID(); // 在开始时就生成会话ID

            // 初始化批量结果容器
            initializeBatchDisplay(comicData.story_title || '批量生成结果', sessionId);

            let successCount = 0;
            let errorCount = 0;

            // 首先生成封面（如果存在）
            if (comicData.cover) {
                try {
                    // 构建封面提示词
                    let coverPrompt = `漫画封面设计: ${comicData.cover.title_text || ''}. `;
                    coverPrompt += `${comicData.cover.visual_description || ''}. `;
                    coverPrompt += `主要角色: ${comicData.cover.main_character || ''}. `;
                    coverPrompt += `关键元素: ${comicData.cover.key_elements || ''}. `;
                    coverPrompt += `风格说明: ${comicData.cover.style_notes || ''}. `;
                    coverPrompt += `配色方案: ${comicData.cover.color_scheme || ''}. `;
                    coverPrompt += `构图: ${comicData.cover.composition || ''}`;

                    console.log('开始生成封面...');
                    const data = await generateImageWithRetry(
                        coverPrompt, 
                        size, 
                        sessionId, 
                        true,
                        null,
                        3,
                        style
                    );
                    
                    const result = {
                        panel: 'cover',
                        imagePath: data.imagePath,
                        fileName: data.fileName,
                        description: '封面'
                    };
                    results.push(result);
                    successCount++;

                    // 立即显示生成的封面
                    addImageToDisplay(result, sessionId);

                    // 更新进度
                    completed++;
                    
                    // 使用统一的进度更新
                    updateProgressState(completed, totalImages, '批量生成中');
                    
                    // 实时更新统计
                    updateRealTimeStatistics(successCount, errorCount);

                } catch (error) {
                    console.error('生成封面失败:', error);
                    
                    let friendlyError = error.message;
                    if (error.message.includes('超时')) {
                        friendlyError = '网络连接超时，请检查网络后重试';
                    } else if (error.message.includes('网络')) {
                        friendlyError = '网络连接异常，请稍后重试';
                    } else if (error.message.includes('服务器错误')) {
                        friendlyError = 'AI服务暂时不可用，请稍后重试';
                    } else if (error.message.includes('敏感内容')) {
                        friendlyError = '封面内容可能包含敏感信息，请修改提示词后重试';
                    }
                    
                    const errorResult = {
                        panel: 'cover',
                        error: friendlyError,
                        description: '封面'
                    };
                    results.push(errorResult);
                    errorCount++;
                    
                    // 显示错误信息
                    addErrorToDisplay(errorResult);
                    
                    // 更新进度
                    completed++;
                    
                    // 使用统一的进度更新
                    updateProgressState(completed, totalImages, '批量生成中');
                    
                    // 实时更新统计
                    updateRealTimeStatistics(successCount, errorCount);
                }
            }

            // 为每个分镜生成图片（合并分格内容）
            for (const panel of comicData.panels) {
                if (!panel.frames || panel.frames.length === 0) continue;
                
                // 合并该分镜的所有分格内容为一个提示词
                let combinedPrompt = '';
                for (const frame of panel.frames) {
                    combinedPrompt += `${frame.visual_description}. ${frame.dialogue || ''}. ${frame.style_notes || ''}. `;
                }
                // 添加分镜布局信息
                combinedPrompt += `分镜布局: ${panel.layout_type || '默认布局'}. ${panel.layout_description || ''}`;
                
                try {
                    console.log(`开始生成分镜 ${panel.panel_number}...`);
                    
                    const data = await generateImageWithRetry(
                        combinedPrompt, 
                        size, 
                        sessionId, 
                        false, 
                        panel.panel_number,
                        3,
                        style
                    );
                    
                    const result = {
                        panel: panel.panel_number,
                        imagePath: data.imagePath,
                        fileName: data.fileName,
                        description: panel.layout_description || `分镜 ${panel.panel_number}`
                    };
                    results.push(result);
                    successCount++;

                    // 立即显示生成的图片
                    addImageToDisplay(result, sessionId);

                    // 更新进度
                    completed++;
                    
                    // 使用统一的进度更新
                    updateProgressState(completed, totalImages, '批量生成中');
                    
                    // 实时更新统计
                    updateRealTimeStatistics(successCount, errorCount);

                } catch (error) {
                    console.error(`生成分镜 ${panel.panel_number} 失败:`, error);
                    
                    // 提供更友好的错误信息
                    let friendlyError = error.message;
                    if (error.message.includes('超时')) {
                        friendlyError = '网络连接超时，请检查网络后重试';
                    } else if (error.message.includes('网络')) {
                        friendlyError = '网络连接异常，请稍后重试';
                    } else if (error.message.includes('服务器错误')) {
                        friendlyError = 'AI服务暂时不可用，请稍后重试';
                    } else if (error.message.includes('敏感内容')) {
                        friendlyError = '分镜内容可能包含敏感信息，请修改提示词后重试';
                    }
                    
                    const errorResult = {
                        panel: panel.panel_number,
                        error: friendlyError,
                        description: panel.layout_description || `分镜 ${panel.panel_number}`
                    };
                    results.push(errorResult);
                    errorCount++;
                    
                    // 显示错误信息
                    addErrorToDisplay(errorResult);
                    
                    // 更新进度
                    completed++;
                    
                    // 使用统一的进度更新
                    updateProgressState(completed, totalImages, '批量生成中');
                    
                    // 实时更新统计
                    updateRealTimeStatistics(successCount, errorCount);
                }
            }

            // 更新最终标题状态
            const title = document.querySelector('#batch-result-container h3');
            if (title) title.textContent = title.textContent.replace('生成中...', '生成完成');

        } catch (error) {
            console.error('Error:', error);
            imageContainer.innerHTML = `<p>错误: ${error.message}</p>`;
        } finally {
            setButtonLoadingState(false);
        }
    }

    // 初始化批量显示容器
    function initializeBatchDisplay(title, sessionId) {
        let html = `
            <div class="batch-result" id="batch-result-container">
                <h3>${title} - 生成中...</h3>
                <div id="batch-statistics">
                    <p>成功: <span id="success-count">0</span> 张, 失败: <span id="error-count">0</span> 张</p>
                </div>
                <div id="download-section" style="margin: 30px 0; display: none;">
                    <div class="download-cards">
                        <div class="download-card" onclick="downloadBatchImages('${sessionId}')">
                            <div class="card-icon">📦</div>
                            <div class="card-content">
                                <h4>打包下载ZIP</h4>
                                <p>下载所有生成图片的压缩包</p>
                            </div>
                        </div>
                        <div class="download-card" onclick="downloadPDF('${sessionId}', '${title}')">
                            <div class="card-icon">📄</div>
                            <div class="card-content">
                                <h4>下载PDF漫画</h4>
                                <p>生成精美的PDF漫画手册</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="batch-images" id="batch-images-container">
                </div>
                <div id="error-list" style="margin-top: 1rem; display: none;">
                    <h4>失败的分镜:</h4>
                    <ul id="error-items"></ul>
                </div>
            </div>
        `;

        imageContainer.innerHTML = html;
    }

    // 实时添加图片到显示容器
    function addImageToDisplay(result, sessionId) {
        const batchImagesContainer = document.getElementById('batch-images-container');
        const downloadSection = document.getElementById('download-section');
        
        if (batchImagesContainer) {
            const imageDiv = document.createElement('div');
            imageDiv.innerHTML = `
                <img src="${result.imagePath}" alt="分镜 ${result.panel}" style="animation: fadeIn 0.5s ease-in;">
                <p>分镜 ${result.panel}</p>
                <small>${result.description}</small>
                <button onclick="downloadSingleImage('${sessionId}', '${result.fileName}', this)" 
                        style="margin-top: 5px; padding: 5px 10px; background-color: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    下载
                </button>
            `;
            batchImagesContainer.appendChild(imageDiv);
            
            // 显示下载按钮
            if (downloadSection) {
                downloadSection.style.display = 'block';
            }
        }
    }

    // 实时添加错误信息到显示容器
    function addErrorToDisplay(errorResult) {
        const errorList = document.getElementById('error-list');
        const errorItems = document.getElementById('error-items');
        
        if (errorList && errorItems) {
            const errorItem = document.createElement('li');
            errorItem.textContent = `分镜 ${errorResult.panel}: ${errorResult.error}`;
            errorItems.appendChild(errorItem);
            errorList.style.display = 'block';
        }
    }

    // 文件读取工具函数
    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(e.target.result);
            reader.onerror = e => reject(new Error('文件读取失败'));
            reader.readAsText(file);
        });
    }

    // 显示提示消息
    function showMessage(message, type = 'success') {
        // 移除现有的消息
        const existingMessage = document.querySelector('.download-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 创建新的消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = `download-message ${type}`;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;
        
        if (type === 'success') {
            messageDiv.style.backgroundColor = '#28a745';
        } else if (type === 'error') {
            messageDiv.style.backgroundColor = '#dc3545';
        } else if (type === 'info') {
            messageDiv.style.backgroundColor = '#17a2b8';
        }
        
        messageDiv.textContent = message;
        document.body.appendChild(messageDiv);

        // 添加CSS动画
        if (!document.querySelector('#message-styles')) {
            const style = document.createElement('style');
            style.id = 'message-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        // 3秒后自动消失
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, 300);
        }, 3000);
    }

    // 下载单张图片
    window.downloadSingleImage = async function(sessionId, fileName, buttonElement) {
        // 找到下载按钮
        const downloadBtn = buttonElement || event.target;
        const originalText = downloadBtn.textContent;
        
        try {
            // 更新按钮状态
            downloadBtn.textContent = '下载中...';
            downloadBtn.disabled = true;
            downloadBtn.style.backgroundColor = '#6c757d';
            
            showMessage('开始下载图片...', 'info');
            
            // 直接从临时目录获取图片并下载
            const response = await fetch(`/temp/${sessionId}/${fileName}`);
            
            if (!response.ok) {
                throw new Error('获取图片失败');
            }
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            
            // 创建下载链接
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showMessage(`图片下载成功！文件已保存到默认下载目录`, 'success');
        } catch (error) {
            console.error('下载失败:', error);
            showMessage(`下载失败: ${error.message}`, 'error');
        } finally {
            // 恢复按钮状态
            downloadBtn.textContent = originalText;
            downloadBtn.disabled = false;
            downloadBtn.style.backgroundColor = '#007bff';
        }
    };

    // ZIP打包下载图片
    window.downloadBatchImages = async function(sessionId) {
        // 找到ZIP下载按钮
        const batchDownloadBtn = event.target;
        const originalText = batchDownloadBtn.textContent;
        
        try {
            // 更新按钮状态
            batchDownloadBtn.textContent = '准备打包...';
            batchDownloadBtn.disabled = true;
            batchDownloadBtn.style.backgroundColor = '#6c757d';
            
            showMessage('正在获取图片列表...', 'info');
            
            // 通过服务器API获取图片列表
            const listResponse = await fetch(`/api/list-session-images?sessionId=${sessionId}`);
            if (!listResponse.ok) {
                throw new Error('获取图片列表失败');
            }
            
            const { files } = await listResponse.json();
            
            if (files.length === 0) {
                showMessage('没有找到可下载的图片', 'error');
                return;
            }
            
            showMessage(`找到 ${files.length} 张图片，正在打包成ZIP文件...`, 'info');
            batchDownloadBtn.textContent = '正在打包ZIP...';
            
            // 调用ZIP下载API
            const zipResponse = await fetch(`/download-zip/${sessionId}`);
            
            if (!zipResponse.ok) {
                const errorData = await zipResponse.json();
                throw new Error(errorData.error || 'ZIP下载失败');
            }
            
            // 获取ZIP文件的blob
            const blob = await zipResponse.blob();
            
            // 从响应头获取文件名，如果没有则使用默认名称
            const contentDisposition = zipResponse.headers.get('Content-Disposition');
            let fileName = `images_${sessionId}_${Date.now()}.zip`;
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="(.+)"/);
                if (fileNameMatch) {
                    fileName = fileNameMatch[1];
                }
            }
            
            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showMessage(`ZIP文件下载完成！包含 ${files.length} 张图片`, 'success');
            
        } catch (error) {
            console.error('ZIP下载失败:', error);
            showMessage(`ZIP下载失败: ${error.message}`, 'error');
        } finally {
            // 恢复按钮状态
            batchDownloadBtn.textContent = originalText;
            batchDownloadBtn.disabled = false;
            batchDownloadBtn.style.backgroundColor = '#28a745';
        }
    };

    // PDF下载函数
    window.downloadPDF = async function(sessionId, storyTitle) {
        try {
            showMessage('正在生成PDF漫画手册...', 'info');
            
            const response = await fetch('/download-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sessionId: sessionId,
                    storyTitle: storyTitle
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'PDF生成失败');
            }

            // 获取PDF文件
            const blob = await response.blob();
            
            // 从响应头获取文件名
            const contentDisposition = response.headers.get('Content-Disposition');
            let fileName = `《${storyTitle || 'comic'}》.pdf`;
            
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
                if (fileNameMatch) {
                    fileName = decodeURIComponent(fileNameMatch[1]);
                }
            }

            // 创建下载链接
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            showMessage(`PDF漫画手册下载完成！文件名: ${fileName}`, 'success');
            
        } catch (error) {
            console.error('PDF下载失败:', error);
            showMessage(`PDF下载失败: ${error.message}`, 'error');
        }
    };
});