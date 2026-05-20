function getVibeLevelFromScore(score, reviewCount) {
  if (reviewCount === 0) {
    return { label: "New", theme: "slate", locked: true };
  }

  if (reviewCount < 5) {
    return { label: "Early Signal", theme: "slate", locked: true };
  }

  if (score >= 4.5) return { label: "Exceptional", theme: "emerald" };
  if (score >= 4.0) return { label: "Excellent", theme: "teal" };
  if (score >= 3.5) return { label: "Good", theme: "cyan" };
  if (score >= 3.0) return { label: "Fair", theme: "amber" };
  if (score >= 2.5) return { label: "Needs Attention", theme: "orange" };
  if (score >= 2.0) return { label: "Poor", theme: "red" };
  return { label: "Critical", theme: "crimson" };
}
export default getVibeLevelFromScore;
