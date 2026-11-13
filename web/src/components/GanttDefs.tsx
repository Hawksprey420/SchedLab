import { labelColor, type HatchPattern, type ProcessStyle } from "../lib/processStyle";

const SIZE = 8;

/** The hatch lines of one pattern, drawn in the colour the bar's label uses so they stay in tune with it. */
function hatchShapes(pattern: HatchPattern) {
  switch (pattern) {
    case "diagonal":
      return <path d={`M-2,2 l4,-4 M0,${SIZE} l${SIZE},-${SIZE} M${SIZE - 2},${SIZE + 2} l4,-4`} />;
    case "reverse-diagonal":
      return <path d={`M-2,${SIZE - 2} l4,4 M0,0 l${SIZE},${SIZE} M${SIZE - 2},-2 l4,4`} />;
    case "cross":
      return <path d={`M0,0 l${SIZE},${SIZE} M${SIZE},0 l-${SIZE},${SIZE}`} />;
    case "horizontal":
      return <path d={`M0,${SIZE / 2} h${SIZE}`} />;
    case "vertical":
      return <path d={`M${SIZE / 2},0 v${SIZE}`} />;
    case "dots":
      return <circle cx={SIZE / 2} cy={SIZE / 2} r={1.3} style={{ stroke: "none" }} />;
    case "solid":
      return null;
  }
}

interface GanttDefsProps {
  /** Styles of the processes that appear in the chart; duplicates are drawn once. */
  styles: readonly ProcessStyle[];
  /** Makes pattern ids unique when more than one chart is on a page. */
  idPrefix: string;
}

export function patternUrl(idPrefix: string, style: ProcessStyle): string {
  return `url(#${idPrefix}-${style.patternId})`;
}

export function GanttDefs({ styles, idPrefix }: GanttDefsProps) {
  const unique = [...new Map(styles.map((style) => [style.patternId, style])).values()];
  return (
    <defs>
      {unique.map((style) => {
        const ink = labelColor(style.labelTone);
        return (
          <pattern key={style.patternId} id={`${idPrefix}-${style.patternId}`} width={SIZE} height={SIZE} patternUnits="userSpaceOnUse">
            <rect width={SIZE} height={SIZE} style={{ fill: style.fill }} />
            <g style={{ stroke: ink, fill: ink, strokeWidth: 1.2, strokeOpacity: 0.55, fillOpacity: 0.55 }}>
              {hatchShapes(style.pattern)}
            </g>
          </pattern>
        );
      })}
    </defs>
  );
}
