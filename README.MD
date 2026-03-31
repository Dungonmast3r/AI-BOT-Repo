# AI-BOT

**A powerful, modular Discord bot built with JavaScript** — featuring music playback, custom commands, event handling, and AI-enhanced functionality.

![Discord.js](https://img.shields.io/badge/Discord.js-%235865F2.svg?style=for-the-badge&logo=discord&logoColor=white)
![JavaScript](https://img.shields.io/badge/javascript-%23323330.svg?style=for-the-badge&logo=javascript&logoColor=%23F7DF1E)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)

<p align="center">
  <img src="https://via.placeholder.com/800x400/5865F2/FFFFFF?text=AI-BOT+Discord+Music+&+Commands" alt="AI-BOT Discord Bot" width="800"/>
  <br/>
  <em>AI-BOT running on your server — music, commands & more</em>
</p>

## 📖 About

**AI-BOT** is a feature-rich Discord bot written in JavaScript (Node.js). It includes:

- Prefix/slash command system
- Event-based architecture
- Music playback (via `musicbot/` module)
- Utility functions and custom structures
- Easy-to-extend command and event handlers

Perfect for personal servers, music communities, or as a foundation for adding AI-powered features (chat responses, moderation, games, etc.).

## ✨ Features

- 🎵 **Music playback** — play, skip, queue, pause, resume from YouTube, SoundCloud, etc.
- ⚡ **Modular commands & events** — easy to add new features
- 🛠️ **Handler system** — clean separation of commands, events, and utilities
- 📂 **Well-organized structure** — `commands/`, `events/`, `handlers/`, `utils/`, etc.
- 🔧 **Configurable** — sensitive data stored in `config.js`
- 🤖 **AI-ready** — extend with APIs (OpenAI, Grok, etc.) for smart responses

## 🚀 Quick Start

### Prerequisites

- Node.js **v18+**
- A Discord bot token (create one at https://discord.com/developers/applications)
- (Optional) Lavalink or yt-dlp for advanced music support

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/Dungonmast3r/AI-BOT.git
cd AI-BOT

# 2. Install dependencies
npm install

# 3. Create and fill config.js / .env file
#    (copy from config.example.js if it exists, or create it)
cp config.example.js config.js   # if example exists

# Edit config.js with your:
# - Discord bot token
# - Prefix
# - Owner ID(s)
# - Lavalink / music settings (if used)
