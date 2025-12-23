# Architecture notes

## Goals
- Capture one live stream
- Transcribe and translate
- Generate voice with ElevenLabs
- Publish delayed outputs per language

## MVP flow
1) Ingest RTMP/WebRTC -> audio extraction
2) Transcribe -> translate -> synthesize
3) Push to streaming CDN
