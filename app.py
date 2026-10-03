from flask import Flask, render_template, Response, jsonify
import attention_detector

app = Flask(__name__)


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def home():
    return render_template("index.html")


# =========================================================
# START MONITORING
# =========================================================

@app.route("/start")
def start_monitoring():

    success = attention_detector.start_camera()

    if success:
        return jsonify({
            "success": True,
            "message": "Camera started successfully"
        })

    return jsonify({
        "success": False,
        "message": "Camera could not be opened"
    })


# =========================================================
# STOP MONITORING
# =========================================================

@app.route("/stop")
def stop_monitoring():

    attention_detector.stop_camera()

    return jsonify({
        "success": True,
        "message": "Monitoring stopped"
    })


# =========================================================
# VIDEO STREAM
# =========================================================

@app.route("/video_feed")
def video_feed():

    return Response(
        attention_detector.generate_frames(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


# =========================================================
# GET ATTENTION DATA
# =========================================================

@app.route("/data")
def get_data():

    return jsonify(
        attention_detector.get_latest_data()
    )


# =========================================================
# SERVER STATUS
# =========================================================

@app.route("/server_status")
def server_status():

    return jsonify({
        "server": True,
        "camera": attention_detector.camera_is_running()
    })


# =========================================================
# RUN FLASK
# =========================================================

if __name__ == "__main__":

    print("")
    print("==========================================")
    print("       FOCUS AI ATTENTION SYSTEM")
    print("==========================================")
    print("")
    print("Flask server starting...")
    print("")
    print("Open this in your browser:")
    print("http://127.0.0.1:5000")
    print("")
    print("==========================================")

    app.run(
        host="127.0.0.1",
        port=5000,
        debug=False,
        threaded=True,
        use_reloader=False
    )