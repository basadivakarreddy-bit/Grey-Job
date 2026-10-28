import React, { useState } from 'react';
import {
  X,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { TestResult } from '../types';
import { runAllTests } from '../utils/testRunner';

interface TestRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TestRunnerModal: React.FC<TestRunnerModalProps> = ({ isOpen, onClose }) => {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [hasRun, setHasRun] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRun = async () => {
    setIsRunning(true);
    setHasRun(true);
    try {
      const finalResults = await runAllTests((currentResults) => {
        setTests(currentResults);
      });
      setTests(finalResults);
    } catch (err) {
      console.error('Test suite execution error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const passedCount = tests.filter((t) => t.status === 'passed').length;
  const failedCount = tests.filter((t) => t.status === 'failed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                grey-job Specification Test Suite (15 Tests)
              </h2>
              <p className="text-xs text-neutral-500">
                Automated validation of all acceptance criteria & security invariants
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action bar */}
        <div className="px-4 py-3 bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs font-mono">
            {hasRun ? (
              <>
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Passed: {passedCount}/15
                </span>
                {failedCount > 0 && (
                  <span className="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-medium">
                    <XCircle className="w-3.5 h-3.5" />
                    Failed: {failedCount}
                  </span>
                )}
              </>
            ) : (
              <span className="text-neutral-500">Ready to execute tests</span>
            )}
          </div>

          <button
            onClick={handleRun}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white rounded-md disabled:opacity-50 transition-colors shadow-xs"
          >
            {isRunning ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Running tests...</span>
              </>
            ) : hasRun ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Rerun All Tests</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Run 15 Tests</span>
              </>
            )}
          </button>
        </div>

        {/* Test List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
          {!hasRun ? (
            <div className="py-12 text-center text-neutral-400">
              Click &quot;Run 15 Tests&quot; above to execute the test suite against the live SQLite
              backend, IndexedDB, XSS guards, and route handlers.
            </div>
          ) : (
            tests.map((test) => (
              <div
                key={test.id}
                className={`p-3 rounded-md border transition-colors ${
                  test.status === 'passed'
                    ? 'border-emerald-200 dark:border-emerald-950 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : test.status === 'failed'
                    ? 'border-rose-200 dark:border-rose-950 bg-rose-50/40 dark:bg-rose-950/20'
                    : test.status === 'running'
                    ? 'border-neutral-300 dark:border-neutral-700 bg-neutral-100/50 dark:bg-neutral-800/50'
                    : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-medium text-neutral-900 dark:text-neutral-100">
                    {test.status === 'passed' && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    )}
                    {test.status === 'failed' && (
                      <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                    )}
                    {test.status === 'running' && (
                      <Clock className="w-4 h-4 text-neutral-500 animate-spin shrink-0" />
                    )}
                    {test.status === 'pending' && (
                      <div className="w-4 h-4 rounded-full border border-neutral-300 shrink-0" />
                    )}
                    <span>{test.title}</span>
                  </div>

                  {test.durationMs !== undefined && (
                    <span className="text-[11px] text-neutral-400">{test.durationMs}ms</span>
                  )}
                </div>

                <div className="mt-1 text-neutral-500 dark:text-neutral-400 text-[11px] pl-6 font-sans">
                  {test.description}
                </div>

                {test.message && (
                  <div
                    className={`mt-1.5 text-[11px] pl-6 ${
                      test.status === 'passed'
                        ? 'text-emerald-700 dark:text-emerald-300'
                        : 'text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    ↳ {test.message}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50 flex items-center justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-neutral-400" />
            <span>Node.js SQLite WAL + IndexedDB + Service Worker</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
