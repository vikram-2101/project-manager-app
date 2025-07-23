from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from typing import Optional, List
import os
from dotenv import load_dotenv
import uuid

load_dotenv()

app = FastAPI(title="Project Manager API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB connection
MONGO_URL = os.getenv("MONGO_URL")
client = AsyncIOMotorClient(MONGO_URL)
db = client.project_manager

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")
JWT_EXPIRATION_HOURS = int(os.getenv("JWT_EXPIRATION_HOURS", 24))

security = HTTPBearer()

# Pydantic models
class UserSignup(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str = "team_member"  # admin or team_member

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    user_id: str
    email: str
    full_name: str
    role: str
    created_at: datetime

class Project(BaseModel):
    project_id: str
    title: str
    description: str
    created_by: str
    team_members: List[str] = []
    created_at: datetime
    updated_at: datetime

class Task(BaseModel):
    task_id: str
    project_id: str
    title: str
    description: str
    assigned_to: Optional[str] = None
    status: str = "todo"  # todo, in_progress, done
    due_date: Optional[datetime] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

class Comment(BaseModel):
    comment_id: str
    task_id: str
    author_id: str
    content: str
    created_at: datetime

class Notification(BaseModel):
    notification_id: str
    user_id: str
    message: str
    type: str  # task_assigned, comment_added, status_changed
    link: str
    is_read: bool = False
    created_at: datetime

# Helper functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        user_id: str = payload.get("user_id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"user_id": user_id})
    if user is None:
        raise credentials_exception
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

# API Routes
@app.get("/api/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/auth/signup")
async def signup(user_data: UserSignup):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    user_id = str(uuid.uuid4())
    hashed_password = get_password_hash(user_data.password)
    
    user_doc = {
        "user_id": user_id,
        "email": user_data.email,
        "password": hashed_password,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_doc)
    
    # Create access token
    access_token = create_access_token({"user_id": user_id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user_id,
            "email": user_data.email,
            "full_name": user_data.full_name,
            "role": user_data.role
        }
    }

@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = await db.users.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token = create_access_token({"user_id": user["user_id"]})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "user_id": user["user_id"],
            "email": user["email"],
            "full_name": user["full_name"],
            "role": user["role"]
        }
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "user_id": current_user["user_id"],
        "email": current_user["email"],
        "full_name": current_user["full_name"],
        "role": current_user["role"]
    }

@app.get("/api/users")
async def get_all_users(current_user: dict = Depends(get_current_user)):
    users = await db.users.find({}, {"password": 0, "_id": 0}).to_list(None)
    return users

# Project Management APIs

class ProjectCreate(BaseModel):
    title: str
    description: str
    team_members: List[str] = []

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    team_members: Optional[List[str]] = None

@app.post("/api/projects")
async def create_project(project_data: ProjectCreate, current_user: dict = Depends(get_admin_user)):
    project_id = str(uuid.uuid4())
    
    # Verify team members exist
    if project_data.team_members:
        existing_users = await db.users.find(
            {"user_id": {"$in": project_data.team_members}}, 
            {"user_id": 1}
        ).to_list(None)
        existing_user_ids = [user["user_id"] for user in existing_users]
        
        invalid_users = set(project_data.team_members) - set(existing_user_ids)
        if invalid_users:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid user IDs: {list(invalid_users)}"
            )
    
    project_doc = {
        "project_id": project_id,
        "title": project_data.title,
        "description": project_data.description,
        "created_by": current_user["user_id"],
        "team_members": project_data.team_members,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.projects.insert_one(project_doc)
    
    # Create notifications for team members
    if project_data.team_members:
        notifications = []
        for member_id in project_data.team_members:
            notification_doc = {
                "notification_id": str(uuid.uuid4()),
                "user_id": member_id,
                "message": f"You have been added to project \"{project_data.title}\"",
                "type": "project_added",
                "link": f"/projects/{project_id}",
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            notifications.append(notification_doc)
        
        if notifications:
            await db.notifications.insert_many(notifications)
    
    return {
        "project_id": project_id,
        "message": "Project created successfully"
    }

@app.get("/api/projects")
async def get_projects(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") == "admin":
        # Admin can see all projects
        projects = await db.projects.find({}, {"_id": 0}).to_list(None)
    else:
        # Team members can only see projects they're part of
        projects = await db.projects.find(
            {"team_members": current_user["user_id"]}, 
            {"_id": 0}
        ).to_list(None)
    
    # Add team member details and task counts
    for project in projects:
        # Get team member details
        if project["team_members"]:
            team_members = await db.users.find(
                {"user_id": {"$in": project["team_members"]}},
                {"user_id": 1, "full_name": 1, "email": 1, "_id": 0}
            ).to_list(None)
            project["team_member_details"] = team_members
        else:
            project["team_member_details"] = []
        
        # Get creator details
        creator = await db.users.find_one(
            {"user_id": project["created_by"]},
            {"user_id": 1, "full_name": 1, "email": 1, "_id": 0}
        )
        project["creator_details"] = creator
        
        # Count tasks by status
        task_counts = await db.tasks.aggregate([
            {"$match": {"project_id": project["project_id"]}},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]).to_list(None)
        
        project["task_stats"] = {
            "total": sum(item["count"] for item in task_counts),
            "todo": next((item["count"] for item in task_counts if item["_id"] == "todo"), 0),
            "in_progress": next((item["count"] for item in task_counts if item["_id"] == "in_progress"), 0),
            "done": next((item["count"] for item in task_counts if item["_id"] == "done"), 0)
        }
    
    return projects

@app.get("/api/projects/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    project = await db.projects.find_one({"project_id": project_id}, {"_id": 0})
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check access permissions
    if (current_user.get("role") != "admin" and 
        current_user["user_id"] not in project["team_members"] and
        current_user["user_id"] != project["created_by"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this project"
        )
    
    # Add team member details
    if project["team_members"]:
        team_members = await db.users.find(
            {"user_id": {"$in": project["team_members"]}},
            {"user_id": 1, "full_name": 1, "email": 1, "role": 1, "_id": 0}
        ).to_list(None)
        project["team_member_details"] = team_members
    else:
        project["team_member_details"] = []
    
    # Get creator details
    creator = await db.users.find_one(
        {"user_id": project["created_by"]},
        {"user_id": 1, "full_name": 1, "email": 1, "_id": 0}
    )
    project["creator_details"] = creator
    
    # Get project tasks
    tasks = await db.tasks.find(
        {"project_id": project_id}, 
        {"_id": 0}
    ).to_list(None)
    
    # Add assignee details to tasks
    for task in tasks:
        if task.get("assigned_to"):
            assignee = await db.users.find_one(
                {"user_id": task["assigned_to"]},
                {"user_id": 1, "full_name": 1, "email": 1, "_id": 0}
            )
            task["assignee_details"] = assignee
        else:
            task["assignee_details"] = None
    
    project["tasks"] = tasks
    
    # Calculate progress
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t["status"] == "done"])
    project["progress"] = round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
    
    return project

@app.put("/api/projects/{project_id}")
async def update_project(
    project_id: str, 
    project_data: ProjectUpdate, 
    current_user: dict = Depends(get_current_user)
):
    project = await db.projects.find_one({"project_id": project_id})
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Check permissions (admin or project creator)
    if (current_user.get("role") != "admin" and 
        current_user["user_id"] != project["created_by"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admin or project creator can update projects"
        )
    
    update_data = {"updated_at": datetime.utcnow()}
    
    if project_data.title is not None:
        update_data["title"] = project_data.title
    if project_data.description is not None:
        update_data["description"] = project_data.description
    if project_data.team_members is not None:
        # Verify team members exist
        if project_data.team_members:
            existing_users = await db.users.find(
                {"user_id": {"$in": project_data.team_members}}, 
                {"user_id": 1}
            ).to_list(None)
            existing_user_ids = [user["user_id"] for user in existing_users]
            
            invalid_users = set(project_data.team_members) - set(existing_user_ids)
            if invalid_users:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid user IDs: {list(invalid_users)}"
                )
        
        # Find newly added members for notifications
        old_members = set(project.get("team_members", []))
        new_members = set(project_data.team_members) - old_members
        
        update_data["team_members"] = project_data.team_members
        
        # Create notifications for newly added members
        if new_members:
            notifications = []
            for member_id in new_members:
                notification_doc = {
                    "notification_id": str(uuid.uuid4()),
                    "user_id": member_id,
                    "message": f"You have been added to project \"{project['title']}\"",
                    "type": "project_added",
                    "link": f"/projects/{project_id}",
                    "is_read": False,
                    "created_at": datetime.utcnow()
                }
                notifications.append(notification_doc)
            
            await db.notifications.insert_many(notifications)
    
    await db.projects.update_one(
        {"project_id": project_id},
        {"$set": update_data}
    )
    
    return {"message": "Project updated successfully"}

@app.delete("/api/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(get_admin_user)):
    project = await db.projects.find_one({"project_id": project_id})
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Delete associated tasks and comments
    await db.tasks.delete_many({"project_id": project_id})
    await db.comments.delete_many({"project_id": project_id})
    await db.notifications.delete_many({"link": {"$regex": f"/projects/{project_id}"}})
    
    # Delete project
    await db.projects.delete_one({"project_id": project_id})
    
    return {"message": "Project deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)