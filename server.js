require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

app.use(express.static('public'));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(express.json());

app.post('/generate-image', async (req, res) => {
    const { prompt, size } = req.body;
    const apiKey = process.env.DOUBAO_API_KEY;
    const apiUrl = 'https://ark.cn-beijing.volces.com/api/v3/images/generations';

    try {
        const systemPromptPath = path.join(__dirname, 'system_prompt.md');
        const systemPrompt = fs.readFileSync(systemPromptPath, 'utf-8');
        const fullPrompt = `${systemPrompt.trim()}, ${prompt}`;

        const response = await fetch(apiUrl, {
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
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Doubao API Error: Status ${response.status}, Body: ${errorBody}`);
            return res.status(response.status).json({ error: `Failed to generate image. API returned: ${errorBody}` });
        }

        const data = await response.json();
        const imageUrl = data.data[0].url;

        const imageResponse = await fetch(imageUrl);
        const buffer = await imageResponse.buffer();
        const imageName = `${Date.now()}.png`;
        const imagePath = path.join(__dirname, 'images', imageName);
        fs.writeFileSync(imagePath, buffer);

        res.json({ imagePath: `/images/${imageName}` });
    } catch (error) {
        console.error('Server Error:', error);
        res.status(500).json({ error: 'Failed to generate image due to a server error.' });
    }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});