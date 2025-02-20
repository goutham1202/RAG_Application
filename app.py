from flask import Flask, request, jsonify, render_template
import os
import asyncio
import google.generativeai as genai
import speech_recognition as sr
from sentence_transformers import SentenceTransformer
from pinecone import Pinecone
from googletrans import Translator
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)

# Configure Generative AI
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize Google Generative AI model
generation_config = {
    "temperature": 0.6,
    "top_p": 0.95,
    "top_k": 40,
    "max_output_tokens": 8192,
    "response_mime_type": "text/plain",
}

model = genai.GenerativeModel(
    model_name="gemini-2.0-flash-exp",
    generation_config=generation_config,
)

try:
    chat_session = model.start_chat(history=[])
except Exception as e:
    print(f"Failed to initialize chat session: {e}")
    chat_session = None

# Initialize Pinecone and embedding model
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index = pc.Index("ragapp")
embedding_model = SentenceTransformer('intfloat/multilingual-e5-large')

translator = Translator()

def retrieve_chunks(query):
    """Retrieve relevant text chunks from Pinecone."""
    query_embedding = embedding_model.encode([query])[0].tolist()
    try:
        response = index.query(vector=query_embedding, top_k=5, include_metadata=True)
        return [match['metadata']['text'] for match in response['matches']]
    except Exception as e:
        print(f"Error retrieving chunks from Pinecone: {e}")
        return []

async def translate_text_async(text, src, dest):
    """Translate text asynchronously using googletrans."""
    try:
        translated = await translator.translate(text, src=src, dest=dest)
        return translated.text
    except Exception as e:
        print(f"Translation error: {e}")
        return text

def translate_text_sync(text, src, dest):
    """Synchronously run the translation function."""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    return loop.run_until_complete(translate_text_async(text, src, dest))

def get_speech_input(language="en"):
    """Capture speech input from microphone."""
    recognizer = sr.Recognizer()
    with sr.Microphone() as source:
        print("Listening... Speak now!")
        try:
            audio = recognizer.listen(source)
            text = recognizer.recognize_google(audio, language=language)
            return text
        except sr.UnknownValueError:
            return "Sorry, I could not understand your speech."
        except sr.RequestError as e:
            return f"Speech Recognition service error: {e}"

@app.route('/')
def home():
    """Render the home page."""
    return render_template('main.html')

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_input = data.get("message")
    language = data.get("language", "en")

    if not user_input:
        return jsonify({"error": "Empty message"}), 400

    if language == "kn":
        try:
            user_input = translate_text_sync(user_input, src="kn", dest="en")
        except Exception as e:
            return jsonify({"error": f"Translation error: {e}"}), 500

    context = retrieve_chunks(user_input)
    print(context)  # Keep this for debugging

    if context:
        prompt = "Here is some context I found related to your query:\n\n" + '\n'.join(context) + "\n\nNow, please respond to the following query:\nUser's Query: " + user_input
    else:
        prompt = f"Now, please respond to the following query:\nUser's Query: {user_input}"

    try:
        response = chat_session.send_message(prompt)  # Call send_message ONLY ONCE
        response_text = response.text

        if language == "kn":
            try:
                response_text = translate_text_sync(response_text, src="en", dest="kn")
            except Exception as e:
                return jsonify({"error": f"Translation error: {e}"}), 500

        return jsonify({"response": response_text})

    except Exception as e:
        print(f"Gemini API Error: {e}, Prompt: {prompt}")
        return jsonify({"error": f"Gemini API Error: {e}"}), 500

@app.route('/speech', methods=['GET'])
def speech():
    """Handle voice input and return transcribed text."""
    language = request.args.get("language", "en")
    transcribed_text = get_speech_input(language="kn-IN" if language == "kn" else "en-US")
    return jsonify({"transcribed_text": transcribed_text})

if __name__ == '__main__':
    app.jinja_env.auto_reload = True
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(debug=True)
