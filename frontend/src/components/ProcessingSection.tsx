import React from 'react';

interface ProcessingSectionProps {
  step: number;
  message: string;
}

export const ProcessingSection: React.FC<ProcessingSectionProps> = ({ step, message }) => {
  const steps = [
    { number: 1, text: 'Uploading', title: 'Uploading file...', msg: 'Preparing your audio file for processing', icon: '📤' },
    { number: 2, text: 'Converting', title: 'Converting audio...', msg: 'Optimizing audio format for transcription', icon: '🔄' },
    { number: 3, text: 'Transcribing', title: 'Transcribing speech...', msg: 'Converting speech to text using AI', icon: '🎧' },
    { number: 4, text: 'Analyzing', title: 'Analyzing content...', msg: 'Understanding context and extracting insights', icon: '🧠' },
    { number: 5, text: 'Generating', title: 'Generating notes...', msg: 'Creating structured meeting documentation', icon: '📝' }
  ];

  const currentStepInfo = steps[step - 1] || { 
    title: 'Processing...', 
    msg: message || 'Working on your request',
    icon: '⚡'
  };

  const progressPercentage = ((step - 1) / (steps.length - 1)) * 100;

  return (
    <section className="processing-section">
      <div className="processing-card">
        <div className="processing-header">
          <div className="processing-icon">{currentStepInfo.icon}</div>
          <h3>{currentStepInfo.title}</h3>
          <p>{message || currentStepInfo.msg}</p>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <span className="progress-text">Step {step} of {steps.length}</span>
        </div>

        <div className="progress-steps">
          {steps.map((stepInfo) => (
            <div 
              key={stepInfo.number}
              className={`step ${
                step > stepInfo.number ? 'completed' : 
                step === stepInfo.number ? 'active' : 
                'pending'
              }`}
            >
              <div className="step-circle">
                {step > stepInfo.number ? (
                  <span className="check-icon">✓</span>
                ) : (
                  <span className="step-number">{stepInfo.number}</span>
                )}
              </div>
              <span className="step-text">{stepInfo.text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};