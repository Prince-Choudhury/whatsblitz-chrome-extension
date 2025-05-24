document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  const startBtn = document.getElementById('startBtn');
  const status = document.getElementById('status');

  // Handle drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '#25D366';
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '#ccc';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    handleFile(file);
  });

  // Handle click to upload
  dropZone.addEventListener('click', () => {
    fileInput.click();
  });

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    handleFile(file);
  });

  function handleFile(file) {
    if (!file) return;
    
    if (!file.name.match(/\.(xlsx|csv)$/)) {
      showStatus('Please upload an Excel or CSV file', 'error');
      return;
    }

    // Check if WhatsApp Web is open
    chrome.tabs.query({ url: 'https://web.whatsapp.com/*' }, (tabs) => {
      if (tabs.length === 0) {
        showStatus('Please open WhatsApp Web first', 'error');
        return;
      }

      // Send file to content script for processing
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = e.target.result;
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'PROCESS_FILE',
          data: data,
          filename: file.name
        });
      };
      reader.readAsArrayBuffer(file);
      
      showStatus('File uploaded successfully!', 'success');
      startBtn.disabled = false;
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
