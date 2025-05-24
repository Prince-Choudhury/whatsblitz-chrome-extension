document.addEventListener('DOMContentLoaded', function() {
  // Ensure XLSX is loaded
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
  // Drag and drop handlers
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.borderColor = '#25D366';
    dropZone.style.backgroundColor = '#f0f8f0';
  });

  dropZone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.borderColor = '#ccc';
    dropZone.style.backgroundColor = '';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropZone.style.borderColor = '#ccc';
    dropZone.style.backgroundColor = '';
    
    const file = e.dataTransfer.files[0];
    console.log('WhatsBlitz: File dropped:', file?.name);
    handleFile(file);
  });

  // Click to upload handlers
  dropZone.addEventListener('click', () => {
    console.log('WhatsBlitz: Upload area clicked');
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    console.log('WhatsBlitz: File selected:', file?.name);
    handleFile(file);
  });

  function handleFile(file) {
    console.log('WhatsBlitz: Handling file:', file?.name);
    
    if (!file) {
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
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
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

      reader.readAsArrayBuffer(file);
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
