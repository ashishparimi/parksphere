#!/bin/bash

# Setup script for Draco and Basis decoders needed by the 3D engine

echo "Setting up 3D asset decoders..."

# Create directories
mkdir -p public/draco
mkdir -p public/basis

# Download Draco decoder files
echo "Downloading Draco decoder..."
DRACO_VERSION="1.5.6"
DRACO_BASE_URL="https://www.gstatic.com/draco/versioned/decoders/${DRACO_VERSION}/"

# Download Draco WASM files
curl -o public/draco/draco_decoder.js "${DRACO_BASE_URL}draco_decoder.js"
curl -o public/draco/draco_decoder.wasm "${DRACO_BASE_URL}draco_decoder.wasm"
curl -o public/draco/draco_wasm_wrapper.js "${DRACO_BASE_URL}draco_wasm_wrapper.js"

# Download Basis transcoder files
echo "Downloading Basis transcoder..."
THREEJS_VERSION="r155"
BASIS_BASE_URL="https://raw.githubusercontent.com/mrdoob/three.js/${THREEJS_VERSION}/examples/jsm/libs/basis/"

# Download Basis files
curl -o public/basis/basis_transcoder.js "${BASIS_BASE_URL}basis_transcoder.js"
curl -o public/basis/basis_transcoder.wasm "${BASIS_BASE_URL}basis_transcoder.wasm"

echo "Decoder setup complete!"
echo "Files installed:"
echo "  - public/draco/ (Draco decoder for compressed meshes)"
echo "  - public/basis/ (Basis transcoder for KTX2 textures)"