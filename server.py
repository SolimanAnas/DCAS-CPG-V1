from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)

# Allow CORS from anywhere (GitHub Pages / Cloudflare)
CORS(app)

# Load OpenRouter API key from environment
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    print("⚠️ WARNING: OPENROUTER_API_KEY is not set. /api/chat will fail.")


@app.route("/")
def health_check():
    return jsonify({"status": "DCAS CPG AI backend is running"}), 200


@app.route("/api/chat", methods=["POST"])
def chat():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()

    if not data or "message" not in data:
        return jsonify({"error": "No message provided"}), 400

    user_message = data["message"].strip()

    if not user_message:
        return jsonify({"error": "Message is empty"}), 400

    if not OPENROUTER_API_KEY:
        return jsonify({"error": "Server configuration error: API key missing"}), 500

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": "deepseek/deepseek-chat",
        "messages": [
            {
                "role": "system",
                "content": "You are a helpful assistant for DCAS CPG 2025 guidelines."
            },
            {
                "role": "user",
                "content": user_message
            }
        ],
        "max_tokens": 500,
        "temperature": 0.3
    }

    try:
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=30
        )

        response.raise_for_status()
        result = response.json()

        reply = result["choices"][0]["message"]["content"]

        return jsonify({"reply": reply}), 200

    except requests.exceptions.Timeout:
        return jsonify({"error": "Request to OpenRouter timed out"}), 504

    except requests.exceptions.RequestException as e:
        app.logger.error(f"OpenRouter request error: {str(e)}")
        return jsonify({"error": "Failed to contact AI service"}), 502

    except Exception as e:
        app.logger.error(f"Unexpected server error: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500


# IMPORTANT: Render requires binding to its provided PORT
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)