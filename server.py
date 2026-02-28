# server . py 
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)  # allow requests from your PWA

# Your OpenRouter API key – set as environment variable for security
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY')
if not OPENROUTER_API_KEY:
    print("⚠️  WARNING: OPENROUTER_API_KEY not set. The /api/chat endpoint will fail.")

@app.route('/')
def index():
    return jsonify({"status": "DCAS CPG AI backend is running"})

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    if not data or 'message' not in data:
        return jsonify({'error': 'No message provided'}), 400

    user_message = data['message'].strip()
    if not user_message:
        return jsonify({'error': 'Message is empty'}), 400

    if not OPENROUTER_API_KEY:
        return jsonify({'error': 'Server configuration error: API key missing'}), 500

    headers = {
        'Authorization': f'Bearer {OPENROUTER_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': 'deepseek/deepseek-chat',  # or 'deepseek/deepseek-r1'
        'messages': [
            {'role': 'system', 'content': 'You are a helpful assistant for DCAS CPG 2025 guidelines.'},
            {'role': 'user', 'content': user_message}
        ],
        'max_tokens': 500
    }

    try:
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers=headers,
            json=payload,
            timeout=30
        )
        response.raise_for_status()
        result = response.json()
        reply = result['choices'][0]['message']['content']
        return jsonify({'reply': reply})
    except requests.exceptions.Timeout:
        return jsonify({'error': 'Request to OpenRouter timed out'}), 504
    except requests.exceptions.RequestException as e:
        # Log the error for debugging
        app.logger.error(f"OpenRouter error: {str(e)}")
        return jsonify({'error': f'Failed to contact AI service: {str(e)}'}), 502
    except Exception as e:
        app.logger.error(f"Unexpected error: {str(e)}")
        return jsonify({'error': 'An internal server error occurred'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)