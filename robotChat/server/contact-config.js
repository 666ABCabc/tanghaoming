// server/contact-config.js
// Intelligent Contact Form Configuration - All settings can be modified here

export default {
    // Fields to collect (asked in order)
    required_fields: [
        { 
            name: 'name', 
            label: 'Name',
            prompt: 'What should I call you?',
            validate: (value) => value.length >= 2 ? null : 'Name must be at least 2 characters'
        },
        { 
            name: 'phone', 
            label: 'Phone',
            prompt: 'Please leave your phone number so we can contact you.',
            validate: (value) => /^1[3-9]\d{9}$/.test(value) ? null : 'Please enter a valid 11-digit phone number'
        },
        { 
            name: 'email', 
            label: 'Email',
            prompt: 'Finally, please provide your email address. We will send you the details.',
            validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : 'Please enter a valid email address'
        }
    ],

    // Email address to receive submissions
    recipient_email: '1472713854@qq.com',

    // Email sending configuration (using QQ Mail)
    email_config: {
        host: 'smtp.qq.com',
        port: 587,
        secure: false,
        auth: {
            user: '1472713854@qq.com',
            pass: 'ffzojqssuzxahbgg'
        }
    },

    // Bot messages
    bot_messages: {
        welcome: "Hello! I'm your intelligent assistant. To better serve you, I need to collect some basic information first.",
        thank_you: "Thank you for your cooperation! Your information has been successfully submitted. Our customer service will contact you soon.",
        error: "Sorry, we encountered a technical issue. Please try again later.",
        invalid_input: "Invalid input format. Please try again."
    },

    // Storage settings
    storage: {
        save_to_file: true,
        file_path: './submissions.json',
        send_email: true
    }
};