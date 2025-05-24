class UIController {
  constructor() {
    this.sidebar = null;
    this.progressBar = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
  }

  initialize() {
    this.createSidebar();
    this.initializeEventListeners();
  }

  createSidebar() {
    // Create sidebar container
    this.sidebar = document.createElement('div');
    this.sidebar.id = 'whatsblitz-sidebar';
    this.sidebar.innerHTML = `
      <div class="whatsblitz-header">
        <h3>WhatsBlitz</h3>
        <button class="whatsblitz-minimize">_</button>
      </div>
      <div class="whatsblitz-content">
        <div class="whatsblitz-upload-area" id="whatsblitz-drop-zone">
          <p>Drop Excel file here<br>or click to browse</p>
          <input type="file" id="whatsblitz-file-input" accept=".xlsx,.csv" style="display: none;">
        </div>
        <div class="whatsblitz-progress" style="display: none;">
          <div class="whatsblitz-progress-bar">
            <div class="whatsblitz-progress-fill"></div>
          </div>
          <p class="whatsblitz-progress-text">0%</p>
        </div>
        <div class="whatsblitz-controls">
          <button id="whatsblitz-start" disabled>Start Sending</button>
          <button id="whatsblitz-stop" disabled>Stop</button>
        </div>
        <div class="whatsblitz-status"></div>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      #whatsblitz-sidebar {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        z-index: 9999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      .whatsblitz-header {
        padding: 12px;
        background: #25D366;
        color: white;
        border-radius: 8px 8px 0 0;
        cursor: move;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .whatsblitz-header h3 {
        margin: 0;
        font-size: 16px;
      }

      .whatsblitz-minimize {
        background: none;
        border: none;
        color: white;
        cursor: pointer;
      }

      .whatsblitz-content {
        padding: 16px;
      }

      .whatsblitz-upload-area {
        border: 2px dashed #ccc;
        padding: 20px;
        text-align: center;
        border-radius: 8px;
        margin-bottom: 16px;
        cursor: pointer;
      }

      .whatsblitz-upload-area:hover {
        border-color: #25D366;
        background: #f0f8f0;
      }

      .whatsblitz-progress {
        margin: 16px 0;
      }

      .whatsblitz-progress-bar {
        height: 8px;
        background: #eee;
        border-radius: 4px;
        overflow: hidden;
      }

      .whatsblitz-progress-fill {
        height: 100%;
        background: #25D366;
        width: 0%;
        transition: width 0.3s ease;
      }

      .whatsblitz-progress-text {
        text-align: center;
        margin: 8px 0;
        color: #666;
      }

      .whatsblitz-controls {
        display: flex;
        gap: 8px;
      }

      .whatsblitz-controls button {
        flex: 1;
        padding: 8px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-weight: bold;
      }

      #whatsblitz-start {
        background: #25D366;
        color: white;
      }

      #whatsblitz-start:disabled {
        background: #ccc;
        cursor: not-allowed;
      }

      #whatsblitz-stop {
        background: #ff4444;
        color: white;
        display: none;
      }

      .whatsblitz-status {
        margin-top: 16px;
        padding: 8px;
        border-radius: 4px;
        display: none;
      }

      .whatsblitz-status.error {
        background: #ffebee;
        color: #c62828;
      }

      .whatsblitz-status.success {
        background: #e8f5e9;
        color: #2e7d32;
      }
    `;

    document.head.appendChild(styles);
    document.body.appendChild(this.sidebar);
  }

  initializeEventListeners() {
    // Drag functionality
    const header = this.sidebar.querySelector('.whatsblitz-header');
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('whatsblitz-minimize')) return;
      
      this.isDragging = true;
      const rect = this.sidebar.getBoundingClientRect();
      this.dragOffset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;

      const x = e.clientX - this.dragOffset.x;
      const y = e.clientY - this.dragOffset.y;
      
      this.sidebar.style.left = `${Math.max(0, Math.min(window.innerWidth - 300, x))}px`;
      this.sidebar.style.top = `${Math.max(0, Math.min(window.innerHeight - 100, y))}px`;
    });

    document.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Minimize functionality
    const minimizeBtn = this.sidebar.querySelector('.whatsblitz-minimize');
    const content = this.sidebar.querySelector('.whatsblitz-content');
    
    minimizeBtn.addEventListener('click', () => {
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
      minimizeBtn.textContent = content.style.display === 'none' ? '□' : '_';
    });

    // Progress updates
    document.addEventListener('whatsblitz_progress', (e) => {
      this.updateProgress(e.detail);
    });

    // Notification handling
    document.addEventListener('whatsblitz_notification', (e) => {
      this.showNotification(e.detail, 'success');
    });

    // Start/Stop buttons
    const startBtn = document.getElementById('whatsblitz-start');
    const stopBtn = document.getElementById('whatsblitz-stop');

    startBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'START_SENDING' });
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      stopBtn.disabled = false;
    });

    stopBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'STOP_SENDING' });
      stopBtn.style.display = 'none';
      startBtn.style.display = 'block';
      this.showNotification('Message sending stopped', 'error');
    });
  }

  updateProgress(progress) {
    const progressBar = this.sidebar.querySelector('.whatsblitz-progress');
    const progressFill = this.sidebar.querySelector('.whatsblitz-progress-fill');
    const progressText = this.sidebar.querySelector('.whatsblitz-progress-text');

    progressBar.style.display = 'block';
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;

    if (progress === 100) {
      setTimeout(() => {
        progressBar.style.display = 'none';
        document.getElementById('whatsblitz-stop').style.display = 'none';
        document.getElementById('whatsblitz-start').style.display = 'block';
      }, 2000);
    }
  }

  showNotification(message, type) {
    const status = this.sidebar.querySelector('.whatsblitz-status');
    status.textContent = message;
    status.className = `whatsblitz-status ${type}`;
    status.style.display = 'block';

    setTimeout(() => {
      status.style.display = 'none';
    }, 5000);
  }
}

// Initialize UI
const uiController = new UIController();
uiController.initialize();
