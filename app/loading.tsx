export default function Loading() {
  return (
    <div className="flex items-center justify-center h-dvh">
      <div className="flex flex-col items-center gap-5">
        <div className="relative">
          <div className="absolute -inset-3 rounded-3xl border border-vox-purple/20 animate-pulse" />
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-vox-purple to-vox-blue flex items-center justify-center glow-purple">
            <span className="text-white text-2xl font-black">V</span>
          </div>
        </div>
        <div className="flex gap-1.5 items-center">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-vox-purple animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
