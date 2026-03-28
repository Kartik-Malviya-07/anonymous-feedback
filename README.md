# Anonymous Feedback System

A full-stack web application built using Python (Flask), MongoDB Atlas, HTML, CSS, and vanilla JavaScript (Fetch API).

## Features
- **User Side:** Modern, responsive UI feedback form with clear validations.
- **Admin Side:** Session-based authentication dashboard with data filtering and analytics.
- **Backend:** Scalable REST API fetching/submitting data to MongoDB Atlas.

## Setup Instructions

### Prerequisites
- Python 3.8+
- [MongoDB Atlas Account](https://mongodb.com/cloud/atlas) (with a free cluster)

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Set Environment Variables
Create a `.env` file in the root directory and add the following:
```env
MONGO_URI=your_mongodb_atlas_connection_string
SECRET_KEY=your_secret_flask_session_key
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
```

### 3. Run Locally
```bash
python app.py
```
Open your browser and navigate to `http://127.0.0.1:5000`

### 4. Deploy on Render
1. Push your code to a GitHub repository.
2. Go to [Render](https://render.com/) and create a new **Web Service**.
3. Connect your GitHub repository.
4. Set the **Build Command** to: `pip install -r requirements.txt`
5. Set the **Start Command** to: `gunicorn app:app`
6. Add the environment variables (`MONGO_URI`, `SECRET_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`) in Render's dashboard.
7. Click "Create Web Service".
