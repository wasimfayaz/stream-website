# StreaamSync: Real-Time Synced Video Playback Platform

StreaamSync is a premium watch-party platform designed for couples to stream movies and videos in perfect synchronization. It features synchronized HTML5 video player controls, a direct URL stream box, a local drag-and-drop file watch option, a live text chat room, and floating emoji reaction animations.

---

## 🚀 Key Features

*   **Synchronized Video Playback**: Real-time play, pause, and scrubber seeking coordination between viewers using custom HTML5 video controls.
*   **Dual-Loop Prevention Engine**: Separates user-triggered playback events from programmatic socket-triggered updates, completely avoiding infinite play-pause event recursion.
*   **Zero-Server-Bandwidth Local File Sync**: Allows users to watch high-quality local movie files (from their hard drives) together by dragging the same file into the page. The app creates a local object URL and synchronizes playback states without uploading a single byte to the server.
*   **Curated Movie Library**: Includes out-of-the-box streaming links for open-source cinema classics like *Sintel*, *Tears of Steel*, *Big Buck Bunny*, and *Cosmos Laundromat*.
*   **Custom URL Streaming**: Accept direct HTTP video links (.mp4, .webm, HLS .m3u8, etc.) to project external movie streams for both viewers instantly.
*   **Real-time Chat & Notifications**: A dedicated message board containing text bubbles and automated system status notifications (e.g. *"Alice paused the video"*, *"Bob joined"*).
*   **Floating Emoji Reactions**: Users can click reaction emojis (❤️, 😂, 😮, 🔥, 🍿, 😢) in the tray, triggering floating animations that rise and drift upward across the video player on all connected screens in real-time.

---

## 🛠️ Tech Stack & File Structure

The project has a unified structure:

```text
/home/wxm/Documents/streaam/
├── package.json              # Root package script runner
├── server.js                 # Express backend & Socket.io coordinator
└── client/                   # Vite React Frontend
    ├── package.json          # Frontend dependencies
    ├── index.html            # Core HTML entrypoint
    ├── vite.config.js        # Vite config
    └── src/
        ├── main.jsx          # React app mounter
        ├── App.jsx           # Lobby view, Watch Party Room, and Custom Player
        ├── App.css           # Empty (unused to prevent style overrides)
        └── index.css         # Modern dark-mode neon design system
```

---

## ⚙️ How to Run Locally

### 1. Dev Mode (Hot Reload)

In development, the server and client run concurrently on separate ports:
*   **Backend**: `http://localhost:5000` (Socket.io)
*   **Frontend**: `http://localhost:5173` (Vite)

To start the dev environment, run this command in the project root:
```bash
npm run dev
```

### 2. Production Mode (Single Port)

In production, the Express server builds the React app and serves it statically on a single port:
*   **Unified App Port**: `http://localhost:5000`

To build and run in production:
```bash
# Compile client assets into client/dist
npm run build

# Start the Node.js production server
npm start
```

---

## ⚡ Technical Highlights

### Avoiding Playback Sync Recursion
Typically, sync players face infinite loops: User A plays $\rightarrow$ Server emits play to User B $\rightarrow$ User B's video starts playing $\rightarrow$ User B's listener triggers play socket emission $\rightarrow$ Server emits play to User A $\rightarrow$ Infinite recursion.

StreaamSync solves this by using custom HTML5 player buttons. The play/pause and scrubber seek states only emit socket updates inside **user-initiated input event handlers** (like button clicks, range slider `onMouseUp`), and **never** bind to internal HTML5 video triggers (`onPlay`, `onPause`). Programmatic socket updates directly mutate the HTML5 video ref without touching user input triggers, making the synchronization 100% loop-immune and ultra-lightweight.

### Instant Invite Links
When a user creates a watch party, the room code (e.g., `4973KQ`) is automatically appended to the URL query string:
`http://localhost:5173/?room=4973KQ`

Clicking the **Copy Link** icon copies this URL. When the recipient opens the link, the room code is automatically parsed and filled into the "Join Party" form, so they only need to enter their username and click join to start streaming.


---

## ☁️ Deployment & Free Local Tunneling Guidelines (How to Host Online)

Because the watch party features rely on **Socket.io WebSockets**, the backend requires a **persistent running server** (like Node.js/Express). 

Vercel is a **serverless** platform, meaning backend functions spin down when inactive, so **WebSockets (Socket.io) do not work on Vercel**. 

Here is how you can host the website for **free**, including streaming your local files directly to your partner!

---

### Option A: Local Tunneling (100% Free, Direct Local File Streaming)
If you have video files downloaded on your hard drive, you can run the app locally, open a free secure tunnel, and share the link with your partner. Your partner will stream the video files **directly from your computer** in real-time, completely free of charge.

1.  **Start the server locally** on your computer:
    ```bash
    # Build client assets
    npm run build
    
    # Start the Express server (running on http://localhost:5000)
    npm start
    ```
2.  **Open a Free Tunnel** (Choose one of the following methods in a new terminal window):
    *   **Method 1: Localtunnel** (Signup-free, install-free):
        ```bash
        npx localtunnel --port 5000
        ```
        This will output a public link (e.g., `https://slimy-ducks-go.loca.lt`).
        *(Note: The first time your partner opens this link, they may need to enter your public IP address to verify, which is printed in your terminal or checkable on whatsmyip.org).*
    *   **Method 2: Pinggy** (No signup, uses built-in SSH):
        ```bash
        ssh -R 80:localhost:5000 a.pinggy.io
        ```
        This yields an immediate secure public URL.
    *   **Method 3: ngrok** (Free, requires token):
        ```bash
        ngrok http 5000
        ```
3.  **Share the link**: Send the tunnel link to your partner. When they open it, they will connect to your local server.
4.  **Select a Local File**: Go to the **Local Sync File** tab, drag & drop or select your movie file. It uploads instantly to your local running server (takes ~1s on localhost) and streams to your partner directly from your hard drive!

---

### Option B: All-in-One Deployment (Cloud Hosting)
Deploy the entire project to a hosting provider that supports persistent Node.js servers, such as **Render** (free tier), **Railway**, or **Fly.io**.

1.  Connect your GitHub repository to **Render** and create a **Web Service**.
2.  Set the following configuration values:
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
3.  Once deployed, Render will provide a single URL (e.g., `https://streaam.onrender.com`). Note that if you use cloud hosting, local files will upload to the cloud server, which might have upload limits or bandwidth lags depending on your internet connection. (Local Tunneling is highly recommended for personal local files).

---

### Option C: Split Deployment (Vercel + Render)
If you want to host the frontend on **Vercel** for fast edge loading, and host the WebSocket server on **Render**:

1.  **Deploy Backend on Render**:
    *   Create a Render **Web Service** using this repository.
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
    *   Note your backend URL (e.g., `https://streaam-backend.onrender.com`).
2.  **Deploy Frontend on Vercel**:
    *   Create a Vercel project, pointing to the `client/` subdirectory of this repository.
    *   In Vercel's Environment Variables settings, add:
        *   `VITE_WS_URL`: `https://your-backend-url.onrender.com` (replace with your Render URL).
    *   Deploy! The Vercel frontend will now communicate directly with the Render WebSocket server.


