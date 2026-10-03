import cv2
import mediapipe as mp
import math
import threading

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

from ultralytics import YOLO


# =========================================================
# SETTINGS
# =========================================================

FACE_MODEL = "face_landmarker.task"
YOLO_MODEL = "yolo11n.pt"

LEFT_EYE = [362, 385, 387, 263, 373, 380]
RIGHT_EYE = [33, 160, 158, 133, 153, 144]

EAR_THRESHOLD = 0.20

CLOSED_FRAME_LIMIT = 15

PHONE_CONFIDENCE = 0.35


# =========================================================
# GLOBAL VARIABLES
# =========================================================

camera = None

camera_running = False

camera_lock = threading.Lock()

closed_frames = 0

frame_timestamp = 0


latest_data = {
    "attention": 0,
    "eye": "WAITING",
    "head": "WAITING",
    "phone": False,
    "phone_confidence": 0,
    "status": "WAITING"
}


# =========================================================
# LOAD MEDIAPIPE
# =========================================================

print("")
print("Loading MediaPipe...")

base_options = python.BaseOptions(
    model_asset_path=FACE_MODEL
)


options = vision.FaceLandmarkerOptions(
    base_options=base_options,

    running_mode=vision.RunningMode.VIDEO,

    num_faces=1,

    min_face_detection_confidence=0.5,

    min_face_presence_confidence=0.5,

    min_tracking_confidence=0.5
)


landmarker = vision.FaceLandmarker.create_from_options(
    options
)


print("MediaPipe loaded successfully.")


# =========================================================
# LOAD YOLO
# =========================================================

print("")
print("Loading YOLO...")


yolo_model = YOLO(YOLO_MODEL)


print("YOLO loaded successfully.")


# =========================================================
# DISTANCE FUNCTION
# =========================================================

def distance(point1, point2):

    x1, y1 = point1

    x2, y2 = point2

    return math.sqrt(
        (x2 - x1) ** 2 +
        (y2 - y1) ** 2
    )


# =========================================================
# EYE ASPECT RATIO
# =========================================================

def eye_aspect_ratio(eye_points):

    vertical1 = distance(
        eye_points[1],
        eye_points[5]
    )

    vertical2 = distance(
        eye_points[2],
        eye_points[4]
    )

    horizontal = distance(
        eye_points[0],
        eye_points[3]
    )

    if horizontal == 0:

        return 0

    return (
        vertical1 +
        vertical2
    ) / (2 * horizontal)


# =========================================================
# START CAMERA
# =========================================================

def start_camera():

    global camera
    global camera_running

    with camera_lock:

        if camera_running:

            return True

        print("")
        print("Opening camera...")

        camera = cv2.VideoCapture(0)

        if not camera.isOpened():

            print("")
            print("ERROR: Camera could not be opened.")
            print("")

            camera = None

            camera_running = False

            return False


        # Camera settings

        camera.set(
            cv2.CAP_PROP_FRAME_WIDTH,
            1280
        )

        camera.set(
            cv2.CAP_PROP_FRAME_HEIGHT,
            720
        )


        camera_running = True

        print("Camera opened successfully.")

        return True


# =========================================================
# STOP CAMERA
# =========================================================

def stop_camera():

    global camera
    global camera_running
    global closed_frames
    global frame_timestamp

    with camera_lock:

        if camera is not None:

            camera.release()

            camera = None


        camera_running = False

        closed_frames = 0

        frame_timestamp = 0


    latest_data.update({

        "attention": 0,

        "eye": "WAITING",

        "head": "WAITING",

        "phone": False,

        "phone_confidence": 0,

        "status": "WAITING"

    })


    print("Camera stopped.")


# =========================================================
# CHECK CAMERA
# =========================================================

def camera_is_running():

    return camera_running


# =========================================================
# GET LATEST DATA
# =========================================================

def get_latest_data():

    return latest_data.copy()


# =========================================================
# PROCESS FRAME
# =========================================================

def process_frame(frame):

    global closed_frames
    global frame_timestamp
    global latest_data


    # -----------------------------------------------------
    # MIRROR IMAGE
    # -----------------------------------------------------

    frame = cv2.flip(
        frame,
        1
    )


    height, width, _ = frame.shape


    # =====================================================
    # DEFAULT VALUES
    # =====================================================

    phone_detected = False

    phone_confidence = 0

    phone_box = None


    eye_status = "UNKNOWN"

    head_direction = "UNKNOWN"

    attention_score = 0

    status = "NO FACE"


    # =====================================================
    # YOLO PHONE DETECTION
    # =====================================================

    try:

        yolo_results = yolo_model.predict(

            frame,

            conf=PHONE_CONFIDENCE,

            imgsz=320,

            verbose=False

        )


        for result in yolo_results:

            if result.boxes is None:

                continue


            for box in result.boxes:

                class_id = int(
                    box.cls[0]
                )

                confidence = float(
                    box.conf[0]
                )

                class_name = result.names[
                    class_id
                ]


                if class_name.lower() == "cell phone":

                    phone_detected = True

                    phone_confidence = confidence

                    coordinates = box.xyxy[
                        0
                    ].tolist()


                    phone_box = [

                        int(coordinates[0]),

                        int(coordinates[1]),

                        int(coordinates[2]),

                        int(coordinates[3])

                    ]


    except Exception as error:

        print(
            "YOLO error:",
            error
        )


    # =====================================================
    # DRAW PHONE
    # =====================================================

    if phone_detected and phone_box:

        x1, y1, x2, y2 = phone_box


        cv2.rectangle(

            frame,

            (x1, y1),

            (x2, y2),

            (0, 0, 255),

            3

        )


        cv2.putText(

            frame,

            f"PHONE {phone_confidence:.2f}",

            (
                x1,
                max(
                    y1 - 10,
                    20
                )
            ),

            cv2.FONT_HERSHEY_SIMPLEX,

            0.6,

            (0, 0, 255),

            2

        )


    # =====================================================
    # MEDIAPIPE
    # =====================================================

    try:

        rgb_frame = cv2.cvtColor(

            frame,

            cv2.COLOR_BGR2RGB

        )


        mp_image = mp.Image(

            image_format=mp.ImageFormat.SRGB,

            data=rgb_frame

        )


        frame_timestamp += 33


        result = landmarker.detect_for_video(

            mp_image,

            frame_timestamp

        )


    except Exception as error:

        print(
            "MediaPipe error:",
            error
        )

        return frame


    # =====================================================
    # FACE DETECTED
    # =====================================================

    if result.face_landmarks:

        face = result.face_landmarks[0]


        # =================================================
        # EYE LANDMARKS
        # =================================================

        left_eye = []

        right_eye = []


        for index in LEFT_EYE:

            landmark = face[index]


            x = int(
                landmark.x * width
            )

            y = int(
                landmark.y * height
            )


            left_eye.append(
                (x, y)
            )


        for index in RIGHT_EYE:

            landmark = face[index]


            x = int(
                landmark.x * width
            )

            y = int(
                landmark.y * height
            )


            right_eye.append(
                (x, y)
            )


        # =================================================
        # EAR
        # =================================================

        left_ear = eye_aspect_ratio(
            left_eye
        )


        right_ear = eye_aspect_ratio(
            right_eye
        )


        ear = (
            left_ear +
            right_ear
        ) / 2


        # =================================================
        # EYE STATUS
        # =================================================

        if ear < EAR_THRESHOLD:

            closed_frames += 1

            eye_status = "CLOSED"


        else:

            closed_frames = 0

            eye_status = "OPEN"


        # =================================================
        # HEAD DIRECTION
        # =================================================

        nose = face[1]

        left_face = face[234]

        right_face = face[454]


        nose_x = nose.x

        left_x = left_face.x

        right_x = right_face.x


        face_width = (
            right_x -
            left_x
        )


        if face_width != 0:

            nose_position = (

                nose_x -
                left_x

            ) / face_width


        else:

            nose_position = 0.5


        if nose_position < 0.40:

            head_direction = "LEFT"


        elif nose_position > 0.60:

            head_direction = "RIGHT"


        else:

            head_direction = "CENTER"


        # =================================================
        # ATTENTION SCORE
        # =================================================

        # FACE = 20

        attention_score = 20


        # EYES = 30

        if eye_status == "OPEN":

            attention_score += 30


        # HEAD = 30

        if head_direction == "CENTER":

            attention_score += 30

        else:

            attention_score += 10


        # PHONE = 20

        if not phone_detected:

            attention_score += 20


        # =================================================
        # STATUS
        # =================================================

        if closed_frames > CLOSED_FRAME_LIMIT:

            status = "DROWSY"

            attention_score = min(
                attention_score,
                25
            )


        elif phone_detected:

            status = "PHONE DETECTED"

            attention_score = min(
                attention_score,
                35
            )


        elif head_direction in [

            "LEFT",

            "RIGHT"

        ]:

            status = "DISTRACTED"


        elif (

            eye_status == "OPEN"

            and

            head_direction == "CENTER"

        ):

            status = "ATTENTIVE"


        else:

            status = "DISTRACTED"


        # =================================================
        # LIMIT SCORE
        # =================================================

        attention_score = max(

            0,

            min(

                100,

                attention_score

            )

        )


        # =================================================
        # DRAW EYE LANDMARKS
        # =================================================

        for point in left_eye:

            cv2.circle(

                frame,

                point,

                3,

                (0, 255, 0),

                -1

            )


        for point in right_eye:

            cv2.circle(

                frame,

                point,

                3,

                (0, 255, 0),

                -1

            )


        # =================================================
        # DRAW NOSE
        # =================================================

        nose_pixel = (

            int(
                nose.x * width
            ),

            int(
                nose.y * height
            )

        )


        cv2.circle(

            frame,

            nose_pixel,

            5,

            (255, 0, 0),

            -1

        )


    else:

        status = "NO FACE"

        attention_score = 0


    # =====================================================
    # UPDATE WEBSITE DATA
    # =====================================================

    latest_data = {

        "attention": attention_score,

        "eye": eye_status,

        "head": head_direction,

        "phone": phone_detected,

        "phone_confidence": round(

            phone_confidence,

            2

        ),

        "status": status

    }


    # =====================================================
    # DRAW INFORMATION ON CAMERA
    # =====================================================

    cv2.putText(

        frame,

        f"Eye: {eye_status}",

        (20, 35),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.65,

        (255, 255, 255),

        2

    )


    cv2.putText(

        frame,

        f"Head: {head_direction}",

        (20, 70),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.65,

        (255, 255, 255),

        2

    )


    cv2.putText(

        frame,

        f"Status: {status}",

        (20, 105),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.65,

        (0, 255, 0),

        2

    )


    cv2.putText(

        frame,

        f"Attention: {attention_score}%",

        (20, 140),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.65,

        (255, 255, 0),

        2

    )


    if phone_detected:

        phone_text = "PHONE: DETECTED"

        phone_color = (0, 0, 255)

    else:

        phone_text = "PHONE: NOT DETECTED"

        phone_color = (255, 255, 255)


    cv2.putText(

        frame,

        phone_text,

        (20, 175),

        cv2.FONT_HERSHEY_SIMPLEX,

        0.65,

        phone_color,

        2

    )


    # =====================================================
    # RETURN FRAME
    # =====================================================

    return frame


# =========================================================
# GENERATE VIDEO FRAMES
# =========================================================

def generate_frames():

    global camera


    while True:

        if not camera_running:

            break


        with camera_lock:

            if camera is None:

                break


            success, frame = camera.read()


        if not success:

            print(
                "Could not read camera frame."
            )

            break


        # Process frame

        frame = process_frame(
            frame
        )


        # Encode image

        success, buffer = cv2.imencode(

            ".jpg",

            frame

        )


        if not success:

            continue


        frame_bytes = buffer.tobytes()


        # Send to browser

        yield (

            b"--frame\r\n"

            b"Content-Type: image/jpeg\r\n\r\n"

            + frame_bytes

            + b"\r\n"

        )


# =========================================================
# PROGRAM END
# =========================================================