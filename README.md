# Drill Hole Calculator

## Overview

The Drill Hole Calculator is a Progressive Web App (PWA) designed for geologists. This tool provides an easy-to-use interface for inputting measurement data, performing calculations of planes to real-world dip and dip direction, and storing results.

![image](https://github.com/kinnujan/drillhole-calculator/blob/c20f6cdd064aee01c99288d0d48a1ca07515fd3b/dhcalc_screenshot.png)

## Features

- Calculate dip and dip direction from alpha and beta measurements
- Support for various measurement types (bedding, foliation, fault, shear, vein)
- Customizable measurement types, generation types, and custom types
- Dark mode for comfortable viewing in low-light conditions
- Haptic feedback for enhanced user interaction (device-dependent)
- Offline functionality
- Data persistence using local storage
- Export results to CSV
- Copy results to clipboard
- Responsive design for use on various devices
- Undo functionality for easy correction of mistakes
- Custom color option for preview and results based on dip direction and dip
- Easy depth input with quick adjustment buttons
- Settings page for personalized app configuration

### Todo:
- Support for lineations/gamma measurements

## Installation

As a Progressive Web App, the Drill Hole Calculator can be installed on your device for easy access:

1. Visit the app's URL in a modern web browser (Chrome, Firefox, Safari, or Edge).
2. For mobile devices:
   - On Android: You should see a prompt to "Add to Home Screen". Tap this to install the app.
   - On iOS: Tap the share button, then "Add to Home Screen".
3. For desktop:
   - Look for the install icon in the address bar (usually on the right side) and click it.

Alternatively, you can use the app directly in your web browser without installation.

## Usage

1. Enter the Hole ID, Hole Dip, and Hole Azimuth in the respective fields.
2. Select the measurement type and generation.
3. Enter the depth of the measurement. Use the quick adjustment buttons (+/- 0.1m, 1m, 10m) for easy input.
4. Input the alpha and beta angles using the number inputs or sliders.
5. Add a comment if needed.
6. Click "Add Measurement" to save the data.
7. Use the "Undo" button if you need to remove the last added measurement.
8. View results in the table below.
9. Use the "Copy Results" or "Save as CSV" buttons to export your data.
10. Access the Settings page to customize the app:
    - Toggle Dark Mode
    - Enable/Disable Haptic Feedback
    - Enable/Disable Undo Button
    - Enable/Disable Custom Colors
    - Choose Strike Mode
    - Manage Measurement Types, Generation Types, and Custom Types
    - Reset All Settings and Data

## Contributing

Contributions to the Drill Hole Calculator are welcome! Please feel free to submit pull requests, create issues or spread the word.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Thanks to Claude, an AI assistant, for providing guidance and assistance during the development process.
- Special acknowledgement to Anssi for their invaluable expertise in developing this calculator.

## Contact

For any queries or suggestions, please open an issue on the GitHub repository or contact me on Twitter/LinkedIn.
