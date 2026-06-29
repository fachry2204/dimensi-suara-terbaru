const ffmpeg = require('fluent-ffmpeg');
const ffprobeStatic = require('ffprobe-static');
const path = require('path');

ffmpeg.setFfprobePath(ffprobeStatic.path);

const file = path.join(__dirname, '../public/uploads/audio/ad3d86b7-e2b9-41f0-87b6-2f48d53d5d61.wav');
ffmpeg.ffprobe(file, (err, data) => {
    if (err) console.error("FFPROBE ERROR:", err.message);
    else console.log("FFPROBE SUCCESS:", JSON.stringify(data.format));
});
