export default function ProgressBar({ value = 0 }) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className="w-full h-3 rounded-full bg-gradient-to-r from-gray-200 to-gray-100 overflow-hidden shadow-inner">
      <div
        className="h-3 transition-all duration-300 ease-out bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 animate-[shimmer_2.2s_linear_infinite] bg-[length:200%_100%]"
        style={{ width: `${clamped}%` }}
      />
      <style>{`@keyframes shimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }`}</style>
    </div>
  )
}


