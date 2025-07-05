// utils/parseFormatOptions.js
export function parseFormatOptions(formatText) {
  if (!formatText || !formatText.includes("#Typ: numberHeadings")) return null;

  const lines = formatText.split(/\r?\n/).map(l => l.trim());
  const levelsLine = lines.find(l => l.startsWith("- Ebenen:"));
  const patternLine = lines.find(l => l.startsWith("- pattern:"));

  const levelsMatch = levelsLine?.match(/\[([0-9,\s]+)\]/);
  const patternMatch = patternLine?.match(/pattern:\s*"([^"]+)"/);

  const levels = levelsMatch
    ? levelsMatch[1].split(",").map(n => parseInt(n.trim(), 10))
    : [2, 3, 4];
  const pattern = patternMatch?.[1] || "%n.";

  console.log("📑 parseFormatOptions input:", formatText);
  console.log("✅ parseFormatOptions output:", {
    type: "numberHeadings",
    levels,
    pattern
  });

  return {
    type: "numberHeadings",
    levels,
    pattern,
  };
}
