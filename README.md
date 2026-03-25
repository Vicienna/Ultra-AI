# Nexus AI - Advanced Multi-Model Chat Platform

Nexus AI is a professional-grade collaborative AI chat platform built with React, Vite, and Firebase. It leverages the power of Google's Gemini models to provide a seamless, multi-model discussion experience with real-time thinking visualization and Google Search grounding.

## 🚀 Features

- **Multi-Model Discussion**: Collaborative responses from multiple Gemini models (Flash, Flash Lite) working together.
- **Real-Time Thinking**: Visualize the AI's reasoning process as it happens.
- **Search Grounding**: Integrated Google Search for up-to-date information and fact-checking.
- **Programmer Modes**: Specialized modes for quick code generation and complex multi-step agentic coding.
- **Firebase Integration**: Secure authentication and real-time chat history synchronization.
- **Responsive Design**: Polished, mobile-first UI with dark/light mode support.
- **Multi-Language Support**: Available in English and Indonesian.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS 4
- **AI Engine**: Google Gemini API (@google/genai)
- **Database & Auth**: Firebase (Firestore, Auth)
- **Animations**: Motion (Framer Motion)
- **Icons**: Lucide React
- **Toast Notifications**: Sonner

## 📦 Installation

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables in a `.env` file (see `.env.example`).
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🌐 Deployment on Vercel

This project is optimized for Vercel deployment.

1. Push your code to a GitHub repository.
2. Connect your repository to Vercel.
3. Configure the following Environment Variables in Vercel:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FIRESTORE_DATABASE_ID`
4. Deploy!

## 📄 License

MIT License
