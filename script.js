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

// Function to load the COCO-SSD model (Replaced by initializeDefaultModel and loadSelectedModel)
// async function loadModel() { ... }

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
        if (isLoading) {
            button.classList.add('opacity-50', 'cursor-not-allowed');
        } else {
            button.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    });
    // Also disable/enable other main action buttons if needed
    startButton.disabled = isLoading || (activeModel.instance === null); // Keep startButton disabled if no model or loading
    videoUpload.disabled = isLoading;
    imageUpload.disabled = isLoading;
}

async function loadSelectedModel(modelName) {
    if (activeModel.isLoading) {
        console.log("Model loading already in progress.");
        return;
    }
    if (activeModel.name === modelName && activeModel.instance) {
        console.log(`${modelName} is already loaded.`);
        return;
    }

    setLoadingState(true, `正在加载 ${modelName} 模型...`);
    activeModel.error = null; // Clear previous error

    try {
        let newModelInstance;
        if (modelName === "cocoSsd") {
            newModelInstance = await cocoSsd.load();
        } else if (modelName === "mobileNetSsd") {
            // IMPORTANT: Replace with a valid TFJS GraphModel URL for MobileNet SSD
            const modelUrl = 'https://tfhub.dev/tensorflow/tfjs-model/ssd_mobilenet_v2/coco/uint8/2/default/1/model.json?tfjs-format=graph-model'; // Example URL, ensure it's a GraphModel
            // Note: MobileNet SSD from TF Hub might have different output signature than cocoSsd.load()
            // This part will likely need adaptation in the 'detect' and 'drawResults' logic later.
            newModelInstance = await tf.loadGraphModel(modelUrl);
            // We'll need a way to know the model type for later detection logic
            newModelInstance.isGraphModel = true; // Custom flag
            newModelInstance.modelType = "mobileNetSsd"; // Specific type
        } else if (modelName === "yoloV5s") {
            // IMPORTANT: This is an example URL from a community-converted model.
            // Its availability, correctness, and performance are not guaranteed.
            // It might be necessary to find a more robust or self-hosted model URL.
            // This model is expected to be a TFJS GraphModel.
            const modelUrl = 'https://raw.githubusercontent.com/zldrobit/yolov5/tfjs_graph_model/model_yolov5s_tfjs/model.json';
            
            console.log(`Attempting to load YOLOv5s from: ${modelUrl}`);
            newModelInstance = await tf.loadGraphModel(modelUrl);
            newModelInstance.isGraphModel = true;
            newModelInstance.modelType = "yoloV5s"; // Specific type for dispatching pre/post processing
            // Common input shape for YOLOv5s is 640x640. This should be confirmed based on the model.
            newModelInstance.inputShape = [1, 640, 640, 3]; // Format: [batch, height, width, channels]
            console.log("YOLOv5s model loaded structure:", newModelInstance);

            // You might want to log model.inputs and model.outputs to understand its expected signature
            // console.log("YOLOv5s inputs:", newModelInstance.inputs);
            // console.log("YOLOv5s outputs:", newModelInstance.outputs);
        } else {
            throw new Error(`未知模型: ${modelName}`);
        }

        activeModel.name = modelName;
        activeModel.instance = newModelInstance;
        console.log(`${modelName} model loaded successfully.`);
        setLoadingState(false, `${modelName} 加载完成!`);
        updateModelSelectorUI(modelName);

    } catch (err) {
        console.error(`Error loading ${modelName} model: `, err);
        activeModel.error = err;
        activeModel.instance = null; // Ensure no stale model instance
        // Don't reset activeModel.name, so UI can reflect which model failed to load
        setLoadingState(false, `${modelName} 加载失败。请稍后再试或选择其他模型。`);
        // updateModelSelectorUI(null); // Optionally clear selection or show error state on selector
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
                    currentConfidenceThreshold
                    // iouThreshold will use its default in postprocessOutputYoloV5s
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
                alert("摄像头访问被拒绝。请允许访问以使用此功能。");
            } else if (err.name === "NotFoundError") {
                alert("未在您的设备上找到摄像头。");
            } else {
                alert("访问摄像头时发生错误：" + err.message);
            }
        }
    } else {
        alert("您的浏览器不支持 getUserMedia。");
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
                currentConfidenceThreshold
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
        alert("图片物体检测时发生错误。");
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
    rawOutputTensor,      // Single tensor, e.g., shape [1, 25200, 85] for COCO (80 classes + 5 coords/obj_score)
    originalImageWidth,
    originalImageHeight,
    letterboxInfo,        // Contains { ratio, dw, dh, paddedWidth, paddedHeight }
    confidenceThreshold,  // User-defined confidence threshold
    iouThreshold = 0.45   // Default IoU threshold for NMS
) {
    if (!rawOutputTensor) {
        console.warn("YOLOv5 postprocess: rawOutputTensor is null or undefined.");
        return [];
    }

    console.log("YOLOv5 Postprocessing: Input tensor shape:", rawOutputTensor.shape);
    // Expected shape e.g. [1, 25200, 85] (1 batch, 25200 boxes, 5 (xywh, obj_score) + num_classes)

    const outputData = await rawOutputTensor.array(); // Get data as a JavaScript array
    tf.dispose(rawOutputTensor); // Dispose the raw tensor as soon as data is extracted

    const boxes = [];        // To store [x, y, w, h]
    const scores = [];       // To store confidence scores (objectness * class_score)
    const classIndices = []; // To store class indices

    const numClasses = rawOutputTensor.shape[2] - 5; // Assuming 5 + num_classes structure

    // Step 1: Decode and filter boxes based on confidence
    // This loop iterates through all potential bounding boxes predicted by the model.
    // For each box, it calculates the actual confidence score and extracts box coordinates and class.
    outputData[0].forEach(prediction => { // outputData[0] because batch size is 1
        const objectness = prediction[4]; // Objectness score
        if (objectness < confidenceThreshold) { // Early filter by objectness (can be part of overall confidence)
            return; // Skip low objectness boxes
        }

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

        const finalScore = objectness * maxClassScore; // Combine objectness with class score

        if (finalScore > confidenceThreshold) {
            // Extract box coordinates (center_x, center_y, width, height) - normalized to model input size (e.g., 640x640)
            const cx = prediction[0]; // center_x
            const cy = prediction[1]; // center_y
            const w = prediction[2];  // width
            const h = prediction[3];  // height

            // Convert to top-left x, y for NMS functions (still normalized to model input size)
            const x1 = cx - w / 2;
            const y1 = cy - h / 2;
            // NMS functions in TFJS often expect [y1, x1, y2, x2]
            // So, boxes for NMS should be [y1, x1, y1 + h, x1 + w] (normalized to model input size)
            // However, our `drawResults` expects [x, y, width, height] in original image coords.
            // We'll store [x1, y1, w, h] (top-left based, normalized to model input) for now,
            // and convert to original image space *after* NMS.

            boxes.push([x1, y1, x1 + w, y1 + h]); // Store as [x1, y1, x2, y2] for NMS
            scores.push(finalScore);
            classIndices.push(bestClassIndex);
        }
    });

    if (boxes.length === 0) {
        console.log("YOLOv5 Postprocessing: No boxes passed confidence threshold.");
        return [];
    }
    console.log(`YOLOv5 Postprocessing: ${boxes.length} boxes before NMS.`);


    // Step 2: Perform Non-Max Suppression (NMS) per class
    // TFJS NMS `tf.image.nonMaxSuppressionAsync` typically works on boxes for a single class at a time.
    // Or, `nonMaxSuppressionWithScoreAsync` can handle multi-class if boxes are structured correctly,
    // but it's often simpler to loop per class or use a combined NMS if available.
    // For now, let's implement a simplified NMS approach (can be refined).
    // A common approach:
    // 1. Get all boxes exceeding confidence.
    // 2. Apply NMS for each class independently.
    
    const nmsResultIndices = await tf.image.nonMaxSuppressionAsync(
        boxes,           // tensor2d of shape [numBoxes, 4] -> [[y1,x1,y2,x2],...] TFJS wants this order
        scores,          // tensor1d of shape [numBoxes]
        100,             // maxOutputSize: Max number of boxes to select.
        iouThreshold,    // iouThreshold
        confidenceThreshold // scoreThreshold (optional, can filter again here)
    );

    const finalDetectionsIndices = await nmsResultIndices.array();
    tf.dispose(nmsResultIndices);

    console.log(`YOLOv5 Postprocessing: ${finalDetectionsIndices.length} boxes after NMS.`);

    // Step 3: Map NMS results back to original image coordinates and format for drawResults
    const finalPredictions = [];
    finalDetectionsIndices.forEach(index => {
        const boxNMS = boxes[index]; // This is [x1_model, y1_model, x2_model, y2_model] normalized to model input
        const score = scores[index];
        const classIndex = classIndices[index];
        const className = COCO_CLASSES[classIndex]; // Assuming COCO_CLASSES is available globally

        // Denormalize and adjust for letterboxing
        // boxNMS = [x1_model_norm, y1_model_norm, x2_model_norm, y2_model_norm]
        let [x1_model_norm, y1_model_norm, x2_model_norm, y2_model_norm] = boxNMS;

        // Scale back to padded image dimensions (e.g., 640x640)
        // This step is implicitly handled if cx,cy,w,h were already relative to padded size.
        // The zldrobit model outputs coordinates relative to the 640x640 input.

        // Adjust for letterbox padding and ratio to get coordinates in original image space
        // (x_model - dw) / ratio = x_original
        // (y_model - dh) / ratio = y_original
        // w_original = w_model / ratio
        // h_original = h_model / ratio
        
        const x1_orig = (x1_model_norm * letterboxInfo.paddedWidth - letterboxInfo.dw) / letterboxInfo.ratio;
        const y1_orig = (y1_model_norm * letterboxInfo.paddedHeight - letterboxInfo.dh) / letterboxInfo.ratio;
        const x2_orig = (x2_model_norm * letterboxInfo.paddedWidth - letterboxInfo.dw) / letterboxInfo.ratio;
        const y2_orig = (y2_model_norm * letterboxInfo.paddedHeight - letterboxInfo.dh) / letterboxInfo.ratio;

        finalPredictions.push({
            class: className,
            score: score,
            bbox: [
                x1_orig,
                y1_orig,
                x2_orig - x1_orig, // width
                y2_orig - y1_orig  // height
            ]
        });
    });

    console.log("YOLOv5 Postprocessing: Final formatted predictions:", finalPredictions.length);
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
