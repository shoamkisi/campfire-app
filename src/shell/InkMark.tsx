/** A short pen stroke. Used under the current tab and under "listen". */
export function InkMark({ width = 22 }: { width?: number }) {
  return (
    <svg className="ink" viewBox="0 0 36 7" width={width} height={6} aria-hidden="true">
      <path d="M1 4.1 C 7 2.4, 11 5.6, 18 3.6 S 29 2.7, 35 4.4" />
    </svg>
  );
}
