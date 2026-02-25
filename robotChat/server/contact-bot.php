<?php
// server/contact-bot.php
// Intelligent Contact Form Backend - Using DeepSeek API

session_start();
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// Load configuration
require_once 'contact-config.php';

// Read request
$input = json_decode(file_get_contents('php://input'), true);
$message = $input['message'] ?? null;
$action = $input['action'] ?? null;

// Initialize or reset session
if ($action === 'reset' || !isset($_SESSION['contact_form'])) {
    $_SESSION['contact_form'] = [
        'step' => 0,
        'collected_data' => [],
        'history' => []
    ];
    
    // Call AI to generate welcome message
    $welcome = callDeepSeek([
        ['role' => 'system', 'content' => CONFIG['bot']['system_prompt']],
        ['role' => 'user', 'content' => 'Start a friendly conversation and ask for the user\'s name.']
    ]);
    
    // If AI fails, use fallback
    if (!$welcome) {
        $welcome = CONFIG['bot_messages']['welcome'] . ' ' . CONFIG['required_fields'][0]['prompt'];
    }
    
    // Save AI response to history
    $_SESSION['contact_form']['history'][] = ['role' => 'assistant', 'content' => $welcome];
    
    echo json_encode([
        'reply' => $welcome,
        'field' => CONFIG['required_fields'][0]['name'],
        'progress' => [
            'current' => 1,
            'total' => count(CONFIG['required_fields'])
        ]
    ]);
    exit;
}

// Get current session
$session = $_SESSION['contact_form'];
$currentStep = $session['step'];
$currentField = CONFIG['required_fields'][$currentStep];

// Validate user input
if ($currentField && isset($currentField['validate']) && $message) {
    $validator = $currentField['validate'];
    if (is_callable($validator)) {
        $error = $validator($message);
        if ($error) {
            echo json_encode([
                'reply' => $error . ' ' . $currentField['prompt'],
                'error' => true,
                'progress' => [
                    'current' => $currentStep + 1,
                    'total' => count(CONFIG['required_fields'])
                ]
            ]);
            exit;
        }
    }
}

// Save user response
if ($message && $currentField) {
    $_SESSION['contact_form']['collected_data'][$currentField['name']] = $message;
    $_SESSION['contact_form']['history'][] = ['role' => 'user', 'content' => $message];
}

// Check if completed
if ($currentStep >= count(CONFIG['required_fields']) - 1) {
    // All information collected, save to file
    if (CONFIG['storage']['save_to_file']) {
        saveToFile($_SESSION['contact_form']['collected_data']);
    }
    
    // Send email
    $emailSent = true;
    if (CONFIG['storage']['send_email']) {
        $emailSent = sendEmail($_SESSION['contact_form']['collected_data']);
    }
    
    if ($emailSent) {
        // Call AI to generate thank you message
        $thankYou = callDeepSeek([
            ['role' => 'system', 'content' => CONFIG['bot']['system_prompt']],
            ['role' => 'user', 'content' => 'The user has provided all information. Thank them warmly and let them know their information has been submitted successfully.']
        ]);
        
        if (!$thankYou) {
            $thankYou = CONFIG['bot_messages']['thank_you'];
        }
        
        session_destroy();
        echo json_encode([
            'reply' => $thankYou,
            'finished' => true
        ]);
    } else {
        echo json_encode([
            'reply' => CONFIG['bot_messages']['error'],
            'error' => true
        ]);
    }
    exit;
}

// Move to next field
$_SESSION['contact_form']['step']++;
$nextField = CONFIG['required_fields'][$_SESSION['contact_form']['step']];

// Call AI to generate next question
$aiPrompt = "The user just provided their {$currentField['label']}: {$message}. Now ask in a friendly way for their {$nextField['label']}.";
$aiReply = callDeepSeek(array_merge(
    [['role' => 'system', 'content' => CONFIG['bot']['system_prompt']]],
    $_SESSION['contact_form']['history'],
    [['role' => 'user', 'content' => $aiPrompt]]
));

// If AI fails, use field prompt
if (!$aiReply) {
    $aiReply = $nextField['prompt'];
}

// Save AI response
$_SESSION['contact_form']['history'][] = ['role' => 'assistant', 'content' => $aiReply];

echo json_encode([
    'reply' => $aiReply,
    'field' => $nextField['name'],
    'progress' => [
        'current' => $_SESSION['contact_form']['step'] + 1,
        'total' => count(CONFIG['required_fields'])
    ]
]);

// ========== Helper Functions ==========

function callDeepSeek($messages) {
    $apiKey = getenv('DEEPSEEK_API_KEY');
    if (!$apiKey) {
        // Read from .env file
        $envFile = __DIR__ . '/../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos($line, 'DEEPSEEK_API_KEY=') === 0) {
                    $apiKey = substr($line, 17);
                    break;
                }
            }
        }
    }
    
    if (!$apiKey) {
        error_log('DeepSeek API key not found');
        return null;
    }
    
    $ch = curl_init('https://api.deepseek.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ],
        CURLOPT_POSTFIELDS => json_encode([
            'model' => 'deepseek-chat',
            'messages' => $messages,
            'temperature' => 0.7,
            'max_tokens' => 150
        ])
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    
    if (curl_error($ch)) {
        error_log('Curl error: ' . curl_error($ch));
        curl_close($ch);
        return null;
    }
    
    curl_close($ch);
    
    if ($httpCode === 200) {
        $data = json_decode($response, true);
        return $data['choices'][0]['message']['content'] ?? null;
    }
    
    error_log('DeepSeek API error: HTTP ' . $httpCode . ' - ' . $response);
    return null;
}

function saveToFile($data) {
    $filePath = __DIR__ . '/../submissions.json';
    $submissions = [];
    
    if (file_exists($filePath)) {
        $content = file_get_contents($filePath);
        $submissions = json_decode($content, true) ?: [];
    }
    
    $submissions[] = array_merge($data, [
        'submitted_at' => date('Y-m-d H:i:s'),
        'ip' => $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
    ]);
    
    file_put_contents($filePath, json_encode($submissions, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    return true;
}

function sendEmail($data) {
    $to = '1472713854@qq.com';
    $subject = 'New Contact Form Submission';
    
    $message = "New submission from website contact form:\n\n";
    $message .= str_repeat("=", 50) . "\n\n";
    $message .= "Name: " . ($data['name'] ?? 'Not provided') . "\n";
    $message .= "Phone: " . ($data['phone'] ?? 'Not provided') . "\n";
    $message .= "Email: " . ($data['email'] ?? 'Not provided') . "\n";
    $message .= "\nSubmission time: " . date('Y-m-d H:i:s') . "\n";
    $message .= "IP Address: " . ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'Unknown') . "\n";
    $message .= "\n" . str_repeat("=", 50);
    
    $headers = "From: contact-form@localhost\r\n";
    $headers .= "Reply-To: 1472713854@qq.com\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion();
    
    return mail($to, $subject, $message, $headers);
}
?>