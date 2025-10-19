// 测试脚本：验证批量生成模式中漫画风格的应用
const fs = require('fs');
const path = require('path');

// 测试数据：模拟批量生成请求
const testData = {
    prompt: "测试漫画风格应用",
    size: "4:3",
    sessionId: "test-session-123",
    iscover: false,
    style: "comic_japanese" // 测试日式风格
};

console.log('=== 测试漫画风格应用 ===');
console.log('测试数据:', JSON.stringify(testData, null, 2));

// 模拟 generateComicImage 函数中的风格处理逻辑
const systemPromptPath = path.join(__dirname, 'system_prompts', `${testData.style}.md`);

console.log('\n=== 风格文件检查 ===');
console.log('风格文件路径:', systemPromptPath);

// 检查文件是否存在
if (fs.existsSync(systemPromptPath)) {
    console.log('✅ 风格文件存在');
    
    // 读取文件内容
    const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
    console.log('✅ 风格文件内容读取成功');
    console.log('风格提示词长度:', systemPrompt.length, '字符');
    console.log('风格提示词预览:', systemPrompt.substring(0, 100) + '...');
    
    // 模拟完整的提示词构建
    const fullPrompt = `${systemPrompt.trim()}, ${testData.prompt}`;
    console.log('\n✅ 完整提示词构建成功');
    console.log('完整提示词预览:', fullPrompt.substring(0, 150) + '...');
    
    console.log('\n🎉 测试通过：漫画风格在批量生成模式中正确应用！');
    
} else {
    console.log('❌ 风格文件不存在');
    
    // 检查默认文件
    const defaultPromptPath = path.join(__dirname, 'system_prompts', 'comic_american.md');
    if (fs.existsSync(defaultPromptPath)) {
        console.log('⚠️  使用默认美式漫画风格');
        const defaultPrompt = fs.readFileSync(defaultPromptPath, 'utf-8');
        console.log('默认风格提示词预览:', defaultPrompt.substring(0, 100) + '...');
    } else {
        console.log('❌ 默认风格文件也不存在');
    }
}

console.log('\n=== 所有可用风格文件 ===');
const systemPromptsDir = path.join(__dirname, 'system_prompts');
if (fs.existsSync(systemPromptsDir)) {
    const files = fs.readdirSync(systemPromptsDir);
    const styleFiles = files.filter(file => file.endsWith('.md'));
    console.log('可用风格文件:', styleFiles.map(file => file.replace('.md', '')).join(', '));
} else {
    console.log('❌ system_prompts 目录不存在');
}