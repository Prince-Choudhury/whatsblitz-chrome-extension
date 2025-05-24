class MessageProcessor {
  constructor() {
    this.contacts = [];
  }

  processContacts(contacts) {
    try {
      if (!Array.isArray(contacts) || contacts.length === 0) {
        throw new Error('No contacts provided');
      }

      // Process and validate each contact
      this.contacts = contacts.map(contact => {
        // Normalize phone number
        let phone = contact.phone.toString().replace(/\s+/g, '');
        if (!phone.startsWith('+')) {
          phone = '+' + phone;
        }

        // Validate phone number
        if (!this.validatePhoneNumber(phone)) {
          console.warn(`Invalid phone number format: ${phone}`);
        }

        return {
          ...contact,
          phone,
          processed: false,
          status: 'pending'
        };
      });

      // Save contacts to localStorage
      localStorage.setItem('whatsblitz_contacts', JSON.stringify(this.contacts));

      return {
        success: true,
        message: `Processed ${this.contacts.length} contacts successfully`
      };
    } catch (error) {
      console.error('Error processing contacts:', error);
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

// Export the MessageProcessor class
window.MessageProcessor = MessageProcessor;
