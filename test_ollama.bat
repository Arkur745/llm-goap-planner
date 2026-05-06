@echo off
REM Test Ollama /api/generate endpoint
REM Create a simple JSON request body
(
echo {
echo   "model": "llama3:8b",
echo   "prompt": "Hello",
echo   "stream": false
echo }
) > ollama_request.json

echo Testing POST to http://localhost:11434/api/generate
curl.exe -X POST http://localhost:11434/api/generate -H "Content-Type: application/json" -d "@ollama_request.json" -i
pause
