document.addEventListener('DOMContentLoaded', () => {
    const generateBtn = document.getElementById('generate-btn');
    const promptTextarea = document.getElementById('prompt');
    const imageContainer = document.getElementById('image-container');
    const loader = document.querySelector('.loader');

    generateBtn.addEventListener('click', async () => {
        const prompt = promptTextarea.value;
        const size = document.querySelector('input[name="size"]:checked').value;

        if (!prompt) {
            alert('请输入提示词！');
            return;
        }

        generateBtn.disabled = true;
        loader.style.display = 'block';
        loader.textContent = '生成中...';
        imageContainer.innerHTML = '';
        imageContainer.appendChild(loader);

        try {
            const response = await fetch('/generate-image', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, size }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate image.');
            }

            const data = await response.json();
            const img = document.createElement('img');
            img.src = data.imagePath;
            img.alt = prompt;
            imageContainer.appendChild(img);
        } catch (error) {
            console.error('Error:', error);
            imageContainer.innerHTML = `<p>Error: ${error.message}</p>`;
        } finally {
            generateBtn.disabled = false;
            loader.style.display = 'none';
        }
    });
});