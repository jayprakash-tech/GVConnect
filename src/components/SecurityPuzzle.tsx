import { useState, useMemo } from 'react';
import { ShieldCheck, RotateCcw, RotateCw, CheckCircle2 } from 'lucide-react';

interface SecurityPuzzleProps {
  onSolved: (token: string) => void;
  solved: boolean;
}

export function SecurityPuzzle({ onSolved, solved }: SecurityPuzzleProps) {
  const [targetAngle, setTargetAngle] = useState<number>(() => {
    const presets = [90, 135, 180, 225, 270];
    return presets[Math.floor(Math.random() * presets.length)];
  });
  const [angle, setAngle] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  const diff = useMemo(() => {
    const raw = Math.abs((angle % 360) - (targetAngle % 360));
    return raw > 180 ? 360 - raw : raw;
  }, [angle, targetAngle]);

  const isAligned = diff <= 12;

  const handleSliderChange = (nextVal: number) => {
    if (solved) return;
    setAngle(nextVal);
    setFeedback('');
  };

  const handleStep = (delta: number) => {
    if (solved) return;
    setAngle((prev) => (prev + delta + 360) % 360);
    setFeedback('');
  };

  const handleVerifyPuzzle = () => {
    if (solved) return;
    if (isAligned) {
      const token = `pzl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setFeedback('Security alignment confirmed.');
      onSolved(token);
    } else {
      setAttempts((a) => a + 1);
      setFeedback('Rotate the gold marker until it aligns with the crimson target notch.');
    }
  };

  const handleResetPuzzle = () => {
    if (solved) return;
    const presets = [60, 120, 180, 240, 300];
    setTargetAngle(presets[Math.floor(Math.random() * presets.length)]);
    setAngle(0);
    setFeedback('');
  };

  return (
    <div className="rounded-xl border border-white/12 bg-[#120409]/90 p-5 text-white">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#ffcf8a]" />
            Security Verification Puzzle
          </p>
          <p className="text-xs text-white/65 mt-1">
            Align the rotating gold crest indicator with the crimson target marker.
          </p>
        </div>
        {solved && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 whitespace-nowrap shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            Solved
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div
          className="relative w-28 h-28 rounded-full border-2 border-[#d4af37]/30 bg-[#1a060e] flex items-center justify-center shrink-0 select-none"
          aria-label={`Security alignment dial, current angle ${angle} degrees, target ${targetAngle} degrees`}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `rotate(${targetAngle}deg)` }}
          >
            <div className="w-3.5 h-3.5 bg-[#800020] rounded-full mx-auto -mt-1.5 ring-2 ring-[#ffcf8a]" />
          </div>

          <div
            className="absolute inset-2 rounded-full border border-dashed border-[#d4af37]/60 flex items-start justify-center transition-transform duration-150"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div className="w-3.5 h-3.5 bg-[#ffcf8a] border-2 border-[#120409] rounded-full -mt-1.5 shadow-[0_0_10px_rgba(255,207,138,0.8)]" />
          </div>

          <span className="text-xs font-mono-tabular text-[#ffcf8a] font-semibold">
            {solved ? 'OK' : `${angle}°`}
          </span>
        </div>

        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStep(-15)}
              disabled={solved}
              aria-label="Rotate left 15 degrees"
              className="p-2 rounded-lg border border-white/15 bg-[#1a060e] text-[#ffcf8a] hover:border-[#d4af37] disabled:opacity-45 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <input
              type="range"
              min={0}
              max={345}
              step={15}
              value={angle}
              disabled={solved}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              aria-label="Rotate security emblem"
              className="flex-1 accent-[#d4af37] cursor-pointer"
            />

            <button
              type="button"
              onClick={() => handleStep(15)}
              disabled={solved}
              aria-label="Rotate right 15 degrees"
              className="p-2 rounded-lg border border-white/15 bg-[#1a060e] text-[#ffcf8a] hover:border-[#d4af37] disabled:opacity-45 transition-colors cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleVerifyPuzzle}
              disabled={solved}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                solved
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 cursor-default'
                  : 'bg-[#d4af37] text-[#1c040b] hover:bg-[#ffcf8a]'
              }`}
            >
              {solved ? 'Puzzle Verified' : 'Verify Alignment'}
            </button>

            {!solved && (
              <button
                type="button"
                onClick={handleResetPuzzle}
                className="text-xs text-white/65 hover:text-[#ffcf8a] underline-offset-2 hover:underline cursor-pointer"
              >
                New Challenge
              </button>
            )}
          </div>

          {feedback && (
            <p className={`text-xs ${solved ? 'text-emerald-300' : 'text-[#ffcf8a]'}`}>
              {feedback}{' '}
              {attempts > 1 && !solved
                ? '(Tip: align the glowing gold dot directly with the crimson ring marker)'
                : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
