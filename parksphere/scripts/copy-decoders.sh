#!/bin/bash

# Copy Draco decoders for Three.js
echo "Setting up Draco and Basis decoders..."

# Create directories if they don't exist
mkdir -p ../client/public/draco
mkdir -p ../client/public/basis

# Note: In production, you would copy these from node_modules
# For now, we'll create placeholder files

# Create placeholder notice
cat > ../client/public/draco/README.md << EOF
# Draco Decoders

Copy the following files from node_modules/three/examples/jsm/libs/draco/:
- draco_decoder.js
- draco_decoder.wasm
- draco_wasm_wrapper.js

Or use the Google Draco CDN:
https://www.gstatic.com/draco/versioned/decoders/1.5.6/
EOF

cat > ../client/public/basis/README.md << EOF
# Basis Transcoder

Copy the following files from node_modules/three/examples/jsm/libs/basis/:
- basis_transcoder.js
- basis_transcoder.wasm

These are needed for KTX2 texture loading.
EOF

echo "✅ Decoder directories created with instructions"