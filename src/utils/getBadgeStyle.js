export const getBadgeStyle = (no) => {
  const n = parseInt(no);
  const base = 'border-2 shadow-sm box-border';
  if (n === 1) return `${base} bg-white text-slate-900 border-slate-900`;
  if (n === 2) return `${base} bg-yellow-400 text-slate-900 border-yellow-400`;
  if (n === 3) return `${base} bg-red-600 text-white border-red-600`;
  if (n === 4) return `${base} bg-slate-900 text-white border-slate-900`;
  if (n === 5) return `${base} bg-blue-600 text-white border-blue-600`;
  if (n === 6) return `${base} bg-green-600 text-white border-green-600`;
  if (n === 7) return `${base} bg-[#8B4513] text-white border-[#8B4513]`;
  if (n === 8) return `${base} bg-pink-400 text-white border-pink-400`;
  if (n === 9) return `${base} bg-purple-700 text-white border-purple-700`;
  if (n === 10) return `${base} bg-[#2ad0e4] text-slate-900 border-[#2ad0e4]`;
  if (n === 11) return `${base} bg-white text-[#005c42] border-[#005c42]`;
  if (n === 12) return `${base} bg-yellow-400 text-[#005c42] border-[#005c42]`;
  return `${base} bg-slate-200 text-slate-500 border-slate-300`;
};

