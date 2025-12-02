@echo off
REM Email Service for Barangay Events System
REM This script processes the email queue from Firestore

cd /d C:\xampp\htdocs\barangay-event-proposal

REM Check if node is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    exit /b 1
)

REM Run the email service
node email-service.js

REM Log the execution
@echo [%date% %time%] Email service completed with exit code %errorlevel% >> email-service-history.log
