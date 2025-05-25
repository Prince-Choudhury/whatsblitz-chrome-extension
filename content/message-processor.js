class MessageProcessor {
  constructor() {
    this.contacts = [];
  }

  async processFile(file) {
    try {
      console.log('Processing file:', file.name, 'Type:', file.type);
      
      // Check file extension
      const fileExtension = file.name.split('.').pop().toLowerCase();
      if (!['csv', 'xlsx', 'xls'].includes(fileExtension)) {
        throw new Error(`Invalid file extension: .${fileExtension}. Please use .xlsx or .csv files.`);
      }

      // For CSV files, use different parsing approach
      if (fileExtension === 'csv') {
        const text = await this.readFileAsText(file);
        return this.processCSVData(text);
      }

      // For Excel files
      const data = await this.readFile(file);
      const contacts = this.parseFileData(data, file.name);
      return this.processContacts(contacts);
    } catch (error) {
      console.error('Error details:', error);
      return {
        success: false,
        message: error.message || 'Error processing file'
      };
    }
  }

  async readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Error reading file as text'));
      reader.readAsText(file);
    });
  }

  processCSVData(csvText) {
    try {
      // Split the CSV text into lines
      const lines = csvText.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('File must contain at least a header row and one data row');
      }

      // Parse header row
      const headers = lines[0].split(',').map(h => h.toLowerCase().trim());
      
      // Validate required columns
      const requiredColumns = ['phone', 'name', 'message'];
      const missingColumns = requiredColumns.filter(col => !headers.includes(col));
      if (missingColumns.length > 0) {
        throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
      }

      // Parse data rows
      const contacts = [];
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        if (values.length !== headers.length) {
          console.warn(`Skipping invalid row ${i + 1}: column count mismatch`);
          continue;
        }

        const contact = {};
        headers.forEach((header, index) => {
          contact[header] = values[index];
        });
        contact.rowNumber = i + 1;
        contacts.push(contact);
      }

      return this.processContacts(contacts);
    } catch (error) {
      console.error('CSV Processing error:', error);
      throw error;
    }
  }

  parseCSVLine(line) {
    const values = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Handle escaped quotes
          currentValue += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        currentValue += char;
      }
    }
    
    values.push(currentValue.trim());
    return values;
  }

  async readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook);
        } catch (error) {
          console.error('XLSX parsing error:', error);
          reject(new Error('Could not parse Excel file. Please ensure it\'s a valid .xlsx file.'));
        }
      };
      
      reader.onerror = () => reject(new Error('Error reading file'));
      reader.readAsArrayBuffer(file);
    });
  }

  parseFileData(workbook, filename) {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

    if (jsonData.length < 2) {
      throw new Error('File must contain at least a header row and one data row');
    }

    // Get headers and validate required columns
    const headers = jsonData[0].map(h => h.toLowerCase().trim());
    const requiredColumns = ['phone', 'name', 'message'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));

    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }

    // Map column indices
    const columnMap = {
      phone: headers.indexOf('phone'),
      name: headers.indexOf('name'),
      message: headers.indexOf('message')
    };

    // Process data rows
    const contacts = [];
    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      if (!row[columnMap.phone]) continue; // Skip empty rows

      const contact = {
        phone: row[columnMap.phone].toString(),
        name: row[columnMap.name] || '',
        message: row[columnMap.message] || '',
        rowNumber: i + 1
      };

      // Add any additional columns as template variables
      headers.forEach((header, index) => {
        if (!requiredColumns.includes(header) && row[index]) {
          contact[header] = row[index].toString();
        }
      });

      contacts.push(contact);
    }

    return contacts;
  }

  processContacts(contacts) {
    try {
      if (!Array.isArray(contacts) || contacts.length === 0) {
        throw new Error('No valid contacts found in file');
      }

      // Process and validate each contact
      this.contacts = contacts.map(contact => {
        // Normalize phone number
        let phone = contact.phone.toString().replace(/[^0-9+]/g, '');
        if (!phone.startsWith('+')) {
          phone = '+' + phone;
        }

        // Validate phone number
        if (!this.validatePhoneNumber(phone)) {
          console.warn(`Invalid phone number format in row ${contact.rowNumber}: ${phone}`);
        }

        // Process message template
        const message = this.processTemplate(contact.message, contact);

        return {
          ...contact,
          phone,
          message,
          processed: false,
          status: 'pending'
        };
      });

      // Save contacts to localStorage
      localStorage.setItem('whatsblitz_contacts', JSON.stringify(this.contacts));

      return {
        success: true,
        message: `Processed ${this.contacts.length} contacts successfully`,
        contacts: this.contacts
      };
    } catch (error) {
      console.error('Error processing contacts:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  processTemplate(template, data) {
    return template.replace(/{{([^}]+)}}/g, (match, key) => {
      const value = data[key.trim().toLowerCase()];
      return value !== undefined ? value : match;
    });
  }

  validatePhoneNumber(phone) {
    // Basic phone number validation
    return /^\+?[1-9]\d{1,14}$/.test(phone);
  }

  getContacts() {
    return this.contacts;
  }

  clearContacts() {
    this.contacts = [];
    localStorage.removeItem('whatsblitz_contacts');
  }
}

// Export the MessageProcessor class
window.MessageProcessor = MessageProcessor;
