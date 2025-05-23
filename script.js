const video = document.getElementById('video');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const objectList = document.getElementById('objectList');
const canvas = document.getElementById('canvas');
const context = canvas.getContext('2d');
const videoUpload = document.getElementById('videoUpload');
const imageUpload = document.getElementById('imageUpload'); // Added

let model; // To hold the COCO-SSD model
let isDetecting = false;
let batchImageResults = []; // Added for batch results

// Function to load the COCO-SSD model
async function loadModel() {
    try {
        model = await cocoSsd.load();
        console.log("COCO-SSD model loaded successfully.");
        startButton.disabled = false; // Enable start button
    } catch (err) {
        console.error("Error loading the COCO-SSD model: ", err);
        alert("加载 COCO-SSD 模型出错。物体检测将无法工作。");
    }
}

async function detectObjects() {
    if (!isDetecting) return;

    if (video.readyState >= 3) { // HAVE_FUTURE_DATA or HAVE_ENOUGH_DATA
        try {
            const predictions = await model.detect(video);
            drawResults(predictions); // Call new function to draw results
        } catch (err) {
            console.error("Error during object detection: ", err);
        }
    }
    requestAnimationFrame(detectObjects); // Continue the loop
}

function drawResults(predictions) {
    context.clearRect(0, 0, canvas.width, canvas.height);
    objectList.innerHTML = ''; // Clear previous list items

    predictions.forEach(prediction => {
        if (prediction.score > 0.5) { // Optional: Confidence threshold
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
    const imageSummaryListElement = document.getElementById('imageSummaryList'); // Renamed for consistency
    if (imageSummaryListElement) imageSummaryListElement.innerHTML = '';
    const imageSummaryListElement = document.getElementById('imageSummaryList'); // Renamed for consistency
    if (imageSummaryListElement) imageSummaryListElement.innerHTML = '';
    document.getElementById('objectList').innerHTML = ''; // Also clear main object list

    // Hide/remove existing image if any
    const existingImage = document.getElementById('displayedImage');
    if (existingImage) {
        existingImage.remove();
    }
    document.getElementById('container').style.display = 'block'; // Ensure video container is visible
    video.style.display = 'block'; // Make video element visible
    canvas.style.display = 'block'; // Ensure canvas is visible
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
        document.getElementById('container').style.display = 'block'; // Ensure video container is visible
        video.style.display = 'block'; // Make video element visible
        canvas.style.display = 'block'; // Ensure canvas is visible
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
        // For now, don't automatically display the first image's full details.
        // User will need to click on a summary.
        // Clear main display if it's not already.
        const existingMainImage = document.getElementById('displayedImage');
        if (existingMainImage) existingMainImage.remove();
        context.clearRect(0, 0, canvas.width, canvas.height);
        document.getElementById('objectList').innerHTML = '<li class="text-gray-500">从上方摘要列表选择一张图片查看详情。</li>';

    } else {
         document.getElementById('objectList').innerHTML = ''; // Clear if no batch results
    }
}

imageUpload.addEventListener('change', handleImageUpload);

async function performImageDetection(imgElement) {
    if (!model || !imgElement) {
        console.error("Model or image element not available for detection.");
        return null; // Return null or empty array on error
    }
    console.log("Performing detection on image:", imgElement.id || imgElement.src.substring(0,30));
    try {
        const predictions = await model.detect(imgElement);
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


    // 2. Display the selected image in the main content area
    const img = document.createElement('img');
    img.id = 'displayedImage'; // Use the same ID for consistency
    img.src = selectedResult.dataURL;
    img.className = 'w-full h-full object-contain'; // Match styling of single image display

    const videoContainer = document.getElementById('container'); // Parent of video/canvas
    videoContainer.style.display = 'block'; // Ensure #container is visible
    // Ensure canvas is a direct child of 'container' or its positioning is correct relative to 'img'
    videoContainer.appendChild(img); // Add image to the container

    img.onload = () => {
        // 3. Adjust canvas size
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        canvas.style.display = 'block'; // Make sure canvas is visible over the image

        // 4. Draw detection results for this image
        //    The predictions are already stored in selectedResult.predictions
        drawResults(selectedResult.predictions || []); // Pass the stored predictions

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
