# Project Structure

## Root Level
```
Arayanibul/
├── src/                    # Source code
├── docs/                   # Project documentation
├── .kiro/                  # Kiro configuration and steering
├── start.sh               # Quick start script
└── README.md              # Main project documentation
```

## Backend Structure (src/backend/)
```
backend/
└── API/                   # Web API project (current monolith)
    ├── Controllers/       # API controllers
    ├── Data/             # DbContext and data access
    ├── Models/           # DTOs and domain models
    ├── Services/         # Business logic services
    ├── Migrations/       # EF Core migrations
    ├── Program.cs        # Application entry point
    ├── appsettings.json  # Configuration
    └── app.db           # SQLite database file
```

### Backend Architecture Pattern
- **Layered Architecture**: Controllers → Services → Data Access
- **Dependency Injection**: Services registered in Program.cs
- **Repository Pattern**: Planned for future implementation
- **DTO Pattern**: Separate models for API requests/responses

## Mobile Structure (src/mobile/)
```
mobile/
├── screens/              # Application screens/pages
├── components/           # Reusable UI components
├── services/            # API clients and external services
├── hooks/               # Custom React hooks
├── navigation/          # Navigation configuration
├── types/               # TypeScript type definitions
├── utils/               # Helper functions and utilities
├── assets/              # Images, fonts, icons
├── data/                # Mock data and constants
├── App.tsx              # Root application component
└── package.json         # Dependencies and scripts
```

### Mobile Architecture Pattern
- **Component-Based**: Functional components with hooks
- **Screen-Service Pattern**: Screens consume services for data
- **Context for State**: Authentication state managed via React Context
- **Navigation Stack**: Stack navigator for screen transitions

## Naming Conventions

### Backend (C#)
- **Controllers**: `AuthController.cs`, `HomeController.cs`
- **Services**: `AuthService.cs`, `UserService.cs`
- **Models**: `ApplicationUser.cs`, `AuthDTOs.cs`
- **Methods**: PascalCase (`RegisterAsync`, `LoginAsync`)

### Mobile (TypeScript/React)
- **Screens**: `LoginScreen.tsx`, `HomeScreen.tsx`
- **Components**: `ThemedText.tsx`, `HapticTab.tsx`
- **Services**: `authService.ts`, `api.ts`
- **Functions**: camelCase (`checkAuthStatus`, `handleLogin`)

## File Organization Rules
- Group related functionality in dedicated folders
- Keep components small and focused on single responsibility
- Place shared utilities in dedicated utils folders
- Separate business logic from UI components
- Use index files for clean imports where appropriate

## Future Architecture Notes
- Backend planned to evolve from monolith to microservices
- Mobile may add state management library (Redux/Zustand) as complexity grows
- Database will migrate from SQLite to PostgreSQL for production