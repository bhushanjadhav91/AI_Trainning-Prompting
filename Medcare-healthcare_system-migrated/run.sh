#!/usr/bin/env bash
set -e
echo "🏥 MedCare+ v7 — Starting Development Servers"
echo ""
command -v dotnet >/dev/null || { echo "❌ .NET 8 SDK required"; exit 1; }
command -v node   >/dev/null || { echo "❌ Node.js required"; exit 1; }

export ASPNETCORE_ENVIRONMENT=Development

cd backend
dotnet run &
BACKEND_PID=$!
cd ..

echo "⏳ Waiting for backend..."
for i in $(seq 1 30); do
  curl -sf http://localhost:5050/actuator/health >/dev/null 2>&1 && echo "✅ Backend ready" && break
  sleep 2
done

cd frontend
[ ! -d node_modules ] && npm install
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "================================================"
echo "  App:     http://localhost:4200"
echo "  Swagger: http://localhost:5050/swagger"
echo "  admin / Admin@123 | priya@medcare.in / Doctor@123 | aakash / Patient@123"
echo "================================================"
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
