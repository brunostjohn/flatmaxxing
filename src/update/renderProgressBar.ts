const barWidth = 24;
const filledChar = "█";
const emptyChar = "░";

const formatMegabytes = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export const renderProgressBar = (downloaded: number, total: number) => {
  const ratio = total > 0 ? Math.min(1, downloaded / total) : 0;
  const filled = Math.round(ratio * barWidth);
  const bar = `${filledChar.repeat(filled)}${emptyChar.repeat(barWidth - filled)}`;
  const percent = Math.round(ratio * 100);
  const totalLabel = total > 0 ? formatMegabytes(total) : "?";
  return `[${bar}] ${percent}%  ${formatMegabytes(downloaded)} / ${totalLabel}`;
};
