class UIController {
  constructor() {
    this.sidebar = null;
    this.progressBar = null;
    this.isDragging = false;
    this.dragOffset = { x: 0, y: 0 };
    this.messageProcessor = new MessageProcessor();
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
        <div class="whatsblitz-contacts" style="display: none;">
          <h4>Contacts to Process</h4>
          <div class="whatsblitz-contacts-list"></div>
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
          <button id="whatsblitz-clear" style="display: none;">Clear</button>
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
        max-height: calc(100vh - 100px);
        overflow-y: auto;
      }

      .whatsblitz-upload-area {
        border: 2px dashed #ccc;
        padding: 20px;
        text-align: center;
        border-radius: 8px;
        margin-bottom: 16px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .whatsblitz-upload-area:hover,
      .whatsblitz-upload-area.drag-over {
        border-color: #25D366;
        background: #f0f8f0;
      }

      .whatsblitz-contacts {
        margin: 16px 0;
      }

      .whatsblitz-contacts h4 {
        margin: 0 0 8px;
        color: #666;
      }

      .whatsblitz-contacts-list {
        max-height: 200px;
        overflow-y: auto;
        border: 1px solid #eee;
        border-radius: 4px;
      }

      .whatsblitz-contact-item {
        padding: 8px;
        border-bottom: 1px solid #eee;
        font-size: 14px;
      }

      .whatsblitz-contact-item:last-child {
        border-bottom: none;
      }

      .whatsblitz-contact-name {
        font-weight: bold;
      }

      .whatsblitz-contact-phone {
        color: #666;
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
        transition: all 0.3s ease;
      }

      .whatsblitz-controls button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      #whatsblitz-start {
        background: #25D366;
        color: white;
      }

      #whatsblitz-stop {
        background: #ff4444;
        color: white;
        display: none;
      }

      #whatsblitz-clear {
        background: #f0f0f0;
        color: #666;
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

    // File upload handling
    const dropZone = document.getElementById('whatsblitz-drop-zone');
    const fileInput = document.getElementById('whatsblitz-file-input');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      
      const file = e.dataTransfer.files[0];
      if (file) {
        await this.handleFileUpload(file);
      }
    });

    fileInput.addEventListener('change', async () => {
      const file = fileInput.files[0];
      if (file) {
        await this.handleFileUpload(file);
      }
    });

    // Minimize functionality
    const minimizeBtn = this.sidebar.querySelector('.whatsblitz-minimize');
    const content = this.sidebar.querySelector('.whatsblitz-content');
    
    minimizeBtn.addEventListener('click', () => {
      content.style.display = content.style.display === 'none' ? 'block' : 'none';
      minimizeBtn.textContent = content.style.display === 'none' ? '□' : '_';
    });

    // Start/Stop buttons
    const startBtn = document.getElementById('whatsblitz-start');
    const stopBtn = document.getElementById('whatsblitz-stop');
    const clearBtn = document.getElementById('whatsblitz-clear');

    startBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'START_SENDING' });
      startBtn.style.display = 'none';
      stopBtn.style.display = 'block';
      stopBtn.disabled = false;
      clearBtn.style.display = 'none';
    });

    stopBtn.addEventListener('click', () => {
      chrome.runtime.sendMessage({ type: 'STOP_SENDING' });
      stopBtn.style.display = 'none';
      startBtn.style.display = 'block';
      clearBtn.style.display = 'block';
      this.showNotification('Message sending stopped', 'error');
    });

    clearBtn.addEventListener('click', () => {
      this.messageProcessor.clearContacts();
      this.resetUI();
    });

    // Progress updates
    document.addEventListener('whatsblitz_progress', (e) => {
      this.updateProgress(e.detail);
    });

    // Notification handling
    document.addEventListener('whatsblitz_notification', (e) => {
      this.showNotification(e.detail, 'success');
    });
  }

  async handleFileUpload(file) {
    try {
      const result = await this.messageProcessor.processFile(file);
      
      if (result.success) {
        this.showContacts(result.contacts);
        this.showNotification(result.message, 'success');
        document.getElementById('whatsblitz-start').disabled = false;
        document.getElementById('whatsblitz-clear').style.display = 'block';
      } else {
        this.showNotification(result.message, 'error');
      }
    } catch (error) {
      this.showNotification(error.message, 'error');
    }
  }

  showContacts(contacts) {
    const contactsList = this.sidebar.querySelector('.whatsblitz-contacts-list');
    const contactsSection = this.sidebar.querySelector('.whatsblitz-contacts');
    
    contactsList.innerHTML = contacts.map(contact => `
      <div class="whatsblitz-contact-item">
        <div class="whatsblitz-contact-name">${contact.name}</div>
        <div class="whatsblitz-contact-phone">${contact.phone}</div>
      </div>
    `).join('');

    contactsSection.style.display = 'block';
  }

  resetUI() {
    const contactsSection = this.sidebar.querySelector('.whatsblitz-contacts');
    const progressSection = this.sidebar.querySelector('.whatsblitz-progress');
    const startBtn = document.getElementById('whatsblitz-start');
    const stopBtn = document.getElementById('whatsblitz-stop');
    const clearBtn = document.getElementById('whatsblitz-clear');

    contactsSection.style.display = 'none';
    progressSection.style.display = 'none';
    startBtn.disabled = true;
    startBtn.style.display = 'block';
    stopBtn.style.display = 'none';
    clearBtn.style.display = 'none';
    this.showNotification('', '');
  }

  updateProgress(progress) {
    const progressBar = this.sidebar.querySelector('.whatsblitz-progress');
    const progressFill = this.sidebar.querySelector('.whatsblitz-progress-fill');
    const progressText = this.sidebar.querySelector('.whatsblitz-progress-text');

    progressBar.style.display = 'block';
    progressFill.style.width = `${progress}%`;
    progressText.textContent = `${progress}%`;

    if (progress === 100) {
      document.getElementById('whatsblitz-stop').style.display = 'none';
      document.getElementById('whatsblitz-start').style.display = 'block';
      document.getElementById('whatsblitz-clear').style.display = 'block';
    }
  }

  showNotification(message, type) {
    const statusDiv = this.sidebar.querySelector('.whatsblitz-status');
    
    if (!message) {
      statusDiv.style.display = 'none';
      return;
    }

    statusDiv.textContent = message;
    statusDiv.className = 'whatsblitz-status';
    if (type) statusDiv.classList.add(type);
    statusDiv.style.display = 'block';
  }
}

// Initialize UI controller
const uiController = new UIController();
uiController.initialize();
