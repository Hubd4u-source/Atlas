# High-Speed Browser Automation Guide

## 🚀 Speed Principles
To complete tasks like Amazon shopping or YouTube playback efficiently, follow these high-speed patterns:

### 1. Direct Navigation (Bypass Homepages)
Never search from a homepage if you can construct a direct Search URL. This saves multiple tool calls.

- **Amazon Search**: `https://www.amazon.com/s?k=SEARCH_QUERY`
- **YouTube Search**: `https://www.youtube.com/results?search_query=SEARCH_QUERY`
- **GitHub Search**: `https://github.com/search?q=SEARCH_QUERY`

### 2. High-Speed Interaction Patterns
Instead of using `user_browser_inspect` for every step, use `user_browser_script` to perform multiple actions or find elements using robust selectors.

#### YouTube Auto-Play Pattern
```javascript
// Navigate directly to result and play
const playButton = document.querySelector('.ytp-play-button');
if (playButton && playButton.getAttribute('title').includes('Play')) {
    playButton.click();
}
```

#### Amazon One-Click Add Pattern
```javascript
// Direct Add to Cart from Search Result
const addBtn = document.querySelector('#a-autoid-1-announce, [id^="a-autoid-"][id$="-announce"]');
if (addBtn) addBtn.click();
```

### 3. Smart Waiting
Avoid fixed sleep. Use `user_browser_script` with a small polling loop if you need to wait for a specific element to appear, instead of making multiple tool calls.

---

## 🏗️ Site-Specific Quick Reference

| Site | Goal | Fast Pattern |
|------|------|--------------|
| Amazon | Add to Cart | Navigate to `s?k=...` -> Use `user_browser_click` on first `add-to-cart` button. |
| YouTube | Play Video | Navigate to `results?search_query=...` -> Click first video title -> Verify play status. |
| GitHub | Star Repo | Navigate directly to `user/repo` -> Click `input[value="Star"]`. |

**Golden Rule**: If you know the URL structure, go there directly. If you know the selector, act immediately.
