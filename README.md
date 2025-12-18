<h1 style="margin: auto">Scalable-ChatApp<h1>

A real-time, scalable chat application built with Node.js, Socket.IO, Redis, and MongoDB. Designed for low-latency messaging and user presence tracking.

<h3>Live Demo: https://scalable-chat-app-three.vercel.app/<h3>

<h2>Tech Stack<h2>

Backend: Node.js, Express

Real-time Communication: Socket.IO

Database: MongoDB (with Mongoose)

Cache: Redis (online/offline presence)

Frontend: React

Deployment: Vercel (frontend), Render (backend)

<h2>Key Features<h2>

<ul>
<li>Real-time messaging between users</li>
<li>Online/offline presence tracking using Redis</li>
<li>Persistent message storage in MongoDB</li>
<li>Scalable architecture ready for multiple Socket.IO instances</li>
</ul>

<h2>Architecture Overview</h2>
<img src="/assets/Architecture-Diagram.png">

<h2>Design Decisions & Trade-offs</h2>

Redis for Presence:
Fast, in-memory store for ephemeral user status. Avoids unnecessary DB writes and reduces latency.

Socket.IO over raw WebSockets:
Simplifies event handling, automatic reconnections, and room management.

MongoDB for Persistence:
Stores messages reliably while separating ephemeral presence state.

<h2>How It Works</h2>

User connects → Socket.IO handshake

Redis updates online presence

Messages are broadcasted via Socket.IO and stored in MongoDB

Redis broadcasts presence updates to all connected clients

Disconnections handled; presence rebuilds on reconnect
