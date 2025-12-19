<h1>Scalable ChatApp</h1>
<br>
<p>A <strong>real-time, scalable chat application</strong> built with <strong>Node.js, Socket.IO, Redis, and MongoDB</strong>. Designed for low-latency messaging and real-time user presence tracking.</p>
<p><strong>Live Demo:</strong> <a href="https://scalable-chat-app-three.vercel.app" target="_blank">https://scalable-chat-app-three.vercel.app</a></p>
<br>
<h2>Tech Stack</h2>
<br>
<ul>
  <li><strong>Backend:</strong> Node.js, Express</li>
  <li><strong>Real-time Communication:</strong> Socket.IO</li>
  <li><strong>Database:</strong> MongoDB (Mongoose)</li>
  <li><strong>Cache:</strong> Redis (online/offline presence)</li>
  <li><strong>Frontend:</strong> React</li>
  <li><strong>Deployment:</strong> Vercel (frontend), Render (backend)</li>
</ul>

<h2>Key Features</h2>
<ul>
  <li>Real-time messaging between users</li>
  <li>Typing Indicators</li>
  <li>Timestamp for each msg</li>
  <li>Online/offline presence tracking using Redis</li>
  <li>Persistent message storage in MongoDB</li>
  <li>Scalable architecture ready for multiple Socket.IO instances</li>
</ul>


<h2>Architecture Overview</h2>
<img src="/assets/Architecture-Diagram.png" alt="Architecture Diagram">
<ul>
  <li><strong>Redis for Presence:</strong> Fast, in-memory storage for ephemeral user status. Reduces database writes and latency.</li>
  <li><strong>Socket.IO:</strong> Simplifies event handling, automatic reconnections, and room management.</li>
  <li><strong>MongoDB:</strong> Reliable storage for messages while separating ephemeral presence state.</li>
</ul>

<h2>WorkFlow</h2>
<ol>
  <li>User connects → Socket.IO handshake</li>
  <li>Redis updates online presence</li>
  <li>Messages are broadcast via Socket.IO and stored in MongoDB</li>
  <li>Redis broadcasts presence updates to all connected clients</li>
  <li>Disconnections handled; presence rebuilds on reconnect</li>
</ol>

<h2>Design Decisions & Trade-offs</h2>
<ul>
  <li><strong>Redis for Presence:</strong> Chosen for speed and efficiency. Avoids hitting the main database for temporary state.</li>
  <li><strong>Socket.IO over WebSockets:</strong> Easier to manage rooms, events, and reconnections.</li>
  <li><strong>MongoDB for Persistence:</strong> Ensures message history is stored reliably, separating ephemeral vs permanent data.</li>
</ul>

<br>
<br>
<br>
      <li>Horizontal scaling with Redis Pub/Sub for multiple server instances</li>
    </ul>
  </section>
