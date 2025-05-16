# OnlineCheckers.org - Frontend

This is the frontend component of OnlineCheckers.org, a web application that allows users to play Italian Checkers online against other players or against a bot.

## Technologies

- Angular 17+ (Standalone Components)
- Bootstrap 5
- ngx-translate for internationalization

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or later)
- npm (v9 or later)
- Angular CLI (`npm install -g @angular/cli`)
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/online-checkers.git
cd online-checkers/frontend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure the environment

Edit `src/environments/environment.ts` for development configuration:

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8080'
};
```

### 4. Run the development server

```bash
ng serve
```

Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Project Structure

- **src/app/components/** - Reusable UI components (board, chat, moves, etc.)
- **src/app/pages/** - Page components (menu, game pages, rules, etc.)
- **src/services/** - Services for API communication and state management
- **src/model/entities/** - Data models
- **src/assets/i18n/** - Translation files (English, Italian)
- **src/styles/** - Global styles and theme variables

## Game Features

- **Play Modes**:
  - Local Play (on the same device)
  - Online Play against other players
  - Play against the computer (bot with 3 difficulty levels)
- **Game Rules**: Italian Checkers ruleset
- **UI Features**:
  - Board visualization with coordinates
  - Move history
  - In-game chat
  - Game sharing
  - Rematch feature
- **Customization**:
  - Language selection (English, Italian)
  - Light/Dark theme

## Building for Production

```bash
ng build --configuration=production
```

The build artifacts will be stored in the `dist/` directory.

## Running Tests

```bash
ng test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the Angular style guide
- Write meaningful commit messages
- Maintain code documentation
- Ensure components are responsive
- Support both light and dark themes
- Support both English and Italian languages
- Ensure all new features work on mobile devices

## License

To the extent possible under law, this work is dedicated to the public domain worldwide. 
http://creativecommons.org/publicdomain/zero/1.0/