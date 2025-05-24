class MessageProcessor {
  constructor() {
    this.contacts = [];
  }

  async processFile(fileData, filename) {
    try {
      const workbook = XLSX.read(fileData, { type: 'array' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);

      if (rows.length === 0) {
        throw new Error('No data found in the Excel file');
      }

      // Validate required columns
      const requiredColumns = ['phone', 'name', 'message'];
      const headers = Object.keys(rows[0]);
      
      for (const col of requiredColumns) {
        if (!headers.some(header => header.toLowerCase() === col)) {
          throw new Error(`Missing required column: ${col}`);
        }
      }

      // Process rows
      this.contacts = rows.map(row => {
        // Normalize phone number (remove spaces, ensure it starts with country code)
        let phone = row.phone.toString().replace(/\s+/g, '');
        if (!phone.startsWith('+')) {
          phone = '+' + phone;
        }

        return {
          phone,
          name: row.name,
          message: row.message,
          ...row // Include any additional columns for template variables
        };
      });

      // Save contacts to localStorage
      localStorage.setItem('whatsblitz_contacts', JSON.stringify(this.contacts));

      // Enable start button
      document.getElementById('whatsblitz-start').disabled = false;

      return {
        success: true,
        message: `Processed ${this.contacts.length} contacts successfully`
      };
    } catch (error) {
      console.error('Error processing file:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  validatePhoneNumber(phone) {
    // Basic phone number validation
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  }
}

// Initialize processor
const messageProcessor = new MessageProcessor();

// Handle file processing message
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'PROCESS_FILE') {
    messageProcessor.processFile(request.data, request.filename)
      .then(result => {
        const event = new CustomEvent('whatsblitz_notification', {
          detail: result.message
        });
        document.dispatchEvent(event);
      });
  }
});
