#!/bin/bash
# Unified build script for HashEngine (Linux/Mac)
# Supports both hash server and N-API module builds

set -e

# Parse command line argument
BUILD_TARGET=${1:-server}

# Display header
echo "========================================"
case "$BUILD_TARGET" in
    server)
        echo "Building HashEngine Hash Server"
        ;;
    napi)
        echo "Building HashEngine N-API Module"
        ;;
    *)
        echo "ERROR: Unknown build target '$BUILD_TARGET'"
        echo ""
        echo "Usage: ./build.sh [server|napi]"
        echo "  server - Build optimized hash server (default)"
        echo "  napi   - Build N-API module for Node.js"
        exit 1
        ;;
esac
echo "========================================"
echo ""

# Build hash server with optimizations
if [ "$BUILD_TARGET" = "server" ]; then
    echo "Optimizations enabled:"
    echo "  + mimalloc allocator"
    echo "  + LTO = \"fat\""
    echo "  + panic = \"abort\""
    echo "  + overflow-checks = false"
    echo "  + target-cpu = native"
    echo "  + cryptoxide 0.5 (SIMD)"
    echo "  + Performance monitoring"
    echo ""

    # Stop any running hash-server instances
    echo "[1/4] Stopping existing hash-server instances..."
    if pkill -f hash-server 2>/dev/null; then
        echo "  ✓ Stopped running server"
        sleep 2
    else
        echo "  ℹ No running server found"
    fi

    # Clean previous build
    echo ""
    echo "[2/4] Cleaning previous build..."
    cargo clean

    # Set optimization flags
    echo ""
    echo "[3/4] Setting Rust optimization flags..."
    export RUSTFLAGS="-C target-cpu=native -C panic=abort"
    echo "  RUSTFLAGS=$RUSTFLAGS"

    # Build with all optimizations
    echo ""
    echo "[4/4] Building optimized hash server..."
    echo "This will take 2-3 minutes..."
    cargo build --release --bin hash-server

    # Display results
    echo ""
    echo "========================================"
    echo "Build Complete!"
    echo "========================================"
    echo ""
    echo "Binary location:"
    echo "  target/release/hash-server"
    echo ""
    echo "Binary size:"
    ls -lh target/release/hash-server | awk '{print "  " $5 " - " $9}'
    echo ""
    echo "To start the server:"
    echo "  cargo run --release --bin hash-server"
    echo ""
    echo "To benchmark:"
    echo "  node benchmark.js"
    echo ""
fi

# Build N-API module
if [ "$BUILD_TARGET" = "napi" ]; then
    echo "Building N-API module for Node.js..."
    echo ""

    # Build Rust code
    cargo build --release

    # Copy the built library to index.node
    if [ -f "target/release/libHashEngine_napi.so" ]; then
        cp target/release/libHashEngine_napi.so index.node
        echo ""
        echo "========================================"
        echo "Build Complete!"
        echo "========================================"
        echo ""
        echo "✓ Built: index.node (Linux)"
        echo ""
    elif [ -f "target/release/libHashEngine_napi.dylib" ]; then
        cp target/release/libHashEngine_napi.dylib index.node
        echo ""
        echo "========================================"
        echo "Build Complete!"
        echo "========================================"
        echo ""
        echo "✓ Built: index.node (macOS)"
        echo ""
    elif [ -f "target/release/HashEngine_napi.dll" ]; then
        cp target/release/HashEngine_napi.dll index.node
        echo ""
        echo "========================================"
        echo "Build Complete!"
        echo "========================================"
        echo ""
        echo "✓ Built: index.node (Windows via WSL)"
        echo ""
    else
        echo "Error: Could not find compiled library"
        exit 1
    fi
fi

echo "Hash engine build complete!"
