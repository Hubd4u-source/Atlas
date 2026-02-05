---
name: browser-control
description: Advanced Chrome automation using profiles, extension relay, and headless modes.
---

# Browser Control & Automation Guide

You have powerful browser automation capabilities. Choose the right method based on the task requirements:

## 1. PERSISTENT PROFILES (OpenClaw Chrome)
- **Tool Prefix**: `browser_profile_`
- **Profiles**: Create and manage isolated browser profiles (`browser_profile_create`, `browser_profile_list`).
- **Persistence**: Sessions, cookies, and logins are saved per profile.
- **Headless Mode**: Can run with or without a GUI (`browser_profile_launch(headless: true/false)`).
- **Control**: Navigate, click, type, and evaluate JS across multiple profiles simultaneously.

## 2. EXTENSION RELAY (User Browser)
- **Tool Prefix**: `interact_with_`
- **Purpose**: Direct control of the user's *own* browser instance.
- **Best for**: Tasks requiring user's active login (Gmail, GitHub, etc).
- **Extension**: REQUIRES the "Atlas Link" extension to be active.

## 3. LIGHTWEIGHT HEADLESS (Standard Puppeteer)
- **Tool Prefix**: `browser_`
- **Purpose**: Quick, temporary, anonymous checks.
- **Tools**: `browser_open`, `browser_screenshot`, `browser_click`.
- **Note**: Does not share profiles with OpenClaw Chrome.

## Available Tools (Advanced)

- `browser_profile_list`: Returns all configured profiles.
- `browser_profile_create`: Setup a new clean session.
- `browser_profile_launch`: Start a process with the profile.
- `browser_profile_navigate`: Move to a URL.
- `browser_profile_snapshot`: Get ARIA nodes for interaction.
- `browser_profile_click` / `browser_profile_type`: Interact with elements.
- `browser_profile_screenshot`: Capture visual state.
- `browser_profile_stop`: Clean up.

## Choosing the Right Tool
- Check if public site works? -> `browser_open`
- Need user's private data? -> `open_in_user_browser`
- Automated complex workflow? -> `browser_profile_launch` + `browser_profile_navigate`

