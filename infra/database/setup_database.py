#!/usr/bin/env python3
"""
Database Setup Script for Messaging Intelligence Platform
Automatically runs init.sql on Supabase PostgreSQL
"""

import os
import sys
from pathlib import Path
import psycopg2
from dotenv import load_dotenv

# Load environment variables
env_path = Path(__file__).parent.parent / '.env'
load_dotenv(env_path)

# Database connection string
DB_URL = os.getenv('SUPABASE_DB_URL')

if not DB_URL:
    print("❌ ERROR: SUPABASE_DB_URL not found in .env file")
    sys.exit(1)

print("[*] Messaging Intelligence Platform - Database Setup")
print("=" * 60)
print(f"[DB] Target: Supabase PostgreSQL")
print(f"[FILE] Script: init.sql")
print("=" * 60)

# Read SQL file
sql_file = Path(__file__).parent / 'init.sql'
if not sql_file.exists():
    print(f"❌ ERROR: {sql_file} not found")
    sys.exit(1)

with open(sql_file, 'r', encoding='utf-8') as f:
    sql_content = f.read()

print(f"\n[OK] Loaded init.sql ({len(sql_content)} bytes)")

try:
    # Connect to database
    print("\n[*] Connecting to Supabase...")
    conn = psycopg2.connect(DB_URL)
    conn.autocommit = True
    cursor = conn.cursor()
    
    print("[OK] Connected successfully!")
    
    # Check PostgreSQL version
    cursor.execute("SELECT version();")
    version = cursor.fetchone()[0]
    print(f"[DB] PostgreSQL version: {version.split(',')[0]}")
    
    # Execute SQL script
    print("\n[*] Executing init.sql...")
    cursor.execute(sql_content)
    
    print("[OK] SQL script executed successfully!")
    
    # Verify tables created
    print("\n[*] Verifying tables...")
    cursor.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name LIKE 'ai_%'
        ORDER BY table_name;
    """)
    
    tables = cursor.fetchall()
    if tables:
        print(f"\n[OK] Created {len(tables)} AI tables:")
        for table in tables:
            print(f"   - {table[0]}")
    else:
        print("\n[WARN] No AI tables found (they may already exist)")
    
    # Check extensions
    print("\n[*] Checking extensions...")
    cursor.execute("SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'vector');")
    extensions = cursor.fetchall()
    for ext in extensions:
        print(f"   [OK] {ext[0]}")
    
    if len(extensions) < 2:
        print("   [WARN] Some extensions may not be installed")
    
    # Close connection
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("[SUCCESS] Database setup complete!")
    print("=" * 60)
    print("\n[NEXT] Next steps:")
    print("   1. Deploy Docker containers: cd infra && docker-compose up -d")
    print("   2. Matrix Synapse will auto-create its tables")
    print("   3. Mautrix bridge will auto-create its tables")
    print("   4. AI service will use the custom tables")
    print("\n[SUCCESS] Your database is ready!")
    
except psycopg2.Error as e:
    print(f"\n[ERROR] Database error: {e}")
    sys.exit(1)
except Exception as e:
    print(f"\n[ERROR] Error: {e}")
    sys.exit(1)
