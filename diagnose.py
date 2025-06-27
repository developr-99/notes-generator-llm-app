#!/usr/bin/env python3
"""
Meeting Page Diagnostic Script
Run this to diagnose meeting page loading issues
"""

import os
import requests
import sqlite3
from pathlib import Path

def check_file_structure():
    """Check if all required files exist"""
    print("🔍 Checking File Structure...")
    
    required_files = [
        'main.py',
        'database.py',
        'static/home.html',
        'static/home.css', 
        'static/home.js',
        'static/meeting.html',
        'static/meeting.css',
        'static/meeting.js',
        'static/index.html',
        'static/style.css',
        'static/app.js'
    ]
    
    missing_files = []
    for file in required_files:
        if os.path.exists(file):
            print(f"  ✅ {file}")
        else:
            print(f"  ❌ {file} - MISSING!")
            missing_files.append(file)
    
    if missing_files:
        print(f"\n⚠️  Missing files: {missing_files}")
        return False
    else:
        print("\n✅ All required files present")
        return True

def check_database():
    """Check database and meetings"""
    print("\n🗄️ Checking Database...")
    
    if not os.path.exists('meetings.db'):
        print("  ❌ meetings.db not found!")
        print("  💡 Create a meeting first from the home page")
        return False
    
    try:
        conn = sqlite3.connect('meetings.db')
        cursor = conn.cursor()
        
        # Check tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"  📋 Tables: {[t[0] for t in tables]}")
        
        # Check meetings count
        cursor.execute("SELECT COUNT(*) FROM meetings")
        count = cursor.fetchone()[0]
        print(f"  📊 Total meetings: {count}")
        
        if count > 0:
            # Get sample meeting
            cursor.execute("SELECT id, title, status FROM meetings LIMIT 1")
            meeting = cursor.fetchone()
            print(f"  📝 Sample meeting: ID={meeting[0]}, Title='{meeting[1]}', Status={meeting[2]}")
            conn.close()
            return meeting[0]  # Return meeting ID for testing
        else:
            print("  ⚠️  No meetings found - create one first!")
            conn.close()
            return None
            
    except Exception as e:
        print(f"  ❌ Database error: {e}")
        return False

def test_server():
    """Test if server is running and responding"""
    print("\n🌐 Testing Server...")
    
    base_url = "http://localhost:9000"
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health", timeout=5)
        print(f"  ✅ Health check: {response.status_code}")
        if response.status_code == 200:
            health_data = response.json()
            print(f"      Whisper: {'✅' if health_data.get('whisper_loaded') else '❌'}")
            print(f"      Ollama: {'✅' if health_data.get('ollama_connected') else '❌'}")
    except Exception as e:
        print(f"  ❌ Server not responding: {e}")
        print("  💡 Make sure to run: python main.py")
        return False
    
    # Test home page
    try:
        response = requests.get(base_url, timeout=5)
        print(f"  ✅ Home page: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Home page error: {e}")
    
    # Test meetings API
    try:
        response = requests.get(f"{base_url}/api/meetings", timeout=5)
        print(f"  ✅ Meetings API: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            meeting_count = len(data.get('meetings', []))
            print(f"      Found {meeting_count} meetings via API")
            if meeting_count > 0:
                return data['meetings'][0]['id']  # Return first meeting ID
    except Exception as e:
        print(f"  ❌ Meetings API error: {e}")
    
    return None

def test_meeting_page(meeting_id):
    """Test specific meeting page access"""
    if not meeting_id:
        print("\n⚠️  No meeting ID to test")
        return
        
    print(f"\n📄 Testing Meeting Page (ID: {meeting_id})...")
    
    base_url = "http://localhost:9000"
    
    # Test individual meeting API
    try:
        response = requests.get(f"{base_url}/api/meetings/{meeting_id}", timeout=5)
        print(f"  ✅ Meeting API: {response.status_code}")
        if response.status_code == 200:
            meeting_data = response.json()
            print(f"      Title: '{meeting_data.get('title')}'")
            print(f"      Status: {meeting_data.get('status')}")
        elif response.status_code == 404:
            print("  ❌ Meeting not found in database")
            return
    except Exception as e:
        print(f"  ❌ Meeting API error: {e}")
        return
    
    # Test meeting page route
    try:
        response = requests.get(f"{base_url}/meeting/{meeting_id}", timeout=5)
        print(f"  📄 Meeting page route: {response.status_code}")
        if response.status_code == 200:
            print("  ✅ Meeting page should load successfully")
        elif response.status_code == 404:
            print("  ❌ Meeting page route not found")
        else:
            print(f"  ⚠️  Unexpected status: {response.status_code}")
    except Exception as e:
        print(f"  ❌ Meeting page error: {e}")

def check_static_files():
    """Test static file serving"""
    print("\n📁 Testing Static File Serving...")
    
    base_url = "http://localhost:9000"
    static_files = [
        '/static/meeting.html',
        '/static/meeting.css', 
        '/static/meeting.js'
    ]
    
    for file_path in static_files:
        try:
            response = requests.get(f"{base_url}{file_path}", timeout=5)
            if response.status_code == 200:
                print(f"  ✅ {file_path}")
            else:
                print(f"  ❌ {file_path} - Status: {response.status_code}")
        except Exception as e:
            print(f"  ❌ {file_path} - Error: {e}")

def main():
    """Run all diagnostic checks"""
    print("🔧 Meeting Page Diagnostic Tool")
    print("=" * 50)
    
    # Check file structure
    files_ok = check_file_structure()
    
    # Check database
    meeting_id = check_database()
    
    # Test server
    if files_ok:
        api_meeting_id = test_server()
        
        # Use meeting ID from API or database
        test_meeting_id = api_meeting_id or meeting_id
        
        # Test meeting page
        test_meeting_page(test_meeting_id)
        
        # Test static files
        check_static_files()
    
    print("\n" + "=" * 50)
    print("🎯 DIAGNOSTIC COMPLETE")
    print("\nNext steps:")
    print("1. Fix any ❌ issues shown above")
    print("2. If no meetings exist, create one from home page")
    print("3. Check browser console (F12) for JavaScript errors")
    print("4. Report findings for further assistance")

if __name__ == "__main__":
    main()