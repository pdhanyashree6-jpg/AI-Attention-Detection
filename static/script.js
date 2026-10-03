/* =========================================================
   FOCUS - AI ATTENTION MONITORING
   CONNECTED TO FLASK BACKEND
========================================================= */


// =========================================================
// GET ELEMENTS
// =========================================================

const camera =
    document.getElementById("camera");

const cameraMessage =
    document.getElementById("cameraMessage");

const startBtn =
    document.getElementById("startBtn");

const stopBtn =
    document.getElementById("stopBtn");

const attentionValue =
    document.getElementById("attentionValue");

const attentionProgress =
    document.getElementById("attentionProgress");

const attentionStatus =
    document.getElementById("attentionStatus");

const eyeStatus =
    document.getElementById("eyeStatus");

const headDirection =
    document.getElementById("headDirection");

const phoneStatus =
    document.getElementById("phoneStatus");

const sessionTime =
    document.getElementById("sessionTime");

const averageAttention =
    document.getElementById("averageAttention");

const focusedTime =
    document.getElementById("focusedTime");

const distractionCount =
    document.getElementById("distractionCount");

const graphScore =
    document.getElementById("graphScore");

const canvas =
    document.getElementById("attentionChart");


// =========================================================
// VARIABLES
// =========================================================

let monitoring = false;

let timerInterval = null;

let dataInterval = null;

let sessionSeconds = 0;

let focusedSeconds = 0;

let distractions = 0;

let lastDistractionState = false;

let attentionValues = [];

const MAX_GRAPH_POINTS = 60;


// =========================================================
// CANVAS
// =========================================================

let ctx = null;

if (canvas) {

    ctx =
        canvas.getContext("2d");

}


// =========================================================
// START MONITORING
// =========================================================

async function startMonitoring() {

    if (monitoring) {

        return;

    }


    console.log(
        "Starting monitoring..."
    );


    try {

        const response =
            await fetch("/start");


        const data =
            await response.json();


        console.log(
            "Server response:",
            data
        );


        if (!data.success) {

            alert(
                "Camera could not be opened.\n\n" +
                data.message
            );

            return;

        }


        monitoring = true;


        // ---------------------------------------------
        // SHOW CAMERA
        // ---------------------------------------------

        camera.src =
            "/video_feed?" +
            new Date().getTime();


        camera.style.display =
            "block";


        cameraMessage.style.display =
            "none";


        // ---------------------------------------------
        // BUTTONS
        // ---------------------------------------------

        startBtn.disabled =
            true;

        stopBtn.disabled =
            false;


        startBtn.innerHTML =
            "● Monitoring...";


        // ---------------------------------------------
        // RESET SESSION
        // ---------------------------------------------

        sessionSeconds = 0;

        focusedSeconds = 0;

        distractions = 0;

        attentionValues = [];


        updateTimer();

        updateFocusedTime();


        if (distractionCount) {

            distractionCount.textContent =
                "0";

        }


        if (averageAttention) {

            averageAttention.textContent =
                "0%";

        }


        // ---------------------------------------------
        // START TIMER
        // ---------------------------------------------

        startTimer();


        // ---------------------------------------------
        // GET DATA
        // ---------------------------------------------

        startDataUpdates();


        console.log(
            "FOCUS monitoring started."
        );


    }

    catch (error) {

        console.error(
            "Start error:",
            error
        );


        alert(
            "Make sure Flask server is running.\n\n" +
            "Open:\n" +
            "http://127.0.0.1:5000"
        );

    }

}


// =========================================================
// STOP MONITORING
// =========================================================

async function stopMonitoring() {

    if (!monitoring) {

        return;

    }


    console.log(
        "Stopping monitoring..."
    );


    try {

        await fetch("/stop");

    }

    catch (error) {

        console.error(
            "Stop error:",
            error
        );

    }


    monitoring = false;


    // ---------------------------------------------
    // STOP IMAGE
    // ---------------------------------------------

    camera.src = "";

    camera.style.display =
        "none";


    cameraMessage.style.display =
        "flex";


    // ---------------------------------------------
    // STOP TIMER
    // ---------------------------------------------

    stopTimer();


    // ---------------------------------------------
    // STOP DATA
    // ---------------------------------------------

    stopDataUpdates();


    // ---------------------------------------------
    // BUTTONS
    // ---------------------------------------------

    startBtn.disabled =
        false;

    stopBtn.disabled =
        true;


    startBtn.innerHTML =
        "▶ Start Monitoring";


    console.log(
        "FOCUS monitoring stopped."
    );

}


// =========================================================
// TIMER
// =========================================================

function startTimer() {

    if (timerInterval) {

        return;

    }


    timerInterval =
        setInterval(

            function () {

                sessionSeconds++;


                updateTimer();


            },

            1000

        );

}


// =========================================================
// STOP TIMER
// =========================================================

function stopTimer() {

    if (timerInterval) {

        clearInterval(
            timerInterval
        );

        timerInterval = null;

    }

}


// =========================================================
// FORMAT TIME
// =========================================================

function formatTime(
    totalSeconds
) {

    const minutes =
        Math.floor(
            totalSeconds / 60
        );


    const seconds =
        totalSeconds % 60;


    return (

        String(minutes)
            .padStart(2, "0")

        +

        ":"

        +

        String(seconds)
            .padStart(2, "0")

    );

}


// =========================================================
// UPDATE TIMER
// =========================================================

function updateTimer() {

    if (sessionTime) {

        sessionTime.textContent =
            formatTime(
                sessionSeconds
            );

    }

}


// =========================================================
// UPDATE FOCUSED TIME
// =========================================================

function updateFocusedTime() {

    if (focusedTime) {

        focusedTime.textContent =
            formatTime(
                focusedSeconds
            );

    }

}


// =========================================================
// START DATA UPDATES
// =========================================================

function startDataUpdates() {

    if (dataInterval) {

        return;

    }


    getData();


    dataInterval =
        setInterval(

            getData,

            500

        );

}


// =========================================================
// STOP DATA UPDATES
// =========================================================

function stopDataUpdates() {

    if (dataInterval) {

        clearInterval(
            dataInterval
        );

        dataInterval = null;

    }

}


// =========================================================
// GET DATA FROM FLASK
// =========================================================

async function getData() {

    if (!monitoring) {

        return;

    }


    try {

        const response =
            await fetch(
                "/data?" +
                new Date().getTime()
            );


        if (!response.ok) {

            throw new Error(
                "Server returned error"
            );

        }


        const data =
            await response.json();


        console.log(
            "AI DATA:",
            data
        );


        updateDashboard(
            data
        );


    }

    catch (error) {

        console.error(
            "Data error:",
            error
        );

    }

}


// =========================================================
// UPDATE DASHBOARD
// =========================================================

function updateDashboard(data) {


    // =====================================================
    // ATTENTION
    // =====================================================

    const attention =
        Number(
            data.attention || 0
        );


    updateAttentionDisplay(
        attention
    );


    addGraphValue(
        attention
    );


    drawGraph();


    // =====================================================
    // EYES
    // =====================================================

    if (eyeStatus) {

        eyeStatus.textContent =
            data.eye || "UNKNOWN";


        if (
            String(
                data.eye
            ).toUpperCase()
            ===
            "OPEN"
        ) {

            eyeStatus.style.color =
                "#159b70";

        }

        else {

            eyeStatus.style.color =
                "#d2265d";

        }

    }


    // =====================================================
    // HEAD
    // =====================================================

    if (headDirection) {

        headDirection.textContent =
            data.head || "UNKNOWN";


        if (
            String(
                data.head
            ).toUpperCase()
            ===
            "CENTER"
        ) {

            headDirection.style.color =
                "#159b70";

        }

        else {

            headDirection.style.color =
                "#c32388";

        }

    }


    // =====================================================
    // PHONE
    // =====================================================

    if (phoneStatus) {

        if (data.phone === true) {

            phoneStatus.textContent =
                "Detected";


            phoneStatus.classList.remove(
                "safe"
            );


            phoneStatus.classList.add(
                "phone-warning"
            );

        }

        else {

            phoneStatus.textContent =
                "Not Detected";


            phoneStatus.classList.remove(
                "phone-warning"
            );


            phoneStatus.classList.add(
                "safe"
            );

        }

    }


    // =====================================================
    // STATUS
    // =====================================================

    const status =
        String(
            data.status || ""
        ).toUpperCase();


    if (attentionStatus) {

        if (
            status ===
            "ATTENTIVE"
        ) {

            attentionStatus.textContent =
                "Highly Attentive";

        }

        else if (
            status ===
            "PHONE DETECTED"
        ) {

            attentionStatus.textContent =
                "Phone Detected";

        }

        else if (
            status ===
            "DISTRACTED"
        ) {

            attentionStatus.textContent =
                "Distracted";

        }

        else if (
            status ===
            "DROWSY"
        ) {

            attentionStatus.textContent =
                "Drowsy";

        }

        else if (
            status ===
            "NO FACE"
        ) {

            attentionStatus.textContent =
                "No Face Detected";

        }

        else {

            attentionStatus.textContent =
                status;

        }

    }


    // =====================================================
    // FOCUSED TIME
    // =====================================================

    if (attention >= 60) {

        focusedSeconds++;

        updateFocusedTime();

    }


    // =====================================================
    // DISTRACTIONS
    // =====================================================

    const isDistracted =

        attention < 40

        ||

        status ===
        "PHONE DETECTED"

        ||

        status ===
        "DROWSY";


    if (
        isDistracted
        &&
        !lastDistractionState
    ) {

        distractions++;


        if (distractionCount) {

            distractionCount.textContent =
                distractions;

        }

    }


    lastDistractionState =
        isDistracted;


    // =====================================================
    // AVERAGE
    // =====================================================

    updateAverage();

}


// =========================================================
// UPDATE ATTENTION DISPLAY
// =========================================================

function updateAttentionDisplay(
    value
) {

    value =
        Math.max(
            0,
            Math.min(
                100,
                value
            )
        );


    if (attentionValue) {

        attentionValue.textContent =
            Math.round(value);

    }


    if (attentionProgress) {

        attentionProgress.style.width =
            value + "%";

    }


    if (graphScore) {

        graphScore.textContent =
            Math.round(value) +
            "%";

    }

}


// =========================================================
// ADD GRAPH VALUE
// =========================================================

function addGraphValue(
    value
) {

    attentionValues.push(
        value
    );


    if (
        attentionValues.length
        >
        MAX_GRAPH_POINTS
    ) {

        attentionValues.shift();

    }

}


// =========================================================
// UPDATE AVERAGE
// =========================================================

function updateAverage() {

    if (
        attentionValues.length === 0
    ) {

        return;

    }


    let total = 0;


    attentionValues.forEach(
        function (value) {

            total += value;

        }
    );


    const average =
        Math.round(
            total /
            attentionValues.length
        );


    if (averageAttention) {

        averageAttention.textContent =
            average + "%";

    }

}


// =========================================================
// DRAW GRAPH
// =========================================================

function drawGraph() {

    if (!canvas || !ctx) {

        return;

    }


    const width =
        canvas.clientWidth;


    const height =
        canvas.clientHeight;


    if (
        width <= 0 ||
        height <= 0
    ) {

        return;

    }


    const dpr =
        window.devicePixelRatio ||
        1;


    canvas.width =
        width * dpr;


    canvas.height =
        height * dpr;


    ctx.setTransform(

        dpr,

        0,

        0,

        dpr,

        0,

        0

    );


    ctx.clearRect(

        0,

        0,

        width,

        height

    );


    // =====================================================
    // GRAPH AREA
    // =====================================================

    const left = 45;

    const right = 20;

    const top = 20;

    const bottom = 30;


    const graphWidth =

        width -
        left -
        right;


    const graphHeight =

        height -
        top -
        bottom;


    // =====================================================
    // BACKGROUND
    // =====================================================

    ctx.fillStyle =
        "#ffffff";


    ctx.fillRect(

        0,

        0,

        width,

        height

    );


    // =====================================================
    // GRID
    // =====================================================

    const levels = [

        100,

        75,

        50,

        25,

        0

    ];


    ctx.font =
        "11px Arial";


    levels.forEach(

        function (level) {


            const y =

                top +

                graphHeight -

                (
                    level /
                    100
                ) *
                graphHeight;


            ctx.beginPath();


            ctx.moveTo(

                left,

                y

            );


            ctx.lineTo(

                width - right,

                y

            );


            ctx.strokeStyle =
                "#eadff0";


            ctx.lineWidth = 1;


            ctx.stroke();


            ctx.fillStyle =
                "#927d98";


            ctx.textAlign =
                "right";


            ctx.textBaseline =
                "middle";


            ctx.fillText(

                level + "%",

                left - 8,

                y

            );

        }

    );


    // =====================================================
    // TITLE
    // =====================================================

    ctx.font =
        "bold 11px Arial";


    ctx.fillStyle =
        "#8b568e";


    ctx.textAlign =
        "left";


    ctx.textBaseline =
        "top";


    ctx.fillText(

        "ATTENTION %",

        left,

        2

    );


    // =====================================================
    // NO DATA
    // =====================================================

    if (
        attentionValues.length === 0
    ) {

        return;

    }


    // =====================================================
    // POINTS
    // =====================================================

    const points = [];


    attentionValues.forEach(

        function (
            value,
            index
        ) {


            let x;


            if (
                attentionValues.length
                ===
                1
            ) {

                x = left;

            }

            else {

                x =

                    left +

                    (
                        index /
                        (
                            attentionValues.length -
                            1
                        )
                    )
                    *
                    graphWidth;

            }


            const y =

                top +

                graphHeight -

                (
                    value /
                    100
                )
                *
                graphHeight;


            points.push({

                x: x,

                y: y

            });

        }

    );


    // =====================================================
    // GRAPH AREA
    // =====================================================

    if (
        points.length > 1
    ) {

        ctx.beginPath();


        ctx.moveTo(

            points[0].x,

            top +
            graphHeight

        );


        points.forEach(

            function (point) {

                ctx.lineTo(

                    point.x,

                    point.y

                );

            }

        );


        ctx.lineTo(

            points[
                points.length - 1
            ].x,

            top +
            graphHeight

        );


        ctx.closePath();


        ctx.fillStyle =
            "rgba(210,38,145,0.12)";


        ctx.fill();

    }


    // =====================================================
    // GRAPH LINE
    // =====================================================

    ctx.beginPath();


    points.forEach(

        function (
            point,
            index
        ) {


            if (index === 0) {

                ctx.moveTo(

                    point.x,

                    point.y

                );

            }

            else {

                ctx.lineTo(

                    point.x,

                    point.y

                );

            }

        }

    );


    ctx.strokeStyle =
        "#c32388";


    ctx.lineWidth = 3;


    ctx.lineJoin =
        "round";


    ctx.lineCap =
        "round";


    ctx.stroke();


    // =====================================================
    // LAST POINT
    // =====================================================

    if (
        points.length > 0
    ) {

        const lastPoint =
            points[
                points.length - 1
            ];


        ctx.beginPath();


        ctx.arc(

            lastPoint.x,

            lastPoint.y,

            5,

            0,

            Math.PI * 2

        );


        ctx.fillStyle =
            "#ffffff";


        ctx.fill();


        ctx.strokeStyle =
            "#d22691";


        ctx.lineWidth = 3;


        ctx.stroke();

    }

}


// =========================================================
// BUTTON EVENTS
// =========================================================

if (startBtn) {

    startBtn.addEventListener(

        "click",

        startMonitoring

    );

}


if (stopBtn) {

    stopBtn.addEventListener(

        "click",

        stopMonitoring

    );

}


// =========================================================
// RESIZE
// =========================================================

window.addEventListener(

    "resize",

    function () {

        drawGraph();

    }

);


// =========================================================
// INITIAL STATE
// =========================================================

if (stopBtn) {

    stopBtn.disabled =
        true;

}


if (camera) {

    camera.style.display =
        "none";

}


if (cameraMessage) {

    cameraMessage.style.display =
        "flex";

}


if (attentionValue) {

    attentionValue.textContent =
        "0";

}


if (attentionProgress) {

    attentionProgress.style.width =
        "0%";

}


if (attentionStatus) {

    attentionStatus.textContent =
        "Waiting for monitoring...";

}


if (eyeStatus) {

    eyeStatus.textContent =
        "Waiting";

}


if (headDirection) {

    headDirection.textContent =
        "Waiting";

}


if (phoneStatus) {

    phoneStatus.textContent =
        "Not Detected";

}


if (sessionTime) {

    sessionTime.textContent =
        "00:00";

}


if (averageAttention) {

    averageAttention.textContent =
        "0%";

}


if (focusedTime) {

    focusedTime.textContent =
        "00:00";

}


if (distractionCount) {

    distractionCount.textContent =
        "0";

}


// =========================================================
// DRAW INITIAL GRAPH
// =========================================================

drawGraph();


console.log(
    "FOCUS JavaScript connected to Flask."
);