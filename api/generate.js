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
// Storage and History Management
const STORAGE_KEY = 'youtube_seo_history';

function saveToHistory(seoData, topic, language, model) {
    const history = getHistory();
    const newItem = {
        id: Date.now(),
        timestamp: new Date().toLocaleString(),
        topic: topic,
        language: language,
        model: model,
        data: seoData
    };
    
    history.unshift(newItem);
    if (history.length > 50) history.splice(50);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    return newItem;
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
}

function clearHistory() {
    localStorage.removeItem(STORAGE_KEY);
    loadHistory();
}

function loadHistory() {
    const history = getHistory();
    const historyList = document.getElementById('historyList');
    const emptyHistory = document.getElementById('emptyHistory');
    
    if (history.length === 0) {
        historyList.innerHTML = '';
        emptyHistory.classList.remove('hidden');
        return;
    }
    
    emptyHistory.classList.add('hidden');
    historyList.innerHTML = history.map(item => `
        <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div class="flex justify-between items-start mb-3">
                <div>
                    <h3 class="font-semibold text-gray-800 text-lg">${item.topic}</h3>
                    <p class="text-sm text-gray-500">
                        ${item.timestamp} • ${item.language} • ${item.model}
                    </p>
                </div>
                <button onclick="deleteHistoryItem(${item.id})" class="text-red-500 hover:text-red-700">
                    🗑️
                </button>
            </div>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 class="font-semibold text-gray-700 mb-2">🎯 Titles</h4>
                    <div class="text-sm text-gray-600 bg-white p-2 rounded border">
                        ${item.data.titles.split(',').slice(0, 3).map(title => 
                            `<div class="mb-1">• ${title.trim()}</div>`
                        ).join('')}
                    </div>
                </div>
                <div>
                    <h4 class="font-semibold text-gray-700 mb-2">🏷️ Keywords</h4>
                    <div class="flex flex-wrap gap-1">
                        ${item.data.keywords.split(',').slice(0, 5).map(keyword => 
                            `<span class="bg-white px-2 py-1 text-xs rounded border">${keyword.trim()}</span>`
                        ).join('')}
                    </div>
                </div>
            </div>
            
            <div class="mt-3 flex space-x-2">
                <button onclick="viewFullHistoryItem(${item.id})" 
                        class="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600">
                    👁️ View Full
                </button>
                <button onclick="useHistoryItem(${item.id})" 
                        class="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600">
                    🔄 Use Again
                </button>
            </div>
        </div>
    `).join('');
}

function deleteHistoryItem(id) {
    const history = getHistory().filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    loadHistory();
}

function viewFullHistoryItem(id) {
    const history = getHistory();
    const item = history.find(h => h.id === id);
    if (!item) return;
    
    const content = `
🎯 TITLES:
${item.data.titles}

📝 DESCRIPTION:
${item.data.description}

🔑 KEYWORDS:
${item.data.keywords}

🏷️ HASHTAGS:
${item.data.hashtags}
    `;
    
    alert(content);
}

function useHistoryItem(id) {
    const history = getHistory();
    const item = history.find(h => h.id === id);
    if (!item) return;
    
    switchTab('generator');
    document.getElementById('videoTopic').value = item.topic;
    document.getElementById('language').value = item.language;
    document.getElementById('aiModel').value = item.model;
    displayResults(item.data, `History - ${item.model}`);
}

// Tab Management
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-white', 'text-red-600');
        btn.classList.add('text-white', 'hover:bg-white/20');
    });
    
    document.getElementById(`${tabName}Tab`).classList.remove('hidden');
    document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`)
        .classList.add('bg-white', 'text-red-600');
    
    if (tabName === 'history') {
        loadHistory();
    }
}

// Event Listeners
document.getElementById('tabGenerator').addEventListener('click', () => switchTab('generator'));
document.getElementById('tabHistory').addEventListener('click', () => switchTab('history'));
document.getElementById('clearHistory').addEventListener('click', clearHistory);

// Modify your existing displayResults function
function displayResults(data, modelUsed) {
    const topic = document.getElementById('videoTopic').value.trim();
    const language = document.getElementById('language').value;
    const model = document.getElementById('aiModel').value;
    
    // Save to history
    saveToHistory(data, topic, language, model);
    
    // ... rest of your existing displayResults code
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadHistory();
});

// Make functions global
window.deleteHistoryItem = deleteHistoryItem;
window.viewFullHistoryItem = viewFullHistoryItem;
window.useHistoryItem = useHistoryItem;
