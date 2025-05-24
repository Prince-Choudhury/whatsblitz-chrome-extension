// Load dependencies
async function loadScript(src) {
  const scriptURL = chrome.runtime.getURL(src);
  const script = document.createElement('script');
  script.src = scriptURL;
  script.type = 'text/javascript';
  return new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Load all required scripts
Promise.all([
  loadScript('lib/xlsx.full.min.js'),
  loadScript('content/ui-controller.js'),
  loadScript('content/message-processor.js')
]).then(() => {
  console.log('WhatsBlitz: All scripts loaded');
}).catch(error => {
  console.error('WhatsBlitz: Error loading scripts:', error);
});

class WhatsAppController {
  constructor() {
    this.isProcessing = false;
    this.currentProgress = 0;
    this.messageQueue = [];
  }

  async initialize() {
    // Wait for WhatsApp Web to load completely
    await this.waitForElement('[data-testid="search"]');
  }

  async searchContact(phoneNumber) {
    const searchBox = document.querySelector('[data-testid="search"]');
    if (!searchBox) throw new Error('Search box not found');

    // Clear existing search
    searchBox.click();
    searchBox.value = '';
    const inputEvent = new Event('input', { bubbles: true });
    searchBox.dispatchEvent(inputEvent);

    // Enter phone number
    searchBox.value = phoneNumber;
    searchBox.dispatchEvent(inputEvent);

    // Wait for search results
    await this.sleep(2000);

    // Click the first chat result
    const chatElement = await this.waitForElement(`[title*="${phoneNumber}"]`);
    if (!chatElement) throw new Error('Contact not found');
    chatElement.click();

    // Wait for chat to load
    await this.sleep(1000);
  }

  async sendMessage(message) {
    const messageBox = document.querySelector('[data-testid="conversation-compose-box-input"]');
    if (!messageBox) throw new Error('Message box not found');

    // Type message
    messageBox.textContent = message;
    messageBox.dispatchEvent(new Event('input', { bubbles: true }));

    await this.sleep(500);

    // Click send button
    const sendButton = document.querySelector('[data-testid="send"]');
    if (!sendButton) throw new Error('Send button not found');
    sendButton.click();

    // Wait for message to be sent
    await this.sleep(1000);
  }

  async processMessage(contact) {
    try {
      await this.searchContact(contact.phone);
      
      // Replace template variables
      let message = contact.message;
      Object.keys(contact).forEach(key => {
        message = message.replace(new RegExp(`{{${key}}}`, 'g'), contact[key]);
      });

      await this.sendMessage(message);
      
      // Log success
      this.logMessage({
        phone: contact.phone,
        name: contact.name,
        status: 'success',
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Log error
      this.logMessage({
        phone: contact.phone,
        name: contact.name,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      return false;
    }
  }

  async startProcessing(contacts) {
    if (this.isProcessing) return;
    this.isProcessing = true;
    this.currentProgress = 0;
    this.messageQueue = [...contacts];

    while (this.messageQueue.length > 0 && this.isProcessing) {
      const contact = this.messageQueue.shift();
      await this.processMessage(contact);
      
      // Update progress
      this.currentProgress = Math.round(((contacts.length - this.messageQueue.length) / contacts.length) * 100);
      this.updateProgress(this.currentProgress);

      // Random delay between messages (5-15 seconds)
      const delay = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
      await this.sleep(delay);
    }

    this.isProcessing = false;
    if (this.currentProgress === 100) {
      this.showNotification('All messages sent successfully!');
    }
  }

  stopProcessing() {
    this.isProcessing = false;
    this.messageQueue = [];
  }

  // Helper methods
  async waitForElement(selector, timeout = 5000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const element = document.querySelector(selector);
      if (element) return element;
      await this.sleep(100);
    }
    return null;
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  logMessage(data) {
    const history = JSON.parse(localStorage.getItem('whatsblitz_history') || '[]');
    history.push(data);
    localStorage.setItem('whatsblitz_history', JSON.stringify(history));
  }

  updateProgress(progress) {
    // This will be implemented in ui-controller.js
    document.dispatchEvent(new CustomEvent('whatsblitz_progress', { detail: progress }));
  }

  showNotification(message) {
    // This will be implemented in ui-controller.js
    document.dispatchEvent(new CustomEvent('whatsblitz_notification', { detail: message }));
  }
}

// Initialize controller
const whatsAppController = new WhatsAppController();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PROCESS_FILE') {
    // Handle file processing (will be implemented in message-processor.js)
  } else if (request.type === 'START_SENDING') {
    const contacts = JSON.parse(localStorage.getItem('whatsblitz_contacts') || '[]');
    whatsAppController.startProcessing(contacts);
  } else if (request.type === 'STOP_SENDING') {
    whatsAppController.stopProcessing();
  }
});
