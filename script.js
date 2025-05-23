// Final Integrated Script - End of Stage 7, Module 1

const video = document.getElementById('video');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const objectList = document.getElementById('objectList');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const videoUpload = document.getElementById('videoUpload');
const imageUpload = document.getElementById('imageUpload'); 
const displayedImageElement = document.getElementById('displayedImage');

const COCO_CLASSES = [
    'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
    'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
    'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
    'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
    'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
    'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
    'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
    'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
    'hair drier', 'toothbrush'
]; 

let activeModel = {
    name: null, 
    instance: null, 
    isLoading: false,
    error: null
};
let isDetecting = false;
let batchImageResults = []; 

// Element references
let confidenceSlider;
let confidenceValueDisplay;
let iouSlider;
let iouValueDisplay;

// Thresholds
let currentConfidenceThreshold = 0.5; 
let currentIouThreshold = 0.45; 

let currentMainMediaPredictions = []; 

function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('Toast container not found! Cannot show toast:', message);
        alert(`${type.toUpperCase()}: ${message}`); // Fallback
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'p-4 rounded-md shadow-lg flex items-center justify-between text-sm animate-fade-in-right'; 

    let bgColor, textColor, iconSVG;
    switch (type) {
        case 'success':
            bgColor = 'bg-emerald-600 dark:bg-emerald-700'; // Updated
            textColor = 'text-white';
            iconSVG = `<svg class="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
            break;
        case 'error':
            bgColor = 'bg-red-600 dark:bg-red-700'; // Updated (darker shade)
            textColor = 'text-white';
            iconSVG = `<svg class="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
            break;
        case 'warning':
            bgColor = 'bg-amber-500 dark:bg-amber-600'; // Updated
            textColor = 'text-slate-900'; // Updated for better contrast on amber with dark theme
            iconSVG = `<svg class="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.216 3.031-1.742 3.031H4.42c-1.526 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-3a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>`;
            break;
        default: // info
            bgColor = 'bg-cyan-600 dark:bg-cyan-700'; // Updated to cyan
            textColor = 'text-white';
            iconSVG = `<svg class="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>`;
            break;
    }
    toast.classList.add(...bgColor.split(' '), ...textColor.split(' '));

    const messageSpan = document.createElement('span');
    messageSpan.innerHTML = iconSVG; 
    messageSpan.appendChild(document.createTextNode(message)); 
    messageSpan.classList.add('flex', 'items-center');


    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.className = 'ml-4 text-xl font-semibold leading-none hover:opacity-75 focus:outline-none';
    closeButton.onclick = () => {
        toast.classList.remove('animate-fade-in-right');
        toast.classList.add('animate-fade-out-right'); 
        setTimeout(() => toast.remove(), 300); 
    };

    toast.appendChild(messageSpan);
    toast.appendChild(closeButton);
    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.remove('animate-fade-in-right');
            toast.classList.add('animate-fade-out-right'); 
            setTimeout(() => toast.remove(), 300); 
        }
    }, duration);
}

function updateModelSelectorUI(selectedModelName) {
    const buttons = document.querySelectorAll('.model-selector-btn');
    buttons.forEach(button => {
        const modelName = button.dataset.modelName;
        const checkmark = document.getElementById(`checkmark-${modelName}`);
        const loadingIndicator = button.querySelector('.model-loading-indicator');

        // HTML already updated with tech-savvy classes like 'bg-cyan-700', 'ring-cyan-500' for selected
        // and 'bg-slate-800' for not selected.
        // This JS function dynamically ADDS these classes based on selection,
        // so the class names here should match what's intended in the HTML for the *selected* state.
        // And it REMOVES selected state classes and ADDS base state classes for *deselected*.

        if (modelName === selectedModelName) {
            // Add classes for SELECTED state (these should match the tech-savvy selected style from index.html)
            button.classList.add('bg-cyan-700', 'ring-2', 'ring-cyan-500'); // Tech-savvy selected
            button.classList.remove('bg-slate-800', 'hover:bg-slate-700'); // Remove base/hover state for tech-savvy
            button.setAttribute('aria-pressed', 'true');
            if (checkmark) checkmark.classList.remove('hidden');
            if (loadingIndicator && !activeModel.isLoading) loadingIndicator.classList.add('hidden');

        } else {
            // Add classes for DESELECTED/BASE state (these should match tech-savvy base style from index.html)
            button.classList.remove('bg-cyan-700', 'ring-2', 'ring-cyan-500'); // Remove tech-savvy selected
            button.classList.add('bg-slate-800', 'hover:bg-slate-700');    // Add base state for tech-savvy
            button.setAttribute('aria-pressed', 'false');
            if (checkmark) checkmark.classList.add('hidden');
            if (loadingIndicator) loadingIndicator.classList.add('hidden'); 
        }
    });
}

function setLoadingState(isLoading, message = "") {
    activeModel.isLoading = isLoading;
    const loadingStatusEl = document.getElementById('model-loading-status');
    const modelButtons = document.querySelectorAll('.model-selector-btn');

    if (loadingStatusEl) {
        loadingStatusEl.textContent = message;
    }

    modelButtons.forEach(button => {
        button.disabled = isLoading;
        const modelNameForButton = button.dataset.modelName;
        const loadingIndicator = button.querySelector('.model-loading-indicator');
        const percentageText = button.querySelector('.loading-percentage');
        const mainTextElements = button.querySelectorAll('.model-name-text, .model-desc-text, .checkmark-icon');

        if (isLoading && activeModel.name === modelNameForButton) { // Show spinner only on the button being loaded
            button.classList.add('opacity-75', 'cursor-not-allowed'); 
            if (loadingIndicator) loadingIndicator.classList.remove('hidden');
            if (percentageText) percentageText.textContent = ''; // Reset percentage initially
            mainTextElements.forEach(el => el.classList.add('opacity-0')); // Hide text and checkmark
        } else if (isLoading) { // Other buttons are disabled but don't show their spinner
             button.classList.add('opacity-50', 'cursor-not-allowed');
             if (loadingIndicator) loadingIndicator.classList.add('hidden');
             mainTextElements.forEach(el => el.classList.remove('opacity-0')); // Ensure text is visible
        } else { // Not loading
            button.classList.remove('opacity-75', 'opacity-50', 'cursor-not-allowed');
            if (loadingIndicator) loadingIndicator.classList.add('hidden');
            mainTextElements.forEach(el => el.classList.remove('opacity-0'));
        }
    });
    
    console.log(`setLoadingState: isLoading=${isLoading}, activeModel.instance is ${activeModel.instance ? 'NOT null' : 'null'}`);
    startButton.disabled = isLoading || (activeModel.instance === null);
    if(startButton.disabled) startButton.classList.add('opacity-50', 'cursor-not-allowed'); else startButton.classList.remove('opacity-50', 'cursor-not-allowed');
    console.log(`setLoadingState: startButton.disabled set to ${startButton.disabled}`);
    
    videoUpload.disabled = isLoading;
    imageUpload.disabled = isLoading;
    if (confidenceSlider) confidenceSlider.disabled = isLoading;
    if (iouSlider) iouSlider.disabled = isLoading;
}

async function loadSelectedModel(modelName) {
    if (activeModel.isLoading && activeModel.name === modelName) {
        console.log(`Loading for ${modelName} is already in progress.`);
        return;
    }
     if (activeModel.name === modelName && activeModel.instance && !activeModel.isLoading) {
        console.log(`${modelName} is already loaded and active.`);
        showToast(`${modelName} 模型已加载。`, 'info', 3000);
        return;
    }

    const prevModelName = activeModel.name;
    activeModel.name = modelName; 
    activeModel.isLoading = true; 
    activeModel.error = null;
    activeModel.instance = null; 
    
    if (prevModelName) updateModelSelectorUI(prevModelName); // Deselect old one visually
    updateModelSelectorUI(modelName); // Select new one and prepare for loading UI
    setLoadingState(true, `正在加载 ${modelName} 模型...`); // This will show spinner on the correct button

    try {
        let newModelInstance;
        const currentModelButton = document.getElementById(`model-${modelName}`);
        const percentageTextEl = currentModelButton ? currentModelButton.querySelector('.loading-percentage') : null;

        if (modelName === "cocoSsd") {
            if (percentageTextEl) percentageTextEl.textContent = ''; 
            newModelInstance = await cocoSsd.load();
        } else if (modelName === "mobileNetSsd" || modelName === "yoloV5s") {
            let modelUrl;
            if (modelName === "mobileNetSsd") {
                modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/coco/uint8/2/default/1/model.json?tfjs-format=graph-model';
                newModelInstance = await tf.loadGraphModel(modelUrl, {
                    onProgress: (fraction) => {
                        if (percentageTextEl && activeModel.isLoading && activeModel.name === modelName) {
                            percentageTextEl.textContent = `${Math.round(fraction * 100)}%`;
                        }
                    }
                });
                newModelInstance.modelType = "mobileNetSsd";
            } else { // yoloV5s
                modelUrl = 'https://raw.githubusercontent.com/zldrobit/yolov5/tfjs_graph_model/model_yolov5s_tfjs/model.json';
                newModelInstance = await tf.loadGraphModel(modelUrl, {
                    onProgress: (fraction) => {
                       if (percentageTextEl && activeModel.isLoading && activeModel.name === modelName) {
                            percentageTextEl.textContent = `${Math.round(fraction * 100)}%`;
                        }
                    }
                });
                newModelInstance.modelType = "yoloV5s";
                newModelInstance.inputShape = [1, 640, 640, 3];
            }
            newModelInstance.isGraphModel = true;
        } else {
            throw new Error(`未知模型: ${modelName}`);
        }
        
        if (activeModel.name !== modelName) {
             console.warn(`Model loading for ${modelName} completed, but another model (${activeModel.name}) load was initiated. Discarding ${modelName}.`);
             if (newModelInstance && typeof newModelInstance.dispose === 'function') {
                newModelInstance.dispose();
             }
             return; 
        }
            
        activeModel.instance = newModelInstance;
        activeModel.isLoading = false; 
        console.log(`loadSelectedModel: ${modelName} instance assigned. isLoading set to false.`);
        
        setLoadingState(false, `${modelName} 加载完成!`); 
        updateModelSelectorUI(modelName); // Ensure correct button is highlighted after loading
        showToast(`${modelName} 模型加载成功!`, 'success');


    } catch (err) {
        console.error(`Error loading ${modelName} model (raw error object):`, err); 
        
        let errorMessage = err.message || "未知错误";
        if (err.stack) {
            console.error("Stack trace:", err.stack);
        }
        if (err.name) {
            errorMessage = `${err.name}: ${errorMessage}`;
        }

        if(activeModel.name === modelName || activeModel.name === null) { 
            activeModel.error = err; 
            activeModel.instance = null;
            activeModel.isLoading = false; 
            setLoadingState(false, `${modelName} 加载失败。`); 
            updateModelSelectorUI(null); 
            showToast(`${modelName} 加载失败: ${errorMessage.substring(0, 100)}`, 'error', 7000); 
        } else {
             console.warn(`Error for ${modelName} but active model is ${activeModel.name}. Ignoring stale error.`);
        }
    }
}

function clearAllMediaAndResults() {
    console.log("Clearing all media and results due to model switch or media change...");

    if (video.srcObject) {
        const stream = video.srcObject;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (video.src && video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src);
        video.src = "";
    }
    video.style.display = 'none'; 
    video.controls = false;

    if (displayedImageElement.src) {
        displayedImageElement.src = "";
        displayedImageElement.classList.add('hidden');
    }
    
    const mediaContainer = document.getElementById('container');
    const placeholder = document.getElementById('main-content-placeholder');
    if (mediaContainer) mediaContainer.style.display = 'none';
    if (placeholder) placeholder.classList.remove('hidden');

    isDetecting = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none'; 

    objectList.innerHTML = '<li class="text-slate-500">请选择媒体并开始分析。</li>'; // Updated class

    batchImageResults = []; 
    const summaryListElement = document.getElementById('imageSummaryList');
    if (summaryListElement) {
        summaryListElement.innerHTML = '<li class="text-slate-500">上传图片以查看摘要。</li>'; // Updated class
    }

    const loadingStatusEl = document.getElementById('model-loading-status');
    if (loadingStatusEl) {
        if (!activeModel.isLoading && !activeModel.error && activeModel.name && activeModel.instance) {
             loadingStatusEl.textContent = activeModel.name + ' 已准备好。请选择媒体。';
        } else if (activeModel.isLoading) {
            // Keep current loading message
        } else if (activeModel.error) {
            loadingStatusEl.textContent = `${activeModel.name || '模型'} 加载失败。请重试。`;
        } else {
             loadingStatusEl.textContent = '选择模型并加载媒体进行分析。';
        }
    }
    currentMainMediaPredictions = []; 
}

async function detectObjects() {
    if (!isDetecting) return;
    if (!activeModel.instance) {
        console.warn("detectObjects: No active model instance.");
        requestAnimationFrame(detectObjects); 
        return;
    }

    let predictions = [];
    try {
        if (video.readyState >= 3) { 
            if (activeModel.instance.modelType === "yoloV5s") {
                const modelInputShape = activeModel.instance.inputShape.slice(1, 3); 
                const { tensor: inputTensor, letterboxInfo } = preprocessInputYoloV5s(video, modelInputShape);
                
                const rawOutputTensor = await activeModel.instance.executeAsync(inputTensor);
                tf.dispose(inputTensor); 

                const outputTensorForPost = Array.isArray(rawOutputTensor) ? rawOutputTensor[0] : rawOutputTensor;

                predictions = await postprocessOutputYoloV5s(
                    outputTensorForPost, 
                    video.videoWidth,
                    video.videoHeight,
                    letterboxInfo,
                    currentConfidenceThreshold,
                    currentIouThreshold 
                );
                if (Array.isArray(rawOutputTensor)) {
                    for (let i = 1; i < rawOutputTensor.length; i++) {
                        tf.dispose(rawOutputTensor[i]);
                    }
                }

            } else if (activeModel.instance.isGraphModel) { 
                const inputTensor = preprocessInput(video, activeModel.instance.inputShape); 
                const outputTensors = await activeModel.instance.executeAsync(inputTensor);
                tf.dispose(inputTensor);
                predictions = await postprocessOutputMobileNetSsd(outputTensors, video.videoWidth, video.videoHeight, currentConfidenceThreshold);
            } else if (activeModel.instance) { 
                predictions = await activeModel.instance.detect(video);
            }
        }
    } catch (err) {
        console.error("Error during object detection (detectObjects): ", err);
        isDetecting = false; 
        setLoadingState(false, `检测出错: ${err.message.substring(0,100)}`);
        showToast(`视频检测时发生错误: ${err.message.substring(0,100)}`, 'error');
    }

    drawResults(predictions || []); 

    if (isDetecting) { 
        requestAnimationFrame(detectObjects);
    }
}

function drawResults(predictions) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    objectList.innerHTML = ''; 

    predictions.forEach(prediction => {
        if (prediction.score > currentConfidenceThreshold) { 
            const [x, y, width, height] = prediction.bbox;

            context.strokeStyle = '#0891b2'; // Cyan-600 for bounding box
            context.lineWidth = 2;
            context.strokeRect(x, y, width, height);

            context.fillStyle = '#0891b2'; // Cyan-600 for text background (or just text color)
            context.font = '16px Arial';
            const label = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
            
            // For better text visibility with dark boxes, consider a small background for the text
            const textWidth = context.measureText(label).width;
            context.fillStyle = 'rgba(15, 23, 42, 0.7)'; // slate-900 with opacity
            context.fillRect(x, y > 20 ? y - 20 : y, textWidth + 4, 20);
            context.fillStyle = '#e2e8f0'; // slate-200 for text
            context.fillText(label, x + 2, y > 20 ? y - 5 : y + 15);


            const listItem = document.createElement('li');
            // Class already updated in index.html to text-slate-300, JS just sets textContent
            listItem.textContent = label; 
            objectList.appendChild(listItem);
        }
    });
}

startButton.addEventListener('click', async () => {
    clearAllMediaAndResults(); // Clear everything before starting new media
    
    document.getElementById('main-content-placeholder').classList.add('hidden');
    document.getElementById('container').style.display = 'block'; 
    video.style.display = 'block';
    displayedImageElement.classList.add('hidden');
    canvas.style.display = 'block';
    video.controls = false; 

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.controls = false; 
            video.play(); 
        } catch (err) {
            console.error("Error accessing the camera: ", err);
            if (err.name === "NotAllowedError") {
                showToast("摄像头访问被拒绝。请允许访问以使用此功能。", 'warning');
            } else if (err.name === "NotFoundError") {
                showToast("未在您的设备上找到摄像头。", 'warning');
            } else {
                showToast("访问摄像头时发生错误：" + err.message, 'error');
            }
            clearAllMediaAndResults(); // Re-show placeholder on error
        }
    } else {
        showToast("您的浏览器不支持 getUserMedia。", 'error');
        clearAllMediaAndResults(); // Re-show placeholder
    }
});

stopButton.addEventListener('click', () => {
    if (video.srcObject) {
        const stream = video.srcObject;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    isDetecting = false;
    if (video.src && video.src.startsWith('blob:')) { // If it was a video file
        URL.revokeObjectURL(video.src);
        video.src = "";
    }
    // Don't call clearAllMediaAndResults here to keep model selection,
    // but do clear the media display part
    video.style.display = 'none';
    displayedImageElement.classList.add('hidden');
    displayedImageElement.src = '';
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none';
    objectList.innerHTML = '<li class="text-slate-500">媒体已停止。</li>'; // Updated class
    document.getElementById('main-content-placeholder').classList.remove('hidden');
    document.getElementById('container').style.display = 'none';
    currentMainMediaPredictions = [];
});

video.addEventListener('play', () => {
    if (video.srcObject) { 
        console.log("Camera stream playing. Setting canvas and starting detection.");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        isDetecting = true;
        detectObjects();
    } else if (video.src && video.src.startsWith('blob:')) {
        console.log("Uploaded video playing. Detection started by onloadeddata.");
    } else {
        console.log("Video 'play' event fired, but no identifiable stream or blob src.");
    }
});

function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        clearAllMediaAndResults(); // Clear everything before starting new media

        document.getElementById('main-content-placeholder').classList.add('hidden');
        document.getElementById('container').style.display = 'block';
        video.style.display = 'block';
        displayedImageElement.classList.add('hidden');
        canvas.style.display = 'block';

        const fileURL = URL.createObjectURL(file);
        video.src = fileURL; 
        video.controls = true; 

        video.onloadeddata = () => {
            console.log("Video data loaded. Setting canvas and starting detection.");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            isDetecting = true; 
            detectObjects(); 
            video.play(); 
        };

        video.onended = () => {
            console.log("Video ended.");
            isDetecting = false;
            if (video.src && video.src.startsWith('blob:')) { 
                URL.revokeObjectURL(video.src);
                console.log("Revoked object URL on video end.");
            }
            // Consider calling clearAllMediaAndResults or a subset to reset UI
            stopButton.click(); // Simulate stop button press to reset UI
        };
    }
}

videoUpload.addEventListener('change', handleVideoUpload);

async function handleImageUpload(event) { 
    const files = event.target.files;
    if (!files.length) {
        return;
    }
    clearAllMediaAndResults(); // Clear previous state

    batchImageResults = []; // Reset batch results

    console.log(`Processing ${files.length} image(s)...`);
    showToast(`正在处理 ${files.length} 张图片...`, 'info', 3000);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        const imageId = `batchImage-${Date.now()}-${i}`; 

        try {
            const dataURL = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Don't display image in main view yet, just process
            const tempImg = document.createElement('img');
            tempImg.src = dataURL;
            await new Promise((resolve, reject) => {
                tempImg.onload = resolve;
                tempImg.onerror = (e) => {
                    console.error(`Error loading temp image ${fileName}:`, e);
                    reject(new Error(`Failed to load temp image ${fileName}`));
                };
            });

            const predictions = await performImageDetection(tempImg);

            batchImageResults.push({
                id: imageId,
                fileName: fileName,
                dataURL: dataURL,
                predictions: predictions || [] 
            });

            console.log(`Processed and stored: ${fileName}`);

        } catch (error) {
            console.error(`Error processing file ${fileName}:`, error);
            showToast(`处理文件 ${fileName} 出错: ${error.message}`, 'error');
        }
    }

    console.log("All images processed. Batch results:", batchImageResults);
    displayImageSummaries(); 

    if (batchImageResults.length > 0) {
        // Select the first image by default, or let user click
        handleSummaryItemClick(batchImageResults[0].id);
        showToast(`${batchImageResults.length} 张图片处理完成。`, 'success');
    } else {
        // No images successfully processed, show placeholder
        document.getElementById('main-content-placeholder').classList.remove('hidden');
        document.getElementById('container').style.display = 'none';
        canvas.style.display = 'none';
        objectList.innerHTML = '<li class="text-slate-500">未处理任何图片或处理失败。</li>';  // Updated class
    }
}

imageUpload.addEventListener('change', handleImageUpload);

async function performImageDetection(imgElement) {
    if (!activeModel.instance || !imgElement) {
        console.error("Model or image element not available for detection.");
        return null;
    }

    console.log("Performing detection on image:", imgElement.id || imgElement.src.substring(0,30));
    let predictions = []; 

    try {
        if (activeModel.instance.modelType === "yoloV5s") {
            const modelInputShape = activeModel.instance.inputShape.slice(1, 3); 
            const { tensor: inputTensor, letterboxInfo } = preprocessInputYoloV5s(imgElement, modelInputShape);
            
            const rawOutputTensor = await activeModel.instance.executeAsync(inputTensor);
            tf.dispose(inputTensor);

            const outputTensorForPost = Array.isArray(rawOutputTensor) ? rawOutputTensor[0] : rawOutputTensor;
            
            predictions = await postprocessOutputYoloV5s(
                outputTensorForPost,
                imgElement.naturalWidth,
                imgElement.naturalHeight,
                letterboxInfo,
                currentConfidenceThreshold,
                currentIouThreshold 
            );
            if (Array.isArray(rawOutputTensor)) {
                for (let i = 1; i < rawOutputTensor.length; i++) {
                    tf.dispose(rawOutputTensor[i]);
                }
            }

        } else if (activeModel.instance.isGraphModel) { 
            const inputTensor = preprocessInput(imgElement, activeModel.instance.inputShape);
            const outputTensors = await activeModel.instance.executeAsync(inputTensor);
            tf.dispose(inputTensor);
            predictions = await postprocessOutputMobileNetSsd(outputTensors, imgElement.naturalWidth, imgElement.naturalHeight, currentConfidenceThreshold);
        
        } else if (activeModel.instance) { 
            predictions = await activeModel.instance.detect(imgElement);
        }
        console.log("Image detection complete. Predictions:", predictions);
        return predictions;
    } catch (err) {
        console.error(`Error during image object detection for ${activeModel.name}:`, err);
        showToast(`图片检测 (${activeModel.name}) 失败: ${err.message.substring(0,100)}`, 'error'); 
        return null; 
    }
}

function preprocessInputYoloV5s(mediaElement, modelInputShape = [640, 640]) {
    const modelHeight = modelInputShape[0];
    const modelWidth = modelInputShape[1];

    return tf.tidy(() => {
        const imgTensor = tf.browser.fromPixels(mediaElement);
        const originalHeight = imgTensor.shape[0];
        const originalWidth = imgTensor.shape[1];

        const r = Math.min(modelHeight / originalHeight, modelWidth / originalWidth);
        const newUnpadWidth = Math.round(originalWidth * r);
        const newUnpadHeight = Math.round(originalHeight * r);

        const resizedImg = tf.image.resizeBilinear(imgTensor, [newUnpadHeight, newUnpadWidth], true);

        const dw = (modelWidth - newUnpadWidth) / 2;
        const dh = (modelHeight - newUnpadHeight) / 2;

        const paddingTop = Math.floor(dh);
        const paddingBottom = Math.ceil(dh);
        const paddingLeft = Math.floor(dw);
        const paddingRight = Math.ceil(dw);
        
        const paddedImg = tf.pad(
            resizedImg,
            [[paddingTop, paddingBottom], [paddingLeft, paddingRight], [0, 0]],
            114 // YOLOv5 common padding color (gray)
        );

        const normalizedImg = paddedImg.toFloat().div(255.0);
        const batchedImg = normalizedImg.expandDims(0); 

        const letterboxInfo = {
            originalWidth,
            originalHeight,
            paddedWidth: modelWidth, 
            paddedHeight: modelHeight, 
            ratio: r, 
            dw: dw, 
            dh: dh  
        };

        return { tensor: batchedImg, letterboxInfo: letterboxInfo };
    });
}

function preprocessInput(mediaElement, modelInputShape = [1, 300, 300, 3]) {
    const targetHeight = modelInputShape[1];
    const targetWidth = modelInputShape[2];

    return tf.tidy(() => {
        let inputTensor = tf.browser.fromPixels(mediaElement);
        const resizedTensor = tf.image.resizeBilinear(inputTensor, [targetHeight, targetWidth], true);
        const floatInput = resizedTensor.toFloat();
        const expandedTensor = floatInput.expandDims(0); 
        return expandedTensor;
    });
}

async function postprocessOutputMobileNetSsd(predictionOutputs, imageWidth, imageHeight, confidenceThreshold = 0.5) {
    const boxesTensor = predictionOutputs[0];     
    const classesTensor = predictionOutputs[1];   
    const scoresTensor = predictionOutputs[2];    
    const numDetectionsTensor = predictionOutputs[3]; 

    const boxes = await boxesTensor.array(); 
    const classes = await classesTensor.array();
    const scores = await scoresTensor.array();
    const numDetections = (await numDetectionsTensor.array())[0]; 

    tf.dispose([boxesTensor, classesTensor, scoresTensor, numDetectionsTensor]); 

    const N = numDetections; 
    const outputPredictions = [];

    for (let i = 0; i < N; i++) {
        const score = scores[0][i];
        if (score > confidenceThreshold) {
            const classIndex = parseInt(classes[0][i]); 
            const className = COCO_CLASSES[classIndex]; // MobileNetSSD from TF Hub often uses 0-indexed classes directly mapping to COCO.

            if (!className) {
                console.warn(`Unknown class index for MobileNetSSD: ${classIndex}`);
                continue;
            }

            const [ymin, xmin, ymax, xmax] = boxes[0][i];
            const bbox = [
                xmin * imageWidth,  
                ymin * imageHeight, 
                (xmax - xmin) * imageWidth,  
                (ymax - ymin) * imageHeight  
            ];
            outputPredictions.push({
                class: className,
                score: score,
                bbox: bbox
            });
        }
    }
    return outputPredictions;
}

function displayImageSummaries() {
    const summaryListElement = document.getElementById('imageSummaryList');
    if (!summaryListElement) return;

    summaryListElement.innerHTML = ''; 

    if (batchImageResults.length === 0) {
        summaryListElement.innerHTML = '<li class="text-slate-500">没有处理的图片。</li>'; // Updated class
        return;
    }

    batchImageResults.forEach((result, index) => {
        const listItem = document.createElement('li');
        // Base classes are set in index.html (bg-slate-800, border-slate-700, hover:bg-slate-700 etc.)
        // JS will toggle selection classes. Added transition classes here.
        listItem.className = 'p-2 border border-slate-700 rounded-md hover:bg-slate-700 cursor-pointer flex items-center space-x-2 transition-all duration-150 ease-in-out transform hover:scale-[1.03]';
        listItem.dataset.imageId = result.id;

        const thumbnail = document.createElement('img');
        thumbnail.src = result.dataURL;
        thumbnail.className = 'w-12 h-12 sm:w-16 sm:h-16 object-cover rounded'; 

        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1 min-w-0'; // Added min-w-0 for better truncation

        const fileNameP = document.createElement('p');
        fileNameP.className = 'text-xs sm:text-sm font-medium truncate text-slate-200'; // Updated class
        fileNameP.textContent = result.fileName;

        const detectionSummaryP = document.createElement('p');
        detectionSummaryP.className = 'text-xs text-slate-400'; // Updated class
        if (result.predictions && result.predictions.length > 0) {
            const objectTypes = new Set(result.predictions.map(p => p.class));
            detectionSummaryP.textContent = `检测到 ${result.predictions.length} 个物体 (${Array.from(objectTypes).slice(0,2).join(', ')}${objectTypes.size > 2 ? '...' : ''})`;
        } else {
            detectionSummaryP.textContent = '未检测到物体或出错。';
        }

        infoDiv.appendChild(fileNameP);
        infoDiv.appendChild(detectionSummaryP);

        listItem.appendChild(thumbnail);
        listItem.appendChild(infoDiv);

        listItem.addEventListener('click', () => handleSummaryItemClick(result.id));

        summaryListElement.appendChild(listItem);
    });
}

async function postprocessOutputYoloV5s(
    rawOutputTensor,      
    originalImageWidth,
    originalImageHeight,
    letterboxInfo,        
    confidenceThreshold,
    iouThreshold = 0.45
) {
    if (!rawOutputTensor) {
        console.warn("YOLOv5 postprocess: rawOutputTensor is null or undefined.");
        return [];
    }

    const outputData = await rawOutputTensor.array();
    tf.dispose(rawOutputTensor);

    const numClasses = outputData[0][0].length - 5; 
    const allFilteredBoxes = []; 

    outputData[0].forEach(prediction => {
        const objectness = prediction[4];
        
        let maxClassScore = 0;
        let bestClassIndex = -1;
        for (let i = 0; i < numClasses; i++) {
            const classScore = prediction[5 + i];
            if (classScore > maxClassScore) {
                maxClassScore = classScore;
                bestClassIndex = i;
            }
        }

        const finalScore = objectness * maxClassScore;

        if (finalScore > confidenceThreshold) {
            const cx = prediction[0]; 
            const cy = prediction[1]; 
            const w = prediction[2];  
            const h = prediction[3];  

            const y1 = cy - h / 2;
            const x1 = cx - w / 2;
            const y2 = cy + h / 2;
            const x2 = cx + w / 2;

            allFilteredBoxes.push({
                boxCoords: [y1, x1, y2, x2], 
                score: finalScore,
                classIndex: bestClassIndex,
            });
        }
    });

    if (allFilteredBoxes.length === 0) {
        console.log("YOLOv5 Postprocessing: No boxes passed initial confidence threshold.");
        return [];
    }
    console.log(`YOLOv5 Postprocessing: ${allFilteredBoxes.length} boxes passed initial confidence before per-class NMS.`);

    const finalPredictions = [];
    for (let c = 0; c < numClasses; c++) { 
        const classSpecificBoxes = allFilteredBoxes.filter(b => b.classIndex === c);
        if (classSpecificBoxes.length === 0) {
            continue;
        }

        const boxesForNMS = classSpecificBoxes.map(b => b.boxCoords);
        const scoresForNMS = classSpecificBoxes.map(b => b.score);

        if (boxesForNMS.length > 0) {
            const nmsResultIndices = await tf.image.nonMaxSuppressionAsync(
                boxesForNMS,       
                scoresForNMS,      
                100,               
                iouThreshold,      
                confidenceThreshold
            );

            const selectedIndicesForClass = await nmsResultIndices.array();
            tf.dispose(nmsResultIndices);

            selectedIndicesForClass.forEach(selectedIndex => {
                const selectedBoxInfo = classSpecificBoxes[selectedIndex];
                const className = COCO_CLASSES[selectedBoxInfo.classIndex];

                let [y1_model_norm, x1_model_norm, y2_model_norm, x2_model_norm] = selectedBoxInfo.boxCoords;
                
                const x1_orig = (x1_model_norm * letterboxInfo.paddedWidth - letterboxInfo.dw) / letterboxInfo.ratio;
                const y1_orig = (y1_model_norm * letterboxInfo.paddedHeight - letterboxInfo.dh) / letterboxInfo.ratio;
                const x2_orig = (x2_model_norm * letterboxInfo.paddedWidth - letterboxInfo.dw) / letterboxInfo.ratio;
                const y2_orig = (y2_model_norm * letterboxInfo.paddedHeight - letterboxInfo.dh) / letterboxInfo.ratio;

                finalPredictions.push({
                    class: className,
                    score: selectedBoxInfo.score,
                    bbox: [
                        x1_orig,
                        y1_orig,
                        x2_orig - x1_orig, 
                        y2_orig - y1_orig  
                    ]
                });
            });
        }
    }

    console.log("YOLOv5 Postprocessing: Final formatted predictions after per-class NMS:", finalPredictions.length);
    return finalPredictions;
}

function handleSummaryItemClick(imageId) {
    const selectedResult = batchImageResults.find(result => result.id === imageId);
    if (!selectedResult) {
        console.error("Could not find image result for ID:", imageId);
        return;
    }

    if (video.srcObject) { 
        const stream = video.srcObject;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    if (video.src && video.src.startsWith('blob:')) { 
        URL.revokeObjectURL(video.src);
        video.src = "";
    }
    video.style.display = 'none'; 
    video.controls = false;
    isDetecting = false; 

    displayedImageElement.src = selectedResult.dataURL;
    displayedImageElement.classList.remove('hidden');
    
    document.getElementById('video').style.display = 'none';

    document.getElementById('main-content-placeholder').classList.add('hidden');
    const videoContainer = document.getElementById('container');
    videoContainer.style.display = 'block'; 


    displayedImageElement.onload = () => {
        canvas.width = displayedImageElement.naturalWidth;
        canvas.height = displayedImageElement.naturalHeight;
        canvas.style.display = 'block'; 

        currentMainMediaPredictions = selectedResult.predictions || []; 
        drawResults(currentMainMediaPredictions); 

        console.log(`Displaying details for ${selectedResult.fileName}`);
    };
     // If image is already loaded (e.g. from cache), onload might not fire, so check and call directly
    if (displayedImageElement.complete && displayedImageElement.naturalWidth > 0) {
        displayedImageElement.onload();
    }


    const summaryListItems = document.querySelectorAll('#imageSummaryList li');
    summaryListItems.forEach(item => {
        if (item.dataset.imageId === imageId) {
            // Classes for SELECTED state (match tech-savvy selected style from index.html)
            item.classList.add('bg-cyan-600', 'ring-2', 'ring-cyan-400');
            item.classList.remove('border-slate-700', 'hover:bg-slate-700'); // Remove base state classes
        } else {
            // Classes for DESELECTED/BASE state (match tech-savvy base style from index.html)
            item.classList.remove('bg-cyan-600', 'ring-2', 'ring-cyan-400');
            item.classList.add('border-slate-700', 'hover:bg-slate-700'); // Add base state classes
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const modelSelectorButtons = document.querySelectorAll('.model-selector-btn');
    modelSelectorButtons.forEach(button => {
        button.addEventListener('click', () => {
            const modelNameFromButton = button.dataset.modelName; 
            if (activeModel.name !== modelNameFromButton && !activeModel.isLoading) {
                clearAllMediaAndResults(); 
                loadSelectedModel(modelNameFromButton);
            } else if (activeModel.isLoading) {
                console.log("Model loading is already in progress.");
                showToast('模型仍在加载中，请稍候...', 'warning');
            } else {
                console.log(`${modelNameFromButton} is already the active model.`);
                showToast(`${modelNameFromButton} 模型已激活。`, 'info', 3000);
            }
        });
    });

    clearAllMediaAndResults(); // Initial UI state with placeholder

    (async () => { 
        try {
            console.log("DOMContentLoaded: Attempting to load default model...");
            await loadSelectedModel("cocoSsd");
            console.log("DOMContentLoaded: Default model loading process initiated.");
            if (activeModel.instance && !activeModel.error) {
                 document.getElementById('model-loading-status').textContent = activeModel.name + ' 已准备好。请选择媒体。';
            } else if (activeModel.error) {
                console.error("DOMContentLoaded: Default model failed to load.", activeModel.error);
            }
        } catch (err) {
            console.error("DOMContentLoaded: Critical error during initial model load sequence:", err);
            showToast(`初始化加载模型时发生严重错误: ${err.message}`, 'error', 7000);
            setLoadingState(false, '模型初始化失败!');
            updateModelSelectorUI(null);
        }
    })(); 

    confidenceSlider = document.getElementById('confidenceSlider');
    confidenceValueDisplay = document.getElementById('confidenceValue');

    if (confidenceSlider && confidenceValueDisplay) {
        confidenceSlider.value = currentConfidenceThreshold * 100;
        confidenceValueDisplay.textContent = `${Math.round(currentConfidenceThreshold * 100)}%`;

        confidenceSlider.addEventListener('input', (event) => {
            currentConfidenceThreshold = parseInt(event.target.value) / 100;
            confidenceValueDisplay.textContent = `${event.target.value}%`;

            if (displayedImageElement.src && !displayedImageElement.classList.contains('hidden')) {
                drawResults(currentMainMediaPredictions); 
            } 
        });
    }

    iouSlider = document.getElementById('iouSlider');
    iouValueDisplay = document.getElementById('iouValue');

    if (iouSlider && iouValueDisplay) {
        iouSlider.value = currentIouThreshold;
        iouValueDisplay.textContent = parseFloat(currentIouThreshold).toFixed(2);

        iouSlider.addEventListener('input', (event) => {
            currentIouThreshold = parseFloat(event.target.value);
            iouValueDisplay.textContent = currentIouThreshold.toFixed(2);

            if (activeModel.instance && activeModel.modelType === "yoloV5s" &&
                displayedImageElement.src && !displayedImageElement.classList.contains('hidden')) {
                
                console.log("IoU changed for YOLOv5s image, re-detecting...");
                performImageDetection(displayedImageElement).then(predictions => {
                    if (predictions) {
                        currentMainMediaPredictions = predictions; 
                        drawResults(predictions); 
                    }
                });
            }
        });
    }
});

[end of script.js]
