# Atlas AI Assistant

A self-hosted personal AI assistant with multi-channel communication, persistent memory, and extensible skills.

## Features

- 🔒 **Privacy-First**: All data stays on your infrastructure
- 💬 **Multi-Channel**: Telegram, Discord, WhatsApp, Slack (and more)
- 🧠 **Persistent Memory**: Remembers context across conversations
- 🛠️ **Extensible**: Plugin-based skills framework
- 🤖 **Multi-Agent**: Claude, OpenAI, or local models

## Quick Start

```bash
# Clone and install
git clone https://github.com/your-username/atlas.git
cd atlas
npm install

# Run setup wizard
npm run cli init

# Start the gateway
npm start
```

## Configuration

Copy the example config and add your API keys:

```bash
mkdir -p ~/.atlas
cp config.example.json ~/.atlas/config.json
# Edit with your keys
```

## Architecture

```
┌─────────────────────────────────────────────┐
│  Channels (Telegram, Discord, WhatsApp)     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         Gateway (WebSocket :18789)          │
│    Session Management | Message Routing     │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│      Agents (Claude, OpenAI, Local)         │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│  Tools (Browser, Files, Shell, Skills)      │
└─────────────────────────────────────────────┘
```

## Project Structure

```
atlas/
├── packages/
│   ├── core/       # Gateway, session management
│   ├── agents/     # AI provider integrations
│   ├── channels/   # Communication adapters
│   ├── tools/      # Built-in tools
│   ├── skills/     # Skill framework
│   ├── memory/     # Memory system
│   └── cli/        # Command-line interface
├── apps/
│   └── gateway/    # Main gateway service
└── docs/           # Documentation
```

## License

MIT



