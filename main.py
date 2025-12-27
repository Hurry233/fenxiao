import os
import json
import asyncio
import sqlite3
import hashlib
from typing import Optional
from datetime import datetime, timedelta
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Request
from fastapi.responses import StreamingResponse, JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
import jwt

# Fix the lifespan manager issue
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan manager for FastAPI startup and shutdown"""
    # Startup
    init_db()
    yield
    # Shutdown
    await fastgpt_client.client.aclose()

# Load environment variables
load_dotenv()

# Get FastGPT configuration from environment variables
FASTGPT_BASE_URL = os.getenv("FASTGPT_BASE_URL", "https://fastgpt.aiown.top")
FASTGPT_ADMIN_KEY = os.getenv("FASTGPT_ADMIN_KEY")
FASTGPT_CHAT_APP_KEY = os.getenv("FASTGPT_CHAT_APP_KEY")
JWT_SECRET = os.getenv("JWT_SECRET", "your-secret-key-change-this")
JWT_ALGORITHM = "HS256"

if not FASTGPT_ADMIN_KEY or not FASTGPT_CHAT_APP_KEY:
    raise ValueError("FASTGPT_ADMIN_KEY and FASTGPT_CHAT_APP_KEY must be set in environment variables")

# Database setup
DATABASE_PATH = "users.db"

def init_db():
    """Initialize SQLite database with users table"""
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    # Create users table if not exists
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            fastgpt_dataset_id TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    conn.commit()
    conn.close()

class AuthService:
    """Authentication service for handling user login and JWT tokens"""
    
    @staticmethod
    def create_jwt_token(user_id: int, username: str) -> str:
        """Create JWT token for user authentication"""
        payload = {
            "user_id": user_id,
            "username": username,
            "exp": datetime.utcnow() + timedelta(days=7)  # Token expires in 7 days
        }
        return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def verify_jwt_token(token: str) -> Optional[dict]:
        """Verify JWT token and return payload if valid"""
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Simple password hashing (MVP level)"""
        return hashlib.sha256(password.encode()).hexdigest()

class FastGPTClient:
    """Client for interacting with FastGPT API"""
    
    def __init__(self, base_url: str, admin_key: str, chat_key: str):
        self.base_url = base_url
        self.admin_key = admin_key
        self.chat_key = chat_key
        self.client = httpx.AsyncClient(timeout=30.0)
    
    async def create_dataset(self, username: str) -> str:
        """
        Create a new dataset for a user in FastGPT
        Returns the dataset ID
        """
        url = f"{self.base_url}/api/core/dataset/create"
        headers = {
            "Authorization": f"Bearer {self.admin_key}",
            "Content-Type": "application/json"
        }
        
        # Dataset name will be username_KB
        payload = {
            "name": f"{username}_KB",
            "type": "dataset",
            "parentId": None
        }
        
        try:
            response = await self.client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            
            result = response.json()
            if result.get("code") != 200:
                raise HTTPException(status_code=500, detail=f"Failed to create dataset: {result.get('message')}")
            
            # FastGPT returns the dataset ID in the 'data' field
            dataset_id = result.get("data")
            if not dataset_id:
                raise HTTPException(status_code=500, detail="No dataset ID returned from FastGPT")
            
            return dataset_id
            
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"FastGPT API error: {str(e)}")
    
    async def upload_file_to_dataset(self, dataset_id: str, file: UploadFile):
        """
        Upload a file to a specific dataset in FastGPT
        """
        url = f"{self.base_url}/api/core/dataset/collection/create/localFile"
        headers = {
            "Authorization": f"Bearer {self.admin_key}"
        }
        
        # Prepare the data payload as JSON string
        data_payload = {
            "datasetId": dataset_id,
            "parentId": "",
            "trainingType": "chunk",
            "chunkSize": 512,
            "metadata": {}
        }
        
        # Prepare multipart form data
        files = {
            "file": (file.filename, file.file, file.content_type)
        }
        
        try:
            response = await self.client.post(
                url, 
                headers=headers,
                data={"data": json.dumps(data_payload)},
                files=files
            )
            response.raise_for_status()
            
            result = response.json()
            if result.get("code") != 200:
                raise HTTPException(status_code=500, detail=f"Failed to upload file: {result.get('message')}")
            
            return result
            
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"FastGPT API error: {str(e)}")
    
    async def chat_with_dataset(self, dataset_id: str, messages: list, chat_id: str):
        """
        Send chat request to FastGPT with dataset context
        Returns streaming response
        """
        url = f"{self.base_url}/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.chat_key}",
            "Content-Type": "application/json"
        }
        
        # Prepare the chat payload
        # Get user info from the last message for variables
        user_message = messages[-1] if messages else {"role": "user", "content": ""}
        
        payload = {
            "chatId": chat_id,
            "stream": True,
            "detail": False,
            "variables": {
                "fastdataUid": dataset_id  # This is the key for isolating knowledge base
            },
            "messages": messages
        }
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST", 
                    url, 
                    json=payload, 
                    headers=headers
                ) as response:
                    response.raise_for_status()
                    
                    # Stream the response
                    async for chunk in response.aiter_bytes():
                        if chunk:
                            yield chunk
                            
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=f"FastGPT API error: {str(e)}")

# Pydantic models for request validation
class RegisterRequest(BaseModel):
    """Request model for user registration"""
    username: str
    password: str

class LoginRequest(BaseModel):
    """Request model for user login"""
    username: str
    password: str

class ChatRequest(BaseModel):
    """Request model for chat"""
    messages: list
    chatId: Optional[str] = None

# Initialize services
fastgpt_client = FastGPTClient(FASTGPT_BASE_URL, FASTGPT_ADMIN_KEY, FASTGPT_CHAT_APP_KEY)
auth_service = AuthService()
security = HTTPBearer()

# Initialize FastAPI app with lifespan manager
app = FastAPI(
    title="Multi-User AI Knowledge Base API",
    description="MVP for multi-user isolated AI knowledge base assistant",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for MVP
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (index.html) at root
# Mount static files for frontend
app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
async def serve_frontend():
    """Serve the frontend index.html file at root path"""
    if os.path.exists("index.html"):
        return FileResponse("index.html")
    else:
        return {"message": "Multi-User AI Knowledge Base API is running", "frontend": "index.html not found"}


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """
    Dependency to get current user from JWT token
    """
    token = credentials.credentials
    payload = auth_service.verify_jwt_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return payload

async def get_user_dataset_id(user_id: int) -> str:
    """
    Get the FastGPT dataset ID for a user
    """
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT fastgpt_dataset_id FROM users WHERE id = ?", (user_id,))
    result = cursor.fetchone()
    conn.close()
    
    if not result:
        raise HTTPException(status_code=404, detail="User not found")
    
    return result[0]

@app.post("/register")
async def register(request: RegisterRequest):
    """
    User registration endpoint
    Creates a new FastGPT dataset for the user and stores user info in SQLite
    """
    # Hash the password
    hashed_password = auth_service.hash_password(request.password)
    
    try:
        # Create dataset in FastGPT
        dataset_id = await fastgpt_client.create_dataset(request.username)
        
        # Store user in SQLite
        conn = sqlite3.connect(DATABASE_PATH)
        cursor = conn.cursor()
        
        cursor.execute(
            "INSERT INTO users (username, password, fastgpt_dataset_id) VALUES (?, ?, ?)",
            (request.username, hashed_password, dataset_id)
        )
        
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()
        
        # Generate JWT token
        token = auth_service.create_jwt_token(user_id, request.username)
        
        return {
            "success": True,
            "message": "Registration successful",
            "user_id": user_id,
            "dataset_id": dataset_id,
            "token": token
        }
        
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Username already exists")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")

@app.post("/login")
async def login(request: LoginRequest):
    """
    User login endpoint
    Returns JWT token for authentication
    """
    hashed_password = auth_service.hash_password(request.password)
    
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, username, fastgpt_dataset_id FROM users WHERE username = ? AND password = ?",
        (request.username, hashed_password)
    )
    
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    user_id, username, dataset_id = user
    token = auth_service.create_jwt_token(user_id, username)
    
    return {
        "success": True,
        "message": "Login successful",
        "user_id": user_id,
        "dataset_id": dataset_id,
        "token": token
    }

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    File upload endpoint
    Uploads file to user's specific dataset in FastGPT
    """
    # Validate file type
    allowed_extensions = ['.pdf', '.doc', '.docx', '.txt']
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="File type not supported. Allowed: PDF, DOC, DOCX, TXT")
    
    # Get user's dataset ID
    dataset_id = await get_user_dataset_id(current_user["user_id"])
    
    # Upload file to FastGPT
    result = await fastgpt_client.upload_file_to_dataset(dataset_id, file)
    
    return {
        "success": True,
        "message": "File uploaded successfully",
        "filename": file.filename,
        "fastgpt_response": result
    }

@app.post("/chat")
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Chat endpoint with streaming response
    Forwards messages to FastGPT with user's specific dataset
    """
    messages = request.messages
    chat_id = request.chatId or f"chat_{current_user['user_id']}_{datetime.now().timestamp()}"
    
    if not messages:
        raise HTTPException(status_code=400, detail="Messages are required")
    
    # Get user's dataset ID
    dataset_id = await get_user_dataset_id(current_user["user_id"])
    
    # Stream response from FastGPT
    stream = fastgpt_client.chat_with_dataset(
        dataset_id=dataset_id,
        messages=messages,
        chat_id=chat_id
    )
    
    return StreamingResponse(
        stream,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@app.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """
    Get current user information
    """
    conn = sqlite3.connect(DATABASE_PATH)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT id, username, fastgpt_dataset_id, created_at FROM users WHERE id = ?",
        (current_user["user_id"],)
    )
    
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "success": True,
        "user": {
            "id": user[0],
            "username": user[1],
            "dataset_id": user[2],
            "created_at": user[3]
        }
    }

@app.get("/")
async def root():
    """Health check endpoint"""
    return {"message": "Multi-User AI Knowledge Base API is running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)