# WhatsBlitz Chrome Extension

WhatsBlitz is a powerful Chrome extension that enables personalized WhatsApp messaging automation with Excel file support. Perfect for businesses and individuals who need to send personalized messages to multiple contacts efficiently.

## Feature

- 📊 Excel/CSV File Upload
  - Support for .xlsx and .csv files
  - Template variables for personalized messages
  - Drag & drop interface

- 💬 WhatsApp Web Integration
  - Automatic message sending
  - Human-like delays between messages
  - Progress tracking

- 🎯 Smart Message Processing
  - Template variable substitution (e.g., {{name}}, {{product}})
  - Phone number validation and formatting
  - Error handling for invalid numbers

- 📱 User-Friendly Interface
  - Floating, draggable sidebar
  - Real-time progress updates
  - Contact list preview
  - Clear error notifications

## Installation

1. Clone this repository or download the ZIP file
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory
5. The WhatsBlitz icon should appear in your Chrome toolbar

## Usage

1. Open [WhatsApp Web](https://web.whatsapp.com) in Chrome
2. Click the WhatsBlitz extension icon
3. Upload your contacts file (Excel or CSV)
4. Review the loaded contacts in the sidebar
5. Click "Start Sending" to begin the automation
6. Monitor progress in real-time
7. Use "Stop" to pause at any time

## Contact File Format

Your Excel/CSV file should contain the following columns:
- `phone`: Phone number with country code (e.g., +1234567890)
- `name`: Contact name for personalization
- `message`: Message template with variables
- Additional columns will be available as template variables

Example:
```csv
phone,name,message,product,order_id
+1234567890,John Doe,"Hi {{name}}, your order #{{order_id}} for {{product}} is ready!",iPhone 13 Pro,ORD-123
```

### Template Variables

You can use any column name as a template variable in your messages:
- `{{name}}` - Replaced with the contact's name
- `{{product}}` - Replaced with the product value
- `{{order_id}}` - Replaced with the order ID
- Add any custom columns for additional variables

## Best Practices

1. **Phone Numbers**
   - Always include country code
   - Remove spaces and special characters
   - Example: +1234567890

2. **Message Templates**
   - Keep messages personal but professional
   - Test with a small batch first
   - Use template variables for personalization

3. **Sending**
   - Start with a small list to test
   - Monitor the first few messages
   - Don't send too many messages too quickly

## Privacy & Security

- WhatsBlitz operates locally in your browser
- No data is sent to external servers
- Contact information is stored temporarily in localStorage
- The extension only has access to WhatsApp Web

## Known Issues

1. WhatsApp Web must be open and active
2. Some messages may fail if the contact is not on WhatsApp
3. Very large contact lists may cause performance issues

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

If you encounter any issues or have suggestions:
1. Check the Known Issues section
2. Open an issue on GitHub
3. Provide detailed information about the problem
