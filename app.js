// Service Worker registration with update detection
if ('serviceWorker' in navigator) {
    let refreshing = false;

    // Detect controller change and reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        console.log('Controller changed, reloading page...');
        window.location.reload();
    });

    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);

                // Check for waiting service worker
                if (registration.waiting) {
                    showUpdateNotification(registration.waiting);
                }

                // Listen for new service worker
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('New service worker found, installing...');

                    newWorker.addEventListener('statechange', () => {
                        console.log('Service worker state changed to:', newWorker.state);

                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            // New service worker is ready
                            console.log('New service worker installed, showing update notification');
                            showUpdateNotification(newWorker);
                        }
                    });
                });
            })
            .catch(error => console.log('ServiceWorker registration failed:', error));
    });
}

// Show update notification to user
function showUpdateNotification(worker) {
    // Create notification banner
    const banner = document.createElement('div');
    banner.id = 'update-notification';
    banner.className = 'update-notification';

    const message = document.createElement('div');
    message.className = 'update-message';
    message.textContent = '新しいバージョンがあります';

    const button = document.createElement('button');
    button.className = 'update-button';
    button.textContent = '更新する';
    button.onclick = () => {
        console.log('User clicked update button, sending SKIP_WAITING message');
        worker.postMessage({ type: 'SKIP_WAITING' });
        banner.remove();
    };

    banner.appendChild(message);
    banner.appendChild(button);
    document.body.appendChild(banner);

    console.log('Update notification shown to user');
}

// PWA Install Prompt
let deferredPrompt;
const installButton = document.getElementById('installButton');

// Capture the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
    console.log('beforeinstallprompt event fired');
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show install button
    if (installButton) {
        installButton.style.display = 'block';
    }
    // Show install banner if not dismissed before
    showInstallBanner();
});

// Install button click handler
if (installButton) {
    installButton.addEventListener('click', async () => {
        if (!deferredPrompt) {
            console.log('No deferred prompt available');
            return;
        }
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        // Clear the deferredPrompt
        deferredPrompt = null;
        // Hide install button and banner
        installButton.style.display = 'none';
        hideInstallBanner();
    });
}

// Show install banner (toast-style)
function showInstallBanner() {
    // Check if banner was dismissed
    const dismissed = localStorage.getItem('install_banner_dismissed');
    if (dismissed) {
        console.log('Install banner was previously dismissed');
        return;
    }

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('App is already installed');
        return;
    }

    const banner = document.createElement('div');
    banner.id = 'install-banner';
    banner.className = 'install-banner';
    banner.innerHTML = `
        <div class="install-banner-content">
            <div class="install-banner-icon">📱</div>
            <div class="install-banner-text">
                <div class="install-banner-title">アプリをインストール</div>
                <div class="install-banner-desc">ホーム画面に追加して簡単にアクセス</div>
            </div>
        </div>
        <div class="install-banner-actions">
            <button class="install-banner-btn install-btn" id="bannerInstallBtn">インストール</button>
            <button class="install-banner-btn dismiss-btn" id="bannerDismissBtn">×</button>
        </div>
    `;

    document.body.appendChild(banner);

    // Install button in banner
    const bannerInstallBtn = document.getElementById('bannerInstallBtn');
    bannerInstallBtn.addEventListener('click', async () => {
        if (!deferredPrompt) {
            console.log('No deferred prompt available');
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);
        deferredPrompt = null;
        hideInstallBanner();
        if (installButton) {
            installButton.style.display = 'none';
        }
    });

    // Dismiss button
    const bannerDismissBtn = document.getElementById('bannerDismissBtn');
    bannerDismissBtn.addEventListener('click', () => {
        localStorage.setItem('install_banner_dismissed', 'true');
        hideInstallBanner();
    });

    // Auto show with animation
    setTimeout(() => {
        banner.classList.add('show');
    }, 2000);

    console.log('Install banner shown');
}

// Hide install banner
function hideInstallBanner() {
    const banner = document.getElementById('install-banner');
    if (banner) {
        banner.classList.remove('show');
        setTimeout(() => banner.remove(), 300);
    }
}

// Detect when PWA is installed
window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    hideInstallBanner();
    if (installButton) {
        installButton.style.display = 'none';
    }
    // Clear dismissal flag
    localStorage.removeItem('install_banner_dismissed');
});

// DOM elements
const promptInput = document.getElementById('prompt');
const numImagesSelect = document.getElementById('num_images');
const aspectRatioSelect = document.getElementById('aspect_ratio');
const resolutionSelect = document.getElementById('resolution');
const outputFormatSelect = document.getElementById('output_format');
const apiKeyInput = document.getElementById('api_key');
const generateBtn = document.getElementById('generateBtn');
const cancelBtn = document.getElementById('cancelBtn');
const statusDiv = document.getElementById('status');
const resultsDiv = document.getElementById('results');
const btnText = document.querySelector('.btn-text');
const btnLoader = document.querySelector('.btn-loader');
const apiKeyToggle = document.getElementById('apiKeyToggle');
const apiKeyContent = document.getElementById('apiKeyContent');
const apiWarning = document.getElementById('apiWarning');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
const deleteApiKeyBtn = document.getElementById('deleteApiKeyBtn');
const imageFileInput = document.getElementById('imageFileInput');
const cameraFileInput = document.getElementById('cameraFileInput');
const cameraBtn = document.getElementById('cameraBtn');
const uploadControls = document.getElementById('uploadControls');
const uploadDropZone = document.getElementById('uploadDropZone');
const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const customPromptsToggle = document.getElementById('customPromptsToggle');
const customPromptsContent = document.getElementById('customPromptsContent');
const customPromptsList = document.getElementById('customPromptsList');
const customPromptsButtons = document.getElementById('customPromptsButtons');
const imageLibraryToggle = document.getElementById('imageLibraryToggle');
const imageLibraryContent = document.getElementById('imageLibraryContent');
const libraryAddBtn = document.getElementById('libraryAddBtn');
const libraryFileInput = document.getElementById('libraryFileInput');
const imageLibraryGrid = document.getElementById('imageLibraryGrid');
const officialLibraryToggle = document.getElementById('officialLibraryToggle');
const officialLibraryContent = document.getElementById('officialLibraryContent');
const officialLibraryGrid = document.getElementById('officialLibraryGrid');

// Image upload state
let uploadedImages = [];

// Cancellation state
let isCancelled = false;

// Custom prompts state
const MAX_CUSTOM_PROMPTS = 10;
let customPrompts = [];

// Image library state
const MAX_LIBRARY_IMAGES = 20;
const MAX_IMAGE_SIZE_KB = 500;
let libraryImages = [];

// Official library state
const OFFICIAL_TEMPLATE_IMAGES = [
    'char-anju.jpg',
    'char-keisuke-color.jpg',
    'char-keisuke.jpg',
    'char-maou.jpg',
    'char-riko.jpg',
    'char-two-p-chan.jpg',
    'character_sheet_1.jpg',
    'character_sheet_2.jpg',
    'koma1-1.jpg',
    'koma2-1.jpg',
    'koma2-2.jpg',
    'koma3-1.jpg',
    'koma3-2.jpg',
    'koma3-3.jpg',
    'koma4-1.jpg',
    'koma4-2.jpg',
    'koma4-3.jpg',
    'koma4-4.jpg',
    'koma4-5.jpg',
    'koma4-6.jpg',
    'koma4-7.jpg',
    'koma5-1.jpg',
    'koma5-2.jpg',
    'koma5-3.jpg',
    'koma5-4.jpg',
    'koma5-5.jpg',
    'koma6-1.jpg',
    'koma7-1.jpg',
    'white-koma1-1.jpg',
    'white-koma2-1.jpg',
    'white-koma2-2.jpg',
    'white-koma3-1.jpg',
    'white-koma3-2.jpg',
    'white-koma3-3.jpg',
    'white-koma4-1.jpg',
    'white-koma4-2.jpg',
    'white-koma4-3.jpg',
    'white-koma4-4.jpg',
    'white-koma4-5.jpg',
    'white-koma4-6.jpg',
    'white-koma4-7.jpg',
    'white-koma5-1.jpg',
    'white-koma5-2.jpg',
    'white-koma5-3.jpg',
    'white-koma5-4.jpg',
    'white-koma5-5.jpg',
    'white-koma6-1.jpg',
    'white-koma7-1.jpg'
];

// Accordion toggle
apiKeyToggle.addEventListener('click', () => {
    apiKeyToggle.classList.toggle('active');
    apiKeyContent.classList.toggle('active');
});

// Custom prompts accordion toggle
customPromptsToggle.addEventListener('click', () => {
    customPromptsToggle.classList.toggle('active');
    customPromptsContent.classList.toggle('active');
});

// Image library accordion toggle
imageLibraryToggle.addEventListener('click', () => {
    imageLibraryToggle.classList.toggle('active');
    imageLibraryContent.classList.toggle('active');
});

// Official library accordion toggle
officialLibraryToggle.addEventListener('click', () => {
    officialLibraryToggle.classList.toggle('active');
    officialLibraryContent.classList.toggle('active');
});

// Check API key and update warning display
function checkApiKey() {
    const savedApiKey = localStorage.getItem('fal_api_key');
    const hasApiKey = savedApiKey && savedApiKey.trim().length > 0;

    if (hasApiKey) {
        apiWarning.classList.remove('show');
    } else {
        apiWarning.classList.add('show');
    }

    return hasApiKey;
}

// Load saved API key, custom prompts, and library images from localStorage
window.addEventListener('DOMContentLoaded', async () => {
    const savedApiKey = localStorage.getItem('fal_api_key');
    if (savedApiKey) {
        apiKeyInput.value = savedApiKey;
    }

    // Load generation settings
    const savedNumImages = localStorage.getItem('num_images');
    if (savedNumImages) {
        numImagesSelect.value = savedNumImages;
    }

    const savedAspectRatio = localStorage.getItem('aspect_ratio');
    if (savedAspectRatio) {
        aspectRatioSelect.value = savedAspectRatio;
    }

    const savedResolution = localStorage.getItem('resolution');
    if (savedResolution) {
        resolutionSelect.value = savedResolution;
    }

    const savedOutputFormat = localStorage.getItem('output_format');
    if (savedOutputFormat) {
        outputFormatSelect.value = savedOutputFormat;
    }

    // Load saved prompt
    const savedPrompt = localStorage.getItem('saved_prompt');
    if (savedPrompt) {
        promptInput.value = savedPrompt;
    }

    // Load saved reference images
    const savedReferenceImages = localStorage.getItem('reference_images');
    if (savedReferenceImages) {
        try {
            const savedImages = JSON.parse(savedReferenceImages);
            // fileオブジェクトを復元（dataUrlからBlobを作成）
            uploadedImages = [];
            for (const img of savedImages) {
                if (img.dataUrl) {
                    // dataUrlからBlobを作成してFileオブジェクトを復元
                    const response = await fetch(img.dataUrl);
                    const blob = await response.blob();
                    const file = new File([blob], img.fileName || 'image.jpg', { type: blob.type });
                    uploadedImages.push({
                        file: file,
                        dataUrl: img.dataUrl
                    });
                }
            }
        } catch (e) {
            console.error('Failed to load reference images:', e);
            uploadedImages = [];
        }
    }

    // Load saved output images
    const savedOutputImages = localStorage.getItem('output_images');
    if (savedOutputImages) {
        try {
            const outputImages = JSON.parse(savedOutputImages);
            if (outputImages && outputImages.length > 0) {
                // Display saved output images
                displaySavedOutputImages(outputImages);
            }
        } catch (e) {
            console.error('Failed to load saved output images:', e);
        }
    }

    // Load custom prompts
    const savedPrompts = localStorage.getItem('custom_prompts');
    if (savedPrompts) {
        try {
            customPrompts = JSON.parse(savedPrompts);
        } catch (e) {
            customPrompts = [];
        }
    }

    // Initialize custom prompts if empty
    if (customPrompts.length === 0) {
        customPrompts = Array(MAX_CUSTOM_PROMPTS).fill(null).map(() => ({ name: '', text: '' }));
    }

    // Load library images
    const savedLibraryImages = localStorage.getItem('library_images');
    if (savedLibraryImages) {
        try {
            libraryImages = JSON.parse(savedLibraryImages);
        } catch (e) {
            libraryImages = [];
        }
    }

    renderCustomPrompts();
    renderLibraryImages();
    renderOfficialLibrary();
    checkPromptInput();
    checkApiKey();

    // 画像が0枚の状態でも、狙いのレイアウトにする
    updateImagePreview();
});

// Render custom prompts list
function renderCustomPrompts() {
    customPromptsList.innerHTML = '';
    customPromptsButtons.innerHTML = '';

    customPrompts.forEach((prompt, index) => {
        // Render edit area in accordion
        const item = document.createElement('div');
        item.className = 'custom-prompt-item';

        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'custom-prompt-name-input';
        nameInput.placeholder = `プロンプト名 ${index + 1}`;
        nameInput.value = prompt.name;
        nameInput.addEventListener('input', (e) => {
            customPrompts[index].name = e.target.value;
            saveCustomPrompts();
            renderCustomPromptsButtons();
        });

        const textArea = document.createElement('textarea');
        textArea.className = 'custom-prompt-text';
        textArea.placeholder = 'プロンプトを入力...';
        textArea.value = prompt.text;
        textArea.rows = 2;
        textArea.addEventListener('input', (e) => {
            customPrompts[index].text = e.target.value;
            saveCustomPrompts();
            renderCustomPromptsButtons();
        });

        item.appendChild(nameInput);
        item.appendChild(textArea);
        customPromptsList.appendChild(item);
    });

    renderCustomPromptsButtons();
}

// Render custom prompts buttons outside accordion
function renderCustomPromptsButtons() {
    customPromptsButtons.innerHTML = '';

    customPrompts.forEach((prompt, index) => {
        if (prompt.text.trim()) {
            const useBtn = document.createElement('button');
            useBtn.type = 'button';
            useBtn.className = 'use-prompt-btn';
            useBtn.textContent = prompt.name || `プロンプト ${index + 1}`;
            useBtn.addEventListener('click', () => useCustomPrompt(index));
            customPromptsButtons.appendChild(useBtn);
        }
    });
}

// Save custom prompts to localStorage
function saveCustomPrompts() {
    localStorage.setItem('custom_prompts', JSON.stringify(customPrompts));
}

// Use custom prompt
function useCustomPrompt(index) {
    const prompt = customPrompts[index];
    if (prompt.text.trim()) {
        promptInput.value = prompt.text;
        checkPromptInput();
        showStatus(`「${prompt.name || 'プロンプト ' + (index + 1)}」を適用しました`, 'success');
        setTimeout(() => clearStatus(), 2000);
    }
}

// Check prompt input and enable/disable generate button
function checkPromptInput() {
    const hasPrompt = promptInput.value.trim().length > 0;
    generateBtn.disabled = !hasPrompt;
}

// Monitor prompt input and auto-save
promptInput.addEventListener('input', () => {
    checkPromptInput();
    // Auto-save prompt
    localStorage.setItem('saved_prompt', promptInput.value);
});

// Save generation settings when changed
numImagesSelect.addEventListener('change', () => {
    localStorage.setItem('num_images', numImagesSelect.value);
});

aspectRatioSelect.addEventListener('change', () => {
    localStorage.setItem('aspect_ratio', aspectRatioSelect.value);
});

resolutionSelect.addEventListener('change', () => {
    localStorage.setItem('resolution', resolutionSelect.value);
});

outputFormatSelect.addEventListener('change', () => {
    localStorage.setItem('output_format', outputFormatSelect.value);
});

// Image library add button
libraryAddBtn.addEventListener('click', () => {
    if (libraryImages.length >= MAX_LIBRARY_IMAGES) {
        showStatus(`画像ライブラリは最大${MAX_LIBRARY_IMAGES}個までです`, 'error');
        setTimeout(() => clearStatus(), 2000);
        return;
    }
    libraryFileInput.click();
});

// Image library file input
libraryFileInput.addEventListener('change', async (e) => {
    await handleLibraryFileSelect(e.target.files);
    libraryFileInput.value = '';
});

// Image library drag and drop handlers
const imageLibrarySection = document.querySelector('.image-library-section');

imageLibrarySection.addEventListener('dragover', (e) => {
    e.preventDefault();
    imageLibrarySection.classList.add('dragover');
});

imageLibrarySection.addEventListener('dragleave', (e) => {
    // Only remove dragover if leaving the section entirely
    if (e.target === imageLibrarySection) {
        imageLibrarySection.classList.remove('dragover');
    }
});

imageLibrarySection.addEventListener('drop', async (e) => {
    e.preventDefault();
    imageLibrarySection.classList.remove('dragover');
    await handleLibraryFileSelect(e.dataTransfer.files);
});

// Handle library file selection
async function handleLibraryFileSelect(files) {
    if (libraryImages.length >= MAX_LIBRARY_IMAGES) {
        showStatus(`画像ライブラリは最大${MAX_LIBRARY_IMAGES}個までです`, 'error');
        setTimeout(() => clearStatus(), 2000);
        return;
    }

    const fileArray = Array.from(files);
    const remainingSlots = MAX_LIBRARY_IMAGES - libraryImages.length;
    const filesToAdd = fileArray.slice(0, remainingSlots);

    for (const file of filesToAdd) {
        if (file.type.startsWith('image/')) {
            try {
                const compressed = await compressImage(file, MAX_IMAGE_SIZE_KB);
                libraryImages.push(compressed);
            } catch (error) {
                console.error('Image compression error:', error);
                showStatus('画像の圧縮に失敗しました', 'error');
                setTimeout(() => clearStatus(), 2000);
            }
        }
    }

    saveLibraryImages();
    renderLibraryImages();
}

// Compress image to target size
async function compressImage(file, maxSizeKB) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Start with original size
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Try different quality levels to get under maxSizeKB
                let quality = 0.9;
                let dataUrl;
                let sizeKB;

                const compress = () => {
                    dataUrl = canvas.toDataURL('image/jpeg', quality);
                    const base64Length = dataUrl.split(',')[1].length;
                    sizeKB = Math.round((base64Length * 3) / 4 / 1024);

                    if (sizeKB > maxSizeKB && quality > 0.1) {
                        // If still too large, reduce quality or dimensions
                        if (quality > 0.5) {
                            quality -= 0.1;
                        } else {
                            // Reduce dimensions
                            width = Math.floor(width * 0.9);
                            height = Math.floor(height * 0.9);
                            canvas.width = width;
                            canvas.height = height;
                            ctx.drawImage(img, 0, 0, width, height);
                            quality = 0.9;
                        }
                        compress();
                    } else {
                        resolve({
                            id: Date.now() + Math.random(),
                            dataUrl: dataUrl,
                            sizeKB: sizeKB,
                            width: width,
                            height: height
                        });
                    }
                };

                compress();
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Render library images
function renderLibraryImages() {
    imageLibraryGrid.innerHTML = '';

    libraryImages.forEach((image, index) => {
        const item = document.createElement('div');
        item.className = 'library-image-item';
        item.dataset.index = index;

        const img = document.createElement('img');
        img.src = image.dataUrl;
        img.alt = `Library ${index + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.className = 'library-image-remove';
        removeBtn.textContent = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeLibraryImage(index);
        };

        const sizeLabel = document.createElement('div');
        sizeLabel.className = 'library-image-size';
        sizeLabel.textContent = `${image.sizeKB}KB`;

        item.appendChild(img);
        item.appendChild(removeBtn);
        item.appendChild(sizeLabel);

        // Click to add to reference images
        item.addEventListener('click', () => {
            addLibraryImageToReference(index);
        });

        imageLibraryGrid.appendChild(item);
    });
}

// Save library images to localStorage
function saveLibraryImages() {
    localStorage.setItem('library_images', JSON.stringify(libraryImages));
}

// Save reference images to localStorage
function saveReferenceImages() {
    // uploadedImagesからfileを除いてdataUrlのみ保存（fileはシリアライズできない）
    const toSave = uploadedImages.map(img => ({
        dataUrl: img.dataUrl,
        fileName: img.file ? img.file.name : 'image.jpg'
    }));
    localStorage.setItem('reference_images', JSON.stringify(toSave));
}

// Save output images to localStorage
function saveOutputImages(images) {
    localStorage.setItem('output_images', JSON.stringify(images));
}

// Check if device is iOS
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.userAgent));
}

// Display saved output images (on page load)
function displaySavedOutputImages(images) {
    resultsDiv.innerHTML = '';

    images.forEach((image, index) => {
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';

        const img = document.createElement('img');
        img.src = image.url;
        img.alt = `Generated image ${index + 1}`;
        img.loading = 'lazy';

        const actions = document.createElement('div');
        actions.className = 'result-actions';

        const downloadLink = document.createElement('a');
        downloadLink.href = '#';
        downloadLink.textContent = 'ダウンロード';
        downloadLink.className = 'download-link';
        downloadLink.onclick = async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(image.url);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                const tempLink = document.createElement('a');
                tempLink.href = blobUrl;
                tempLink.download = image.file_name || `banana-${Date.now()}-${index}.png`;
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);
                setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            } catch (error) {
                console.error('Download failed:', error);
                window.open(image.url, '_blank');
            }
        };

        // Share button
        const shareBtn = document.createElement('button');
        shareBtn.textContent = '共有';
        shareBtn.className = 'share-btn';
        shareBtn.onclick = async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(image.url);
                const blob = await response.blob();
                const file = new File([blob], image.file_name || `banana-${Date.now()}-${index}.png`, { type: blob.type });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Smartphone Banana - 生成画像',
                    });
                } else if (navigator.share) {
                    await navigator.share({
                        title: 'Smartphone Banana - 生成画像',
                        url: image.url
                    });
                } else {
                    showStatus('この端末では共有機能が使えません', 'error');
                    setTimeout(() => clearStatus(), 2000);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Share failed:', error);
                    showStatus('共有に失敗しました', 'error');
                    setTimeout(() => clearStatus(), 2000);
                }
            }
        };

        actions.appendChild(downloadLink);
        actions.appendChild(shareBtn);

        // iOS hint for saving images
        if (isIOS()) {
            const iosHint = document.createElement('div');
            iosHint.className = 'ios-save-hint';
            iosHint.textContent = '💡 iPhoneは画像を長押しで保存';
            actions.appendChild(iosHint);
        }

        resultItem.appendChild(img);
        resultItem.appendChild(actions);
        resultsDiv.appendChild(resultItem);
    });
}

// Render official library images
function renderOfficialLibrary() {
    officialLibraryGrid.innerHTML = '';

    OFFICIAL_TEMPLATE_IMAGES.forEach((filename) => {
        const item = document.createElement('div');
        item.className = 'official-library-item';

        const img = document.createElement('img');
        img.src = `template/${filename}`;
        img.alt = filename;

        const nameLabel = document.createElement('div');
        nameLabel.className = 'official-library-item-name';
        nameLabel.textContent = filename.replace('.jpg', '');

        item.appendChild(img);
        item.appendChild(nameLabel);

        // Click to add to reference images
        item.addEventListener('click', () => {
            addOfficialImageToReference(filename);
        });

        officialLibraryGrid.appendChild(item);
    });
}

// Add official library image to reference images
async function addOfficialImageToReference(filename) {
    if (uploadedImages.length >= 4) {
        showStatus('参照画像は最大4枚までです', 'error');
        return;
    }

    try {
        // Fetch the image from the template folder
        const response = await fetch(`template/${filename}`);
        const blob = await response.blob();

        // Create File object
        const file = new File([blob], filename, { type: blob.type });

        // Add to uploaded images
        const dataUrl = await readFileAsDataURL(file);
        uploadedImages.push({ file, dataUrl });

        updateImagePreview();
        showStatus(`公式ライブラリから「${filename.replace('.jpg', '')}」を追加しました`, 'success');
    } catch (error) {
        console.error('Failed to load official image:', error);
        showStatus('画像の読み込みに失敗しました', 'error');
    }
}

// Helper function to read file as data URL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Show confirmation dialog
function showConfirmDialog(message, onConfirm) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'confirm-dialog-overlay';

    // Create dialog
    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';

    // Message
    const messageEl = document.createElement('div');
    messageEl.className = 'confirm-dialog-message';
    messageEl.textContent = message;

    // Buttons container
    const buttonsEl = document.createElement('div');
    buttonsEl.className = 'confirm-dialog-buttons';

    // Yes button
    const yesBtn = document.createElement('button');
    yesBtn.className = 'confirm-dialog-btn yes';
    yesBtn.textContent = 'はい';
    yesBtn.onclick = () => {
        document.body.removeChild(overlay);
        onConfirm();
    };

    // No button
    const noBtn = document.createElement('button');
    noBtn.className = 'confirm-dialog-btn no';
    noBtn.textContent = 'いいえ';
    noBtn.onclick = () => {
        document.body.removeChild(overlay);
    };

    buttonsEl.appendChild(noBtn);
    buttonsEl.appendChild(yesBtn);

    dialog.appendChild(messageEl);
    dialog.appendChild(buttonsEl);
    overlay.appendChild(dialog);

    // Close on overlay click
    overlay.onclick = (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    };

    document.body.appendChild(overlay);
}

// Remove library image
function removeLibraryImage(index) {
    showConfirmDialog('ライブラリから削除しますか？', () => {
        libraryImages.splice(index, 1);
        saveLibraryImages();
        renderLibraryImages();
    });
}

// Add library image to reference images
function addLibraryImageToReference(index) {
    if (uploadedImages.length >= 4) {
        showStatus('参照画像は最大4枚までです', 'error');
        setTimeout(() => clearStatus(), 2000);
        return;
    }

    const libraryImage = libraryImages[index];

    // Convert dataUrl back to file
    fetch(libraryImage.dataUrl)
        .then(res => res.blob())
        .then(blob => {
            const file = new File([blob], `library-${index}.jpg`, { type: 'image/jpeg' });
            uploadedImages.push({
                file: file,
                dataUrl: libraryImage.dataUrl
            });
            updateImagePreview();
            showStatus('参照画像に追加しました', 'success');
            setTimeout(() => clearStatus(), 1500);
        });
}

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
    checkApiKey();
});

// Delete API key button
deleteApiKeyBtn.addEventListener('click', () => {
    if (confirm('保存されているAPIキーを削除しますか？')) {
        localStorage.removeItem('fal_api_key');
        apiKeyInput.value = '';
        showStatus('APIキーが削除されました', 'success');
        setTimeout(() => clearStatus(), 3000);
        checkApiKey();
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

// Image upload handlers - using capture phase to prevent bubbling issues
uploadDropZone.addEventListener('click', () => {
    if (uploadedImages.length < 4) {
        imageFileInput.click();
    }
});

imageFileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files);
});

// Camera button handler
cameraBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (uploadedImages.length < 4) {
        cameraFileInput.click();
    } else {
        showStatus('参照画像は最大4枚までです', 'error');
        setTimeout(() => clearStatus(), 2000);
    }
});

// Camera file input handler
cameraFileInput.addEventListener('change', (e) => {
    handleFileSelect(e.target.files);
    cameraFileInput.value = ''; // Reset for next use
});

// Drag and drop handlers
uploadDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadDropZone.classList.add('dragover');
});

uploadDropZone.addEventListener('dragleave', () => {
    uploadDropZone.classList.remove('dragover');
});

uploadDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadDropZone.classList.remove('dragover');
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

    // もうグリッド側だけを使うので、常に隠す
    if (uploadControls) {
        uploadControls.style.display = 'none';
    }

    // Auto-save reference images
    saveReferenceImages();

    // Add uploaded images to grid
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

    // Add drop zone and camera button to grid when 0-3 images are uploaded
    if (uploadedImages.length < 4) {
        // Calculate drop zone span (4 - number of images)
        const dropZoneSpan = 4 - uploadedImages.length;

        // Drop zone
        const dropZoneGrid = document.createElement('div');
        dropZoneGrid.className = 'upload-drop-zone-grid';
        dropZoneGrid.style.gridColumn = `span ${dropZoneSpan}`;
        dropZoneGrid.innerHTML = `
            <p>📁</p>
            <small>クリック or ドラッグ&ドロップ</small>
        `;
        dropZoneGrid.onclick = () => imageFileInput.click();

        // Drag & drop for grid drop zone
        dropZoneGrid.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZoneGrid.classList.add('dragover');
        });
        dropZoneGrid.addEventListener('dragleave', () => {
            dropZoneGrid.classList.remove('dragover');
        });
        dropZoneGrid.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZoneGrid.classList.remove('dragover');
            handleFileSelect(e.dataTransfer.files);
        });

        imagePreviewContainer.appendChild(dropZoneGrid);

        // Camera button (always 1 column)
        const cameraGridItem = document.createElement('div');
        cameraGridItem.className = 'camera-zone-grid';

        const cameraBtnClone = document.createElement('button');
        cameraBtnClone.className = 'camera-btn';
        cameraBtnClone.onclick = () => cameraFileInput.click();

        const cameraIconClone = document.createElement('img');
        cameraIconClone.src = './icons/camera.png';
        cameraIconClone.alt = 'Camera';
        cameraIconClone.className = 'camera-icon';

        cameraBtnClone.appendChild(cameraIconClone);
        cameraGridItem.appendChild(cameraBtnClone);
        imagePreviewContainer.appendChild(cameraGridItem);
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
    if (isLoading) {
        generateBtn.disabled = true;
        btnText.style.display = 'none';
        btnLoader.style.display = 'inline-block';
        cancelBtn.style.display = 'block';
        isCancelled = false;
    } else {
        checkPromptInput(); // Re-enable based on prompt
        btnText.style.display = 'inline-block';
        btnLoader.style.display = 'none';
        cancelBtn.style.display = 'none';
    }
}

// Cancel generation
cancelBtn.addEventListener('click', () => {
    isCancelled = true;
    setLoading(false);
    showStatus('生成をキャンセルしました', 'info');
    console.log('Generation cancelled by user');
});

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
        const statusUrl = submitData.status_url || `${baseUrl}/requests/${requestId}/status`;
        const resultUrl = submitData.response_url || `${baseUrl}/requests/${requestId}`;

        console.log('API Request submitted:', {
            endpoint: FAL_API_URL,
            requestId: requestId,
            statusUrl: statusUrl,
            resultUrl: resultUrl,
            useEditMode: useEditMode
        });

        showStatus('リクエストを送信しました。画像を生成中...', 'info');

        // Poll for results
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max (5s interval)

        while (attempts < maxAttempts) {
            // Check if cancelled
            if (isCancelled) {
                console.log('Generation cancelled during polling');
                throw new Error('生成がキャンセルされました');
            }

            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds

            // Check again after wait
            if (isCancelled) {
                console.log('Generation cancelled during polling');
                throw new Error('生成がキャンセルされました');
            }

            const statusResponse = await fetch(statusUrl, {
                headers: {
                    'Authorization': `Key ${apiKey}`,
                }
            });

            if (!statusResponse.ok) {
                throw new Error(`Status check failed: ${statusResponse.status}`);
            }

            const statusData = await statusResponse.json();
            console.log('Status check response:', {
                status: statusData.status,
                hasImages: !!(statusData.images && statusData.images.length > 0),
                attempt: attempts + 1
            });

            if (statusData.status === 'COMPLETED') {
                // Check if result is already in statusData
                if (statusData.images && statusData.images.length > 0) {
                    console.log('✓ Result found in status response, returning directly');
                    return statusData;
                }

                // Otherwise, fetch the actual result
                console.log('Fetching result from:', resultUrl);
                try {
                    const resultResponse = await fetch(resultUrl, {
                        headers: {
                            'Authorization': `Key ${apiKey}`,
                        }
                    });

                    console.log('Result fetch response status:', resultResponse.status);

                    if (!resultResponse.ok) {
                        console.warn(`✗ Result fetch failed with status ${resultResponse.status}`);
                        // If result fetch fails but we have statusData, try to use it
                        if (statusData) {
                            console.log('Using statusData as fallback (response not ok)');
                            return statusData;
                        }
                        throw new Error(`Result fetch failed: ${resultResponse.status}`);
                    }

                    const result = await resultResponse.json();
                    console.log('✓ Result fetched successfully:', {
                        hasImages: !!(result.images && result.images.length > 0),
                        hasData: !!(result.data)
                    });
                    return result;
                } catch (resultError) {
                    console.error('✗ Result fetch error:', resultError);
                    // If result fetch fails but we have completed status, try to use statusData
                    if (statusData) {
                        console.log('Using statusData as fallback (error caught)');
                        return statusData;
                    }
                    throw resultError;
                }
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
        console.error('API Error Details:', {
            message: error.message,
            stack: error.stack,
            name: error.name
        });
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

    // Save output images to localStorage
    saveOutputImages(data.images);

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
        downloadLink.href = '#';
        downloadLink.textContent = 'ダウンロード';
        downloadLink.className = 'download-link';
        downloadLink.onclick = async (e) => {
            e.preventDefault();
            try {
                // Fetch the image as a blob
                const response = await fetch(image.url);
                const blob = await response.blob();

                // Create a temporary URL for the blob
                const blobUrl = URL.createObjectURL(blob);

                // Create a temporary link and trigger download
                const tempLink = document.createElement('a');
                tempLink.href = blobUrl;
                tempLink.download = image.file_name || `banana-${Date.now()}-${index}.png`;
                document.body.appendChild(tempLink);
                tempLink.click();
                document.body.removeChild(tempLink);

                // Clean up the blob URL
                setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            } catch (error) {
                console.error('Download failed:', error);
                // Fallback: open in new tab
                window.open(image.url, '_blank');
            }
        };

        // Share button
        const shareBtn = document.createElement('button');
        shareBtn.textContent = '共有';
        shareBtn.className = 'share-btn';
        shareBtn.onclick = async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(image.url);
                const blob = await response.blob();
                const file = new File([blob], image.file_name || `banana-${Date.now()}-${index}.png`, { type: blob.type });

                if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        files: [file],
                        title: 'Smartphone Banana - 生成画像',
                    });
                } else if (navigator.share) {
                    // Fallback: share URL only
                    await navigator.share({
                        title: 'Smartphone Banana - 生成画像',
                        url: image.url
                    });
                } else {
                    // Web Share API not supported
                    showStatus('この端末では共有機能が使えません', 'error');
                    setTimeout(() => clearStatus(), 2000);
                }
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Share failed:', error);
                    showStatus('共有に失敗しました', 'error');
                    setTimeout(() => clearStatus(), 2000);
                }
            }
        };

        actions.appendChild(downloadLink);
        actions.appendChild(shareBtn);

        // iOS hint for saving images
        if (isIOS()) {
            const iosHint = document.createElement('div');
            iosHint.className = 'ios-save-hint';
            iosHint.textContent = '💡 iPhoneは画像を長押しで保存';
            actions.appendChild(iosHint);
        }

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
