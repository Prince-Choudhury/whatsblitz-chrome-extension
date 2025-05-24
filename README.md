# WhatsBlitz – Chrome Extension for Personalized WhatsApp Messaging

WhatsBlitz is a powerful Chrome extension that enables automated, personalized WhatsApp messaging using Excel data. Perfect for businesses and individuals who need to send customized messages to multiple contacts efficiently.

## Features

- 📊 Excel/CSV file upload support
- 👤 Personalized messaging with template variables
- ⏱️ Random delays to mimic human behavior
- 📱 Modern floating sidebar interface
- 📝 Message history tracking
- ⚡ Progress tracking with beautiful UI
- 🌙 Dark mode support

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

### Excel File Format
Your Excel file should have the following required columns:
```csv
phone,name,message
+1234567890,John Doe,"Hi {{name}}, your order #{{order_id}} is ready!"
```

Required columns:
- `phone`: Contact number (with country code)
- `name`: Contact name
- `message`: Message template

You can add additional columns that can be used as template variables.

### Template Variables
Use double curly braces to insert variables in your message:
- `{{name}}`: Will be replaced with the contact's name
- `{{any_column}}`: Will be replaced with the value from that column

### Steps to Use
1. Open WhatsApp Web (https://web.whatsapp.com)
2. Click the WhatsBlitz extension icon
3. Upload your Excel file
4. Click "Start Sending" to begin the automation
5. Monitor progress in the floating sidebar

## Security & Privacy
- The extension only runs on WhatsApp Web
- All data is stored locally in your browser
- No data is sent to external servers
- Excel data is processed entirely in your browser

## Known Issues
- WhatsApp Web must be open and logged in
- Some mobile numbers may need country code format adjustment
- Very large Excel files may take longer to process

## Contributing
Pull requests are welcome! For major changes, please open an issue first.

## License
[MIT](https://choosealicense.com/licenses/mit/)
