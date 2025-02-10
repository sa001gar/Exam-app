import React, { useState, useEffect, useCallback } from 'react';
import { Timer } from './components/Timer';
import { mcqQuestions, saqQuestions } from './data/questions';
import { Student, ExamState, ExamStage } from './types';
import { GraduationCap, AlertCircle, CheckCircle2, CheckCircle } from 'lucide-react';

function App() {
  const [student, setStudent] = useState<Student | null>(null);
  const [examStage, setExamStage] = useState<ExamStage>('signin');
  const [examStarted, setExamStarted] = useState(false);
  const [examState, setExamState] = useState<ExamState>({
    mcqAnswers: {},
    saqAnswers: {},
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  const formatAnswers = useCallback((currentExamState: ExamState) => {
    let emailContent = '';

    // Student Information
    emailContent += `Student Information:\n\n`;
    emailContent += `Name: ${student?.name}\n`;
    emailContent += `Email: ${student?.email}\n`;
    emailContent += `GitHub Username: ${student?.githubUsername}\n`;
    emailContent += `Submission Time: ${new Date().toLocaleString()}\n`;
    emailContent += `Tab Switch: ${showWarning ? 'Yes' : 'No'}\n\n`;

    // MCQ Answers - Only include answered questions
    const answeredMCQs = Object.entries(currentExamState.mcqAnswers);
    if (answeredMCQs.length > 0) {
      emailContent += `Multiple Choice Questions:\n\n`;
      answeredMCQs.forEach(([questionId, answerIndex]) => {
        const question = mcqQuestions.find(q => q.id === parseInt(questionId));
        if (question) {
          emailContent += `Question ${questionId}: ${question.question}\n`;
          emailContent += `Selected Answer: ${question.options[answerIndex]}\n\n`;
        }
      });
    }

    // SAQ Answers - Only include answered questions
    const answeredSAQs = Object.entries(currentExamState.saqAnswers).filter(([_, answer]) => answer?.trim() !== '');
    if (answeredSAQs.length > 0) {
      emailContent += `Short Answer Questions:\n\n`;
      answeredSAQs.forEach(([questionId, answer]) => {
        const question = saqQuestions.find(q => q.id === parseInt(questionId));
        if (question) {
          emailContent += `Question ${questionId}: ${question.question}\n`;
          emailContent += `Answer: ${answer}\n\n`;
        }
      });
    }

    if (answeredMCQs.length === 0 && answeredSAQs.length === 0) {
      emailContent += `No questions were answered before submission.\n`;
    }

    return emailContent;
  }, [student, showWarning]);

  const handleSubmit = useCallback(async () => {
    if (isSubmitting || !student) return;
    setIsSubmitting(true);

    try {
      // Capture the current state immediately
      const currentExamState = examState;
      const emailContent = formatAnswers(currentExamState);
      const timestamp = new Date().toLocaleString();

      const formData = new FormData();
      formData.append('access_key', import.meta.env.VITE_WEB3FORMS_KEY);
      formData.append('from_name', 'Exam Data');
      formData.append('subject', `Exam Submission - ${student.name} (${timestamp})`);
      formData.append('message', emailContent);

      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setExamStarted(false);
        setExamStage('success');
      } else {
        throw new Error('Failed to submit exam');
      }
    } catch (error) {
      console.error('Error submitting exam:', error);
      alert('Failed to submit exam. Please contact your instructor.');
    } finally {
      setIsSubmitting(false);
      setShowWarning(false);
    }
  }, [student, examState, isSubmitting, showWarning, formatAnswers]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (examStarted && document.hidden) {
        setShowWarning(true);
        // Capture the current state before the timeout
        const currentState = examState;
        setTimeout(() => {
          // Use the captured state for submission
          setExamState(currentState);
          handleSubmit();
        }, 3000);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (examStarted) {
        e.preventDefault();
        e.returnValue = 'Changes you made may not be saved';
        return e.returnValue;
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (examStarted) {
        e.preventDefault();
        alert('Copy-paste is not allowed during the exam!');
      }
    };

    const handleKeyPress = (e: KeyboardEvent) => {
      if (examStarted && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      if (examStarted) {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleVisibilityChange);
    };
  }, [examStarted, examState, handleSubmit]);

  const resetSession = useCallback(() => {
    setStudent(null);
    setExamStage('signin');
    setExamStarted(false);
    setExamState({
      mcqAnswers: {},
      saqAnswers: {},
    });
    setIsSubmitting(false);
    setShowWarning(false);
  }, []);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setExamStage('rules');
  };

  const handleStartExam = () => {
    setExamStage('exam');
    setExamStarted(true);
  };

  if (examStage === 'success') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg border-4 border-amber-900 text-center">
          <div className="flex items-center justify-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4 text-amber-900 font-mono">
            Exam Submitted Successfully!
          </h1>
          <p className="text-gray-600 mb-8">
            Thank you for completing the Web Development exam. Your responses have been recorded.
          </p>
          <button
            onClick={resetSession}
            className="w-full bg-amber-900 text-white py-2 rounded-md hover:bg-amber-800 transition-colors font-mono"
          >
            Return to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (examStage === 'signin') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-lg border-4 border-amber-900">
          <div className="flex items-center justify-center mb-6">
            <GraduationCap className="w-12 h-12 text-amber-900" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-8 text-amber-900 font-mono">
            Web Development Exam
          </h1>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">
                Full Name
              </label>
              <input
                required
                type="text"
                className="w-full px-3 py-2 border-2 border-amber-900 rounded-md"
                onChange={(e) =>
                  setStudent((prev) => ({ ...prev, name: e.target.value } as Student))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">
                Email
              </label>
              <input
                required
                type="email"
                className="w-full px-3 py-2 border-2 border-amber-900 rounded-md"
                onChange={(e) =>
                  setStudent((prev) => ({ ...prev, email: e.target.value } as Student))
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-amber-900 mb-1">
                GitHub Username
              </label>
              <input
                required
                type="text"
                className="w-full px-3 py-2 border-2 border-amber-900 rounded-md"
                onChange={(e) =>
                  setStudent((prev) => ({
                    ...prev,
                    githubUsername: e.target.value,
                  } as Student))
                }
              />
            </div>
            <button
              type="submit"
              className="w-full bg-amber-900 text-white py-2 rounded-md hover:bg-amber-800 transition-colors font-mono disabled:opacity-50"
              disabled={isSubmitting}
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (examStage === 'rules') {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white p-8 rounded-lg shadow-lg border-4 border-amber-900">
          <div className="flex items-center justify-center mb-6">
            <AlertCircle className="w-12 h-12 text-amber-900" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-8 text-amber-900 font-mono">
            Exam Rules & Guidelines
          </h1>
          <div className="space-y-4 mb-8">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-amber-900 mt-1 flex-shrink-0" />
              <p>The exam duration is 30 minutes. Once started, the timer cannot be paused.</p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-amber-900 mt-1 flex-shrink-0" />
              <p>The exam consists of 10 Multiple Choice Questions (MCQs) and 10 Short Answer Questions (SAQs).</p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-amber-900 mt-1 flex-shrink-0" />
              <p>Switching tabs or windows will give you a 3-second warning before automatically submitting your exam.</p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-amber-900 mt-1 flex-shrink-0" />
              <p>Copy-paste functionality is disabled during the exam.</p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-amber-900 mt-1 flex-shrink-0" />
              <p>Right-clicking and keyboard shortcuts are disabled during the exam.</p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-amber-900 mt-1 flex-shrink-0" />
              <p>Ensure you have a stable internet connection throughout the exam.</p>
            </div>
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="w-5 h-5 text-amber-900 mt-1 flex-shrink-0" />
              <p>Your answers will be automatically saved and submitted when the timer ends.</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={() => setExamStage('signin')}
              className="px-6 py-2 text-amber-900 border-2 border-amber-900 rounded-md hover:bg-amber-50 transition-colors font-mono"
            >
              Go Back
            </button>
            <button
              onClick={handleStartExam}
              className="px-6 py-2 bg-amber-900 text-white rounded-md hover:bg-amber-800 transition-colors font-mono"
            >
              Start Exam
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-amber-50 p-6">
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Warning!</h2>
            <p className="mb-4">You are attempting to leave the exam page. Your exam will be automatically submitted in 3 seconds.</p>
            <div className="animate-pulse bg-red-100 text-red-600 py-2 rounded-md">
              Please return to the exam tab immediately!
            </div>
          </div>
        </div>
      )}
      <div className="max-w-3xl mx-auto">
        <div className="bg-white p-8 rounded-lg shadow-lg border-4 border-amber-900 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-amber-900 font-mono">
              Web Development Exam
            </h1>
            <Timer duration={1800} onTimeUp={handleSubmit} />
          </div>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-bold mb-4 text-amber-900 font-mono">
                Multiple Choice Questions
              </h2>
              {mcqQuestions.map((q) => (
                <div key={q.id} className="mb-6">
                  <p className="mb-2 font-medium">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((option, idx) => (
                      <label key={idx} className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name={`mcq-${q.id}`}
                          value={idx}
                          onChange={(e) =>
                            setExamState((prev) => ({
                              ...prev,
                              mcqAnswers: {
                                ...prev.mcqAnswers,
                                [q.id]: parseInt(e.target.value),
                              },
                            }))
                          }
                          className="text-amber-900"
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 text-amber-900 font-mono">
                Short Answer Questions
              </h2>
              {saqQuestions.map((q) => (
                <div key={q.id} className="mb-6">
                  <p className="mb-2 font-medium">{q.question}</p>
                  <textarea
                    className="w-full p-2 border-2 border-amber-900 rounded-md"
                    rows={4}
                    onChange={(e) =>
                      setExamState((prev) => ({
                        ...prev,
                        saqAnswers: {
                          ...prev.saqAnswers,
                          [q.id]: e.target.value,
                        },
                      }))
                    }
                  />
                </div>
              ))}
            </section>

            <button
              onClick={handleSubmit}
              className="w-full bg-amber-900 text-white py-2 rounded-md hover:bg-amber-800 transition-colors font-mono disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Exam'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;