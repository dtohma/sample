const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(express.json());

// create upload directories if they don't exist
fs.mkdirSync('uploads/styles', { recursive: true });
fs.mkdirSync('uploads/rooms', { recursive: true });

const styleUpload = multer({ dest: 'uploads/styles/' });
const roomUpload = multer({ dest: 'uploads/rooms/' });

const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

app.post('/upload/style', styleUpload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
    }
    res.json({ id: path.basename(req.file.path) });
});

app.post('/upload/room', roomUpload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Image is required' });
    }
    res.json({ id: path.basename(req.file.path) });
});

app.get('/styles', (req, res) => {
    fs.readdir('uploads/styles', (err, files) => {
        if (err) return res.status(500).json({ error: 'Could not list styles' });
        res.json({ styles: files });
    });
});

app.post('/apply-style', async (req, res) => {
    const { roomId, styleId, prompt } = req.body;
    if (!roomId || !styleId) {
        return res.status(400).json({ error: 'roomId and styleId are required' });
    }

    const basePrompt = `Make this room look like the style reference (${styleId}).`;
    const fullPrompt = prompt ? `${basePrompt} ${prompt}` : basePrompt;

    try {
        const response = await openai.createImage({
            prompt: fullPrompt,
            n: 1,
            size: '1024x1024'
        });
        const url = response.data.data[0].url;
        res.json({ url });
    } catch (error) {
        console.error('Error applying style:', error.response?.data || error.message);
        res.status(500).json({ error: 'Image generation failed' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
