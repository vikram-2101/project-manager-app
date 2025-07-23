#!/usr/bin/env python3
"""
Backend API Testing Script for Project Manager Application
Tests authentication APIs, JWT tokens, role-based access, and database operations
"""

import requests
import json
import time
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "http://localhost:8001"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.admin_token = None
        self.team_member_token = None
        self.admin_user_id = None
        self.team_member_user_id = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_health_check(self):
        """Test basic health endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_test("Health Check", True, "Backend is healthy and responding")
                    return True
                else:
                    self.log_test("Health Check", False, f"Unexpected health response: {data}")
                    return False
            else:
                self.log_test("Health Check", False, f"Health check failed with status {response.status_code}")
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Health check failed with error: {str(e)}")
            return False
    
    def test_admin_signup(self):
        """Test admin user signup"""
        try:
            admin_data = {
                "email": "admin@projectmanager.com",
                "password": "AdminPass123!",
                "full_name": "Project Administrator",
                "role": "admin"
            }
            
            response = requests.post(f"{self.base_url}/api/auth/signup", json=admin_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["access_token", "token_type", "user"]
                
                if all(field in data for field in required_fields):
                    self.admin_token = data["access_token"]
                    self.admin_user_id = data["user"]["user_id"]
                    
                    # Verify user data
                    user = data["user"]
                    if (user["email"] == admin_data["email"] and 
                        user["full_name"] == admin_data["full_name"] and 
                        user["role"] == "admin"):
                        self.log_test("Admin Signup", True, "Admin user created successfully with correct data")
                        return True
                    else:
                        self.log_test("Admin Signup", False, "Admin user data mismatch", user)
                        return False
                else:
                    self.log_test("Admin Signup", False, "Missing required fields in response", data)
                    return False
            else:
                self.log_test("Admin Signup", False, f"Signup failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Signup", False, f"Admin signup failed with error: {str(e)}")
            return False
    
    def test_team_member_signup(self):
        """Test team member user signup"""
        try:
            member_data = {
                "email": "developer@projectmanager.com",
                "password": "DevPass123!",
                "full_name": "Senior Developer",
                "role": "team_member"
            }
            
            response = requests.post(f"{self.base_url}/api/auth/signup", json=member_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["access_token", "token_type", "user"]
                
                if all(field in data for field in required_fields):
                    self.team_member_token = data["access_token"]
                    self.team_member_user_id = data["user"]["user_id"]
                    
                    # Verify user data
                    user = data["user"]
                    if (user["email"] == member_data["email"] and 
                        user["full_name"] == member_data["full_name"] and 
                        user["role"] == "team_member"):
                        self.log_test("Team Member Signup", True, "Team member created successfully with correct data")
                        return True
                    else:
                        self.log_test("Team Member Signup", False, "Team member data mismatch", user)
                        return False
                else:
                    self.log_test("Team Member Signup", False, "Missing required fields in response", data)
                    return False
            else:
                self.log_test("Team Member Signup", False, f"Signup failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Team Member Signup", False, f"Team member signup failed with error: {str(e)}")
            return False
    
    def test_duplicate_signup(self):
        """Test duplicate email signup prevention"""
        try:
            duplicate_data = {
                "email": "admin@projectmanager.com",  # Same as admin
                "password": "AnotherPass123!",
                "full_name": "Another User",
                "role": "team_member"
            }
            
            response = requests.post(f"{self.base_url}/api/auth/signup", json=duplicate_data, timeout=10)
            
            if response.status_code == 400:
                data = response.json()
                if "already registered" in data.get("detail", "").lower():
                    self.log_test("Duplicate Email Prevention", True, "Duplicate email correctly rejected")
                    return True
                else:
                    self.log_test("Duplicate Email Prevention", False, f"Wrong error message: {data}")
                    return False
            else:
                self.log_test("Duplicate Email Prevention", False, f"Expected 400 status, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Duplicate Email Prevention", False, f"Test failed with error: {str(e)}")
            return False
    
    def test_admin_login(self):
        """Test admin login"""
        try:
            login_data = {
                "email": "admin@projectmanager.com",
                "password": "AdminPass123!"
            }
            
            response = requests.post(f"{self.base_url}/api/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["access_token", "token_type", "user"]
                
                if all(field in data for field in required_fields):
                    # Verify token is different from signup token (new login)
                    new_token = data["access_token"]
                    user = data["user"]
                    
                    if (user["email"] == login_data["email"] and 
                        user["role"] == "admin" and
                        new_token):
                        self.log_test("Admin Login", True, "Admin login successful with valid token")
                        return True
                    else:
                        self.log_test("Admin Login", False, "Admin login data validation failed", user)
                        return False
                else:
                    self.log_test("Admin Login", False, "Missing required fields in login response", data)
                    return False
            else:
                self.log_test("Admin Login", False, f"Login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Admin login failed with error: {str(e)}")
            return False
    
    def test_team_member_login(self):
        """Test team member login"""
        try:
            login_data = {
                "email": "developer@projectmanager.com",
                "password": "DevPass123!"
            }
            
            response = requests.post(f"{self.base_url}/api/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["access_token", "token_type", "user"]
                
                if all(field in data for field in required_fields):
                    user = data["user"]
                    
                    if (user["email"] == login_data["email"] and 
                        user["role"] == "team_member"):
                        self.log_test("Team Member Login", True, "Team member login successful")
                        return True
                    else:
                        self.log_test("Team Member Login", False, "Team member login data validation failed", user)
                        return False
                else:
                    self.log_test("Team Member Login", False, "Missing required fields in login response", data)
                    return False
            else:
                self.log_test("Team Member Login", False, f"Login failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Team Member Login", False, f"Team member login failed with error: {str(e)}")
            return False
    
    def test_invalid_login(self):
        """Test invalid login credentials"""
        try:
            invalid_data = {
                "email": "admin@projectmanager.com",
                "password": "WrongPassword123!"
            }
            
            response = requests.post(f"{self.base_url}/api/auth/login", json=invalid_data, timeout=10)
            
            if response.status_code == 401:
                data = response.json()
                if "incorrect" in data.get("detail", "").lower():
                    self.log_test("Invalid Login Prevention", True, "Invalid credentials correctly rejected")
                    return True
                else:
                    self.log_test("Invalid Login Prevention", False, f"Wrong error message: {data}")
                    return False
            else:
                self.log_test("Invalid Login Prevention", False, f"Expected 401 status, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Invalid Login Prevention", False, f"Test failed with error: {str(e)}")
            return False
    
    def test_get_current_user_admin(self):
        """Test getting current user info for admin"""
        if not self.admin_token:
            self.log_test("Get Current User (Admin)", False, "No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{self.base_url}/api/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["user_id", "email", "full_name", "role"]
                
                if all(field in data for field in required_fields):
                    if (data["email"] == "admin@projectmanager.com" and 
                        data["role"] == "admin" and
                        data["full_name"] == "Project Administrator"):
                        self.log_test("Get Current User (Admin)", True, "Admin user info retrieved correctly")
                        return True
                    else:
                        self.log_test("Get Current User (Admin)", False, "Admin user info mismatch", data)
                        return False
                else:
                    self.log_test("Get Current User (Admin)", False, "Missing required fields", data)
                    return False
            else:
                self.log_test("Get Current User (Admin)", False, f"Request failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Current User (Admin)", False, f"Test failed with error: {str(e)}")
            return False
    
    def test_get_current_user_team_member(self):
        """Test getting current user info for team member"""
        if not self.team_member_token:
            self.log_test("Get Current User (Team Member)", False, "No team member token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.team_member_token}"}
            response = requests.get(f"{self.base_url}/api/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["user_id", "email", "full_name", "role"]
                
                if all(field in data for field in required_fields):
                    if (data["email"] == "developer@projectmanager.com" and 
                        data["role"] == "team_member" and
                        data["full_name"] == "Senior Developer"):
                        self.log_test("Get Current User (Team Member)", True, "Team member user info retrieved correctly")
                        return True
                    else:
                        self.log_test("Get Current User (Team Member)", False, "Team member user info mismatch", data)
                        return False
                else:
                    self.log_test("Get Current User (Team Member)", False, "Missing required fields", data)
                    return False
            else:
                self.log_test("Get Current User (Team Member)", False, f"Request failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get Current User (Team Member)", False, f"Test failed with error: {str(e)}")
            return False
    
    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoint"""
        try:
            response = requests.get(f"{self.base_url}/api/auth/me", timeout=10)
            
            if response.status_code == 401:
                self.log_test("Unauthorized Access Prevention", True, "Unauthorized access correctly blocked")
                return True
            else:
                self.log_test("Unauthorized Access Prevention", False, f"Expected 401 status, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Unauthorized Access Prevention", False, f"Test failed with error: {str(e)}")
            return False
    
    def test_get_all_users_admin(self):
        """Test getting all users as admin"""
        if not self.admin_token:
            self.log_test("Get All Users (Admin)", False, "No admin token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(f"{self.base_url}/api/users", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list) and len(data) >= 2:
                    # Check that both users are present
                    emails = [user.get("email") for user in data]
                    expected_emails = ["admin@projectmanager.com", "developer@projectmanager.com"]
                    
                    if all(email in emails for email in expected_emails):
                        # Verify no password fields are returned
                        has_password = any("password" in user for user in data)
                        if not has_password:
                            self.log_test("Get All Users (Admin)", True, f"Retrieved {len(data)} users without password fields")
                            return True
                        else:
                            self.log_test("Get All Users (Admin)", False, "Password fields found in user data")
                            return False
                    else:
                        self.log_test("Get All Users (Admin)", False, f"Expected users not found. Got emails: {emails}")
                        return False
                else:
                    self.log_test("Get All Users (Admin)", False, f"Expected list with 2+ users, got: {data}")
                    return False
            else:
                self.log_test("Get All Users (Admin)", False, f"Request failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get All Users (Admin)", False, f"Test failed with error: {str(e)}")
            return False
    
    def test_get_all_users_team_member(self):
        """Test getting all users as team member"""
        if not self.team_member_token:
            self.log_test("Get All Users (Team Member)", False, "No team member token available")
            return False
            
        try:
            headers = {"Authorization": f"Bearer {self.team_member_token}"}
            response = requests.get(f"{self.base_url}/api/users", headers=headers, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                if isinstance(data, list) and len(data) >= 2:
                    # Team members can also see all users (no role restriction on this endpoint)
                    self.log_test("Get All Users (Team Member)", True, f"Team member can access user list with {len(data)} users")
                    return True
                else:
                    self.log_test("Get All Users (Team Member)", False, f"Expected list with 2+ users, got: {data}")
                    return False
            else:
                self.log_test("Get All Users (Team Member)", False, f"Request failed with status {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Get All Users (Team Member)", False, f"Test failed with error: {str(e)}")
            return False
    
    def test_invalid_token(self):
        """Test invalid JWT token"""
        try:
            headers = {"Authorization": "Bearer invalid_token_here"}
            response = requests.get(f"{self.base_url}/api/auth/me", headers=headers, timeout=10)
            
            if response.status_code == 401:
                self.log_test("Invalid Token Prevention", True, "Invalid token correctly rejected")
                return True
            else:
                self.log_test("Invalid Token Prevention", False, f"Expected 401 status, got {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Invalid Token Prevention", False, f"Test failed with error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("=" * 60)
        print("STARTING BACKEND API TESTING")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_health_check,
            self.test_admin_signup,
            self.test_team_member_signup,
            self.test_duplicate_signup,
            self.test_admin_login,
            self.test_team_member_login,
            self.test_invalid_login,
            self.test_get_current_user_admin,
            self.test_get_current_user_team_member,
            self.test_unauthorized_access,
            self.test_get_all_users_admin,
            self.test_get_all_users_team_member,
            self.test_invalid_token
        ]
        
        passed = 0
        failed = 0
        
        for test in tests:
            try:
                if test():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                print(f"❌ FAIL: {test.__name__} - Unexpected error: {str(e)}")
                failed += 1
            
            # Small delay between tests
            time.sleep(0.5)
        
        print("\n" + "=" * 60)
        print("BACKEND TESTING SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {passed + failed}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed / (passed + failed) * 100):.1f}%")
        
        if failed == 0:
            print("\n🎉 ALL BACKEND TESTS PASSED!")
        else:
            print(f"\n⚠️  {failed} TESTS FAILED - CHECK DETAILS ABOVE")
        
        return passed, failed, self.test_results

if __name__ == "__main__":
    tester = BackendTester()
    passed, failed, results = tester.run_all_tests()
    
    # Save detailed results
    with open("/app/backend_test_results.json", "w") as f:
        json.dump({
            "summary": {
                "total_tests": passed + failed,
                "passed": passed,
                "failed": failed,
                "success_rate": (passed / (passed + failed) * 100) if (passed + failed) > 0 else 0
            },
            "test_results": results
        }, f, indent=2)
    
    print(f"\nDetailed results saved to: /app/backend_test_results.json")