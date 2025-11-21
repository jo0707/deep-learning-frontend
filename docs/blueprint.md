# **App Name**: Image Insight

## Core Features:

- Image Input via Webcam: Allow users to capture an image directly from their webcam for classification.
- Image Input via Drag-n-Drop: Enable users to upload images via drag-n-drop functionality.
- Server URL Configuration: Allow users to input and update the inference server URL via the UI. This URL is then saved for subsequent requests to classify images, enabling flexibility and easy reconfiguration without needing to rebuild the frontend.
- Image Classification: Send the image to a backend server (Flask) for inference. The current backend URL is stored as an environment variable, which the user can update via the UI.
- Facial Recognition Inference Display: Display the result of the image classification, presenting the predicted class (face name) from the model, allowing users to immediately see the identified person's name.

## Style Guidelines:

- Primary color: Light green (#32f08c) to give a techy and professional feel.
- Background color: Dark, desaturated green (#121f1f) for a dark theme.
- Accent color: Forest green (#228B22) for interactive elements and to add emphasis.
- Font: 'Inter' (sans-serif) for a modern, machined, objective, neutral look. Use for headlines and body text.
- Use simple, line-based icons in a light shade of green.
- Design a clean and structured layout with a focus on usability. Utilize a grid system for consistent spacing.
- Use subtle transitions and animations for user interactions, such as image loading and result display.