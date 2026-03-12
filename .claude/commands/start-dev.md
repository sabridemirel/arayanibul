Start the local development environment for Arayanibul.

Follow these steps in order:

1. Check if the PostgreSQL Docker container is running:
   ```
   docker compose ps
   ```
   If `arayanibul-db` is not running, start it:
   ```
   docker compose up -d
   ```
   Wait for it to be healthy before proceeding.

2. Check if the backend is already running on port 5001:
   ```
   lsof -i :5001
   ```
   If not running, start the .NET backend in the background:
   ```
   export PATH="/opt/homebrew/opt/dotnet@9/bin:$PATH"
   export DOTNET_ROOT="/opt/homebrew/opt/dotnet@9/libexec"
   cd src/backend/API && dotnet run &
   ```
   Wait ~5 seconds and confirm it's listening on http://localhost:5001.

3. Report the status of each service:
   - PostgreSQL: port 5432
   - Backend API: http://localhost:5001
   - Swagger UI: http://localhost:5001/swagger

If anything fails, report the error clearly and suggest the fix.
