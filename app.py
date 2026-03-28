import os
from datetime import datetime
from flask import Flask, request, jsonify, render_template, session, redirect, url_for
from pymongo import MongoClient
from bson.objectid import ObjectId
from dotenv import load_dotenv
import certifi

load_dotenv()

app = Flask(__name__)
# Use a strong secret key in production
app.secret_key = os.getenv("SECRET_KEY", "super_secret_dev_key")

@app.route('/favicon.ico')
def favicon():
    return '', 204


# MongoDB connection
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
try:
    if "mongodb+srv://" in MONGO_URI:
        client = MongoClient(MONGO_URI, tlsCAFile=certifi.where())
    else:
        client = MongoClient(MONGO_URI)
    db = client.feedback_db
    feedback_collection = db.feedback
    feedback_sessions = db.feedback_sessions
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

# Admin credentials from environment (with defaults for local dev)
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

@app.route("/")
def index():
    """Redirect to the admin login page since direct feedback is disabled."""
    return redirect(url_for('login'))

@app.route("/f/<session_id>")
def session_feedback(session_id):
    """Render the feedback form for a specific session."""
    try:
        session_data = feedback_sessions.find_one({"_id": ObjectId(session_id)})
        if not session_data:
            return "Invalid or expired feedback link.", 404
        return render_template("index.html", session_id=str(session_data["_id"]), session_title=session_data["title"])
    except Exception:
        return "Invalid link format.", 400

@app.route("/submit-feedback", methods=["POST"])
def submit_feedback():
    """API endpoint to handle feedback submission."""
    data = request.json
    
    # Validation
    if not data or not data.get("rating") or not data.get("message") or not data.get("session_id"):
        return jsonify({"success": False, "error": "Missing required fields"}), 400

    try:
        session_data = feedback_sessions.find_one({"_id": ObjectId(data.get("session_id"))})
        category = session_data.get("category", "Other") if session_data else "Other"
    except Exception:
        category = "Other"

    feedback = {
        "session_id": data.get("session_id"),
        "name": data.get("name", "Anonymous").strip() or "Anonymous",
        "category": category,
        "rating": int(data.get("rating")),
        "message": data.get("message"),
        "created_at": datetime.utcnow()
    }
    
    try:
        feedback_collection.insert_one(feedback)
        return jsonify({"success": True, "message": "Feedback submitted successfully"})
    except Exception as e:
        return jsonify({"success": False, "error": "Database error occurred"}), 500

@app.route("/admin")
def admin():
    """Render the admin dashboard page."""
    if "admin_logged_in" not in session:
        return redirect(url_for("login"))
    return render_template("admin.html")

@app.route("/login", methods=["GET", "POST"])
def login():
    """Handle admin login."""
    if request.method == "POST":
        data = request.json
        if data.get("username") == ADMIN_USERNAME and data.get("password") == ADMIN_PASSWORD:
            session["admin_logged_in"] = True
            return jsonify({"success": True})
        return jsonify({"success": False, "error": "Invalid credentials"}), 401
    
    # GET request: render the login page
    if session.get("admin_logged_in"):
        return redirect(url_for("admin"))
    return render_template("login.html")

@app.route("/logout", methods=["GET", "POST"])
def logout():
    """Log the admin out and redirect to login."""
    session.pop("admin_logged_in", None)
    return redirect(url_for("login"))

@app.route("/get-feedback", methods=["GET"])
def get_feedback():
    """API endpoint to retrieve all feedback for the dashboard."""
    if "admin_logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    category = request.args.get("category")
    session_id = request.args.get("session_id")
    query = {}
    if category and category != "All":
        query["category"] = category
    if session_id and session_id != "All":
        query["session_id"] = session_id

    try:
        feedbacks = list(feedback_collection.find(query).sort("created_at", -1))
    except Exception as e:
        return jsonify({"success": False, "error": f"Database connection error: {str(e)}"}), 500
    
    # Format data for JSON serialization
    formatted_feedbacks = []
    total_rating = 0
    
    for f in feedbacks:
        f["_id"] = str(f["_id"])
        # Format the date appropriately
        if "created_at" in f and f["created_at"]:
            f["created_at"] = f["created_at"].strftime("%b %d, %Y - %H:%M")
        else:
            f["created_at"] = "Unknown date"
            
        total_rating += int(f.get("rating", 0))
        formatted_feedbacks.append(f)
        
    avg_rating = round(total_rating / len(feedbacks), 1) if feedbacks else 0.0

    return jsonify({
        "success": True,
        "feedbacks": formatted_feedbacks,
        "total": len(feedbacks),
        "average_rating": avg_rating
    })

@app.route("/delete-feedback/<id>", methods=["DELETE"])
def delete_feedback(id):
    """API endpoint to delete a specific feedback entry."""
    if "admin_logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401

    try:
        result = feedback_collection.delete_one({"_id": ObjectId(id)})
        if result.deleted_count > 0:
            return jsonify({"success": True})
        return jsonify({"success": False, "error": "Feedback not found"}), 404
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/sessions", methods=["POST"])
def create_session():
    """API endpoint to create a new feedback session."""
    if "admin_logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401
    
    data = request.json
    title = data.get("title")
    category = data.get("category")
    if not title or not category:
        return jsonify({"error": "Title and category are required"}), 400
        
    new_session = {
        "title": title,
        "category": category,
        "created_at": datetime.utcnow()
    }
    try:
        result = feedback_sessions.insert_one(new_session)
        return jsonify({"success": True, "session_id": str(result.inserted_id)})
    except Exception as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500

@app.route("/api/sessions", methods=["GET"])
def get_sessions():
    """API endpoint to get all feedback sessions."""
    if "admin_logged_in" not in session:
        return jsonify({"error": "Unauthorized"}), 401
        
    try:
        sessions_list = list(feedback_sessions.find().sort("created_at", -1))
    except Exception as e:
        return jsonify({"success": False, "error": f"Database error: {str(e)}"}), 500
    
    formatted_sessions = []
    for s in sessions_list:
        s["_id"] = str(s["_id"])
        if "created_at" in s and s["created_at"]:
            s["created_at"] = s["created_at"].strftime("%b %d, %Y")
        formatted_sessions.append(s)
        
    return jsonify({"success": True, "sessions": formatted_sessions})

if __name__ == "__main__":
    app.run(debug=True)
