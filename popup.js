document.addEventListener('DOMContentLoaded', function() {
  console.log('WhatsBlitz Debug: DOM Content Loaded');

  // Initialize UI elements
  const initializeUI = () => {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const browseBtn = document.getElementById('browseBtn');
    const startBtn = document.getElementById('startBtn');
    const status = document.getElementById('status');
    const fileInfo = document.getElementById('fileInfo');
    
    if (!dropZone || !fileInput || !browseBtn || !startBtn || !status || !fileInfo) {
      console.error('WhatsBlitz Debug: Required UI elements not found');
      return false;
    }
    return true;
  };

  if (!initializeUI()) {
    console.error('WhatsBlitz: Failed to initialize UI');
    return;
  }
  // Ensure XLSX is loaded
  console.log('WhatsBlitz Debug: Checking XLSX library');
  if (typeof XLSX === 'undefined') {
    console.error('WhatsBlitz: XLSX library not loaded');
    showStatus('Error loading required libraries. Please try reloading.', 'error');
    return;
  }
  console.log('WhatsBlitz: Popup loaded');
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const startBtn = document.getElementById('startBtn');
  const status = document.getElementById('status');
  const fileInfo = document.getElementById('fileInfo');
  const fileName = fileInfo.querySelector('.file-name');

  // Handle drag and drop
  ['dragenter', 'dragover'].forEach(eventName => {
    dropZone.addEventListener(eventName, highlight, false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, unhighlight, false);
  });

  function highlight(e) {
    preventDefaults(e);
    dropZone.classList.add('dragover');
  }

  function unhighlight(e) {
    preventDefaults(e);
    dropZone.classList.remove('dragover');
  }

  dropZone.addEventListener('drop', (e) => {
    preventDefaults(e);
    const file = e.dataTransfer.files[0];
    console.log('WhatsBlitz: File dropped:', file?.name);
    if (file) {
      handleFile(file);
    }
  });

  // Browse button handler
  const browseBtn = document.getElementById('browseBtn');
  // Handle browse button click
  browseBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('WhatsBlitz Debug: Browse button clicked');
    try {
      fileInput.click();
      console.log('WhatsBlitz Debug: File input clicked successfully');
    } catch (error) {
      console.error('WhatsBlitz Debug: Error clicking file input:', error);
      showStatus('Error selecting file. Please try again.', 'error');
    }
  });

  // Handle drop zone click
  dropZone.addEventListener('click', (e) => {
    if (e.target !== browseBtn) {
      e.preventDefault();
      e.stopPropagation();
      fileInput.click();
    }
  });

  // File input change handler
  fileInput.addEventListener('change', (e) => {
    console.log('WhatsBlitz Debug: File input change event triggered');
    const file = e.target.files[0];
    console.log('WhatsBlitz Debug: File selected:', file?.name);
    if (file) {
      try {
        handleFile(file);
        console.log('WhatsBlitz Debug: handleFile called successfully');
      } catch (error) {
        console.error('WhatsBlitz Debug: Error in handleFile:', error);
      }
    } else {
      console.log('WhatsBlitz Debug: No file selected');
    }
  });

  // Make sure the file input is properly initialized
  fileInput.type = 'file';
  fileInput.accept = '.xlsx,.csv,.xls';
  fileInput.style.display = 'none';

  // Prevent default drag behaviors
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleFile(file) {
    console.log('WhatsBlitz: Handling file:', file?.name);
    
    if (!file) {
      console.error('WhatsBlitz: No file provided to handleFile');
      showStatus('No file selected', 'error');
      return;
    }
    
    if (!file.name.match(/\.(xlsx|csv)$/)) {
      showStatus('Please upload an Excel or CSV file', 'error');
      return;
    }

    // Update UI to show selected file
    fileName.textContent = file.name;
    fileInfo.style.display = 'block';

    // Check if WhatsApp Web is open
    chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
      if (tabs.length === 0) {
        showStatus('Please open WhatsApp Web first', 'error');
        return;
      }

      console.log('WhatsBlitz: WhatsApp Web tab found');

      // Read file
      const reader = new FileReader();
      
      reader.onload = function(e) {
        console.log('WhatsBlitz: File loaded, processing...');
        try {
          let workbook;
          if (file.name.endsWith('.csv')) {
            // Handle CSV files
            const csvData = e.target.result;
            workbook = XLSX.read(csvData, { type: 'binary' });
          } else {
            // Handle Excel files
            const data = new Uint8Array(e.target.result);
            workbook = XLSX.read(data, { type: 'array' });
          }
          
          // Get first sheet
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(firstSheet);
          
          console.log('WhatsBlitz: Parsed rows:', rows.length);
          
          if (rows.length === 0) {
            showStatus('No data found in the file', 'error');
            return;
          }

          // Validate required columns
          const requiredColumns = ['phone', 'name', 'message'];
          const headers = Object.keys(rows[0]);
          
          console.log('WhatsBlitz: File headers:', headers);
          
          for (const col of requiredColumns) {
            if (!headers.some(header => header.toLowerCase() === col)) {
              showStatus(`Missing required column: ${col}`, 'error');
              return;
            }
          }

          console.log('WhatsBlitz: Sending contacts to content script');

          // Send data to content script
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'PROCESS_FILE',
            contacts: rows,
            filename: file.name
          }, response => {
            if (chrome.runtime.lastError) {
              console.error('WhatsBlitz: Error sending message:', chrome.runtime.lastError);
              showStatus('Error processing file. Please try again.', 'error');
              return;
            }
            console.log('WhatsBlitz: Contacts processed:', response);
            showStatus(`Loaded ${rows.length} contacts successfully!`, 'success');
            startBtn.disabled = false;
          });

        } catch (error) {
          console.error('WhatsBlitz: Error processing file:', error);
          showStatus('Error processing file: ' + error.message, 'error');
        }
      };

      reader.onerror = function(error) {
        console.error('WhatsBlitz: Error reading file:', error);
        showStatus('Error reading file', 'error');
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsBinaryString(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  }

  startBtn.addEventListener('click', () => {
    chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
      if (tabs.length > 0) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'START_SENDING' });
        window.close();
      }
    });
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
  }
});
