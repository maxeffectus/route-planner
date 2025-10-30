import React, { useState, useEffect } from 'react';
import { UserProfile } from '../models/UserProfile.js';
import { 
    getNextQuestion, 
    getAllQuestions,
    getCurrentFieldValue,
    processAnswer, 
    getCompletionPercentage 
} from '../services/SimpleProfileConfig.js';
import { ProfileQuestionUtils } from '../utils/ProfileQuestionUtils.js';
import { useSummarizer } from '../hooks/useSummarizer.js';
import { useStreamingText } from '../hooks/useStreamingText.js';
import { createProfileSummaryPrompt } from '../services/UserProfilePromptConfig.js';
import { ResponseDisplay } from './ResponseDisplay.jsx';
import { ChatLoadingAnimation } from './ChatLoadingAnimation.jsx';

/**
 * Simple profile setup chat component with predefined questions and answers
 */
const SimpleProfileSetupChat = React.forwardRef(({ 
    userProfile, 
    onProfileUpdate, 
    onComplete,
    onSaveRef 
}, ref) => {
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionHistory, setQuestionHistory] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState([]);
    const [timeWindowAnswers, setTimeWindowAnswers] = useState({
        startHour: 9,
        endHour: 18
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [completionPercentage, setCompletionPercentage] = useState(0);
    const [showSummary, setShowSummary] = useState(false);

    // Summarizer API hooks for profile summary
    const { hasSession, createSession, summarizeText, destroySummarizer, summarizerAPI } = useSummarizer();
    const { response: summaryResponse, isLoading: isLoadingSummary, processStream, resetResponse } = useStreamingText();

    // Helper function to reset all answer states
    const resetAnswerStates = () => {
        ProfileQuestionUtils.resetAnswerStates(setSelectedAnswers, setTimeWindowAnswers);
    };

    // Load current values from profile when question changes
    const loadCurrentValues = () => {
        ProfileQuestionUtils.loadCurrentValues(
            currentQuestion, 
            userProfile, 
            setSelectedAnswers, 
            setTimeWindowAnswers
        );
    };

    // Initialize with first question
    useEffect(() => {
        if (userProfile) {
            // Get all questions for editing mode
            const history = getAllQuestions(userProfile);
            setQuestionHistory(history);
            
            // Set current question based on index
            if (history.length > 0) {
                setCurrentQuestion(history[currentQuestionIndex]);
            } else {
                setCurrentQuestion(null);
            }
            
            setCompletionPercentage(getCompletionPercentage(userProfile));
            // Reset all answer states when moving to new question
            resetAnswerStates();
        }
    }, [userProfile, currentQuestionIndex]);

    // Helper function to check if time window is invalid
    const isTimeWindowInvalid = () => {
        return currentQuestion?.type === 'time-range' && 
               timeWindowAnswers.startHour !== undefined && 
               timeWindowAnswers.endHour !== undefined && 
               timeWindowAnswers.endHour <= timeWindowAnswers.startHour;
    };

    const handleSingleChoice = (value) => {
        if (isProcessing) return;
        setSelectedAnswers([value]);
    };

    const handleMultiChoiceToggle = (value) => {
        if (isProcessing) return;
        
        setSelectedAnswers(prev => {
            if (prev.includes(value)) {
                return prev.filter(item => item !== value);
            } else {
                return [...prev, value];
            }
        });
    };

    const handleTimeWindowChange = (field, value) => {
        if (isProcessing) return;
        
        const newValue = parseInt(value);
        
        setTimeWindowAnswers(prev => ({
            ...prev,
            [field]: newValue
        }));
    };

    // Expose saveCurrentAnswer to parent component
    const saveCurrentAnswer = () => {
        if (isProcessing || !currentQuestion) return;
        
        setIsProcessing(true);
        
        // Get answer value using utility class
        const answer = ProfileQuestionUtils.getAnswerValue(
            currentQuestion, 
            selectedAnswers, 
            timeWindowAnswers
        );
        
        // Process the answer
        const success = processAnswer(userProfile, currentQuestion.field, answer);
        
        if (success) {
            // Update profile
            onProfileUpdate(userProfile);
            setCompletionPercentage(getCompletionPercentage(userProfile));
            
            // Load current values from updated profile instead of resetting
            loadCurrentValues();
        }
        
        setIsProcessing(false);
        return success;
    };

    // Expose saveCurrentAnswer to parent via ref
    React.useImperativeHandle(ref, () => ({
        saveCurrentAnswer
    }));

    // Helper function to navigate to a question after saving
    const navigateToQuestion = (direction) => {
        setTimeout(() => {
            setCurrentQuestionIndex(prev => direction === 'next' ? prev + 1 : prev - 1);
        }, 100);
    };

    const handleNext = () => {
        if (isProcessing) return;
        
        // Check for validation errors before saving
        if (isTimeWindowInvalid()) {
            console.warn('Cannot proceed: invalid time window');
            return;
        }
        
        // Save current answer before moving to next question
        saveCurrentAnswer();
        
        // Check if this is the last question
        const isLastQuestion = currentQuestionIndex >= questionHistory.length - 1;
        if (isLastQuestion) {
            // Show summary page (without generating summary - user will click button)
            setTimeout(() => {
                setShowSummary(true);
            }, 100);
        } else {
        // Move to next question after a short delay to allow save to complete
        navigateToQuestion('next');
        }
    };

    const handlePrevious = () => {
        if (isProcessing || currentQuestionIndex === 0) return;
        
        // Check for validation errors before saving
        if (isTimeWindowInvalid()) {
            console.warn('Cannot proceed: invalid time window');
            return;
        }
        
        // Save current answer before moving to previous question
        saveCurrentAnswer();
        
        // Move to previous question after a short delay to allow save to complete
        navigateToQuestion('previous');
    };

    // Load values when question changes
    useEffect(() => {
        loadCurrentValues();
    }, [currentQuestion]);

    // Generate profile summary using Summarizer API
    const generateSummary = async () => {
        if (!userProfile) {
            console.log('[SimpleProfileSetupChat] No user profile, skipping summary generation');
            return;
        }
        
        console.log('[SimpleProfileSetupChat] Starting summary generation');
        
        try {
            // Check availability first using SummarizerAPI directly
            console.log('[SimpleProfileSetupChat] Checking Summarizer API availability...');
            const availability = await summarizerAPI.checkAvailability();
            console.log('[SimpleProfileSetupChat] Availability check result:', availability);
            
            if (availability !== 'available' && availability !== 'downloadable') {
                const errorMessage = 'Summarizer API is not available in your browser.\n\n' +
                    'To use this feature:\n' +
                    '• Use Chrome 138 or later\n' +
                    '• Make sure you allow the model download on first use\n\n' +
                    'Your profile has been saved successfully.';
                
                alert(`Failed to generate profile summary:\n\n${errorMessage}`);
                
                // Set a fallback message
                processStream(
                    async function*() {
                        yield 'Your travel profile has been successfully created. We will use your preferences to suggest the best routes and places to visit.';
                    }(),
                    {
                        initialMessage: 'Profile saved successfully'
                    }
                );
                return;
            }
            
            // Check user activation for downloadable model
            if (availability === 'downloadable') {
                if (!navigator.userActivation.isActive) {
                    alert('Please click the button again to confirm model download.');
                    return;
                }
                console.log('[SimpleProfileSetupChat] User activation confirmed, proceeding with model download');
            }
            
            // Create summarizer session if needed
            if (!hasSession) {
                console.log('[SimpleProfileSetupChat] Creating summarizer session...');
                await createSession({
                    sharedContext: 'This is a request to summarize a traveler profile in a friendly, conversational way.',
                    type: 'key-points',
                    format: 'markdown',
                    length: 'short'
                });
                console.log('[SimpleProfileSetupChat] Summarizer session created successfully');
            } else {
                console.log('[SimpleProfileSetupChat] Summarizer session already exists');
            }
            
            // Create profile text for summarization
            console.log('[SimpleProfileSetupChat] Creating profile summary prompt...');
            const profileText = createProfileSummaryPrompt(userProfile.toJSON());
            console.log('[SimpleProfileSetupChat] Profile summary prompt created, length:', profileText.length);
            
            // Generate summary using streaming
            console.log('[SimpleProfileSetupChat] Starting summarization...');
            const stream = await summarizeText(profileText);
            console.log('[SimpleProfileSetupChat] Summary stream received, processing...');
            
            await processStream(stream, {
                initialMessage: 'Generating your profile summary...',
                onComplete: () => {
                    console.log('[SimpleProfileSetupChat] Profile summary generated successfully');
                    // Don't call onComplete here - the modal should stay open
                },
                onError: (error) => {
                    console.error('[SimpleProfileSetupChat] Failed to generate summary:', error);
                }
            });
        } catch (error) {
            console.error('[SimpleProfileSetupChat] Error generating summary:', error);
            
            // Show user-friendly error message
            alert(`Failed to generate profile summary:\n\n${error.message}\n\nYour profile has been saved successfully.`);
            
            // Set a fallback message if summarization fails
            processStream(
                async function*() {
                    yield 'Your travel profile has been successfully created. We will use your preferences to suggest the best routes and places to visit.';
                }(),
                {
                    initialMessage: 'Generating your profile summary...'
                }
            );
        }
    };

    if (!userProfile) {
        return (
            <div className="simple-profile-chat">
                <div className="chat-container">
                    <div className="loading-message">
                        <h3>⏳ Initializing Profile Setup...</h3>
                        <p>Please wait while we prepare your profile setup.</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show profile summary page if all questions are completed
    if (showSummary) {
        return (
            <div className="simple-profile-chat">
                <div className="chat-container">
                    <div className="question-section">
                        <h3 className="question-text">📋 Profile Summary</h3>
                    </div>
                    <div style={{ marginTop: '20px' }}>
                        {summaryResponse ? (
                            // Show summary if already generated
                            <ResponseDisplay response={summaryResponse} />
                        ) : isLoadingSummary ? (
                            // Show loader while generating
                            <ChatLoadingAnimation />
                        ) : (
                            // Show button to generate summary
                            <div style={{ textAlign: 'center', padding: '40px' }}>
                                <button
                                    onClick={generateSummary}
                                    disabled={isLoadingSummary}
                                    style={{
                                        padding: '15px 30px',
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        backgroundColor: '#4CAF50',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: isLoadingSummary ? 'not-allowed' : 'pointer',
                                        opacity: isLoadingSummary ? 0.6 : 1,
                                        transition: 'all 0.3s ease'
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isLoadingSummary) {
                                            e.target.style.backgroundColor = '#45a049';
                                            e.target.style.transform = 'scale(1.05)';
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isLoadingSummary) {
                                            e.target.style.backgroundColor = '#4CAF50';
                                            e.target.style.transform = 'scale(1)';
                                        }
                                    }}
                                >
                                    ✨ Generate Profile Summary with AI
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (!currentQuestion) {
        return (
            <div className="simple-profile-chat">
                <div className="chat-container">
                    <div className="completion-message">
                        <h3>🎉 Profile Complete!</h3>
                        <p>Your travel profile has been successfully created.</p>
                        <div className="completion-stats">
                            <div className="stat">
                                <span className="label">Completion:</span>
                                <span className="value">{completionPercentage}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="simple-profile-chat">
            <div className="chat-container">
                {/* Progress bar */}
                <div className="progress-section">
                    <div className="progress-bar">
                        <div 
                            className="progress-fill" 
                            style={{ width: `${completionPercentage}%` }}
                        ></div>
                    </div>
                    <div className="progress-text">
                        {completionPercentage}% Complete
                    </div>
                </div>

                {/* Question */}
                <div className="question-section">
                    <h3 className="question-text">{currentQuestion.question}</h3>
                </div>

                {/* Answer options based on type */}
                <div className="answer-section">
                    {currentQuestion.type === 'single-choice' && (
                        <div className="single-choice-options">
                            {currentQuestion.options.map((option, index) => (
                                <button
                                    key={index}
                                    className={`option-button ${selectedAnswers.includes(option.value) ? 'selected' : ''}`}
                                    onClick={() => handleSingleChoice(option.value)}
                                    disabled={isProcessing}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    )}

                    {currentQuestion.type === 'multi-choice' && (
                        <div className="multi-choice-options">
                            {currentQuestion.options.map((option, index) => (
                                <label key={index} className="checkbox-option">
                                    <input
                                        type="checkbox"
                                        checked={selectedAnswers.includes(option.value)}
                                        onChange={() => handleMultiChoiceToggle(option.value)}
                                        disabled={isProcessing}
                                    />
                                    <span className="checkbox-label">{option.label}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {currentQuestion.type === 'time-range' && (
                        <div className="time-range-form">
                            <div className="time-inputs">
                                <div className="time-input">
                                    <label className="input-label">
                                        {currentQuestion.options.startHour.label}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        max="23"
                                        value={timeWindowAnswers.startHour}
                                        onChange={(e) => handleTimeWindowChange('startHour', e.target.value)}
                                        disabled={isProcessing}
                                    />
                                </div>
                                <div className="time-input">
                                    <label className="input-label">
                                        {currentQuestion.options.endHour.label}
                                    </label>
                                    <input
                                        type="number"
                                        min={timeWindowAnswers.startHour ? timeWindowAnswers.startHour + 1 : 0}
                                        max="23"
                                        value={timeWindowAnswers.endHour}
                                        onChange={(e) => handleTimeWindowChange('endHour', e.target.value)}
                                        disabled={isProcessing}
                                    />
                                </div>
                            </div>
                            {isTimeWindowInvalid() && (
                                <div className="validation-error">
                                    ⚠️ End time must be after start time
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Processing indicator */}
                {isProcessing && (
                    <div className="processing-indicator">
                        <div className="spinner"></div>
                        <span>Processing...</span>
                    </div>
                )}

                {/* Navigation buttons */}
                <div className="navigation-buttons">
                    <button
                        className="nav-button prev-button"
                        onClick={handlePrevious}
                        disabled={isProcessing || currentQuestionIndex === 0 || isTimeWindowInvalid()}
                    >
                        ← Previous
                    </button>
                    
                    <button
                        className="nav-button next-button"
                        onClick={handleNext}
                        disabled={isProcessing || isTimeWindowInvalid()}
                    >
                        {currentQuestionIndex >= questionHistory.length - 1 ? 'Complete' : 'Next →'}
                    </button>
                </div>

                {/* Progress info */}
                <div className="progress-info">
                    <small>
                        Question {currentQuestionIndex + 1} of {questionHistory.length}
                        {completionPercentage > 0 && ` • ${completionPercentage}% complete`}
                    </small>
                </div>

                {/* Action buttons */}
                <div className="action-buttons">
                    {completionPercentage > 0 && (
                        <div className="progress-info">
                            <small>
                                Your progress has been saved. You can continue later.
                            </small>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default SimpleProfileSetupChat;
