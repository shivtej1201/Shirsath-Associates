# Shirsath & Associates - Legal Excellence

This project is a premium, multi-lingual law firm website built with React, Tailwind CSS, and Firebase. It features AI-powered legal insights and a robust lead management system.

## Local Setup Instructions

Follow these steps to get the project running on your local machine.

### 1. Prerequisites

Ensure you have the following installed:
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) (comes with Node.js)

### 2. Export the Project

If you haven't already, you can export this project from AI Studio:
1. Open the **Settings** menu (gear icon).
2. Select **Export to GitHub** or **Download ZIP**.

### 3. Install Dependencies

Navigate to the project directory in your terminal and run:

```bash
npm install
```

### 4. Environment Configuration

Create a `.env` file in the root directory and add your API keys:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

*Note: You can get a Gemini API key from the [Google AI Studio](https://aistudio.google.com/app/apikey).*

### 5. Firebase Configuration

The project is already configured to use the Firebase project set up in AI Studio. The configuration is stored in `firebase-applet-config.json`. 

If you want to use your own Firebase project:
1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Enable **Firestore Database** and **Authentication** (Google Provider).
3. Copy your web app configuration and update `firebase-applet-config.json`.

### 6. Run the Development Server

Start the local development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### 7. Build for Production

To create a production-ready build:

```bash
npm run build
```

The optimized files will be generated in the `dist/` directory.

## Project Structure

- `src/App.tsx`: Main application logic and components.
- `src/translations.ts`: Multi-language support (English, Marathi, Hindi, Tamil, Telugu).
- `src/firebase.ts`: Firebase initialization and utilities.
- `firestore.rules`: Security rules for your database.
- `firebase-blueprint.json`: Data structure documentation.
