const fs = require('fs');
const path = require('path');

async function run() {
    const fileName = 'test.wav';
    const fileSize = 1000;
    
    // 1. Init
    const initRes = await fetch('http://localhost:3000/api/uploads/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            filePurpose: 'MASTER_AUDIO',
            fileName,
            fileSize,
            mimeType: 'audio/wav',
            totalChunks: 1
        })
    });
    
    const initData = await initRes.json();
    console.log('Init:', initData);
    
    const uploadId = initData.uploadId;
    
    // 2. Chunk
    const formData = new FormData();
    formData.append('chunkIndex', '0');
    
    // Create a dummy blob
    const buffer = new Uint8Array(1000);
    const blob = new Blob([buffer], { type: 'audio/wav' });
    formData.append('chunk', blob, fileName);
    
    const chunkRes = await fetch(`http://localhost:3000/api/uploads/${uploadId}/chunk`, {
        method: 'POST',
        body: formData
    });
    
    const text = await chunkRes.text();
    console.log('Chunk status:', chunkRes.status);
    console.log('Chunk response:', text);
}

run().catch(console.error);
