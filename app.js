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
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const deleteApiKeyBtn = document.getElementById('deleteApiKeyBtn');
const imageUploadArea = document.getElementById('imageUploadArea');
const imageFileInput = document.getElementById('imageFileInput');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');

// Image upload state
let uploadedImages = [];

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

// Save API key button
saveApiKeyBtn.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        showStatus('APIキーを入力してください', 'error');
        return;
    }
    localStorage.setItem('fal_api_key', apiKey);
    showStatus('APIキーが保存されました', 'success');
    setTimeout(() => clearStatus(), 3000);
});

// Delete API key button
deleteApiKeyBtn.addEventListener('click', () => {
    if (confirm('保存されているAPIキーを削除しますか？')) {
        localStorage.removeItem('fal_api_key');
        apiKeyInput.value = '';
        showStatus('APIキーが削除されました', 'success');
        setTimeout(() => clearStatus(), 3000);
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

// Image upload handlers
imageUploadArea.addEventListener('click', () => {
    if (uploadedImages.length < 4) {
        imageFileInput.click();
    }
});

imageFileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files);
});

// Drag and drop handlers
imageUploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageUploadArea.classList.add('dragover');
});

imageUploadArea.addEventListener('dragleave', () => {
    imageUploadArea.classList.remove('dragover');
});

imageUploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    imageUploadArea.classList.remove('dragover');
    handleFileSelect(e.dataTransfer.files);
});

// Handle file selection
function handleFileSelect(files) {
    const remainingSlots = 4 - uploadedImages.length;
    const filesToAdd = Array.from(files).slice(0, remainingSlots);

    filesToAdd.forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                uploadedImages.push({
                    file: file,
                    dataUrl: e.target.result
                });
                updateImagePreview();
            };
            reader.readAsDataURL(file);
        }
    });
}

// Update image preview
function updateImagePreview() {
    imagePreviewContainer.innerHTML = '';

    if (uploadedImages.length === 0) {
        uploadPlaceholder.style.display = 'block';
    } else {
        uploadPlaceholder.style.display = 'none';

        uploadedImages.forEach((image, index) => {
            const previewItem = document.createElement('div');
            previewItem.className = 'image-preview-item';

            const img = document.createElement('img');
            img.src = image.dataUrl;
            img.alt = `Preview ${index + 1}`;

            const removeBtn = document.createElement('button');
            removeBtn.className = 'image-remove-btn';
            removeBtn.textContent = '×';
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                removeImage(index);
            };

            previewItem.appendChild(img);
            previewItem.appendChild(removeBtn);
            imagePreviewContainer.appendChild(previewItem);
        });
    }

    // Reset file input
    imageFileInput.value = '';
}

// Remove image
function removeImage(index) {
    uploadedImages.splice(index, 1);
    updateImagePreview();
}

// Convert base64 to Blob
function base64ToBlob(base64, mimeType) {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeType });
}

// Upload image to FAL CDN
async function uploadFalImage(blob, mimeType, filename, apiKey) {
    // Step 1: Try 2-stage upload (Initiate + Upload)
    const restBase = 'https://rest.alpha.fal.ai/storage/upload';
    const initiateEndpoints = [
        `${restBase}/initiate?storage_type=fal-cdn-v3`,
        `${restBase}/initiate?storage_type=fal-cdn`,
        `${restBase}/initiate`
    ];

    for (const endpoint of initiateEndpoints) {
        try {
            // Initiate upload
            const initiateRes = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Key ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    content_type: mimeType,
                    file_name: filename
                })
            });

            if (!initiateRes.ok) continue;

            const data = await initiateRes.json();
            const uploadUrl = data.upload_url || data.uploadUrl;
            const fileUrl = data.file_url || data.fileUrl || data.url;

            if (!uploadUrl || !fileUrl) continue;

            // Upload file
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': mimeType },
                body: blob
            });

            if (!uploadRes.ok) continue;

            // Success
            return { url: fileUrl, error: null };

        } catch (err) {
            console.warn('Initiate upload failed:', endpoint, err);
            continue;
        }
    }

    // Step 2: Fallback to FormData upload
    const legacyFormEndpoints = [
        'https://api.fal.ai/v1/storage/upload',
        'https://api.fal.run/v1/storage/upload',
        'https://fal.run/api/v1/storage/upload',
        'https://fal.ai/api/v1/storage/upload'
    ];

    for (const endpoint of legacyFormEndpoints) {
        try {
            const form = new FormData();
            form.append('file', blob, filename);
            form.append('content_type', mimeType);
            form.append('filename', filename);

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Authorization': `Key ${apiKey}` },
                body: form
            });

            if (!response.ok) continue;

            const data = await response.json();
            const url = data.url || data.file_url || data.fileUrl;

            if (url) {
                return { url, error: null };
            }

        } catch (err) {
            console.warn('FormData upload failed:', endpoint, err);
            continue;
        }
    }

    // All upload attempts failed
    return { url: '', error: new Error('All upload attempts failed') };
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
async function callFalAPI(apiKey, params, useEditMode = false) {
    const baseUrl = 'https://queue.fal.run/fal-ai/nano-banana-pro';
    const FAL_API_URL = useEditMode ? `${baseUrl}/edit` : baseUrl;

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
        const resultUrl = `${FAL_API_URL}/requests/${requestId}`;

        showStatus('リクエストを送信しました。画像を生成中...', 'info');

        // Poll for results
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
                // Fetch the actual result
                const resultResponse = await fetch(resultUrl, {
                    headers: {
                        'Authorization': `Key ${apiKey}`,
                    }
                });

                if (!resultResponse.ok) {
                    throw new Error(`Result fetch failed: ${resultResponse.status}`);
                }

                const result = await resultResponse.json();
                return result;
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

        throw new Error('タイムアウト: 画像生成に時間がかかりすぎています');
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

    // Save API key
    localStorage.setItem('fal_api_key', apiKey);

    // Check if using edit mode (with reference images)
    const useEditMode = uploadedImages.length > 0;

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
        // Upload reference images to FAL CDN if in edit mode
        if (useEditMode) {
            showStatus('参照画像をアップロード中...', 'info');
            const imageUrls = [];

            for (let i = 0; i < uploadedImages.length; i++) {
                const img = uploadedImages[i];

                // Extract base64 from data URL
                const base64Match = img.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (!base64Match) {
                    // Fallback to data URI
                    imageUrls.push(img.dataUrl);
                    continue;
                }

                const mimeType = base64Match[1];
                const base64Data = base64Match[2];
                const filename = img.file.name || `image-${i}.jpg`;

                // Convert to blob and upload
                const blob = base64ToBlob(base64Data, mimeType);
                const uploadResult = await uploadFalImage(blob, mimeType, filename, apiKey);

                if (uploadResult.url) {
                    // Use CDN URL
                    imageUrls.push(uploadResult.url);
                    console.log(`✓ Uploaded ${filename} to FAL CDN:`, uploadResult.url);
                } else {
                    // Fallback to base64 data URI
                    console.warn(`✗ Upload failed for ${filename}, using base64 fallback`);
                    imageUrls.push(img.dataUrl);
                }
            }

            params.image_urls = imageUrls;
        }

        showStatus('画像生成リクエストを送信中...', 'info');
        const result = await callFalAPI(apiKey, params, useEditMode);
        console.log('API Result:', result);

        // FAL APIのレスポンス構造に対応
        // resultに直接imagesがある場合と、result.dataにある場合の両方に対応
        const imageData = result.data || result;
        displayResults(imageData);
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
