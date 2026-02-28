from flask import Flask, request, jsonify
from flask_cors import CORS  # enable CORS for frontend
import requests
import os

app = Flask(__name__)
CORS(app)  # allow requests from your PWA

# Your OpenRouter API key – set as environment variable for security
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', 'your-key-here')
# You can also hardcode during development, but never commit it!

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')

    if not user_message:
        return jsonify({'error': 'No message provided'}), 400

    headers = {
        'Authorization': f'Bearer {OPENROUTER_API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'model': 'deepseek/deepseek-chat',  # or 'deepseek/deepseek-r1' etc.
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
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)