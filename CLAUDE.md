# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arayanibul is a reverse classifieds platform where buyers post what they're looking for instead of sellers posting what they have. Built with React Native/Expo frontend and .NET Core backend.

Key concept: Users post "I'm looking for X" ads, and service/product providers respond with offers.

## Architecture

### Backend (.NET Core)
- **API Layer**: `src/backend/API/` - Main Web API project (.NET 9)
- **Architecture**: Layered architecture (though current structure appears to be in single API project)
- **Database**: SQLite (development), designed for PostgreSQL (production)
- **Authentication**: JWT + OAuth (Google/Facebook)
- **Key Features**: Identity management, real-time SignalR, file upload with ImageSharp

### Frontend (React Native/Expo)
- **Location**: `src/mobile/`
- **Platform**: React Native with Expo (~51.0.28)
- **Navigation**: React Navigation v6 with bottom tabs and stack navigation
- **State Management**: React Context (located in `src/mobile/src/contexts/`)
- **API Client**: Axios for HTTP requests

### Project Structure
```
src/
├── backend/
│   ├── API/              # Main API project
│   ├── API.Tests/        # Unit tests
│   ├── E2E.Tests/        # End-to-end tests
│   └── Lambda/           # AWS Lambda functions
└── mobile/
    └── src/
        ├── components/   # Reusable UI components
        ├── contexts/     # React Context providers
        ├── hooks/        # Custom React hooks
        └── services/     # API service layer
```

## Development Commands

### Backend Commands
```bash
# Navigate to backend
cd src/backend/API

# Restore dependencies
dotnet restore

# Run database migrations
dotnet ef database update

# Start backend server
dotnet run
# Server runs at: http://localhost:5000
# Swagger UI at: http://localhost:5000/swagger
```

### Mobile Commands
```bash
# Navigate to mobile app
cd src/mobile

# Install dependencies
npm install

# Start Expo development server
npx expo start

# Platform-specific builds
npm run android
npm run ios
npm run web

# Code quality
npm run lint
npm run test
npm run test:watch
npm run test:coverage
```

### Quick Start
```bash
# Start both backend and mobile simultaneously
./start.sh
```

## Testing
- **Backend**: Uses .NET testing framework (API.Tests, E2E.Tests)
- **Mobile**: Jest with watch mode support
- Run mobile tests: `npm run test` or `npm run test:watch`
- Coverage reports: `npm run test:coverage`

## Key Technologies
- **Backend**: ASP.NET Core 9, Entity Framework Core, SQLite/PostgreSQL, JWT, SignalR, ImageSharp
- **Mobile**: React Native, Expo, TypeScript, React Navigation, AsyncStorage, Axios
- **Authentication**: JWT tokens with Google/Facebook OAuth integration
- **Development**: ESLint for code quality, Swagger for API documentation

## Important Notes
- Google/Facebook authentication requires native builds (won't work in Expo Go)
- Email/password and guest authentication work in Expo Go
- Backend uses SQLite for development, PostgreSQL recommended for production
- Project follows Turkish documentation (README and docs are in Turkish)