// Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => console.log('ServiceWorker registered:', registration))
            .catch(error => console.log('ServiceWorker registration failed:', error));
    });
}

// DOM elements
const promptInput = document.getElementById('prompt');
const numImagesSelect = document.getElementById('num_images');
const aspectRatioSelect = document.getElementById('aspect_ratio');
const resolutionSelect = document.getElementById('resolution');
const outputFormatSelect = document.getElementById('output_format');
const apiKeyInput = document.getElementById('api_key');
const generateBtn = document.getElementById('generateBtn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const btnText = document.querySelector('.btn-text');
const btnLoader = document.querySelector('.btn-loader');
const apiKeyToggle = document.getElementById('apiKeyToggle');
const apiKeyContent = document.getElementById('apiKeyContent');

// Accordion toggle
apiKeyToggle.addEventListener('click', () => {
    apiKeyToggle.classList.toggle('active');
    apiKeyContent.classList.toggle('active');
});

// Load saved API key from localStorage
window.addEventListener('DOMContentLoaded', () => {
    const savedApiKey = localStorage.getItem('fal_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }
});

// Save API key to localStorage when changed
apiKeyInput.addEventListener('change', () => {
    const apiKey = apiKeyInput.value.trim();
    if (apiKey) {
        localStorage.setItem('fal_api_key', apiKey);
        showStatus('APIキーが保存されました', 'success');
    }
});

// Status display helper
function showStatus(message, type = 'info') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

// Clear status
function clearStatus() {
    statusDiv.textContent = '';
    statusDiv.className = 'status';
}

// Set loading state
function setLoading(isLoading) {
    generateBtn.disabled = isLoading;
    if (isLoading) {
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
    } else {
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
    }
}

// Call FAL API
async function callFalAPI(apiKey, params) {
    const FAL_API_URL = 'https://queue.fal.run/fal-ai/nano-banana-pro';

    try {
        // Submit request
        const submitResponse = await fetch(FAL_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Key ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...params,
                sync_mode: false
            })
        });

        if (!submitResponse.ok) {
            const errorData = await submitResponse.json();
            throw new Error(errorData.detail || `HTTP error! status: ${submitResponse.status}`);
        }

        const submitData = await submitResponse.json();
        const requestId = submitData.request_id;
        const statusUrl = submitData.status_url || `${FAL_API_URL}/requests/${requestId}/status`;

        showStatus('リクエストを送信しました。画像を生成中...', 'info');

        // Poll for results
        let result = null;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max (5s interval)

        while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

            const statusResponse = await fetch(statusUrl, {
                headers: {
                    'Authorization': `Key ${apiKey}`,
                }
            });

            if (!statusResponse.ok) {
                throw new Error(`Status check failed: ${statusResponse.status}`);
            }

            const statusData = await statusResponse.json();

            if (statusData.status === 'COMPLETED') {
                result = statusData;
                break;
            } else if (statusData.status === 'FAILED') {
                throw new Error(statusData.error || '画像生成に失敗しました');
            }

            // Show progress if available
            if (statusData.logs && statusData.logs.length > 0) {
                const lastLog = statusData.logs[statusData.logs.length - 1];
                showStatus(`生成中: ${lastLog.message || '処理中...'}`, 'info');
            }

            attempts++;
        }

        if (!result) {
            throw new Error('タイムアウト: 画像生成に時間がかかりすぎています');
        }

        return result;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// Display results
function displayResults(data) {
    resultsDiv.innerHTML = '';

    if (!data.images || data.images.length === 0) {
        showStatus('画像が生成されませんでした', 'error');
        return;
    }

    data.images.forEach((image, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';

        const img = document.createElement('img');
        img.src = image.url;
        img.alt = `Generated image ${index + 1}`;
        img.loading = 'lazy';

        const actions = document.createElement('div');
        actions.className = 'result-actions';

        const downloadLink = document.createElement('a');
        downloadLink.href = image.url;
        downloadLink.download = image.file_name || `banana-${Date.now()}-${index}.png`;
        downloadLink.textContent = 'ダウンロード';
        downloadLink.target = '_blank';

        actions.appendChild(downloadLink);
        resultItem.appendChild(img);
        resultItem.appendChild(actions);
        resultsDiv.appendChild(resultItem);
    });

    showStatus(`${data.images.length}枚の画像を生成しました！`, 'success');
}

// Generate images
async function generateImages() {
    const prompt = promptInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    // Validation
    if (!prompt) {
        showStatus('プロンプトを入力してください', 'error');
        return;
    }

    if (!apiKey) {
        showStatus('APIキーを入力してください', 'error');
        return;
    }

    if (!apiKey.startsWith('fal-')) {
        showStatus('無効なAPIキー形式です。APIキーは "fal-" で始まる必要があります', 'error');
        return;
    }

    // Save API key
    localStorage.setItem('fal_api_key', apiKey);

    // Prepare request parameters
    const params = {
        prompt: prompt,
        num_images: parseInt(numImagesSelect.value),
        aspect_ratio: aspectRatioSelect.value,
        resolution: resolutionSelect.value,
        output_format: outputFormatSelect.value,
    };

    setLoading(true);
    clearStatus();
    resultsDiv.innerHTML = '';

    try {
        showStatus('画像生成リクエストを送信中...', 'info');
        const result = await callFalAPI(apiKey, params);
        displayResults(result);
    } catch (error) {
        showStatus(`エラー: ${error.message}`, 'error');
        console.error('Generation error:', error);
    } finally {
        setLoading(false);
    }
}

// Event listener
generateBtn.addEventListener('click', generateImages);

// Allow Enter key in prompt (with Shift+Enter for new line)
promptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        generateImages();
    }
});
