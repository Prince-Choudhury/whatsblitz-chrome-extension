class WhatsAppController {
  constructor() {
    this.isProcessing = false;
    this.currentProgress = 0;
    this.messageQueue = [];
    this.messageProcessor = null;
    this.uiController = null;
    this.isInitialized = false;
    this.debugMode = true;
  }

  debug(message) {
    if (this.debugMode) {
      console.log(`WhatsBlitz Debug: ${message}`);
    }
  }

  async initialize() {
    try {
      if (this.isInitialized) {
        this.debug('Already initialized');
        return true;
      }

      this.debug('Starting initialization...');
      
      // Initialize components
      this.messageProcessor = new MessageProcessor();
      this.uiController = new UIController();

      this.isInitialized = true;
      this.debug('Basic initialization complete');
      return true;
    } catch (error) {
      console.error('WhatsBlitz: Error initializing:', error);
      return false;
    }
  }

  async ensureWhatsAppReady() {
    this.debug('Checking WhatsApp Web readiness...');
    
    // First check if we're on the main WhatsApp interface
    const mainInterface = await this.waitForAnyElement([
      '#side', // Side panel
      'div[data-testid="chat-list"]', // Chat list
      '[data-testid="drawer-left"]' // Alternative side panel
    ], 30000);

    if (!mainInterface) {
      throw new Error('WhatsApp Web interface not found - please ensure you are logged in');
    }

    // Try multiple possible selectors for the search box
    const searchBox = await this.waitForAnyElement([
      '[data-testid="search"]', // Primary search box
      '[data-testid="search-input"]', // Alternative search input
      'div[contenteditable="true"][title="Search input textbox"]', // Another possible search input
      'div[role="textbox"][title="Search contacts"]' // Generic search box
    ], 10000);

    if (!searchBox) {
      this.debug('Search box not found with standard selectors, trying alternative approach...');
      
      // Try to find any input or contenteditable div that might be the search box
      const possibleSearchBoxes = Array.from(document.querySelectorAll('div[contenteditable="true"], input[type="text"]'));
      this.debug(`Found ${possibleSearchBoxes.length} possible search inputs`);
      
      // Sort elements by their position (top to bottom, left to right)
      const sortedElements = possibleSearchBoxes.sort((a, b) => {
        const rectA = a.getBoundingClientRect();
        const rectB = b.getBoundingClientRect();
        if (Math.abs(rectA.top - rectB.top) < 50) { // If elements are roughly on the same line
          return rectA.left - rectB.left;
        }
        return rectA.top - rectB.top;
      });

      // Find the first element in the top-left area
      const searchElement = sortedElements.find(element => {
        const rect = element.getBoundingClientRect();
        return rect.top < 200 && rect.left < 400;
      });

      if (searchElement) {
        this.debug('Found potential search box by position');
        return searchElement;
      }
      
      throw new Error('Search box not found - WhatsApp Web might not be ready');
    }

    this.debug('WhatsApp Web interface is ready');
    return searchBox;
  }

  async waitForAnyElement(selectors, timeout = 30000) {
    this.debug(`Waiting for any element matching: ${selectors.join(', ')}`);
    
    return new Promise((resolve) => {
      // First check if any selector already matches
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          this.debug(`Element found immediately: ${selector}`);
          return resolve(element);
        }
      }

      const observer = new MutationObserver(() => {
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            this.debug(`Element found via observer: ${selector}`);
            observer.disconnect();
            return resolve(element);
          }
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });

      // Timeout handler
      setTimeout(() => {
        observer.disconnect();
        this.debug(`Timeout waiting for elements: ${selectors.join(', ')}`);
        resolve(null);
      }, timeout);
    });
  }

  async searchContact(phoneNumber) {
    try {
      this.debug(`Searching for contact: ${phoneNumber}`);

      // Ensure initialization and WhatsApp readiness
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          throw new Error('Failed to initialize WhatsBlitz');
        }
      }

      // Get the search box element
      const searchBox = await this.ensureWhatsAppReady();
      if (!searchBox) {
        throw new Error('Search box not found');
      }

      // Normalize phone number - remove any non-numeric characters except the last '+'
      const normalizedNumber = phoneNumber.startsWith('+') ? 
        phoneNumber : 
        phoneNumber.replace(/^(\d{2})/, '+$1');
      
      this.debug(`Normalized phone number: ${normalizedNumber}`);

      // Clear existing search and focus
      this.debug('Clearing existing search...');
      searchBox.click();
      await this.sleep(100);
      
      // Handle both input and contenteditable elements
      if (searchBox instanceof HTMLInputElement) {
        searchBox.value = '';
        searchBox.focus();
        await this.sleep(100);
        searchBox.value = normalizedNumber;
      } else {
        // For contenteditable divs
        searchBox.textContent = '';
        searchBox.focus();
        await this.sleep(100);

        // Set the content directly first
        searchBox.textContent = normalizedNumber;
        
        // Dispatch input event
        searchBox.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: normalizedNumber
        }));
      }

      // Ensure the search is triggered
      searchBox.dispatchEvent(new Event('input', { bubbles: true }));
      searchBox.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Wait for search results
      await this.sleep(2000);

      // Try to find contact with multiple possible selectors
      this.debug('Looking for contact in search results...');
      let chatElement = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!chatElement && attempts < maxAttempts) {
        // Generate all possible phone number formats
        const phoneVariations = [
          normalizedNumber,                              // e.g., +917066259546
          normalizedNumber.replace('+', ''),             // e.g., 917066259546
          normalizedNumber.replace(/[^0-9]/g, ''),      // e.g., 917066259546
          normalizedNumber.slice(1),                     // e.g., 917066259546
          normalizedNumber.slice(3),                     // e.g., 7066259546
          `0${normalizedNumber.slice(3)}`,              // e.g., 07066259546
          normalizedNumber.replace(/^\+\d{2}/, '')      // e.g., 7066259546
        ];

        this.debug(`Trying phone variations: ${JSON.stringify(phoneVariations)}`);

        for (const phone of phoneVariations) {
          // Try to find elements containing the phone number
          const selectors = [
            `[title*="${phone}"]`,
            `span[title*="${phone}"]`,
            `div[title*="${phone}"]`,
            `[aria-label*="${phone}"]`,
            '[data-testid="cell-frame-title"]',
            'span.selectable-text.copyable-text',
            'div[role="gridcell"]',
            'div[role="row"]'
          ];

          chatElement = await this.waitForAnyElement(selectors, 2000);

          if (chatElement) {
            // Get all text content from the element and its children
            const elementText = chatElement.textContent || 
                              chatElement.innerText || 
                              chatElement.getAttribute('title') || '';
            
            this.debug(`Found element with text: ${elementText}`);

            // Check if any phone variation matches
            if (phoneVariations.some(p => elementText.includes(p))) {
              this.debug(`Matched phone number in element text`);
              break;
            } else {
              // Check parent elements
              let parent = chatElement.parentElement;
              let found = false;
              for (let i = 0; i < 3 && parent; i++) {
                const parentText = parent.textContent || parent.innerText || '';
                if (phoneVariations.some(p => parentText.includes(p))) {
                  chatElement = parent;
                  found = true;
                  this.debug(`Found matching number in parent element`);
                  break;
                }
                parent = parent.parentElement;
              }
              if (found) break;
              chatElement = null;
            }
          }
        }

        if (!chatElement) {
          this.debug(`Retry ${attempts + 1}/${maxAttempts} for contact`);
          await this.sleep(1000);
          attempts++;
        }
      }

      if (!chatElement) {
        this.debug('Contact not found after all attempts');
        throw new Error('Contact not found');
      }

      // Click the chat element
      this.debug('Opening chat...');
      chatElement.click();
      await this.sleep(1000);

      // Verify chat is opened
      const messageInput = await this.waitForAnyElement([
        '[data-testid="conversation-compose-box-input"]',
        'div[contenteditable="true"][title="Type a message"]',
        'div[role="textbox"]'
      ], 5000);

      if (!messageInput) {
        throw new Error('Failed to open chat - message input not found');
      }

      return true;
    } catch (error) {
      this.debug(`Error in searchContact: ${error.message}`);
      throw error;
    }
  }

  async sendMessage(message) {
    try {
      this.debug('Preparing to send message');

      // Find message input with multiple possible selectors
      const messageBox = await this.waitForAnyElement([
        '[data-testid="conversation-compose-box-input"]',
        'div[contenteditable="true"][title="Type a message"]',
        'div[role="textbox"]',
        'div[contenteditable="true"]'
      ], 5000);

      if (!messageBox) {
        throw new Error('Message input not found');
      }

      // Clear existing content and focus
      this.debug('Clearing message box...');
      messageBox.focus();
      messageBox.textContent = '';
      await this.sleep(100);

      // Set message content
      this.debug('Setting message content...');
      messageBox.textContent = message;
      
      // Dispatch necessary events
      messageBox.dispatchEvent(new Event('input', { bubbles: true }));
      messageBox.dispatchEvent(new Event('change', { bubbles: true }));

      // Wait for Enter key to be enabled
      await this.sleep(1000);

      // Try sending with Enter key first
      this.debug('Attempting to send with Enter key...');
      messageBox.dispatchEvent(new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      }));

      await this.sleep(500);

      // If Enter key didn't work, try finding and clicking send button
      const lastMessage = await this.waitForAnyElement([
        'span[data-testid="msg-check"]',
        'span[data-icon="msg-check"]',
        'span[aria-label="Sent"]',
        'span[data-icon="msg-time"]'
      ], 2000);

      if (!lastMessage) {
        this.debug('Enter key did not work, trying send button...');
        
        // Find send button with multiple approaches
        let sendButton = await this.waitForAnyElement([
          '[data-testid="send"]',
          'button[aria-label="Send"]',
          'span[data-icon="send"]',
          'button[title="Send message"]',
          '[data-icon="send"]',
          '[aria-label*="Send"]'
        ], 5000);

        if (!sendButton) {
          // Try finding by traversing up from message box
          this.debug('Trying alternative send button detection...');
          const parentElement = messageBox.closest('[role="row"]') || messageBox.parentElement;
          if (parentElement) {
            const possibleButtons = Array.from(parentElement.querySelectorAll('button, [role="button"], span[data-icon], div[role="button"]'));
            // Filter buttons that appear after the message box
            const messageBoxRect = messageBox.getBoundingClientRect();
            sendButton = possibleButtons.find(btn => {
              const rect = btn.getBoundingClientRect();
              return rect.left > messageBoxRect.right && Math.abs(rect.top - messageBoxRect.top) < 50;
            });
          }
        }

        if (!sendButton) {
          throw new Error('Send button not found');
        }

        // Click send button with retry logic
        this.debug('Clicking send button...');
        let clicked = false;
        
        // Try multiple click methods
        const clickMethods = [
          // Method 1: Direct click
          () => { sendButton.click(); },
          // Method 2: MouseEvent
          () => {
            sendButton.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
            sendButton.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
            sendButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
          },
          // Method 3: Programmatic click on parent
          () => {
            const parent = sendButton.parentElement;
            if (parent) parent.click();
          }
        ];

        for (const method of clickMethods) {
          try {
            method();
            await this.sleep(1000);
            
            // Check if message was sent
            const sent = await this.waitForAnyElement([
              'span[data-testid="msg-check"]',
              'span[data-icon="msg-check"]',
              'span[aria-label="Sent"]',
              'span[data-icon="msg-time"]'
            ], 2000);
            
            if (sent) {
              clicked = true;
              break;
            }
          } catch (e) {
            this.debug('Click method failed, trying next method...');
            continue;
          }
        }

        if (!clicked) {
          throw new Error('Failed to send message - could not click send button');
        }
      }

      // Wait for message to be sent
      await this.sleep(2000);

      // Final verification
      const messageElements = document.querySelectorAll('[role="row"]');
      let messageSent = false;

      for (const element of messageElements) {
        if (element.textContent.includes(message.substring(0, 20))) {
          messageSent = true;
          this.debug('Found sent message in chat');
          break;
        }
      }

      if (!messageSent) {
        this.debug('Warning: Could not verify if message was sent');
      } else {
        this.debug('Message sent successfully');
      }

      return true;
    } catch (error) {
      this.debug(`Error in sendMessage: ${error.message}`);
      throw error;
    }
  }

  async processMessage(contact, retryCount = 0) {
    const MAX_RETRIES = 3;

    try {
      this.debug(`Processing contact: ${contact.name}`);

      // Search for contact
      const foundContact = await this.searchContact(contact.phone);
      if (!foundContact) {
        throw new Error(`Could not find contact: ${contact.phone}`);
      }

      // Process message template
      let message = contact.message;
      Object.keys(contact).forEach(key => {
        const placeholder = new RegExp(`{{${key}}}`, 'g');
        message = message.replace(placeholder, contact[key]);
      });

      // Send message
      const sent = await this.sendMessage(message);
      if (!sent) {
        throw new Error(`Could not send message to: ${contact.phone}`);
      }

      // Log success
      this.logMessage({
        phone: contact.phone,
        name: contact.name,
        status: 'success',
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      this.debug(`Error processing message: ${error.message}`);
      
      // Retry logic
      if (retryCount < MAX_RETRIES) {
        this.debug(`Retrying (${retryCount + 1}/${MAX_RETRIES})...`);
        await this.sleep(2000);
        return this.processMessage(contact, retryCount + 1);
      }
      
      // Log error if max retries reached
      this.logMessage({
        phone: contact.phone,
        name: contact.name,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  async startProcessing(contacts) {
    if (this.isProcessing) return;
    
    try {
      this.isProcessing = true;
      this.currentProgress = 0;
      this.messageQueue = [...contacts];
      
      this.debug(`Starting to process messages for ${contacts.length} contacts`);

      while (this.messageQueue.length > 0 && this.isProcessing) {
        const contact = this.messageQueue.shift();
        await this.processMessage(contact);
        
        // Update progress
        this.currentProgress = Math.round(((contacts.length - this.messageQueue.length) / contacts.length) * 100);
        this.updateProgress(this.currentProgress);

        // Random delay between messages (5-15 seconds)
        if (this.messageQueue.length > 0) {
          const delay = Math.floor(Math.random() * (15000 - 5000 + 1)) + 5000;
          this.debug(`Waiting ${delay}ms before next message...`);
          await this.sleep(delay);
        }
      }

      if (this.currentProgress === 100) {
        this.showNotification('All messages sent successfully!');
      }
    } catch (error) {
      this.debug(`Error in message processing: ${error.message}`);
      this.showNotification('Error processing messages: ' + error.message, 'error');
    } finally {
      this.isProcessing = false;
    }
  }

  stopProcessing() {
    console.log('Stopping message processing');
    this.isProcessing = false;
    this.messageQueue = [];
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
    document.dispatchEvent(new CustomEvent('whatsblitz_progress', { 
      detail: progress 
    }));
  }

  showNotification(message, type = 'success') {
    document.dispatchEvent(new CustomEvent('whatsblitz_notification', { 
      detail: { message, type } 
    }));
  }
}

// Initialize controller
const whatsAppController = new WhatsAppController();

// Listen for messages from popup
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  try {
    if (request.type === 'PROCESS_FILE') {
      // Initialize only when processing a file
      if (!whatsAppController.isInitialized) {
        await whatsAppController.initialize();
      }
      // Handle file processing (will be implemented in message-processor.js)
    } else if (request.type === 'START_SENDING') {
      const contacts = JSON.parse(localStorage.getItem('whatsblitz_contacts') || '[]');
      whatsAppController.startProcessing(contacts);
    } else if (request.type === 'STOP_SENDING') {
      whatsAppController.stopProcessing();
    }
  } catch (error) {
    console.error('Error handling message:', error);
    // Notify the popup about the error
    chrome.runtime.sendMessage({ 
      type: 'ERROR', 
      error: error.message 
    });
  }
});
