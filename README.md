# CardCrop AI Suite

A professional sports card grading and restoration application powered by OpenAI.

## Features

- **🖼️ Batch Processing** - Upload multiple cards for AI-powered damage analysis and restoration
- **🤖 Lumina AI Chat** - Get expert advice on card grading, condition assessment, and restoration
- **🎨 Image Generation** - Create custom sports card assets using DALL-E 3
- **📦 Export** - Download processed cards as ZIP files

## Tech Stack

- React + TypeScript
- Tailwind CSS
- OpenAI API (GPT-4.1, DALL-E 3)
- Vite

## Setup

1. Install dependencies:
```bash
npm install
```

2. Add your OpenAI API key to `.env.local`:
```
OPENAI_API_KEY=your_key_here
```

3. Start the development server:
```bash
npm run dev
```

4. Open http://localhost:3000

## API Key

You can also update the API key at runtime using the "UPDATE API KEY" button in the UI. This stores the key in localStorage.

## Models Used

- **Chat**: GPT-4.1-nano for Lumina conversations
- **Image Analysis**: GPT-4.1-mini with vision for damage detection
- **Image Generation**: DALL-E 3 for card creation
- **Restoration**: GPT-4.1-mini + DALL-E 3 for card repair
