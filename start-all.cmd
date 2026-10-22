@echo off
rem Starts the four OnGarage apps on the web, each in its own window.
rem   user   http://localhost:8091
rem   garage http://localhost:8092
rem   parts  http://localhost:8093
rem   tech   http://localhost:8094
cd /d "%~dp0"
start "OnGarage user 8091"   cmd /k "cd apps\user   && npx expo start -c --web --port 8091"
start "OnGarage garage 8092" cmd /k "cd apps\garage && npx expo start -c --web --port 8092"
start "OnGarage parts 8093"  cmd /k "cd apps\parts  && npx expo start -c --web --port 8093"
start "OnGarage tech 8094"   cmd /k "cd apps\tech   && npx expo start -c --web --port 8094"