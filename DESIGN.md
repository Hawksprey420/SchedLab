# Design direction

Authorship note: the owner chose the "textbook / print-ready" direction on 13 November 2026
and asked the agent to find fitting references online. The specifics below were written by
the agent from those references, so they carry the usual risk of default taste. The owner
can overrule any line.

## Identity

SchedLab should read like a worked example in an operating systems textbook that happens
to be interactive: a process table, a numbered figure, a results table. Screenshots must
drop into the PDF report and print cleanly, including in greyscale.

Reading this as: a single-screen teaching tool for OS students and their instructor, in a
textbook-handout visual language, dial ENERGY 1 / RHYTHM 2 / MOTION 1.

## References

- Tufte CSS (github.com/edwardtufte/tufte-css): off-white page and off-black ink instead
  of pure white and black, serif text, figures with captions, generous margins.
- Okabe and Ito's colour-blind-safe categorical palette, used for process colours.

These are references for judgement, not templates to copy. No sidenote layout is used.

## Palette

| Token | Light | Dark | Use |
|---|---|---|---|
| `paper` | `#fffff8` | `#151515` | Page background |
| `surface` | `#f6f4ea` | `#1f1f1d` | Table header, figure plate |
| `ink` | `#111111` | `#e8e6dc` | Text, rules, axis |
| `ink-muted` | passes 4.5:1 on `paper` | passes 4.5:1 on `paper` | Captions, units, tick labels |
| `rule` | hairline derived from `ink` | same | Table and axis rules |
| `accent` | vermillion `#D55E00` family | lighter tint | Primary action, playhead, the selected algorithm |
| `danger` | a red that passes 4.5:1 | lighter tint | Validation errors only |

One accent only. Exact `ink-muted`, `accent` text and `danger` values are picked by
measuring contrast (WCAG AA: 4.5:1 normal text, 3:1 large text and UI boundaries) in both
themes, not by eye.

Reason for light as the default: the deliverable is a printed or PDF report. A working
light/dark toggle ships because there is no brand reason to fix the theme; it follows the
system preference until the user overrides it.

### Process colours

Processes are data, so they get an encoding system instead of palette colours:

- Colour from the Okabe-Ito set, in this order: `#0072B2`, `#E69F00`, `#009E73`,
  `#CC79A7`, `#56B4E9`, `#D55E00`, `#F0E442`.
- A hatch pattern per process (solid, diagonal, reverse diagonal, cross, dots, horizontal,
  vertical). Colour and pattern cycle at different lengths so the first 49 processes get
  distinct pairs.
- The PID printed on the bar, in whichever of ink or paper measures at least 4.5:1 against
  that bar's fill.
- A process keeps its colour and pattern by input position, so FCFS and SJF charts of the
  same workload match. Idle time is an unfilled, dashed-outline bar labelled "idle".

## Typography

Fonts are bundled with the app (npm `@fontsource` packages), never fetched at runtime,
because the demo must work offline.

| Role | Face | Reason |
|---|---|---|
| Headings, captions, prose | Source Serif 4 | Textbook voice; open source; has the optical sizes for both a title and a caption |
| Controls, tables, form fields | IBM Plex Sans | Clear at small sizes with tabular figures, so columns of times line up |
| Axis ticks, PIDs, time values | IBM Plex Mono | Fixed-width digits keep tick labels and `[begin, end)` intervals aligned |

Numbers in tables and on the axis always use tabular figures. No uppercase labels with
wide tracking.

## Layout

- One column of numbered parts in reading order: workload (process table), algorithm,
  figure (Gantt chart), results table with averages. Wide screens place the workload
  beside the figure; phones stack them.
- The Gantt chart is a figure with a caption ("Figure 1. FCFS schedule, single core,
  time in ticks"). The figure and its ruled time axis with tick marks are the identity
  motif and the focal point of the screen.
- Hairline rules and whitespace separate parts. No cards, no shadows, no gradients.
- Radius: 2px on inputs and buttons, 0 on tables and figures.
- The chart scrolls horizontally inside its own frame on narrow screens with a minimum
  width per tick; the page itself never scrolls sideways.

## Motion

MOTION 1 for P0: state changes only (focus, hover, error appearing). Nothing animates on
load. Honour `prefers-reduced-motion`.

## Copy

Plain, specific, sentence case. Time is always labelled "ticks". Priority is labelled as
recorded but not used by FCFS or SJF. Errors name the field, the value and the fix. No
marketing language, no em dashes.
