from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def hello():
    return {'message': 'Smart Notes API is running!'}

if __name__ == '__main__':
    app.run(debug=True)
