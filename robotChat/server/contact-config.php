<?php
// server/contact-config.php

define('CONFIG', [
    // Fields to collect (asked in order)
    'required_fields' => [
        [
            'name' => 'name', 
            'label' => 'Name', 
            'prompt' => 'What should I call you?',
            'validate' => function($value) {
                return strlen($value) >= 2 ? null : 'Name must be at least 2 characters';
            }
        ],
        [
            'name' => 'phone', 
            'label' => 'Phone', 
            'prompt' => 'Please leave your phone number so we can contact you.',
            'validate' => function($value) {
                return preg_match('/^1[3-9]\d{9}$/', $value) ? null : 'Please enter a valid 11-digit phone number';
            }
        ],
        [
            'name' => 'email', 
            'label' => 'Email', 
            'prompt' => 'Finally, please provide your email address.',
            'validate' => function($value) {
                return filter_var($value, FILTER_VALIDATE_EMAIL) ? null : 'Please enter a valid email address';
            }
        ]
    ],
    
    // Email to receive submissions
    'recipient_email' => '1472713854@qq.com',
    
    // Bot configuration
    'bot' => [
        'system_prompt' => 'You are a professional customer service bot. Your task is to collect necessary information through friendly conversation. Ask only one question at a time, be friendly and professional. After collecting all information, thank the user warmly.'
    ],
    
    // Bot messages (fallback if AI fails)
    'bot_messages' => [
        'welcome' => 'Hello! I am your intelligent assistant. To better serve you, I need to collect some basic information.',
        'thank_you' => 'Thank you for your cooperation! Your information has been successfully submitted.',
        'error' => 'Sorry, we encountered a technical issue. Please try again later.'
    ],
    
    // Storage settings
    'storage' => [
        'save_to_file' => true,
        'send_email' => true
    ]
]);
?>