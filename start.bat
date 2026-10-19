@echo off
title Electricity Bill Estimator - Java Backend
color 0A

echo ===============================================================
echo     ELECTRICITY BILL ESTIMATOR - COLLEGE JAVA MICRO-PROJECT
echo ===============================================================
echo.

:: Ensure Java path is detected (supports PyCharm JBR, Program Files Java, and System PATH)
where javac >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "C:\Program Files\JetBrains\PyCharm Community Edition 2025.2.5\jbr\bin\javac.exe" (
        set "PATH=C:\Program Files\JetBrains\PyCharm Community Edition 2025.2.5\jbr\bin;%PATH%"
    ) else (
        if defined JAVA_HOME (
            if exist "%JAVA_HOME%\bin\javac.exe" (
                set "PATH=%JAVA_HOME%\bin;%PATH%"
            )
        )
    )
)
where javac >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] JDK [javac] not found. Please ensure Java JDK is installed.
    pause
    exit /b 1
)

echo [1/3] Compiling ElectricityBillServer.java...
javac ElectricityBillServer.java
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Compilation failed.
    pause
    exit /b 1
)
echo [SUCCESS] Compilation successful!
echo.

echo [2/3] Opening web application in default browser...
ping 127.0.0.1 -n 2 >nul
start http://localhost:8080
echo.

echo [3/3] Starting Core Java HTTP Server on http://localhost:8080 ...
echo [NOTE] Press Ctrl + C in this window to stop the server.
echo ===============================================================
echo.

java ElectricityBillServer
pause
