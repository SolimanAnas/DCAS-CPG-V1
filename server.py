from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)

# Explicit CORS: allow all origins for /api/* routes
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Load OpenRouter API key from environment
OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY")

if not OPENROUTER_API_KEY:
    print("⚠️ WARNING: OPENROUTER_API_KEY is not set. /api/chat will fail.")


@app.route("/")
def health_check():
    return jsonify({"status": "DCAS CPG AI backend is running"}), 200


@app.route("/api/chat", methods=["POST", "OPTIONS"])
def chat():
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        return '', 200

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

    # 🔁 Updated payload with strict DCAS CPG 2025 system prompt
    payload = {
        'model': 'deepseek/deepseek-chat',
        'messages': [
            {
                'role': 'system',
                'content': """
You are the official DCAS CPG 2025 AI assistant.

STRICT RULES:
- Answer ONLY according to DCAS CPG 2025 prehospital guidelines.
- Do NOT reference ACC, AHA, ESC, or any external organizations.
- Do NOT provide hospital-level management unless clearly included in DCAS CPG.
- Keep answers concise and structured.
- Use bullet points.
- Focus on EMS assessment and treatment.
- If information is not in DCAS CPG, say:
  "Not specified in DCAS CPG 2025."

Tone:
- Direct
- Clinical
- EMS-focused
- No long explanations.
"""
            },
            {
                'role': 'user',
                'content': user_message
            }
        ],
        'max_tokens': 250
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


# Render requires binding to its provided PORT
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 10000))
    app.run(host="0.0.0.0", port=port)