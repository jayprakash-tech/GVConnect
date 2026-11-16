import { useState, useMemo } from 'react';
import { ShieldCheck, RotateCcw, RotateCw, CheckCircle2 } from 'lucide-react';

interface SecurityPuzzleProps {
  onSolved: (token: string) => void;
  solved: boolean;
}

export function SecurityPuzzle({ onSolved, solved }: SecurityPuzzleProps) {
  // Deterministic initial offset away from 0 deg so the user must interact
  const [targetAngle, setTargetAngle] = useState<number>(() => {
    const presets = [90, 135, 180, 225, 270];
    return presets[Math.floor(Math.random() * presets.length)];
  });
  const [angle, setAngle] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');

  // Shortest angular distance in degrees (0..180)
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
    setAngle((prev) => {
      const next = (prev + delta + 360) % 360;
      return next;
    });
    setFeedback('');
  };

  const handleVerifyPuzzle = () => {
    if (solved) return;
    if (isAligned) {
      const token = `pzl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setFeedback('Security verification complete.');
      onSolved(token);
    } else {
      setAttempts((a) => a + 1);
      setFeedback('Rotate the gold marker until it aligns with the target notch.');
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
    <div className="rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-sm font-semibold text-[#1a1a1a] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#800020]" />
            Security Verification Puzzle
          </p>
          <p className="text-xs text-[#525252] mt-1">
            Align the rotating gold crest indicator with the maroon target marker.
          </p>
        </div>
        {solved && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] whitespace-nowrap shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            Solved
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Interactive Alignment Dial */}
        <div
          className="relative w-28 h-28 rounded-full border-2 border-[#e5e5e5] bg-white flex items-center justify-center shrink-0 select-none"
          aria-label={`Security alignment dial, current angle ${angle} degrees, target ${targetAngle} degrees`}
        >
          {/* Target Notch */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ transform: `rotate(${targetAngle}deg)` }}
          >
            <div className="w-3 h-3 bg-[#800020] rounded-full mx-auto -mt-1.5 ring-2 ring-white" />
          </div>

          {/* Rotating Pointer */}
          <div
            className="absolute inset-2 rounded-full border border-dashed border-[#D4AF37]/70 flex items-start justify-center transition-transform duration-150"
            style={{ transform: `rotate(${angle}deg)` }}
          >
            <div className="w-3.5 h-3.5 bg-[#D4AF37] border-2 border-[#800020] rounded-full -mt-1.5" />
          </div>

          <span className="text-xs font-mono tabular-nums text-[#525252] font-semibold">
            {solved ? 'OK' : `${angle}°`}
          </span>
        </div>

        {/* Slider & Accessible Step Controls */}
        <div className="flex-1 w-full space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStep(-15)}
              disabled={solved}
              aria-label="Rotate left 15 degrees"
              className="p-2 rounded-lg border border-[#e5e5e5] bg-white text-[#1a1a1a] hover:border-[#800020] disabled:opacity-50 transition-colors"
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
              className="flex-1 accent-[#800020] cursor-pointer"
            />

            <button
              type="button"
              onClick={() => handleStep(15)}
              disabled={solved}
              aria-label="Rotate right 15 degrees"
              className="p-2 rounded-lg border border-[#e5e5e5] bg-white text-[#1a1a1a] hover:border-[#800020] disabled:opacity-50 transition-colors"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleVerifyPuzzle}
              disabled={solved}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                solved
                  ? 'bg-[#dcfce7] text-[#166534] cursor-default'
                  : 'bg-[#800020] text-[#D4AF37] hover:bg-[#600018]'
              }`}
            >
              {solved ? 'Puzzle Verified' : 'Verify Alignment'}
            </button>

            {!solved && (
              <button
                type="button"
                onClick={handleResetPuzzle}
                className="text-xs text-[#525252] hover:text-[#1a1a1a] underline-offset-2 hover:underline"
              >
                New Challenge
              </button>
            )}
          </div>

          {feedback && (
            <p className={`text-xs ${solved ? 'text-[#166534]' : 'text-[#800020]'}`}>
              {feedback} {attempts > 1 && !solved ? '(Tip: move slider until the gold dot meets the maroon dot)' : ''}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
