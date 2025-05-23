const video = document.getElementById('video');
const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const objectList = document.getElementById('objectList'); // Added for future use
const canvas = document.getElementById('canvas'); // Added for future use
const context = canvas.getContext('2d'); // Added for future use

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
        alert("Error loading the COCO-SSD model. Object detection will not work.");
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
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            video.srcObject = stream;
            video.play(); // Explicitly call play
        } catch (err) {
            console.error("Error accessing the camera: ", err);
            // Handle specific errors or display a message to the user
            if (err.name === "NotAllowedError") {
                alert("Camera access was denied. Please allow access to use this feature.");
            } else if (err.name === "NotFoundError") {
                alert("No camera was found on your device.");
            } else {
                alert("An error occurred while accessing the camera: " + err.message);
            }
        }
    } else {
        alert("getUserMedia is not supported by your browser.");
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
    if (video.srcObject) { // Ensure a stream is attached
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        isDetecting = true;
        detectObjects();
    }
});

// Load the model when the script loads
loadModel();
