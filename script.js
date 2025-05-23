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

function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
        // A. Stop any ongoing video/camera activity and clear displays
        if (video.srcObject) { // Stop camera stream
            const stream = video.srcObject;
            const tracks = stream.getTracks(); // Corrected: define tracks
            tracks.forEach(track => track.stop());
            video.srcObject = null;
        }
        if (video.src && video.src.startsWith('blob:')) { // Clear uploaded video
            URL.revokeObjectURL(video.src);
            video.src = "";
        }
        video.style.display = 'none'; // Hide video element
        video.controls = false;
        isDetecting = false;
        context.clearRect(0, 0, canvas.width, canvas.height);
        objectList.innerHTML = '';

        // B. Read and display the image
        const reader = new FileReader();
        reader.onload = function(e) {
            // Remove previous image if any
            const existingImage = document.getElementById('displayedImage');
            if (existingImage) {
                existingImage.remove();
            }

            // Create and display new image
            const img = document.createElement('img');
            img.id = 'displayedImage';
            img.src = e.target.result;
            img.className = 'w-full h-full object-contain'; // Tailwind for fitting image in container

            const videoContainer = document.getElementById('container'); // This is the video's parent
            videoContainer.style.display = 'block'; // Ensure #container is visible
            video.style.display = 'none'; // Keep video hidden
            canvas.style.display = 'block'; // Keep canvas visible for drawing over image

            videoContainer.appendChild(img); // Add image to the same container as video/canvas

            img.onload = () => {
                // C. Adjust canvas size to match image
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                
                // Ensure #container's aspect ratio doesn't clip the image (optional refinement)
                // videoContainer.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;


                console.log("Image loaded, canvas resized. Ready for detection.");
                // D. TODO in next step: Perform object detection on the image
                performImageDetection(img); 
            }
        }
        reader.readAsDataURL(file);
    }
}

imageUpload.addEventListener('change', handleImageUpload);

async function performImageDetection(imgElement) {
    if (!model || !imgElement) {
        console.error("Model or image element not available for detection.");
        return;
    }

    console.log("Performing detection on image...");
    try {
        const predictions = await model.detect(imgElement);
        drawResults(predictions); // Reuse the existing function to draw results
        console.log("Image detection complete. Predictions:", predictions);

        // Optional: Update any UI or state to indicate detection is done for the image.
        // isDetecting = false; // For static images, detection is a one-off event.
        // However, isDetecting is mostly used for requestAnimationFrame loops.
        // We might not need to set it to false here unless it causes issues
        // with how other parts of the UI (like stop buttons) behave.
        // For now, let's assume drawResults is sufficient.

    } catch (err) {
        console.error("Error during image object detection: ", err);
        alert("图片物体检测时发生错误。"); // Chinese alert
    }
}

// Load the model when the script loads
loadModel();
