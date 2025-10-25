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

/**
 * Simple profile setup chat component with predefined questions and answers
 */
export default function SimpleProfileSetupChat({ 
    userProfile, 
    onProfileUpdate, 
    onComplete 
}) {
    const [currentQuestion, setCurrentQuestion] = useState(null);
    const [questionHistory, setQuestionHistory] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState([]);
    const [dietaryAnswers, setDietaryAnswers] = useState({
        vegan: false,
        vegetarian: false,
        glutenFree: false,
        halal: false,
        kosher: false,
        allergies: ''
    });
    const [timeWindowAnswers, setTimeWindowAnswers] = useState({
        startHour: 9,
        endHour: 18
    });
    const [isProcessing, setIsProcessing] = useState(false);
    const [completionPercentage, setCompletionPercentage] = useState(0);

    // Helper function to reset all answer states
    const resetAnswerStates = () => {
        ProfileQuestionUtils.resetAnswerStates(setSelectedAnswers, setDietaryAnswers, setTimeWindowAnswers);
    };

    // Load current values from profile when question changes
    const loadCurrentValues = () => {
        ProfileQuestionUtils.loadCurrentValues(
            currentQuestion, 
            userProfile, 
            setSelectedAnswers, 
            setDietaryAnswers, 
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

    const handleDietaryChange = (field, value) => {
        if (isProcessing) return;
        setDietaryAnswers(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleTimeWindowChange = (field, value) => {
        if (isProcessing) return;
        
        const newValue = parseInt(value);
        
        setTimeWindowAnswers(prev => {
            const newAnswers = {
                ...prev,
                [field]: newValue
            };
            
            // Validate that endHour > startHour
            if (newAnswers.startHour !== undefined && newAnswers.endHour !== undefined) {
                if (newAnswers.endHour <= newAnswers.startHour) {
                    // If validation fails, don't update the state
                    console.warn('Invalid time window: endHour must be greater than startHour');
                    return prev;
                }
            }
            
            return newAnswers;
        });
    };

    const saveCurrentAnswer = () => {
        if (isProcessing || !currentQuestion) return;
        
        setIsProcessing(true);
        
        // Get answer value using utility class
        const answer = ProfileQuestionUtils.getAnswerValue(
            currentQuestion, 
            selectedAnswers, 
            dietaryAnswers, 
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
    };

    // Helper function to navigate to a question after saving
    const navigateToQuestion = (direction) => {
        setTimeout(() => {
            setCurrentQuestionIndex(prev => direction === 'next' ? prev + 1 : prev - 1);
        }, 100);
    };

    const handleNext = () => {
        if (isProcessing || currentQuestionIndex >= questionHistory.length - 1) return;
        
        // Check for validation errors before saving
        if (isTimeWindowInvalid()) {
            console.warn('Cannot proceed: invalid time window');
            return;
        }
        
        // Save current answer before moving to next question
        saveCurrentAnswer();
        
        // Move to next question after a short delay to allow save to complete
        navigateToQuestion('next');
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

    const handleDietaryToggle = (key) => {
        setDietaryAnswers(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
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

                    {currentQuestion.type === 'dietary-form' && (
                        <div className="dietary-form">
                            <div className="dietary-checkboxes">
                                {currentQuestion.options.map((option, index) => (
                                    <label key={index} className="checkbox-option">
                                        <input
                                            type="checkbox"
                                            checked={dietaryAnswers[option.key]}
                                            onChange={() => handleDietaryToggle(option.key)}
                                            disabled={isProcessing}
                                        />
                                        <span className="checkbox-label">{option.label}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="allergies-input">
                                <label className="input-label">
                                    {currentQuestion.allergiesPrompt}
                                </label>
                                <input
                                    type="text"
                                    value={dietaryAnswers.allergies}
                                    onChange={(e) => setDietaryAnswers(prev => ({
                                        ...prev,
                                        allergies: e.target.value
                                    }))}
                                    placeholder="e.g., nuts, shellfish"
                                    disabled={isProcessing}
                                />
                            </div>
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
                        disabled={isProcessing || currentQuestionIndex >= questionHistory.length - 1 || isTimeWindowInvalid()}
                    >
                        Next →
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
}
