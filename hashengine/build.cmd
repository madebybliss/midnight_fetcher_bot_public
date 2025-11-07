@echo off
REM Unified build script for HashEngine (Windows)
REM Supports both hash server and N-API module builds

REM Add Cargo to PATH if it exists in the default location
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
    set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
)

REM Parse command line argument
set BUILD_TARGET=%1
if "%BUILD_TARGET%"=="" set BUILD_TARGET=server

REM Display header
echo ========================================
if "%BUILD_TARGET%"=="server" (
    echo Building HashEngine Hash Server
) else if "%BUILD_TARGET%"=="napi" (
    echo Building HashEngine N-API Module
) else (
    echo ERROR: Unknown build target "%BUILD_TARGET%"
    echo.
    echo Usage: build.cmd [server^|napi]
    echo   server - Build optimized hash server ^(default^)
    echo   napi   - Build N-API module for Node.js
    exit /b 1
)
echo ========================================
echo.

REM Build hash server with optimizations
if "%BUILD_TARGET%"=="server" (
    echo Optimizations enabled:
    echo   + mimalloc allocator
    echo   + LTO = "fat"
    echo   + panic = "abort"
    echo   + overflow-checks = false
    echo   + target-cpu = native
    echo   + cryptoxide 0.5 ^(SIMD^)
    echo   + Performance monitoring
    echo.

    REM Stop any running hash-server instances
    echo [1/4] Stopping existing hash-server instances...
    taskkill /F /IM hash-server.exe 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo   ✓ Stopped running server
        timeout /t 2 /nobreak >nul
    ) else (
        echo   ℹ No running server found
    )

    REM Clean previous build
    echo.
    echo [2/4] Cleaning previous build...
    cargo clean
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Clean failed
        exit /b 1
    )

    REM Set optimization flags
    echo.
    echo [3/4] Setting Rust optimization flags...
    set RUSTFLAGS=-C target-cpu=native -C panic=abort
    echo   RUSTFLAGS=%RUSTFLAGS%

    REM Build with all optimizations
    echo.
    echo [4/4] Building optimized hash server...
    echo This will take 2-3 minutes...
    cargo build --release --bin hash-server
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERROR: Build failed
        echo.
        echo Possible causes:
        echo   - Missing dependencies ^(run: cargo update^)
        echo   - Compiler version too old ^(need Rust 1.70+^)
        echo.
        exit /b 1
    )

    REM Display results
    echo.
    echo ========================================
    echo Build Complete!
    echo ========================================
    echo.
    echo Binary location:
    echo   target\release\hash-server.exe
    echo.
    echo Binary size:
    dir target\release\hash-server.exe | findstr hash-server.exe
    echo.
    echo To start the server:
    echo   cargo run --release --bin hash-server
    echo.
    echo To benchmark:
    echo   node benchmark.js
    echo.
)

REM Build N-API module
if "%BUILD_TARGET%"=="napi" (
    echo Building N-API module for Node.js...
    echo.

    REM Build with cargo (release mode)
    cargo build --release

    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Cargo build failed
        exit /b 1
    )

    REM Copy the built library to index.node
    if exist "target\release\HashEngine_napi.dll" (
        copy /Y "target\release\HashEngine_napi.dll" "index.node"
        echo.
        echo ========================================
        echo Build Complete!
        echo ========================================
        echo.
        echo Built: index.node
        echo.
    ) else (
        echo ERROR: Could not find HashEngine_napi.dll
        exit /b 1
    )
)

echo Hash engine build complete!
