import React, { useState, useEffect } from 'react';
import { UserProfile } from '../models/UserProfile.js';
import { 
    getNextQuestion, 
    processAnswer, 
    getCompletionPercentage 
} from '../services/SimpleProfileConfig.js';

/**
 * Simple profile setup chat component with predefined questions and answers
 */
export default function SimpleProfileSetupChat({ 
    userProfile, 
    onProfileUpdate, 
    onComplete 
}) {
    const [currentQuestion, setCurrentQuestion] = useState(null);
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
        setSelectedAnswers([]);
        setDietaryAnswers({
            vegan: false,
            vegetarian: false,
            glutenFree: false,
            halal: false,
            kosher: false,
            allergies: ''
        });
        setTimeWindowAnswers({
            startHour: 9,
            endHour: 18
        });
    };

    // Initialize with first question
    useEffect(() => {
        if (userProfile) {
            const nextQuestion = getNextQuestion(userProfile);
            setCurrentQuestion(nextQuestion);
            setCompletionPercentage(getCompletionPercentage(userProfile));
            // Reset all answer states when moving to new question
            resetAnswerStates();
        }
    }, [userProfile]);

    const handleSingleChoice = (value) => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        
        // Process the answer
        const success = processAnswer(userProfile, currentQuestion.field, value);
        
        if (success) {
            // Update profile
            onProfileUpdate(userProfile);
            
            // Move to next question
            const nextQuestion = getNextQuestion(userProfile);
            if (nextQuestion) {
                setCurrentQuestion(nextQuestion);
                setCompletionPercentage(getCompletionPercentage(userProfile));
                // Reset all answer states for next question
                resetAnswerStates();
            } else {
                // Profile is complete
                onComplete(userProfile);
            }
        } else {
            console.error('Failed to process answer');
        }
        
        setIsProcessing(false);
    };

    const handleMultiChoice = () => {
        if (isProcessing || selectedAnswers.length === 0) return;
        
        setIsProcessing(true);
        
        // Process the answer
        const success = processAnswer(userProfile, currentQuestion.field, selectedAnswers);
        
        if (success) {
            // Update profile
            onProfileUpdate(userProfile);
            
            // Move to next question
            const nextQuestion = getNextQuestion(userProfile);
            if (nextQuestion) {
                setCurrentQuestion(nextQuestion);
                setCompletionPercentage(getCompletionPercentage(userProfile));
                // Reset all answer states for next question
                resetAnswerStates();
            } else {
                // Profile is complete
                onComplete(userProfile);
            }
        } else {
            console.error('Failed to process answer');
        }
        
        setIsProcessing(false);
    };

    const handleDietarySubmit = () => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        
        // Process allergies
        const allergies = dietaryAnswers.allergies
            .split(',')
            .map(allergy => allergy.trim())
            .filter(allergy => allergy.length > 0);
        
        const dietaryData = {
            ...dietaryAnswers,
            allergies
        };
        
        // Process the answer
        const success = processAnswer(userProfile, currentQuestion.field, dietaryData);
        
        if (success) {
            // Update profile
            onProfileUpdate(userProfile);
            
            // Move to next question
            const nextQuestion = getNextQuestion(userProfile);
            if (nextQuestion) {
                setCurrentQuestion(nextQuestion);
                setCompletionPercentage(getCompletionPercentage(userProfile));
                // Reset all answer states for next question
                resetAnswerStates();
            } else {
                // Profile is complete
                onComplete(userProfile);
            }
        } else {
            console.error('Failed to process dietary answer');
        }
        
        setIsProcessing(false);
    };

    const handleTimeWindowSubmit = () => {
        if (isProcessing) return;
        
        setIsProcessing(true);
        
        // Process the answer
        const success = processAnswer(userProfile, currentQuestion.field, timeWindowAnswers);
        
        if (success) {
            // Update profile
            onProfileUpdate(userProfile);
            
            // Move to next question
            const nextQuestion = getNextQuestion(userProfile);
            if (nextQuestion) {
                setCurrentQuestion(nextQuestion);
                setCompletionPercentage(getCompletionPercentage(userProfile));
                // Reset all answer states for next question
                resetAnswerStates();
            } else {
                // Profile is complete
                onComplete(userProfile);
            }
        } else {
            console.error('Failed to process time window answer');
        }
        
        setIsProcessing(false);
    };

    const handleMultiChoiceToggle = (value) => {
        setSelectedAnswers(prev => {
            if (prev.includes(value)) {
                return prev.filter(item => item !== value);
            } else {
                return [...prev, value];
            }
        });
    };

    const handleDietaryToggle = (key) => {
        setDietaryAnswers(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const handleTimeWindowChange = (key, value) => {
        setTimeWindowAnswers(prev => ({
            ...prev,
            [key]: parseInt(value) || 0
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
                                    className="option-button"
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
                            <button
                                className="submit-button"
                                onClick={handleMultiChoice}
                                disabled={isProcessing || selectedAnswers.length === 0}
                            >
                                Continue
                            </button>
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
                            <button
                                className="submit-button"
                                onClick={handleDietarySubmit}
                                disabled={isProcessing}
                            >
                                Continue
                            </button>
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
                                        min="0"
                                        max="23"
                                        value={timeWindowAnswers.endHour}
                                        onChange={(e) => handleTimeWindowChange('endHour', e.target.value)}
                                        disabled={isProcessing}
                                    />
                                </div>
                            </div>
                            <button
                                className="submit-button"
                                onClick={handleTimeWindowSubmit}
                                disabled={isProcessing}
                            >
                                Continue
                            </button>
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

                {/* Action buttons */}
                <div className="action-buttons">
                    <button
                        className="save-exit-button"
                        onClick={() => {
                            // Save current progress and exit
                            onProfileUpdate(userProfile);
                            onComplete(userProfile);
                        }}
                        disabled={isProcessing}
                    >
                        💾 Save & Exit
                    </button>
                    
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
