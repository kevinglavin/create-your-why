document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded - initializing website functionality');
    
    // Initialize variables
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    const navLinks = document.querySelectorAll('.nav-link');
    const backToTop = document.getElementById('backToTop');
    const chatbotIcon = document.getElementById('chatbotIcon');
    const chatbotBox = document.getElementById('chatbotBox');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotRefresh = document.getElementById('chatbotRefresh');
    const chatbotInput = document.getElementById('chatbotInputField');
    const chatbotSendButton = document.getElementById('chatbotSendButton');
    const chatbotMessages = document.getElementById('chatbotMessages');
    const quickQuestionBtns = document.querySelectorAll('.quick-question-btn');
    const shareButtons = document.querySelectorAll('.share-btn');
    const chatbotShare = document.getElementById('chatbotShare');
    const shareCopy = document.getElementById('shareCopy');
    const scrollButtons = document.querySelectorAll('[data-scroll-to]');

    // Current active section
    let activeSection = 'home';
    
    // *** ENTER YOUR OPENAI API KEY HERE ***
    const openaiApiKey = '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'; // Replace with your actual OpenAI API key
    
    // Chat conversation history
    let chatHistory = [{
        role: 'assistant',
        content: "Hello! I'm your Create Your Why assistant. How can I help you today?"
    }];
    
    // Mobile menu toggle
    if (mobileMenuToggle) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
        });
    }

    // Navigation and section handling
    function setActiveSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section-content').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show active section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update navigation active state
        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
            }
        });
        
        // Update URL hash
        window.location.hash = sectionId;
        
        // Store active section
        activeSection = sectionId;
        
        // Close mobile menu if open
        if (navMenu.classList.contains('active')) {
            navMenu.classList.remove('active');
        }
        
        // Scroll to top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    // Handle navigation clicks
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const sectionId = this.getAttribute('data-section');
            setActiveSection(sectionId);
        });
    });

    // Handle additional scroll-to buttons
    scrollButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-scroll-to');
            setActiveSection(targetSection);
        });
    });

    // Check URL hash on load
    function checkHash() {
        if (window.location.hash) {
            const hash = window.location.hash.substring(1);
            setActiveSection(hash);
        } else {
            setActiveSection('home');
        }
    }
    checkHash();

    // Back to top button
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            if (backToTop) backToTop.style.display = 'flex';
        } else {
            if (backToTop) backToTop.style.display = 'none';
        }
    });

    if (backToTop) {
        backToTop.addEventListener('click', function() {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Function to call OpenAI API
    async function callOpenAI(message) {
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${openaiApiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        {
                            role: 'system',
                            content: 'You are a helpful career counseling assistant for Create Your Why, a company that helps individuals navigate career and life transitions using narrative psychology and storytelling techniques. Keep responses concise, friendly, and focused on career development, narrative psychology, and the Career Construction Interview (CCI) methodology developed by Prof. Mark Savickas. The company offers an AI-enhanced platform called FYiT, which provides the first and only online version of the CCI. After responding to a question, suggest 2-3 relevant follow-up questions that the user might want to ask next.'
                        },
                        ...chatHistory.map(msg => ({
                            role: msg.role === 'assistant' ? 'assistant' : 'user',
                            content: msg.content
                        })),
                        {
                            role: 'user',
                            content: message
                        }
                    ],
                    max_tokens: 250,
                    temperature: 0.7
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || 'Error calling OpenAI API');
            }
            
            const data = await response.json();
            return data.choices[0].message.content.trim();
        } catch (error) {
            console.error('OpenAI API error:', error);
            return getFallbackResponse(message);
        }
    }

    // Get predefined responses for quick questions
    function getQuickQuestionResponse(questionType) {
        switch (questionType) {
            case 'about':
                return "Create Your Why was founded by Dr. Kevin Glavin, a licensed professional counselor with over 20 years of experience in career counseling and development. We help individuals navigate complex career and life transitions using narrative psychology and storytelling techniques. Dr. Glavin was mentored by Professor Mark Savickas, the creator of Career Construction Theory and the Career Construction Interview (CCI).\n\nSome follow-up questions you might have:\n- What is Career Construction Theory?\n- What are Dr. Glavin's credentials?\n- How can narrative psychology help with my career?";
            
            case 'faqs':
                return "FAQ: 1) What is the Career Construction Interview? It's a qualitative assessment tool developed by Prof. Mark Savickas to help individuals explore who they are, where they've been, and where they're going. 2) What is FYiT? Finding Yourself in Transition is our AI-enhanced platform providing the first digital version of the CCI. 3) How much does FYiT cost? $200 for a full year of access. 4) Do you offer one-on-one coaching? Yes, Dr. Glavin provides personalized coaching services. Contact us for details.\n\nSome follow-up questions you might have:\n- How long does the CCI process take?\n- What's included in the FYiT platform?\n- How do I schedule a coaching session?";
            
            case 'services':
                return "Our services include: 1) FYiT (Finding Yourself in Transition) - Our AI-enhanced platform offering the exclusive digital version of the Career Construction Interview. 2) Career Construction Masterclass - Professional training courses in narrative psychology and career construction theory. 3) One-on-one career coaching with Dr. Kevin Glavin. 4) Workshops and speaking engagements for organizations and conferences.\n\nSome follow-up questions you might have:\n- How much does FYiT cost?\n- What topics are covered in the Masterclass?\n- Do you offer group coaching?";
            
            default:
                return "I'm not sure what information you're looking for. Would you like to know about our services, our founder Dr. Kevin Glavin, or how we can help with your career transition?\n\nSome topics you might be interested in:\n- Our FYiT platform\n- Career Construction Theory\n- Dr. Kevin's background";
        }
    }

    // Fallback responses when API isn't available
    function getFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            return "Hi there! How can I help you with your career journey today?\n\nSome follow-up questions you might have:\n- What services do you offer?\n- How can narrative psychology help me?\n- What is the Career Construction Interview?";
        } 
        else if (lowerMessage.includes('appointment') || lowerMessage.includes('schedule') || lowerMessage.includes('booking') || lowerMessage.includes('call')) {
            return "I'd be happy to help you schedule a call with Dr. Kevin. You can click the 'Schedule a Call' button on our website, or I can take your information. What time works best for you?\n\nSome follow-up questions you might have:\n- How long is the initial consultation?\n- What should I prepare for the call?\n- What time zones do you work in?";
        }
        else if (lowerMessage.includes('service') || lowerMessage.includes('offer') || lowerMessage.includes('help') || lowerMessage.includes('do you')) {
            return "We offer career coaching, guidance, and training using narrative psychology. We help individuals construct their own story to navigate career transitions and challenges. Our flagship product is FYiT (Finding Yourself in Transition), the first digital version of the Career Construction Interview.\n\nSome follow-up questions you might have:\n- What is FYiT?\n- How much do your services cost?\n- How does narrative psychology work?";
        }
        else if (lowerMessage.includes('cost') || lowerMessage.includes('price') || lowerMessage.includes('fee') || lowerMessage.includes('pay')) {
            return "Our coaching services are customized to your needs. The initial 15-minute consultation is free. After that, we offer packages starting at $129.99. Our FYiT platform costs $200 for a full year of access.\n\nSome follow-up questions you might have:\n- What's included in the coaching packages?\n- Are there any discounts available?\n- Do you offer payment plans?";
        }
        else if (lowerMessage.includes('location') || lowerMessage.includes('where') || lowerMessage.includes('office')) {
            return "We offer both virtual sessions and in-person meetings. Many clients prefer virtual sessions for convenience. What would work best for you?\n\nSome follow-up questions you might have:\n- What platform do you use for virtual sessions?\n- Where are you physically located?\n- What are your hours of availability?";
        }
        else if (lowerMessage.includes('thank')) {
            return "You're welcome! Is there anything else I can help you with today?\n\nSome other topics you might be interested in:\n- Learning more about Dr. Kevin Glavin's background\n- Understanding the Career Construction Interview\n- Exploring our FYiT platform";
        }
        else if (lowerMessage.includes('fyit') || lowerMessage.includes('finding yourself') || lowerMessage.includes('transition')) {
            return "Finding Yourself in Transition (FYiT) is our AI-enhanced platform that provides the first and only online version of the Career Construction Interview. It includes an AI assistant, personalized 32-page PDF report, and is accessible on all devices. The cost is $200 for a full year of access.\n\nSome follow-up questions you might have:\n- How long does it take to complete?\n- Can I update my answers later?\n- What's in the 32-page report?";
        }
        else if (lowerMessage.includes('career construction')) {
            return "The Career Construction Interview (CCI) is a powerful tool developed by Prof. Mark Savickas for self-discovery, life planning, and career guidance. It helps individuals understand their life themes and construct their career narrative. Our FYiT platform offers the first and only digital version of this transformative approach.\n\nSome follow-up questions you might have:\n- What questions are in the CCI?\n- How is it different from traditional assessments?\n- Who is Mark Savickas?";
        }
        else if (lowerMessage.includes('narrative psychology')) {
            return "Narrative psychology focuses on how people construct stories to make meaning of their lives. At Create Your Why, we use this approach to help you craft a coherent career narrative that aligns with your values, strengths, and aspirations. This storytelling process is essential for navigating transitions and finding purpose.\n\nSome follow-up questions you might have:\n- How does narrative psychology differ from other approaches?\n- What's the process like?\n- How does this help with career decisions?";
        }
        else if (lowerMessage.includes('mark savickas')) {
            return "Professor Mark Savickas is a world-renowned vocational psychologist who developed Career Construction Theory and the Career Construction Interview. Dr. Kevin Glavin, our founder, had the privilege of being mentored by Prof. Savickas and is dedicated to making this powerful methodology more accessible through our services.\n\nSome follow-up questions you might have:\n- What is Career Construction Theory?\n- How did Dr. Glavin work with Mark Savickas?\n- Are there books or publications about this approach?";
        }
        else if (lowerMessage.includes('kevin') || lowerMessage.includes('glavin') || lowerMessage.includes('founder')) {
            return "Dr. Kevin Glavin is the founder and CEO of Create Your Why. With over 20 years of experience in career counseling and development, he's dedicated to helping individuals navigate career and life transitions. Dr. Glavin was mentored by Professor Mark Savickas and is recognized internationally for his expertise in Career Construction Theory.\n\nSome follow-up questions you might have:\n- What are Dr. Glavin's credentials?\n- Has he published any research?\n- Where has Dr. Glavin worked previously?";
        }
        else {
            return "Thank you for your message. Would you like to schedule a free 15-minute consultation with Dr. Kevin to discuss how we can help with your specific situation?\n\nSome other topics you might be interested in:\n- Learning about our FYiT platform\n- Understanding our approach to career transitions\n- Exploring Dr. Kevin's background and expertise";
        }
    }

    // Extract follow-up questions from the response
    function extractFollowUpQuestions(text) {
        // Check if there's a section for follow-up questions
        if (text.includes("follow-up questions") || text.includes("Some other topics")) {
            // Split the text at the point where follow-up questions begin
            const parts = text.split(/Some follow-up questions|Some other topics/i);
            
            if (parts.length > 1) {
                // Return the main response without the follow-up questions
                const mainResponse = parts[0].trim();
                
                // Extract the questions
                const questionsPart = parts[1];
                const questions = [];
                
                // Look for questions marked with - or numbered
                const questionMatches = questionsPart.match(/[-•]([^-•\n]+)/g) || questionsPart.match(/\d+\)\s+([^\n]+)/g);
                
                if (questionMatches) {
                    questionMatches.forEach(match => {
                        // Clean up the question format
                        const question = match.replace(/[-•\d+)\s]+/, '').trim();
                        if (question) questions.push(question);
                    });
                }
                
                return {
                    mainResponse,
                    followUpQuestions: questions.slice(0, 3) // Limit to 3 questions max
                };
            }
        }
        
        // If no follow-up questions format is detected, return the whole text as main response
        return {
            mainResponse: text,
            followUpQuestions: []
        };
    }

    // Function to add follow-up question buttons
    function addFollowUpButtons(questions) {
        if (!questions || questions.length === 0) return;
        
        const followUpContainer = document.createElement('div');
        followUpContainer.className = 'follow-up-questions';
        
        questions.forEach(question => {
            const button = document.createElement('button');
            button.className = 'follow-up-btn';
            button.textContent = question;
            button.addEventListener('click', function() {
                handleUserMessage(question);
            });
            
            followUpContainer.appendChild(button);
        });
        
        chatbotMessages.appendChild(followUpContainer);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    // Refresh chatbot conversation
    function refreshChat() {
        // Clear the chat history except for the initial greeting
        chatHistory = [{
            role: 'assistant',
            content: "Hello! I'm your Create Your Why assistant. How can I help you today?"
        }];
        
        // Clear the chat messages container
        chatbotMessages.innerHTML = '';
        
        // Add the initial greeting message
        addMessage("Hello! I'm your Create Your Why assistant. How can I help you today?", 'received');
        
        // Add the quick question buttons
        const quickQuestionsDiv = document.createElement('div');
        quickQuestionsDiv.className = 'quick-questions';
        quickQuestionsDiv.innerHTML = `
            <button class="quick-question-btn" data-question="about">About Us</button>
            <button class="quick-question-btn" data-question="faqs">FAQs</button>
            <button class="quick-question-btn" data-question="services">Our Services</button>
        `;
        chatbotMessages.appendChild(quickQuestionsDiv);
        
        // Re-add event listeners to quick question buttons
        quickQuestionsDiv.querySelectorAll('.quick-question-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const questionType = this.getAttribute('data-question');
                handleQuickQuestion(questionType);
            });
        });
        
        // Clear the input field
        if (chatbotInput) chatbotInput.value = '';
        
        // Hide the share container if visible
        if (chatbotShare) chatbotShare.classList.remove('active');
    }
    
    // Handle quick question button clicks
    function handleQuickQuestion(questionType) {
        const response = getQuickQuestionResponse(questionType);
        
        // Add the question to the chat as if the user asked it
        let questionText;
        switch (questionType) {
            case 'about':
                questionText = "Tell me about Create Your Why";
                break;
            case 'faqs':
                questionText = "What are the frequently asked questions?";
                break;
            case 'services':
                questionText = "What services do you offer?";
                break;
            default:
                questionText = "I'd like to learn more";
        }
        
        // Add user question to chat
        addMessage(questionText, 'sent');
        
        // Update chat history
        chatHistory.push({
            role: 'user',
            content: questionText
        });
        
        // Process the response to extract follow-up questions
        const { mainResponse, followUpQuestions } = extractFollowUpQuestions(response);
        
        // Add bot response to chat
        addMessage(mainResponse, 'received');
        
        // Update chat history
        chatHistory.push({
            role: 'assistant',
            content: response
        });
        
        // Add follow-up question buttons
        addFollowUpButtons(followUpQuestions);
    }
    
    // Handle user messages (both typed and clicked)
    async function handleUserMessage(message) {
        // Add user message to chat
        addMessage(message, 'sent');
        
        // Update chat history
        chatHistory.push({
            role: 'user',
            content: message
        });
        
        // Show typing indicator
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'message-received typing-indicator';
        typingIndicator.innerHTML = '<div class="message-content"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>';
        chatbotMessages.appendChild(typingIndicator);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
        
        try {
            // Get response
            let response;
            if (openaiApiKey && openaiApiKey !== 'YOUR_OPENAI_API_KEY_HERE') {
                response = await callOpenAI(message);
            } else {
                response = getFallbackResponse(message);
            }
            
            // Process the response to extract follow-up questions
            const { mainResponse, followUpQuestions } = extractFollowUpQuestions(response);
            
            // Remove typing indicator
            if (chatbotMessages.contains(typingIndicator)) {
                chatbotMessages.removeChild(typingIndicator);
            }
            
            // Add bot response to chat
            addMessage(mainResponse, 'received');
            
            // Update chat history
            chatHistory.push({
                role: 'assistant',
                content: response
            });
            
            // Add follow-up question buttons
            addFollowUpButtons(followUpQuestions);
            
            // Show the share container
            if (chatbotShare) {
                chatbotShare.classList.add('active');
            }
            
        } catch (error) {
            console.error('Error in chatbot:', error);
            
            // Remove typing indicator
            if (chatbotMessages.contains(typingIndicator)) {
                chatbotMessages.removeChild(typingIndicator);
            }
            
            // Add error message and fallback response
            addMessage("I'm having trouble. Let me use my basic responses instead.", 'received');
            
            const fallbackResponse = getFallbackResponse(message);
            const { mainResponse, followUpQuestions } = extractFollowUpQuestions(fallbackResponse);
            
            setTimeout(() => {
                addMessage(mainResponse, 'received');
                
                // Update chat history
                chatHistory.push({
                    role: 'assistant',
                    content: fallbackResponse
                });
                
                // Add follow-up question buttons
                addFollowUpButtons(followUpQuestions);
                
                // Show the share container
                if (chatbotShare) {
                    chatbotShare.classList.add('active');
                }
            }, 500);
        }
    }

    // Add a message to the chat
    function addMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message-${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = message;
        
        messageDiv.appendChild(contentDiv);
        chatbotMessages.appendChild(messageDiv);
        
        // Scroll to bottom of messages
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }
    
    // Get conversation text for sharing
    function getConversationText() {
        let text = "Conversation with Create Your Why Assistant:\n\n";
        
        // Skip the first system message
        for (let i = 0; i < chatHistory.length; i++) {
            const msg = chatHistory[i];
            if (msg.role === 'user') {
                text += `You: ${msg.content}\n\n`;
            } else if (msg.role === 'assistant') {
                // Extract main response without follow-up questions
                const { mainResponse } = extractFollowUpQuestions(msg.content);
                text += `Assistant: ${mainResponse}\n\n`;
            }
        }
        
        text += "\nVisit us at https://www.createyourwhy.com";
        
        return text;
    }
    
    // Share functions
    function setupShareButtons() {
        // Copy to clipboard
        if (shareCopy) {
            shareCopy.addEventListener('click', function(e) {
                e.preventDefault();
                const text = getConversationText();
                navigator.clipboard.writeText(text).then(() => {
                    alert('Conversation copied to clipboard!');
                }).catch(err => {
                    console.error('Could not copy text: ', err);
                    alert('Failed to copy conversation. Please try again.');
                });
            });
        }
        
        // WhatsApp share
        const shareWhatsApp = document.getElementById('shareWhatsApp');
        if (shareWhatsApp) {
            shareWhatsApp.addEventListener('click', function(e) {
                e.preventDefault();
                const text = encodeURIComponent(getConversationText());
                window.open(`https://wa.me/?text=${text}`, '_blank');
            });
        }
        
        // Email share
        const shareEmail = document.getElementById('shareEmail');
        if (shareEmail) {
            shareEmail.addEventListener('click', function(e) {
                e.preventDefault();
                const subject = encodeURIComponent('My Conversation with Create Your Why Assistant');
                const body = encodeURIComponent(getConversationText());
                window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
            });
        }
        
        // LinkedIn share
        const shareLinkedIn = document.getElementById('shareLinkedIn');
        if (shareLinkedIn) {
            shareLinkedIn.addEventListener('click', function(e) {
                e.preventDefault();
                const url = encodeURIComponent('https://www.createyourwhy.com');
                const title = encodeURIComponent('Create Your Why - Career Construction Expertise');
                window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&title=${title}`, '_blank');
            });
        }
        
        // Twitter/X share
        const shareTwitter = document.getElementById('shareTwitter');
        if (shareTwitter) {
            shareTwitter.addEventListener('click', function(e) {
                e.preventDefault();
                const text = encodeURIComponent('Just had a great conversation with the Create Your Why Assistant about career development and narrative psychology. Check them out!');
                const url = encodeURIComponent('https://www.createyourwhy.com');
                window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
            });
        }
        
        // Facebook share
        const shareFacebook = document.getElementById('shareFacebook');
        if (shareFacebook) {
            shareFacebook.addEventListener('click', function(e) {
                e.preventDefault();
                const url = encodeURIComponent('https://www.createyourwhy.com');
                window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
            });
        }
    }

    // Chatbot functionality
    if (chatbotIcon && chatbotBox && chatbotClose) {
        // Toggle chatbot visibility
        chatbotIcon.addEventListener('click', toggleChatbot);
        chatbotClose.addEventListener('click', toggleChatbot);
        
        function toggleChatbot() {
            chatbotBox.classList.toggle('active');
        }
        
        // Refresh chat
        if (chatbotRefresh) {
            chatbotRefresh.addEventListener('click', refreshChat);
        }
        
        // Set up quick question buttons
        quickQuestionBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                const questionType = this.getAttribute('data-question');
                handleQuickQuestion(questionType);
            });
        });
        
        // Set up share buttons
        setupShareButtons();
    }

    // Chatbot message handling
    if (chatbotInput && chatbotSendButton && chatbotMessages) {
        chatbotSendButton.addEventListener('click', sendMessage);
        chatbotInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        function sendMessage() {
            const message = chatbotInput.value.trim();
            if (message === '') return;
            
            // Clear input field
            chatbotInput.value = '';
            
            // Process the message
            handleUserMessage(message);
        }
    }
});