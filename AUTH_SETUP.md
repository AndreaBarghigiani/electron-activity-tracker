# Authentication Setup

Your Electron app now has full authentication integrated with your Next.js web app!

## Features ✨

- **Secure Login**: Email/password authentication via Better Auth
- **Persistent Sessions**: Auto-login on app restart with encrypted token storage
- **Session Validation**: Automatic session check on startup
- **Logout**: Clear credentials and restart app
- **Modern UI**: Beautiful login window with loading states

## How It Works

1. **First Launch**: Login window appears
2. **Credentials**: Enter email/password from your Next.js app
3. **Authentication**: Calls `/api/auth/sign-in/email` on your web app
4. **Token Storage**: Securely stores session token using `electron-store` with encryption
5. **Auto-login**: On next launch, validates existing session automatically
6. **Tracking Starts**: After successful auth, activity tracking begins

## Configuration

### Development
In `.env`, set:
```bash
AUTH_API_URL=http://localhost:3000
```

Make sure your Next.js app is running on `http://localhost:3000`

### Production
When deployed, update `.env` to:
```bash
AUTH_API_URL=https://trackoptimizer.app
```

## Testing

### 1. Start your Next.js app
```bash
cd /Volumes/Dati/coding/projects/activity-tracker
npm run dev
```

### 2. Start the Electron app
```bash
cd /Volumes/Dati/coding/projects/electron-activity-tracker
npm start
```

### 3. Login
- Enter credentials from your Next.js app
- Click "Sign In"
- Login window closes automatically on success
- Activity tracking starts

### 4. Test Auto-login
- Quit the Electron app
- Restart it with `npm start`
- Should automatically validate session and start tracking (no login window)

### 5. Test Logout
- Right-click tray icon
- Select "Logout"
- App restarts and shows login window

## Tray Menu

The tray menu now shows:
- 🧠 Activity Tracker
- 👤 Logged in user email
- 📊 Total Records
- ⏳ Unsynced records
- 💾 Database file
- Sync Now
- **Logout** (new!)
- Quit

## Security

- Session tokens stored with encryption via `electron-store`
- Tokens never exposed in logs or console
- Automatic session validation on startup
- Logout clears all stored credentials

## Files Added

```
src/auth/
├── authManager.js    # Authentication logic & API calls
├── login.html        # Login window UI
├── login.css         # Styling
└── login.js          # Form handling
```

## API Endpoints Used

- `POST /api/auth/sign-in/email` - Login
- `GET /api/auth/get-session` - Validate session

Both endpoints are provided by Better Auth in your Next.js app.

## Troubleshooting

### "Could not connect to server"
- Make sure Next.js app is running
- Check `AUTH_API_URL` in `.env`
- Verify no CORS issues (shouldn't be an issue with Electron)

### "Invalid email or password"
- Verify credentials work on web app first
- Check if email is verified (if required by Better Auth)

### Session keeps expiring
- Better Auth uses 5-minute cookie cache
- Session is validated on startup
- If expired, login window appears automatically

### Clear stored data
Delete auth data manually:
```bash
rm -rf ~/Library/Application\ Support/activity-tracker/auth-data.json
```

## Next Steps

When deploying to production:
1. Update `AUTH_API_URL` to `https://trackoptimizer.app`
2. Consider adding better encryption key (currently hardcoded)
3. Package app with `npm run package:mac`
4. Test with production API

Enjoy your authenticated activity tracker! 🎉
