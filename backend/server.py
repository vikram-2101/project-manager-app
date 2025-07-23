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

# Task Management APIs

class TaskCreate(BaseModel):
    title: str
    description: str
    project_id: str
    assigned_to: Optional[str] = None
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    assigned_to: Optional[str] = None
    status: Optional[str] = None  # todo, in_progress, done
    due_date: Optional[datetime] = None

@app.post("/api/tasks")
async def create_task(task_data: TaskCreate, current_user: dict = Depends(get_current_user)):
    # Verify project exists and user has access
    project = await db.projects.find_one({"project_id": task_data.project_id})
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
    
    # Verify assignee exists and is part of project
    if task_data.assigned_to:
        assignee = await db.users.find_one({"user_id": task_data.assigned_to})
        if not assignee:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assigned user not found"
            )
        
        if (current_user.get("role") != "admin" and 
            task_data.assigned_to not in project["team_members"] and
            task_data.assigned_to != project["created_by"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only assign tasks to project team members"
            )
    
    task_id = str(uuid.uuid4())
    
    task_doc = {
        "task_id": task_id,
        "project_id": task_data.project_id,
        "title": task_data.title,
        "description": task_data.description,
        "assigned_to": task_data.assigned_to,
        "status": "todo",
        "due_date": task_data.due_date,
        "created_by": current_user["user_id"],
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    await db.tasks.insert_one(task_doc)
    
    # Create notification for assignee
    if task_data.assigned_to and task_data.assigned_to != current_user["user_id"]:
        notification_doc = {
            "notification_id": str(uuid.uuid4()),
            "user_id": task_data.assigned_to,
            "message": f"You have been assigned to task \"{task_data.title}\" in project \"{project['title']}\"",
            "type": "task_assigned",
            "link": f"/projects/{task_data.project_id}",
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        await db.notifications.insert_one(notification_doc)
    
    return {
        "task_id": task_id,
        "message": "Task created successfully"
    }

@app.get("/api/tasks")
async def get_user_tasks(
    status: Optional[str] = None,
    project_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    if current_user.get("role") != "admin":
        # Team members can only see tasks assigned to them or in their projects
        user_projects = await db.projects.find(
            {"team_members": current_user["user_id"]}, 
            {"project_id": 1}
        ).to_list(None)
        project_ids = [p["project_id"] for p in user_projects]
        
        query["$or"] = [
            {"assigned_to": current_user["user_id"]},
            {"project_id": {"$in": project_ids}}
        ]
    
    if status:
        query["status"] = status
    if project_id:
        query["project_id"] = project_id
    
    tasks = await db.tasks.find(query, {"_id": 0}).to_list(None)
    
    # Add project and assignee details
    for task in tasks:
        # Get project details
        project = await db.projects.find_one(
            {"project_id": task["project_id"]},
            {"title": 1, "project_id": 1, "_id": 0}
        )
        task["project_details"] = project
        
        # Get assignee details
        if task.get("assigned_to"):
            assignee = await db.users.find_one(
                {"user_id": task["assigned_to"]},
                {"user_id": 1, "full_name": 1, "email": 1, "_id": 0}
            )
            task["assignee_details"] = assignee
        else:
            task["assignee_details"] = None
        
        # Get creator details
        creator = await db.users.find_one(
            {"user_id": task["created_by"]},
            {"user_id": 1, "full_name": 1, "email": 1, "_id": 0}
        )
        task["creator_details"] = creator
    
    return tasks

@app.get("/api/tasks/{task_id}")
async def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"task_id": task_id}, {"_id": 0})
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check access permissions
    project = await db.projects.find_one({"project_id": task["project_id"]})
    if (current_user.get("role") != "admin" and 
        current_user["user_id"] not in project["team_members"] and
        current_user["user_id"] != project["created_by"] and
        current_user["user_id"] != task.get("assigned_to")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this task"
        )
    
    # Add related details
    task["project_details"] = {
        "project_id": project["project_id"],
        "title": project["title"]
    }
    
    if task.get("assigned_to"):
        assignee = await db.users.find_one(
            {"user_id": task["assigned_to"]},
            {"user_id": 1, "full_name": 1, "email": 1, "_id": 0}
        )
        task["assignee_details"] = assignee
    else:
        task["assignee_details"] = None
    
    creator = await db.users.find_one(
        {"user_id": task["created_by"]},
        {"user_id": 1, "full_name": 1, "email": 1, "_id": 0}
    )
    task["creator_details"] = creator
    
    # Get comments for this task
    comments = await db.comments.find(
        {"task_id": task_id}, 
        {"_id": 0}
    ).sort("created_at", 1).to_list(None)
    
    # Add author details to comments
    for comment in comments:
        author = await db.users.find_one(
            {"user_id": comment["author_id"]},
            {"user_id": 1, "full_name": 1, "email": 1, "_id": 0}
        )
        comment["author_details"] = author
    
    task["comments"] = comments
    
    return task

@app.put("/api/tasks/{task_id}")
async def update_task(
    task_id: str, 
    task_data: TaskUpdate, 
    current_user: dict = Depends(get_current_user)
):
    task = await db.tasks.find_one({"task_id": task_id})
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permissions
    project = await db.projects.find_one({"project_id": task["project_id"]})
    can_edit = (
        current_user.get("role") == "admin" or
        current_user["user_id"] == task["created_by"] or
        current_user["user_id"] == project["created_by"] or
        (current_user["user_id"] == task.get("assigned_to") and task_data.status)  # Assignee can only update status
    )
    
    if not can_edit:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to update this task"
        )
    
    update_data = {"updated_at": datetime.utcnow()}
    
    # Only allow status update for assignees (unless admin/creator)
    if (current_user["user_id"] == task.get("assigned_to") and 
        current_user.get("role") != "admin" and
        current_user["user_id"] != task["created_by"] and
        current_user["user_id"] != project["created_by"]):
        
        if task_data.status and task_data.status in ["todo", "in_progress", "done"]:
            update_data["status"] = task_data.status
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Assignees can only update task status"
            )
    else:
        # Full edit permissions
        if task_data.title is not None:
            update_data["title"] = task_data.title
        if task_data.description is not None:
            update_data["description"] = task_data.description
        if task_data.due_date is not None:
            update_data["due_date"] = task_data.due_date
        if task_data.status is not None and task_data.status in ["todo", "in_progress", "done"]:
            update_data["status"] = task_data.status
        if task_data.assigned_to is not None:
            # Verify assignee exists and is part of project
            if task_data.assigned_to:
                assignee = await db.users.find_one({"user_id": task_data.assigned_to})
                if not assignee:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Assigned user not found"
                    )
                
                if (current_user.get("role") != "admin" and 
                    task_data.assigned_to not in project["team_members"] and
                    task_data.assigned_to != project["created_by"]):
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Can only assign tasks to project team members"
                    )
            
            update_data["assigned_to"] = task_data.assigned_to
    
    old_status = task.get("status")
    old_assignee = task.get("assigned_to")
    
    await db.tasks.update_one(
        {"task_id": task_id},
        {"$set": update_data}
    )
    
    # Create notifications for status changes
    if "status" in update_data and update_data["status"] != old_status:
        # Notify project members about status change
        notification_targets = set(project.get("team_members", []))
        notification_targets.add(project["created_by"])
        if task.get("assigned_to"):
            notification_targets.add(task["assigned_to"])
        
        # Remove current user from notifications
        notification_targets.discard(current_user["user_id"])
        
        notifications = []
        for user_id in notification_targets:
            notification_doc = {
                "notification_id": str(uuid.uuid4()),
                "user_id": user_id,
                "message": f"Task \"{task['title']}\" status changed to {update_data['status'].replace('_', ' ').title()}",
                "type": "status_changed",
                "link": f"/projects/{task['project_id']}",
                "is_read": False,
                "created_at": datetime.utcnow()
            }
            notifications.append(notification_doc)
        
        if notifications:
            await db.notifications.insert_many(notifications)
    
    # Create notification for new assignee
    if ("assigned_to" in update_data and 
        update_data["assigned_to"] != old_assignee and 
        update_data["assigned_to"] and
        update_data["assigned_to"] != current_user["user_id"]):
        
        notification_doc = {
            "notification_id": str(uuid.uuid4()),
            "user_id": update_data["assigned_to"],
            "message": f"You have been assigned to task \"{task['title']}\" in project \"{project['title']}\"",
            "type": "task_assigned",
            "link": f"/projects/{task['project_id']}",
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        await db.notifications.insert_one(notification_doc)
    
    return {"message": "Task updated successfully"}

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"task_id": task_id})
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check permissions (admin, task creator, or project creator)
    project = await db.projects.find_one({"project_id": task["project_id"]})
    if (current_user.get("role") != "admin" and 
        current_user["user_id"] != task["created_by"] and
        current_user["user_id"] != project["created_by"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to delete this task"
        )
    
    # Delete associated comments
    await db.comments.delete_many({"task_id": task_id})
    
    # Delete task
    await db.tasks.delete_one({"task_id": task_id})
    
    return {"message": "Task deleted successfully"}

# Comments Management APIs

class CommentCreate(BaseModel):
    task_id: str
    content: str

@app.post("/api/comments")
async def create_comment(comment_data: CommentCreate, current_user: dict = Depends(get_current_user)):
    # Verify task exists and user has access
    task = await db.tasks.find_one({"task_id": comment_data.task_id})
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check access permissions
    project = await db.projects.find_one({"project_id": task["project_id"]})
    if (current_user.get("role") != "admin" and 
        current_user["user_id"] not in project["team_members"] and
        current_user["user_id"] != project["created_by"] and
        current_user["user_id"] != task.get("assigned_to")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to comment on this task"
        )
    
    comment_id = str(uuid.uuid4())
    
    comment_doc = {
        "comment_id": comment_id,
        "task_id": comment_data.task_id,
        "author_id": current_user["user_id"],
        "content": comment_data.content,
        "created_at": datetime.utcnow()
    }
    
    await db.comments.insert_one(comment_doc)
    
    # Create notifications for task stakeholders
    notification_targets = set(project.get("team_members", []))
    notification_targets.add(project["created_by"])
    if task.get("assigned_to"):
        notification_targets.add(task["assigned_to"])
    
    # Remove current user from notifications
    notification_targets.discard(current_user["user_id"])
    
    notifications = []
    for user_id in notification_targets:
        notification_doc = {
            "notification_id": str(uuid.uuid4()),
            "user_id": user_id,
            "message": f"{current_user['full_name']} commented on task \"{task['title']}\"",
            "type": "comment_added",
            "link": f"/projects/{task['project_id']}",
            "is_read": False,
            "created_at": datetime.utcnow()
        }
        notifications.append(notification_doc)
    
    if notifications:
        await db.notifications.insert_many(notifications)
    
    return {
        "comment_id": comment_id,
        "message": "Comment added successfully"
    }

@app.get("/api/comments/{task_id}")
async def get_task_comments(task_id: str, current_user: dict = Depends(get_current_user)):
    # Verify task exists and user has access
    task = await db.tasks.find_one({"task_id": task_id})
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    # Check access permissions
    project = await db.projects.find_one({"project_id": task["project_id"]})
    if (current_user.get("role") != "admin" and 
        current_user["user_id"] not in project["team_members"] and
        current_user["user_id"] != project["created_by"] and
        current_user["user_id"] != task.get("assigned_to")):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to view comments on this task"
        )
    
    comments = await db.comments.find(
        {"task_id": task_id}, 
        {"_id": 0}
    ).sort("created_at", 1).to_list(None)
    
    # Add author details to comments
    for comment in comments:
        author = await db.users.find_one(
            {"user_id": comment["author_id"]},
            {"user_id": 1, "full_name": 1, "email": 1, "_id": 0}
        )
        comment["author_details"] = author
    
    return comments

@app.delete("/api/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    comment = await db.comments.find_one({"comment_id": comment_id})
    
    if not comment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Comment not found"
        )
    
    # Check permissions (admin or comment author)
    if (current_user.get("role") != "admin" and 
        current_user["user_id"] != comment["author_id"]):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to delete this comment"
        )
    
    await db.comments.delete_one({"comment_id": comment_id})
    
    return {"message": "Comment deleted successfully"}

# Notifications Management APIs

@app.get("/api/notifications")
async def get_user_notifications(
    limit: int = 50,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["user_id"]}
    
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(
        query, 
        {"_id": 0}
    ).sort("created_at", -1).limit(limit).to_list(None)
    
    return notifications

@app.put("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    notification = await db.notifications.find_one({"notification_id": notification_id})
    
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )
    
    if notification["user_id"] != current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Permission denied to modify this notification"
        )
    
    await db.notifications.update_one(
        {"notification_id": notification_id},
        {"$set": {"is_read": True}}
    )
    
    return {"message": "Notification marked as read"}

@app.put("/api/notifications/mark-all-read")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    await db.notifications.update_many(
        {"user_id": current_user["user_id"], "is_read": False},
        {"$set": {"is_read": True}}
    )
    
    return {"message": "All notifications marked as read"}

@app.get("/api/notifications/unread-count")
async def get_unread_notifications_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({
        "user_id": current_user["user_id"],
        "is_read": False
    })
    
    return {"unread_count": count}

# Dashboard Statistics APIs

@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    stats = {}
    
    if current_user.get("role") == "admin":
        # Admin sees all statistics
        stats["total_projects"] = await db.projects.count_documents({})
        stats["total_tasks"] = await db.tasks.count_documents({})
        stats["total_users"] = await db.users.count_documents({})
        
        # Task statistics
        task_stats = await db.tasks.aggregate([
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]).to_list(None)
        
        stats["tasks_by_status"] = {
            "todo": next((item["count"] for item in task_stats if item["_id"] == "todo"), 0),
            "in_progress": next((item["count"] for item in task_stats if item["_id"] == "in_progress"), 0),
            "done": next((item["count"] for item in task_stats if item["_id"] == "done"), 0)
        }
        
        # Tasks due today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        stats["tasks_due_today"] = await db.tasks.count_documents({
            "due_date": {"$gte": today_start, "$lte": today_end},
            "status": {"$ne": "done"}
        })
        
    else:
        # Team member sees only their statistics
        user_projects = await db.projects.find(
            {"team_members": current_user["user_id"]}, 
            {"project_id": 1}
        ).to_list(None)
        project_ids = [p["project_id"] for p in user_projects]
        
        stats["my_projects"] = len(project_ids)
        
        # My tasks statistics
        my_tasks_query = {"assigned_to": current_user["user_id"]}
        stats["my_total_tasks"] = await db.tasks.count_documents(my_tasks_query)
        
        # My task statistics by status
        my_task_stats = await db.tasks.aggregate([
            {"$match": my_tasks_query},
            {"$group": {"_id": "$status", "count": {"$sum": 1}}}
        ]).to_list(None)
        
        stats["my_tasks_by_status"] = {
            "todo": next((item["count"] for item in my_task_stats if item["_id"] == "todo"), 0),
            "in_progress": next((item["count"] for item in my_task_stats if item["_id"] == "in_progress"), 0),
            "done": next((item["count"] for item in my_task_stats if item["_id"] == "done"), 0)
        }
        
        # My tasks due today
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start.replace(hour=23, minute=59, second=59, microsecond=999999)
        
        stats["my_tasks_due_today"] = await db.tasks.count_documents({
            "assigned_to": current_user["user_id"],
            "due_date": {"$gte": today_start, "$lte": today_end},
            "status": {"$ne": "done"}
        })
    
    # Unread notifications count
    stats["unread_notifications"] = await db.notifications.count_documents({
        "user_id": current_user["user_id"],
        "is_read": False
    })
    
    return stats

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)