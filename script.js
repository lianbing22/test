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
    if (!activeModel.instance) return; // No model loaded

    let predictions = [];
    if (activeModel.instance.isGraphModel) {
        const inputTensor = preprocessInput(video); // Assuming default shape [1,300,300,3]
        // For TF Hub models, you might need to specify output node names if there are multiple.
        // If model.outputs is available, one could use: const outputNodes = model.outputs.map(o => o.name);
        // const outputTensors = await activeModel.instance.executeAsync(inputTensor, outputNodes);
        const outputTensors = await activeModel.instance.executeAsync(inputTensor);
        tf.dispose(inputTensor); // Dispose input tensor

        predictions = await postprocessOutputMobileNetSsd(outputTensors, video.videoWidth, video.videoHeight);
        // outputTensors are disposed inside postprocessOutputMobileNetSsd
    } else if (activeModel.instance) { // For COCO-SSD like models
        predictions = await activeModel.instance.detect(video);
    }
    // Removed else { predictions = []; } as it's initialized above

    drawResults(predictions);

    // if (activeModel.instance.isGraphModel) {
    //     // console.warn("GraphModel detection logic not yet implemented for video.");
    //     // For now, skip detection or show a message.
    //     // To prevent errors, let's just clear results and return if it's a graph model.
    //     // This will be addressed when integrating MobileNet SSD properly.
    //     // drawResults([]); // Clear previous bounding boxes
    //     // return; // Skip detection for graph model on video for now
    // } else if (video.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
    //     try {
    //         const predictions = await activeModel.instance.detect(video);
    //         drawResults(predictions); // Call new function to draw results
    //     } catch (err) {
    //         console.error("Error during object detection: ", err);
    //     }
    // }
    requestAnimationFrame(detectObjects); // Continue the loop
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
        return null; // Return null or empty array on error
    }
    if (activeModel.instance.isGraphModel) {
        // console.warn("GraphModel detection logic not yet implemented for image.");
        // This will be properly implemented in the next step.
        // For now, let's return empty predictions to avoid breaking flow.
        return []; // Placeholder
    }
    console.log("Performing detection on image:", imgElement.id || imgElement.src.substring(0,30));
    try {
        const predictions = await activeModel.instance.detect(imgElement);
        console.log("Image detection complete. Predictions:", predictions);
        return predictions;
    } catch (err) {
        console.error("Error during image object detection: ", err);
        alert("图片物体检测时发生错误。");
        return null; // Return null or empty array on error
    }
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
