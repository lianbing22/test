const video = document.getElementById('video');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const objectList = document.getElementById('objectList');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const videoUpload = document.getElementById('videoUpload');
const imageUpload = document.getElementById('imageUpload'); // Added

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
]; // 90 classes


// let model; // Replaced with activeModel object
let activeModel = {
    name: null, // e.g., "cocoSsd", "mobileNetSsd"
    instance: null, // Stores the loaded model object
    isLoading: false,
    error: null
};
let isDetecting = false;
let batchImageResults = []; // Added for batch results
let currentConfidenceThreshold = 0.5; // Default to 50%
let currentMainMediaPredictions = []; // For re-drawing static images with new threshold

// Element references
let confidenceSlider;
let confidenceValueDisplay;
let iouSlider;
let iouValueDisplay;

// Thresholds
let currentConfidenceThreshold = 0.5; // Default to 50%
let currentIouThreshold = 0.45; // Default IoU threshold

let currentMainMediaPredictions = []; // For re-drawing static images with new threshold

// Function to load the COCO-SSD model (Replaced by initializeDefaultModel and loadSelectedModel)
// async function loadModel() { ... }

function showToast(message, type = 'info', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) {
        console.error('Toast container not found!');
        // Fallback to alert if container is missing (should not happen)
        alert(`${type.toUpperCase()}: ${message}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = 'p-4 rounded-md shadow-lg flex items-center justify-between text-sm animate-fade-in-right'; // Base classes + animation

    // Icon and Color based on type
    let bgColor, textColor, iconSVG;
    switch (type) {
        case 'success':
            bgColor = 'bg-green-500';
            textColor = 'text-white';
            iconSVG = `<svg class="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
            break;
        case 'error':
            bgColor = 'bg-red-500';
            textColor = 'text-white';
            iconSVG = `<svg class="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
            break;
        case 'warning':
            bgColor = 'bg-yellow-400'; // Softer yellow for better text contrast
            textColor = 'text-gray-800'; // Darker text for yellow background
            iconSVG = `<svg class="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.216 3.031-1.742 3.031H4.42c-1.526 0-2.492-1.697-1.742-3.031l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-3a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clip-rule="evenodd"></path></svg>`;
            break;
        default: // info
            bgColor = 'bg-blue-500';
            textColor = 'text-white';
            iconSVG = `<svg class="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>`;
            break;
    }
    toast.classList.add(bgColor, textColor);

    const messageSpan = document.createElement('span');
    messageSpan.innerHTML = iconSVG; // Add icon before message text
    messageSpan.appendChild(document.createTextNode(message)); // Append text node
    messageSpan.classList.add('flex', 'items-center');


    const closeButton = document.createElement('button');
    closeButton.innerHTML = '&times;';
    closeButton.className = 'ml-4 text-xl font-semibold leading-none hover:opacity-75';
    closeButton.onclick = () => {
        toast.classList.add('animate-fade-out-right'); // Optional: add fade out animation class
        setTimeout(() => toast.remove(), 300); // Remove after animation
    };

    toast.appendChild(messageSpan);
    toast.appendChild(closeButton);
    container.appendChild(toast);

    // Auto-dismiss
    setTimeout(() => {
        // Check if toast still exists (user might have closed it manually)
        if (toast.parentElement) {
            toast.classList.add('animate-fade-out-right'); // Add fade out animation class
            setTimeout(() => toast.remove(), 300); // Remove after animation
        }
    }, duration);
}

function updateModelSelectorUI(selectedModelName) {
    const buttons = document.querySelectorAll('.model-selector-btn');
    buttons.forEach(button => {
        const modelName = button.dataset.modelName;
        const checkmark = document.getElementById(`checkmark-${modelName}`); // Assumes checkmark IDs like 'checkmark-cocoSsd'

        if (modelName === selectedModelName) {
            button.classList.add('bg-blue-100', 'ring-2', 'ring-blue-500');
            button.classList.remove('bg-white');
            button.setAttribute('aria-pressed', 'true');
            if (checkmark) checkmark.classList.remove('hidden');
        } else {
            button.classList.remove('bg-blue-100', 'ring-2', 'ring-blue-500');
            button.classList.add('bg-white');
            button.setAttribute('aria-pressed', 'false');
            if (checkmark) checkmark.classList.add('hidden');
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
        const loadingIndicator = button.querySelector('.model-loading-indicator');
        const percentageText = button.querySelector('.loading-percentage');

        if (isLoading) {
            button.classList.add('opacity-75', 'cursor-not-allowed'); // Make it slightly opaque
            if (loadingIndicator) {
                loadingIndicator.classList.remove('hidden');
                // For global loading state, hide percentage, show only spinner
                if (percentageText) percentageText.textContent = ''; 
                // Ensure spinner is visible (it's part of the indicator div)
            }
        } else {
            button.classList.remove('opacity-75', 'cursor-not-allowed');
            if (loadingIndicator) {
                loadingIndicator.classList.add('hidden');
            }
        }
    });

    // Disable/enable other main action buttons
    startButton.disabled = isLoading || (activeModel.instance === null);
    videoUpload.disabled = isLoading;
    imageUpload.disabled = isLoading;
    if (confidenceSlider) confidenceSlider.disabled = isLoading;
    if (iouSlider) iouSlider.disabled = isLoading;
}

async function loadSelectedModel(modelName) {
    // If a model is already loading, or if the selected model is already active, do nothing.
    // Note: The button click handler in DOMContentLoaded already checks 'activeModel.isLoading'
    // and 'activeModel.name !== modelNameFromButton'.
    // This is an additional safeguard within the function itself.
    if (activeModel.isLoading && activeModel.name === modelName) {
        console.log(`Loading for ${modelName} is already in progress.`);
        return;
    }
     if (activeModel.name === modelName && activeModel.instance && !activeModel.isLoading) {
        console.log(`${modelName} is already loaded and active.`);
        return;
    }

    // Set the activeModel.name *before* calling setLoadingState
    // This is so onProgress can correctly identify if its updates are for the current loading model.
    activeModel.name = modelName; 
    activeModel.isLoading = true; // Manually set isLoading before the first setLoadingState for this load cycle
    activeModel.error = null;
    activeModel.instance = null; // Clear previous instance
    
    setLoadingState(true, `正在加载 ${modelName} 模型...`);
    updateModelSelectorUI(modelName); // Update UI to show this model is targeted for loading

    try {
        let newModelInstance;
        const currentModelButton = document.getElementById(`model-${modelName}`);
        const percentageTextEl = currentModelButton ? currentModelButton.querySelector('.loading-percentage') : null;

        if (modelName === "cocoSsd") {
            if (percentageTextEl) percentageTextEl.textContent = ''; // COCO-SSD has no percentage
            newModelInstance = await cocoSsd.load();
        } else if (modelName === "mobileNetSsd" || modelName === "yoloV5s") {
            let modelUrl;
            if (modelName === "mobileNetSsd") {
                modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/coco/uint8/2/default/1/model.json?tfjs-format=graph-model';
                newModelInstance = await tf.loadGraphModel(modelUrl, {
                    onProgress: (fraction) => {
                        // Check if this loading task is still the active one
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
        
        // Check if another model loading was initiated while this one was loading
        // activeModel.name would have been changed by the newer call to loadSelectedModel
        if (activeModel.name !== modelName) {
             console.warn(`Model loading for ${modelName} completed, but another model (${activeModel.name}) load was initiated. Discarding ${modelName}.`);
             // newModelInstance might need disposal if tf.js doesn't handle it automatically when not assigned.
             // However, standard TFJS models are usually managed by the tf.ENV.
             // For explicit disposal if model has a dispose method (some TFJS models do, GraphModel generally doesn't need manual unless for specific layers)
             if (newModelInstance && typeof newModelInstance.dispose === 'function') {
                newModelInstance.dispose();
             }
             return; 
        }
            
        // Successfully loaded the intended model
        // activeModel.name = modelName; // Already set at the beginning of this load attempt
        activeModel.instance = newModelInstance;
        activeModel.isLoading = false; // Mark loading as complete *before* final UI updates
        console.log(`${modelName} model loaded successfully.`);
        
        setLoadingState(false, `${modelName} 加载完成!`); // This will hide all spinners and enable buttons
        // updateModelSelectorUI(modelName); // Already called when loading started to show target
        // Final check on UI consistency, make sure correct button is highlighted
        if (document.getElementById(`model-${modelName}`).getAttribute('aria-pressed') === 'false') {
            updateModelSelectorUI(modelName);
        }


    } catch (err) {
        console.error(`Error loading ${modelName} model: `, err);
        
        // Check if this error corresponds to the model that is currently supposed to be loading
        if(activeModel.name === modelName) { 
            activeModel.error = err;
            activeModel.instance = null;
            activeModel.isLoading = false; // Ensure loading state is reset
            setLoadingState(false, `${modelName} 加载失败。`); 
            updateModelSelectorUI(null); // No model is active or selected
            showToast(`${modelName} 加载失败: ${err.message}`, 'error');
        } else {
             // A different model loading was already in progress or finished, this error is from a stale load.
             console.warn(`Error for ${modelName} but active model is ${activeModel.name}. Ignoring stale error.`);
        }
    }
}

async function initializeDefaultModel() {
    // Load COCO-SSD by default
    await loadSelectedModel("cocoSsd");
    // Original logic to enable startButton was in loadModel, setLoadingState now handles it.
    // startButton.disabled = activeModel.instance === null;
}

// Removed initializeDefaultModel function as its logic is moved to DOMContentLoaded

function clearAllMediaAndResults() {
    console.log("Clearing all media and results due to model switch...");

    // Stop camera if active
    if (video.srcObject) {
        const stream = video.srcObject;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
    }
    // Clear video file if active
    if (video.src && video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src);
        video.src = "";
    }
    video.style.display = 'block'; // Default to showing video element (empty)
    video.controls = false;

    // Remove displayed image if active
    const existingImage = document.getElementById('displayedImage');
    if (existingImage) {
        existingImage.remove();
    }
     // Ensure video container is visible, and video element itself is displayed (though src might be empty)
    // document.getElementById('container').style.display = 'block'; // Replaced by placeholder logic

    // Hide media container, show placeholder
    const mediaContainer = document.getElementById('container');
    const placeholder = document.getElementById('main-content-placeholder');
    if (mediaContainer) mediaContainer.style.display = 'none';
    if (placeholder) placeholder.classList.remove('hidden');


    // Clear detection state and UI lists
    isDetecting = false;
    context.clearRect(0, 0, canvas.width, canvas.height);
    canvas.style.display = 'none'; // Also hide canvas when no media

    objectList.innerHTML = '<li class="text-gray-500">请选择媒体并开始分析。</li>';

    batchImageResults = []; // Moved from individual handlers to here for centralization
    const summaryListElement = document.getElementById('imageSummaryList');
    if (summaryListElement) {
        summaryListElement.innerHTML = '<li class="text-gray-500">上传图片以查看摘要。</li>';
    }

    const loadingStatusEl = document.getElementById('model-loading-status');
    if (loadingStatusEl) {
        // Message updated when model actually starts loading via setLoadingState
        // For now, just ensure it's not showing a stale "success" message for a model.
        // If activeModel.error is set, it will be shown by setLoadingState.
        if (!activeModel.isLoading && !activeModel.error) {
             loadingStatusEl.textContent = '选择模型并加载媒体进行分析。';
        } else if (activeModel.error) {
            loadingStatusEl.textContent = `${activeModel.name || '模型'} 加载失败。请重试。`;
        }
    }
    currentMainMediaPredictions = []; // Clear stored predictions for main media
}

async function detectObjects() {
    if (!isDetecting) return;
    if (!activeModel.instance) {
        console.warn("detectObjects: No active model instance.");
        requestAnimationFrame(detectObjects); // Keep the loop going but do nothing
        return;
    }

    let predictions = [];
    try {
        if (video.readyState >= 3) { // Ensure video has data
            if (activeModel.instance.modelType === "yoloV5s") {
                const modelInputShape = activeModel.instance.inputShape.slice(1, 3); // e.g., [640, 640]
                const { tensor: inputTensor, letterboxInfo } = preprocessInputYoloV5s(video, modelInputShape);
                
                const rawOutputTensor = await activeModel.instance.executeAsync(inputTensor);
                tf.dispose(inputTensor); // Dispose input tensor

                // rawOutputTensor might be an array of tensors if model has multiple output nodes.
                // Or a single tensor if it's structured that way.
                // Assuming it's the single tensor [1, 25200, classes+5] for now.
                // If it's an array, use rawOutputTensor[0] or similar based on model structure.
                const outputTensorForPost = Array.isArray(rawOutputTensor) ? rawOutputTensor[0] : rawOutputTensor;

                predictions = await postprocessOutputYoloV5s(
                    outputTensorForPost, // Pass the actual tensor
                    video.videoWidth,
                    video.videoHeight,
                    letterboxInfo,
                    currentConfidenceThreshold,
                    currentIouThreshold // ADD THIS
                );
                // If rawOutputTensor was an array and contained other tensors that need disposal:
                if (Array.isArray(rawOutputTensor)) {
                    for (let i = 1; i < rawOutputTensor.length; i++) {
                        tf.dispose(rawOutputTensor[i]);
                    }
                }

            } else if (activeModel.instance.isGraphModel) { // For other GraphModels like MobileNet SSD
                const inputTensor = preprocessInput(video, activeModel.instance.inputShape); // Assuming generic preprocess for other graph models
                const outputTensors = await activeModel.instance.executeAsync(inputTensor);
                tf.dispose(inputTensor);
                predictions = await postprocessOutputMobileNetSsd(outputTensors, video.videoWidth, video.videoHeight, currentConfidenceThreshold);
            } else if (activeModel.instance) { // For COCO-SSD like models
                predictions = await activeModel.instance.detect(video);
            }
        }
    } catch (err) {
        console.error("Error during object detection (detectObjects): ", err);
        // Potentially stop isDetecting or show error to user
        isDetecting = false; // Stop detection loop on error to prevent flooding
        setLoadingState(false, `检测出错: ${err.message.substring(0,100)}`);
    }

    drawResults(predictions || []); // Ensure predictions is not null/undefined

    if (isDetecting) { // Only continue loop if still detecting
        requestAnimationFrame(detectObjects);
    }
}

function drawResults(predictions) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    objectList.innerHTML = ''; // Clear previous list items

    predictions.forEach(prediction => {
        if (prediction.score > currentConfidenceThreshold) { // Use global threshold
            const [x, y, width, height] = prediction.bbox;

            // Draw bounding box
            context.strokeStyle = 'red';
            context.lineWidth = 2;
            context.strokeRect(x, y, width, height);

            // Draw label
            context.fillStyle = 'red';
            context.font = '16px Arial';
            const label = `${prediction.class} (${Math.round(prediction.score * 100)}%)`;
            context.fillText(label, x, y > 10 ? y - 5 : 10);

            // Add to object list
            const listItem = document.createElement('li');
            listItem.textContent = label;
            objectList.appendChild(listItem);
        }
    });
}

startButton.addEventListener('click', async () => {
    // Before getting camera stream:
    if (video.src && video.src.startsWith('blob:')) {
        URL.revokeObjectURL(video.src); // Revoke old object URL
        video.src = ""; // Clear src
        // video.controls = false; // controls are set below
        console.log("Cleared previously loaded video file.");
    }
    // Clear batch image results and summary list
    batchImageResults = [];
    const imageSummaryListElement = document.getElementById('imageSummaryList'); // Keep one
    if (imageSummaryListElement) imageSummaryListElement.innerHTML = '';
    // const imageSummaryListElement = document.getElementById('imageSummaryList'); // Remove this duplicate
    // if (imageSummaryListElement) imageSummaryListElement.innerHTML = ''; // And this
    document.getElementById('objectList').innerHTML = ''; // Also clear main object list

    // Hide/remove existing image if any
    const existingImage = document.getElementById('displayedImage');
    if (existingImage) {
        existingImage.remove();
    }
    // Show media container, hide placeholder
    document.getElementById('main-content-placeholder').classList.add('hidden');
    document.getElementById('container').style.display = 'block'; // Or 'relative' if that's its usual display
    video.style.display = 'block';
    canvas.style.display = 'block';
    video.controls = false; // Camera stream doesn't need default controls

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.controls = false; // Ensure default controls are off for camera
            video.play(); // Explicitly call play
        } catch (err) {
            console.error("Error accessing the camera: ", err);
            // Handle specific errors or display a message to the user
            if (err.name === "NotAllowedError") {
                showToast("摄像头访问被拒绝。请允许访问以使用此功能。", 'warning');
            } else if (err.name === "NotFoundError") {
                showToast("未在您的设备上找到摄像头。", 'warning');
            } else {
                showToast("访问摄像头时发生错误：" + err.message, 'error');
            }
        }
    } else {
        showToast("您的浏览器不支持 getUserMedia。", 'error');
    }
});

stopButton.addEventListener('click', () => {
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    isDetecting = false;
    context.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas when stopping
    objectList.innerHTML = ''; // Clear object list when stopping
    const imageSummaryListElement = document.getElementById('imageSummaryList'); // Added
    if (imageSummaryListElement) imageSummaryListElement.innerHTML = ''; // Added
});

video.addEventListener('play', () => {
    // This listener is now primarily for the camera stream.
    // Uploaded video detection is handled by `onloadeddata` in `handleVideoUpload`.
    if (video.srcObject) { // Only act if it's a camera stream
        console.log("Camera stream playing. Setting canvas and starting detection.");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        isDetecting = true;
        detectObjects();
    } else {
        console.log("Video 'play' event fired, but it's not a camera stream. Detection handled elsewhere or already started.");
    }
});

function handleVideoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // 1. Stop any existing camera stream and detection
        if (video.srcObject) {
            const stream = video.srcObject;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
        // Clear previous object URL if one exists from a prior upload
        if (video.src && video.src.startsWith('blob:')) {
            URL.revokeObjectURL(video.src);
            console.log("Revoked old object URL from previous file upload.");
            video.src = ""; // Clear src
        }
        // Clear batch image results and summary list
        batchImageResults = [];
        const imageSummaryList = document.getElementById('imageSummaryList');
        if (imageSummaryList) imageSummaryList.innerHTML = '';
        document.getElementById('objectList').innerHTML = ''; // Also clear main object list

        // Hide/remove existing image if any
        const existingImage = document.getElementById('displayedImage');
        if (existingImage) {
            existingImage.remove();
        }
    // Show media container, hide placeholder
    document.getElementById('main-content-placeholder').classList.add('hidden');
    document.getElementById('container').style.display = 'block';
    video.style.display = 'block';
    canvas.style.display = 'block';
        // video.controls = true; // controls are set below

        isDetecting = false;
        context.clearRect(0, 0, canvas.width, canvas.height);
        objectList.innerHTML = '';

        // 2. Create an object URL for the selected file
        const fileURL = URL.createObjectURL(file);
        video.src = fileURL; // Set video source to the file
        video.controls = true; // Show default video controls for uploaded video

        // 3. When the video data is loaded, set canvas size and start detection
        video.onloadeddata = () => {
            console.log("Video data loaded. Setting canvas and starting detection.");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            isDetecting = true; // Set before calling detectObjects
            detectObjects(); // Start detection for the uploaded video
            video.play(); // Start playing the video
        };

        video.onended = () => {
            console.log("Video ended.");
            isDetecting = false;
            if (video.src && video.src.startsWith('blob:')) { // Check if it's an object URL
                URL.revokeObjectURL(video.src);
                console.log("Revoked object URL on video end.");
            }
        };
    }
}

videoUpload.addEventListener('change', handleVideoUpload);

async function handleImageUpload(event) { // Make it async
    const files = event.target.files;
    if (!files.length) {
        return;
    }

    // A. Stop any ongoing video/camera activity and clear main displays
    if (video.srcObject) { // Stop camera stream
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    if (video.src && video.src.startsWith('blob:')) { // Clear uploaded video
        URL.revokeObjectURL(video.src);
        video.src = "";
    }
    video.style.display = 'none';
    video.controls = false;
    const existingMainImage = document.getElementById('displayedImage');
    if (existingMainImage) {
        existingMainImage.remove();
    }
    isDetecting = false; // Stop any video detection loops
    context.clearRect(0, 0, canvas.width, canvas.height);
    // objectList.innerHTML = ''; // We'll clear/repopulate this for summaries later

    // B. Clear previous batch results
    batchImageResults = [];
    const imageSummaryList = document.getElementById('imageSummaryList'); // Assuming a new UL for summaries
    if (imageSummaryList) {
        imageSummaryList.innerHTML = ''; // Clear old summaries
    } else {
        // If not using a dedicated summary list yet, clear the main objectList for now
        objectList.innerHTML = '';
    }
    // Also clear the main #objectList if it's being used for detailed results of a single image
    document.getElementById('objectList').innerHTML = '';


    console.log(`Processing ${files.length} image(s)...`);
    // TODO: Show a loading indicator to the user

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileName = file.name;
        const imageId = `batchImage-${Date.now()}-${i}`; // Unique ID

        try {
            const dataURL = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Create a temporary image element to perform detection (not displayed in main view yet)
            const tempImg = document.createElement('img');
            tempImg.src = dataURL;
            await new Promise(resolve => tempImg.onload = resolve); // Wait for image to load its dimensions

            const predictions = await performImageDetection(tempImg);

            batchImageResults.push({
                id: imageId,
                fileName: fileName,
                dataURL: dataURL,
                predictions: predictions || [] // Ensure predictions is an array
            });

            console.log(`Processed and stored: ${fileName}`);

            // TODO (next step): Update UI with this image's summary
            // updateImageSummaryList(batchImageResults[batchImageResults.length-1]);

        } catch (error) {
            console.error(`Error processing file ${fileName}:`, error);
            // Optionally store error info or skip file
        }
    }

    console.log("All images processed. Batch results:", batchImageResults);
    // TODO: Hide loading indicator
    // TODO (next step): Display the first image or a default message if no images.
    // For now, just log. The next step will handle displaying summaries.
    displayImageSummaries(); // New call

    if (batchImageResults.length > 0) {
        // Placeholder remains visible. User needs to click a summary.
        document.getElementById('main-content-placeholder').classList.remove('hidden');
        document.getElementById('container').style.display = 'none'; // Keep media container hidden
        canvas.style.display = 'none';
        const existingMainImage = document.getElementById('displayedImage');
        if (existingMainImage) existingMainImage.remove(); // Ensure no old main image
        context.clearRect(0,0, canvas.width, canvas.height);
        document.getElementById('objectList').innerHTML = '<li class="text-gray-500">从摘要列表选择图片查看详情。</li>';
    } else {
        // No images processed, show placeholder
        document.getElementById('main-content-placeholder').classList.remove('hidden');
        document.getElementById('container').style.display = 'none';
        canvas.style.display = 'none';
        document.getElementById('objectList').innerHTML = ''; // Or a "no images processed" message
    }
}

imageUpload.addEventListener('change', handleImageUpload);

async function performImageDetection(imgElement) {
    if (!activeModel.instance || !imgElement) {
        console.error("Model or image element not available for detection.");
        return null;
    }

    console.log("Performing detection on image:", imgElement.id || imgElement.src.substring(0,30));
    let predictions = []; // Initialize predictions

    try {
        if (activeModel.instance.modelType === "yoloV5s") {
            const modelInputShape = activeModel.instance.inputShape.slice(1, 3); // e.g., [640, 640]
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
                currentIouThreshold // ADD THIS
            );
            if (Array.isArray(rawOutputTensor)) {
                for (let i = 1; i < rawOutputTensor.length; i++) {
                    tf.dispose(rawOutputTensor[i]);
                }
            }

        } else if (activeModel.instance.isGraphModel) { // For MobileNet SSD
            const inputTensor = preprocessInput(imgElement, activeModel.instance.inputShape);
            const outputTensors = await activeModel.instance.executeAsync(inputTensor);
            tf.dispose(inputTensor);
            predictions = await postprocessOutputMobileNetSsd(outputTensors, imgElement.naturalWidth, imgElement.naturalHeight, currentConfidenceThreshold);
        
        } else if (activeModel.instance) { // For COCO-SSD
            predictions = await activeModel.instance.detect(imgElement);
        }
        console.log("Image detection complete. Predictions:", predictions);
        return predictions;
    } catch (err) {
        console.error("Error during image object detection: ", err);
        showToast("图片物体检测时发生错误。", 'error'); // Keep only one call
        return null; // Return null on error
    }
}

function preprocessInputYoloV5s(mediaElement, modelInputShape = [640, 640]) {
    // modelInputShape is expected as [height, width] for model's square input
    const modelHeight = modelInputShape[0];
    const modelWidth = modelInputShape[1];

    return tf.tidy(() => {
        const imgTensor = tf.browser.fromPixels(mediaElement);
        const originalHeight = imgTensor.shape[0];
        const originalWidth = imgTensor.shape[1];

        // Calculate aspect ratios
        const r = Math.min(modelHeight / originalHeight, modelWidth / originalWidth);
        const newUnpadWidth = Math.round(originalWidth * r);
        const newUnpadHeight = Math.round(originalHeight * r);

        // Resize the image with aspect ratio maintained
        const resizedImg = tf.image.resizeBilinear(imgTensor, [newUnpadHeight, newUnpadWidth], true);

        // Calculate padding
        const dw = (modelWidth - newUnpadWidth) / 2;
        const dh = (modelHeight - newUnpadHeight) / 2;

        // Pad the image
        // tf.pad takes paddings in the format [[top, bottom], [left, right], [channel_pad_before, channel_pad_after]]
        // For RGB images, channels are not padded.
        const paddingTop = Math.floor(dh);
        const paddingBottom = Math.ceil(dh);
        const paddingLeft = Math.floor(dw);
        const paddingRight = Math.ceil(dw);

        // Padding color (e.g., gray 114, 114, 114)
        // To pad with a specific color, we might need to create a larger tensor of that color
        // and then copy the resized image into it.
        // Alternatively, tf.pad uses 0 for padding by default if 'constantValue' is not set or is 0.
        // For YOLO, a common padding color is gray (114).
        // If tf.pad's constantValue parameter supports per-channel or if the model is robust to 0-padding, it's simpler.
        // Let's assume 0-padding for now if model is robust, or use a more complex method if 114 is strictly needed.
        // The zldrobit/yolov5 TFJS model seems to be trained with 0-padding or implies it in its preprocessing.
        // For a quick implementation, let's try padding with zeros first.
        // If specific color padding (114) is essential, this part needs to be more complex:
        // 1. Create a tensor of shape [modelHeight, modelWidth, 3] filled with 114.
        // 2. Copy `resizedImg` onto this tensor at the correct offset.
        // For now, using tf.pad with default (0) or specified constant value.
        // The `constantValues` parameter for tf.pad in TFJS defaults to 0.
        const paddedImg = tf.pad(
            resizedImg,
            [[paddingTop, paddingBottom], [paddingLeft, paddingRight], [0, 0]],
            0 // Constant value for padding, 0 is often acceptable. Use 114 if required by specific model.
        );

        // Normalize to [0, 1] and add batch dimension
        // The input tensor should be float32 for most models.
        const normalizedImg = paddedImg.toFloat().div(255.0);
        const batchedImg = normalizedImg.expandDims(0); // Shape: [1, modelHeight, modelWidth, 3]

        // Store letterboxing info for postprocessing
        // This info helps convert detected boxes back to original image coordinates.
        const letterboxInfo = {
            originalWidth,
            originalHeight,
            paddedWidth: modelWidth, // width of the letterboxed image (model input width)
            paddedHeight: modelHeight, // height of the letterboxed image (model input height)
            ratio: r, // resize ratio
            dw: dw, // width padding
            dh: dh  // height padding
        };

        return { tensor: batchedImg, letterboxInfo: letterboxInfo };
    });
}

function displayImageSummaries() {
    const summaryListElement = document.getElementById('imageSummaryList');
    if (!summaryListElement) return;

    summaryListElement.innerHTML = ''; // Clear previous summaries

    if (batchImageResults.length === 0) {
        summaryListElement.innerHTML = '<li class="text-gray-500">没有处理的图片。</li>';
        return;
    }

    batchImageResults.forEach((result, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'p-2 border rounded-md hover:bg-gray-200 cursor-pointer flex items-center space-x-2';
        listItem.dataset.imageId = result.id; // Store unique ID for click handling

        // Thumbnail
        const thumbnail = document.createElement('img');
        thumbnail.src = result.dataURL;
        thumbnail.className = 'w-16 h-16 object-cover rounded'; // Tailwind for thumbnail size

        // Info Div
        const infoDiv = document.createElement('div');
        infoDiv.className = 'flex-1';

        // File Name
        const fileNameP = document.createElement('p');
        fileNameP.className = 'text-sm font-medium truncate';
        fileNameP.textContent = result.fileName;

        // Detection Summary
        const detectionSummaryP = document.createElement('p');
        detectionSummaryP.className = 'text-xs text-gray-600';
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

        // TODO (next step): Add click listener to listItem to display details
        listItem.addEventListener('click', () => handleSummaryItemClick(result.id));

        summaryListElement.appendChild(listItem);
    });
}

async function postprocessOutputYoloV5s(
    rawOutputTensor,      // Single tensor, e.g., shape [1, 25200, 85]
    originalImageWidth,
    originalImageHeight,
    letterboxInfo,        // Contains { ratio, dw, dh, paddedWidth, paddedHeight }
    confidenceThreshold,
    iouThreshold = 0.45
) {
    if (!rawOutputTensor) {
        console.warn("YOLOv5 postprocess: rawOutputTensor is null or undefined.");
        return [];
    }

    const outputData = await rawOutputTensor.array();
    tf.dispose(rawOutputTensor);

    const numClasses = outputData[0][0].length - 5; // 5 => x,y,w,h,objectness
    const allFilteredBoxes = []; // To store boxes that pass initial confidence for per-class NMS

    // Step 1: Decode all boxes and filter by combined confidence (objectness * class_score)
    outputData[0].forEach(prediction => {
        const objectness = prediction[4];
        
        // Find the class with the highest score for this box
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
            const cx = prediction[0]; // center_x relative to model input (e.g., 640x640)
            const cy = prediction[1]; // center_y
            const w = prediction[2];  // width
            const h = prediction[3];  // height

            // Convert to [y1, x1, y2, x2] for tf.image.nonMaxSuppressionAsync
            // These are still normalized to model input size (e.g., 640x640)
            const y1 = cy - h / 2;
            const x1 = cx - w / 2;
            const y2 = cy + h / 2;
            const x2 = cx + w / 2;

            allFilteredBoxes.push({
                boxCoords: [y1, x1, y2, x2], // Correct order for NMS
                score: finalScore,
                classIndex: bestClassIndex,
                // Store original cx,cy,w,h if needed for later, or recalculate from y1,x1,y2,x2
                // For simplicity, we'll use y1,x1,y2,x2 to reconstruct for final output if needed
            });
        }
    });

    if (allFilteredBoxes.length === 0) {
        console.log("YOLOv5 Postprocessing: No boxes passed initial confidence threshold.");
        return [];
    }
    console.log(`YOLOv5 Postprocessing: ${allFilteredBoxes.length} boxes passed initial confidence before per-class NMS.`);

    // Step 2: Perform Per-Class NMS
    const finalPredictions = [];
    for (let c = 0; c < numClasses; c++) {
        // Filter boxes belonging to the current class 'c'
        const classSpecificBoxes = allFilteredBoxes.filter(b => b.classIndex === c);
        if (classSpecificBoxes.length === 0) {
            continue;
        }

        const boxesForNMS = classSpecificBoxes.map(b => b.boxCoords);
        const scoresForNMS = classSpecificBoxes.map(b => b.score);

        if (boxesForNMS.length > 0) {
            const nmsResultIndices = await tf.image.nonMaxSuppressionAsync(
                boxesForNMS,       // tensor2d of shape [numBoxes, 4] with [y1,x1,y2,x2]
                scoresForNMS,      // tensor1d of shape [numBoxes]
                100,               // maxOutputSize: Max number of boxes to select per class.
                iouThreshold,      // iouThreshold
                confidenceThreshold// scoreThreshold (can re-apply, or rely on initial filter)
            );

            const selectedIndicesForClass = await nmsResultIndices.array();
            tf.dispose(nmsResultIndices);

            selectedIndicesForClass.forEach(selectedIndex => {
                const selectedBoxInfo = classSpecificBoxes[selectedIndex];
                const className = COCO_CLASSES[selectedBoxInfo.classIndex];

                // boxCoords are [y1_model, x1_model, y2_model, x2_model] normalized to model input
                let [y1_model_norm, x1_model_norm, y2_model_norm, x2_model_norm] = selectedBoxInfo.boxCoords;
                
                // Adjust for letterbox padding and ratio to get coordinates in original image space
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
                        x2_orig - x1_orig, // width
                        y2_orig - y1_orig  // height
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

    // 0. Stop any ongoing video/camera activity and clear related displays
    if (video.srcObject) { // Stop camera stream
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        video.srcObject = null;
    }
    if (video.src && video.src.startsWith('blob:')) { // Clear uploaded video
        URL.revokeObjectURL(video.src);
        video.src = "";
    }
    video.style.display = 'none'; // Hide video element
    video.controls = false;
    isDetecting = false; // Stop any video detection loops

    // 1. Clear previous main image if any
    const existingMainImage = document.getElementById('displayedImage');
    if (existingMainImage) {
        existingMainImage.remove();
    }
    // Ensure video element is hidden if we are showing an image
    document.getElementById('video').style.display = 'none';

    // Show media container, hide placeholder
    document.getElementById('main-content-placeholder').classList.add('hidden');
    const videoContainer = document.getElementById('container');
    videoContainer.style.display = 'block'; // Show the media container


    // 2. Display the selected image in the main content area
    const img = document.createElement('img');
    img.id = 'displayedImage'; // Use the same ID for consistency
    img.src = selectedResult.dataURL;
    img.className = 'w-full h-full object-contain'; // Match styling of single image display

    // const videoContainer = document.getElementById('container'); // Parent of video/canvas - already defined
    // videoContainer.style.display = 'block'; // Ensure #container is visible - already done
    // Ensure canvas is a direct child of 'container' or its positioning is correct relative to 'img'
    videoContainer.appendChild(img); // Add image to the container

    img.onload = () => {
        // 3. Adjust canvas size
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.style.display = 'block'; // Make sure canvas is visible over the image

        // 4. Draw detection results for this image
        //    The predictions are already stored in selectedResult.predictions
        currentMainMediaPredictions = selectedResult.predictions || []; // STORE HERE
        drawResults(currentMainMediaPredictions); // Initial draw with current (possibly old) threshold

        // 5. Update the main #objectList with details for THIS image
        //    drawResults already clears and populates objectList based on the predictions it receives.
        console.log(`Displaying details for ${selectedResult.fileName}`);
    };

    // Optional: Highlight the selected item in the summary list
    const summaryListItems = document.querySelectorAll('#imageSummaryList li');
    summaryListItems.forEach(item => {
        if (item.dataset.imageId === imageId) {
            item.classList.add('bg-blue-200', 'ring-2', 'ring-blue-500'); // Example highlight
        } else {
            item.classList.remove('bg-blue-200', 'ring-2', 'ring-blue-500');
        }
    });
}


// Load the model when the script loads
loadModel();
