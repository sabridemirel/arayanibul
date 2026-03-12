Create and apply an Entity Framework Core migration for the Arayanibul backend.

The argument provided is the migration name (e.g. `/migrate AddPaymentTable`).

Steps:

1. Set up the .NET 9 environment:
   ```
   export PATH="/opt/homebrew/opt/dotnet@9/bin:$PATH"
   export DOTNET_ROOT="/opt/homebrew/opt/dotnet@9/libexec"
   ```

2. Navigate to the backend project:
   ```
   cd src/backend/API
   ```

3. Restore dotnet tools if needed:
   ```
   dotnet tool restore
   ```

4. If a migration name was provided as argument ($ARGUMENTS), create a new migration:
   ```
   dotnet ef migrations add $ARGUMENTS
   ```
   If no argument was provided, skip this step and only apply existing migrations.

5. Apply all pending migrations:
   ```
   dotnet ef database update
   ```

6. Report the result: list the migrations that were applied, or confirm "No pending migrations" if already up to date.

If the Docker PostgreSQL container is not running, start it first with `docker compose up -d` and wait for it to be ready.
