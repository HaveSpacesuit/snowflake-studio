import { forwardRef } from "react";

/** Full-viewport canvas behind the app used for the ambient snowfall. */
const BackgroundCanvas = forwardRef(function BackgroundCanvas(_props, ref) {
  return <canvas id="backgroundCanvas" ref={ref} aria-hidden="true" />;
});

export default BackgroundCanvas;
