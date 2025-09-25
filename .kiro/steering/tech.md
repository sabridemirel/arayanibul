# Technology Stack

## Backend (.NET Core)
- **Framework**: ASP.NET Core 9.0 Web API
- **Database**: SQLite (development), PostgreSQL (production recommended)
- **ORM**: Entity Framework Core 9.0
- **Authentication**: JWT + ASP.NET Core Identity
- **OAuth**: Google, Facebook authentication
- **Documentation**: Swagger/OpenAPI

### Key Packages
- Microsoft.AspNetCore.Authentication.JwtBearer
- Microsoft.AspNetCore.Identity.EntityFrameworkCore
- Microsoft.EntityFrameworkCore.Sqlite
- Microsoft.AspNetCore.Authentication.Google
- Swashbuckle.AspNetCore

## Frontend (React Native/Expo)
- **Framework**: React Native with Expo SDK ~54.0
- **Language**: TypeScript
- **Navigation**: React Navigation 7.x (Stack Navigator)
- **HTTP Client**: Axios
- **Storage**: AsyncStorage
- **Icons**: Expo Vector Icons (Material Icons)
- **State Management**: React Hooks + Context

### Key Dependencies
- @react-navigation/native, @react-navigation/stack
- @react-native-async-storage/async-storage
- @react-native-google-signin/google-signin
- react-native-fbsdk-next

## Common Commands

### Backend
```bash
cd src/backend/API
dotnet restore                    # Install dependencies
dotnet ef database update         # Apply migrations
dotnet run                       # Start development server (port 5000)
dotnet ef migrations add <name>   # Create new migration
```

### Mobile
```bash
cd src/mobile
npm install                      # Install dependencies
npx expo start                   # Start development server
npx expo start --clear           # Start with cache cleared
npx expo start --android         # Start Android emulator
npx expo start --ios             # Start iOS simulator
```

### Quick Start
```bash
chmod +x start.sh && ./start.sh  # Start both backend and mobile
```

## Development URLs
- **Backend API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/swagger
- **Mobile**: Expo development server

## Build Requirements
- .NET 9 SDK
- Node.js 16+
- Expo CLI
- iOS Simulator (macOS) or Android Emulator