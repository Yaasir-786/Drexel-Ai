// Onboarding flow: full-screen 4-step wizard with single question per step
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';
import Button from '../components/Button';

export default function Onboarding() {
  const navigate = useNavigate();

  // Wizard state (1 to 4)
  const [step, setStep] = useState(1);

  // Form responses
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [projectIdea, setProjectIdea] = useState('');
  const [teamSize, setTeamSize] = useState('');

  // Options for step 2 and step 4
  const roleOptions = ['Student', 'Developer', 'Designer', 'Founder', 'Other'];
  const teamOptions = ['Just me', '2-5', '6-20', '21-50', '50+'];

  // Check if current step is valid to proceed
  const isStepValid = () => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return role !== '';
    if (step === 3) return projectIdea.trim().length > 0;
    if (step === 4) return teamSize !== '';
    return false;
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      // Step 4 "Finish" navigates to /chat
      navigate('/chat');
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col justify-between relative overflow-hidden select-none">
      {/* Soft pastel blurred background circles */}
      <div
        className="absolute top-10 left-10 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-10 right-10 w-96 h-96 rounded-full bg-purple-500/10 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Header Section */}
      <div className="relative z-20">
        {/* Full-width thin progress bar */}
        <div className="w-full h-1 bg-surface border-b border-line">
          <div
            className="h-full bg-primary-gradient"
            style={{ width: `${(step / 4) * 100}%` }}
          />
        </div>

        {/* Navigation row */}
        <header className="px-6 py-4 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            disabled={step === 1}
            className={`inline-flex items-center gap-1.5 text-sm font-medium ${
              step === 1
                ? 'opacity-30 cursor-not-allowed text-muted'
                : 'text-muted hover:text-ink cursor-pointer'
            }`}
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <span className="text-sm font-medium text-muted">
            {step} of 4
          </span>

          <ThemeToggle />
        </header>
      </div>

      {/* Center Content Section: max width 560px */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 w-full max-w-[560px] mx-auto">
        <div className="w-full flex flex-col gap-8">
          {/* Step 1: Name */}
          {step === 1 && (
            <div className="flex flex-col gap-6 text-center">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-ink">
                What's your name?
              </h1>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                autoFocus
                className="w-full h-14 px-4 text-lg rounded-xl border border-line bg-card text-ink outline-none focus:ring-2 focus:ring-[#0099FF] text-center"
              />
            </div>
          )}

          {/* Step 2: Role */}
          {step === 2 && (
            <div className="flex flex-col gap-6 text-center">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-ink">
                What best describes your role?
              </h1>
              <div className="flex flex-col gap-2.5 text-left">
                {roleOptions.map((option) => {
                  const isSelected = role === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setRole(option)}
                      className={`h-12 px-4 rounded-xl border flex items-center justify-between text-sm font-medium cursor-pointer ${
                        isSelected
                          ? 'border-[#0099FF] bg-blue-50/60 dark:bg-blue-950/40 text-ink'
                          : 'border-line bg-card text-muted hover:bg-surface hover:text-ink'
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && (
                        <CheckCircle2 size={20} className="text-[#0099FF]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Project Idea */}
          {step === 3 && (
            <div className="flex flex-col gap-6 text-center">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-ink">
                What do you want to build?
              </h1>
              <textarea
                rows={5}
                value={projectIdea}
                onChange={(e) => setProjectIdea(e.target.value)}
                placeholder="e.g. An AI-powered personal financial dashboard with charts..."
                autoFocus
                className="w-full p-4 text-base rounded-xl border border-line bg-card text-ink outline-none focus:ring-2 focus:ring-[#0099FF] resize-none"
              />
            </div>
          )}

          {/* Step 4: Team Size */}
          {step === 4 && (
            <div className="flex flex-col gap-6 text-center">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-ink">
                How big is your team?
              </h1>
              <div className="flex flex-col gap-2.5 text-left">
                {teamOptions.map((option) => {
                  const isSelected = teamSize === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setTeamSize(option)}
                      className={`h-12 px-4 rounded-xl border flex items-center justify-between text-sm font-medium cursor-pointer ${
                        isSelected
                          ? 'border-[#0099FF] bg-blue-50/60 dark:bg-blue-950/40 text-ink'
                          : 'border-line bg-card text-muted hover:bg-surface hover:text-ink'
                      }`}
                    >
                      <span>{option}</span>
                      {isSelected && (
                        <CheckCircle2 size={20} className="text-[#0099FF]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Centered Continue / Finish button */}
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="primary"
              onClick={handleNext}
              disabled={!isStepValid()}
              className="px-10 text-base"
            >
              {step === 4 ? 'Finish' : 'Continue'}
            </Button>
          </div>
        </div>
      </main>

      {/* Spacer footer to balance vertically */}
      <footer className="h-14" />
    </div>
  );
}
