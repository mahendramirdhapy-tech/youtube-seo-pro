const fetch = require('node-fetch');

module.exports = async (req, res) => {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Handle preflight request
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { topic, language, model } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Topic is required' });
        }

        // Use environment variable (secure)
        const API_KEY = process.env.OPENROUTER_API_KEY;

        const systemPrompt = `Create YouTube SEO content in ${language} for: "${topic}"
        Return ONLY JSON:
        {
            "titles": "Title 1, Title 2, Title 3, Title 4, Title 5",
            "description": "Complete YouTube description...",
            "keywords": "keyword1, keyword2, keyword3, keyword4, keyword5, keyword6, keyword7, keyword8, keyword9, keyword10",
            "hashtags": "#Tag1 #Tag2 #Tag3 #Tag4 #Tag5 #Tag6 #Tag7 #Tag8 #Tag9 #Tag10"
        }`;

        const payload = {
            model: model === 'auto' ? 'deepseek/deepseek-r1' : model,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `Create YouTube SEO for: ${topic}` }
            ],
            temperature: 0.7,
            max_tokens: 2000
        };

        const openRouterResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': 'https://your-app.vercel.app',
                'X-Title': 'YouTube SEO Pro'
            },
            body: JSON.stringify(payload)
        });

        if (!openRouterResponse.ok) {
            throw new Error(`OpenRouter API error: ${openRouterResponse.status}`);
        }

        const data = await openRouterResponse.json();
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            const content = data.choices[0].message.content;
            let seoData;
            
            try {
                const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
                seoData = JSON.parse(cleanContent);
            } catch (parseError) {
                throw new Error('Failed to parse AI response');
            }

            return res.status(200).json({
                success: true,
                data: seoData,
                model: payload.model
            });
        } else {
            throw new Error('No content from AI');
        }

    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
// YAHI TAK - aur kuch nahi add karna
