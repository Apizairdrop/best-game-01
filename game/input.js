// Keyboard and mouse input for Neon Harvest. The canvas is drawn at a fixed
// internal resolution and scaled by CSS, so mouse positions are converted into
// canvas coordinates here. Keys are tracked by code (KeyW, ArrowUp, Space...)
// so WASD and arrows both work, and the page never scrolls on game keys.

/** The game keys whose default browser behaviour we suppress. */
const GAME_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Space',
]);

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, down: false };

  function canvasPos(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * canvas.width,
      y: ((clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function onKeyDown(event) {
    if (GAME_KEYS.has(event.code)) event.preventDefault();
    if (!event.repeat) pressed.add(event.code);
    keys.add(event.code);
  }

  function onKeyUp(event) {
    keys.delete(event.code);
  }

  function onMouseMove(event) {
    const p = canvasPos(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
  }

  function onMouseDown(event) {
    const p = canvasPos(event.clientX, event.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    if (event.button === 0) mouse.down = true;
  }

  function onMouseUp(event) {
    if (event.button === 0) mouse.down = false;
  }

  function onBlur() {
    keys.clear();
    mouse.down = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mouseup', onMouseUp);
  window.addEventListener('blur', onBlur);

  return {
    mouse,
    /** True while the key is held. */
    down(code) {
      return keys.has(code);
    },
    /** True only on the frame the key was first pressed. Consumed by endFrame. */
    wasPressed(code) {
      return pressed.has(code);
    },
    /** True when any of the given codes is held. */
    anyDown(codes) {
      return codes.some((c) => keys.has(c));
    },
    /** True when any of the given codes was pressed this frame. */
    anyPressed(codes) {
      return codes.some((c) => pressed.has(c));
    },
    /** Clear the per-frame pressed set; called once per frame by the loop. */
    endFrame() {
      pressed.clear();
    },
    /** A click edge: true once when the left button goes down. */
    clickEdge: false,
    /** Detach all listeners (unused in play, kept for completeness). */
    destroy() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}
