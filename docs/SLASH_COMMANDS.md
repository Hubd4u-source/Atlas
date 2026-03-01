# Slash Commands - Memory Management

Atlas supports OpenClaw-style slash commands for managing your conversation memory and sessions. All commands work locally without requiring any API keys.

## 🎯 Quick Reference

| Command | Description | Example |
|---------|-------------|---------|
| `/reset` or `/new` | Reset current session | `/reset` |
| `/compact` | Keep only recent messages | `/compact` |
| `/status` | Show session info | `/status` |
| `/search <query>` | Search memory | `/search API documentation` |
| `/clear` | Clear session memory | `/clear` |
| `/export` | Export session history | `/export` |
| `/help` | Show all commands | `/help` |

---

## 📚 Detailed Command Reference

### 🔄 Session Management

#### `/reset` or `/new`
Reset the current session and start a fresh conversation.

```
/reset
```

**What it does:**
- Clears all messages in the current session
- Keeps long-term memory intact (session files remain)
- Useful when you want to start a new topic

**Response:**
```
✅ Session reset! Starting fresh conversation.
```

---

#### `/compact`
Compact the session by keeping only recent messages.

```
/compact
```

**What it does:**
- Keeps system message + last 10 messages
- Removes older messages to reduce context size
- Useful when session is getting too long

**Response:**
```
✅ Session compacted! Removed 25 old messages, kept 11 recent messages.
```

---

#### `/clear`
Clear all memory for the current session.

```
/clear
```

**What it does:**
- Clears all messages in the current session
- Historical session file remains for long-term memory
- Similar to `/reset` but more explicit

**Response:**
```
✅ Session memory cleared! Note: Historical session file remains for long-term memory.
```

---

### 📊 Information Commands

#### `/status`
Show current session and memory system status.

```
/status
```

**What it shows:**
- Session ID
- Number of messages
- Channel information
- User ID
- Memory system mode

**Response:**
```
📋 Session Status

🆔 Session: telegram-123456789
💬 Messages: 15
📍 Channel: telegram
👤 User: 123456789

📊 Memory System:
- Mode: FTS-only (local, no API keys needed)
- Status: Active
```

---

#### `/search <query>`
Search your memory for specific content.

```
/search API documentation
/search database configuration
/search yesterday's discussion
```

**What it does:**
- Searches all memory files using FTS (Full-Text Search)
- Extracts keywords from conversational queries
- Returns top 5 results with scores
- Works completely locally (no API needed)

**Response:**
```
🔍 Search Results for "API documentation":

1. memory/sessions/telegram-123456789.md (lines 45-52)
   Score: 0.856
   We discussed the REST API documentation for the user authentication endpoint...

2. memory/todos.md (lines 12-18)
   Score: 0.742
   TODO: Update API documentation with new endpoints...
```

---

#### `/export`
Export the current session history.

```
/export
```

**What it does:**
- Exports all messages in the current session
- Includes timestamps and roles
- Useful for backup or analysis

**Response:**
```
📤 Session Export (15 messages):

[1] 2026-03-01T10:30:00.000Z - user:
Hello, I need help with the API

---

[2] 2026-03-01T10:30:15.000Z - assistant:
I'd be happy to help with the API. What specifically do you need?

---

...
```

---

### ❓ Help Command

#### `/help`
Show all available commands with descriptions.

```
/help
```

**Response:**
```
📚 Available Slash Commands:

🔄 Session Management:
  /reset or /new - Reset the current session (start fresh)
  /compact - Compact session (keep recent messages only)
  /clear - Clear session memory

📊 Information:
  /status - Show session and memory status
  /search <query> - Search memory for specific content
  /export - Export current session history

❓ Help:
  /help - Show this help message

💡 Tips:
- All memory is stored locally (no API keys needed)
- Session files are kept for long-term memory
- Use /compact to reduce context size
- Use /search to find past conversations
```

---

## 🔒 Privacy & Local Storage

### Everything is Local
- **No API keys required** - All memory operations work locally
- **No external services** - FTS search runs on your machine
- **Your data stays private** - Nothing leaves your computer

### Where is Memory Stored?

```
~/.atlas/data/
├── memory/
│   ├── sessions/          # Session conversation logs
│   │   └── telegram-123456789.md
│   ├── summaries/         # Auto-generated summaries
│   │   └── telegram-123456789.md
│   ├── todos.md           # TODO items
│   ├── tasks.md           # Task queue
│   └── facts.md           # User facts
└── memory.db              # SQLite database (FTS index)
```

---

## 💡 Usage Tips

### When to Use Each Command

**Use `/reset`:**
- Starting a completely new topic
- Want to clear context but keep history
- Testing different approaches

**Use `/compact`:**
- Session is getting too long (>50 messages)
- Want to reduce context size
- Keep recent context but remove old messages

**Use `/search`:**
- Looking for past conversations
- Finding specific information
- Checking what was discussed before

**Use `/status`:**
- Checking how many messages in session
- Verifying memory system is working
- Debugging issues

**Use `/export`:**
- Backing up important conversations
- Analyzing conversation patterns
- Sharing conversation history

---

## 🚀 Examples

### Example 1: Starting Fresh
```
User: /reset
Atlas: ✅ Session reset! Starting fresh conversation.

User: Let's discuss the new API design
Atlas: Sure! What aspects of the API design would you like to focus on?
```

### Example 2: Finding Past Information
```
User: /search database migration
Atlas: 🔍 Search Results for "database migration":

1. memory/sessions/telegram-123456789.md (lines 120-125)
   Score: 0.892
   We discussed the database migration strategy using Prisma...

User: Can you remind me what we decided about the migration?
Atlas: Based on our previous discussion, we decided to...
```

### Example 3: Managing Long Sessions
```
User: /status
Atlas: 📋 Session Status
💬 Messages: 87
...

User: /compact
Atlas: ✅ Session compacted! Removed 77 old messages, kept 11 recent messages.
```

---

## 🔧 Configuration

The memory system is configured in `config.json`:

```json
{
  "memory": {
    "backend": "openclaw",
    "maxConversationHistory": 50,
    "embeddings": {
      "enabled": false,
      "fallbackToFts": true
    },
    "useHybrid": true,
    "query": {
      "minScore": 0.3,
      "maxResults": 10,
      "hybrid": {
        "enabled": true,
        "temporalDecay": {
          "enabled": true,
          "halfLifeDays": 30
        }
      }
    }
  }
}
```

### Key Settings

- `embeddings.enabled: false` - No API keys needed
- `fallbackToFts: true` - Use local FTS search
- `temporalDecay.enabled: true` - Recent memories prioritized
- `halfLifeDays: 30` - Memories decay over 30 days

---

## 🐛 Troubleshooting

### Command Not Working?

1. **Check command syntax:**
   ```
   ✅ /reset
   ❌ / reset
   ❌ /Reset
   ```

2. **Verify memory system is active:**
   ```
   /status
   ```

3. **Check logs:**
   ```
   ⚡ Executing slash command: /reset
   ```

### Search Returns No Results?

1. **Try different keywords:**
   ```
   /search API
   /search documentation
   /search endpoint
   ```

2. **Check if memory files exist:**
   ```
   ls ~/.atlas/data/memory/
   ```

3. **Verify FTS is enabled:**
   ```
   /status
   # Should show: Mode: FTS-only (local, no API keys needed)
   ```

---

## 📖 Related Documentation

- [Memory System Analysis](../MEMORY_SYSTEM_ANALYSIS.md) - Technical details
- [Configuration Guide](../README.md#configuration) - Setup instructions
- [OpenClaw Reference](https://docs.openclaw.ai) - Original implementation

---

**Last Updated:** 2026-03-01  
**Version:** 1.0.0
