
import { useRef, useEffect } from 'react';
import { GameState } from '../types';

export const useGameInput = (gameState: GameState, setGameState: (s: GameState) => void) => {
  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef<{x: number, y: number}>({x: 0, y: 0});
  
  const joystickRef = useRef<{ 
    active: boolean, 
    originX: number, 
    originY: number, 
    currentX: number, 
    currentY: number, 
    touchId: number | null 
  }>({
    active: false, originX: 0, originY: 0, currentX: 0, currentY: 0, touchId: null
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
        keysPressed.current[e.code] = true; 
        
        if (e.code === 'Escape') {
            if (gameState === GameState.PLAYING) {
                setGameState(GameState.PAUSED);
            } else if (gameState === GameState.PAUSED) {
                setGameState(GameState.PLAYING);
            }
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    const handleMouseMove = (e: MouseEvent) => { mousePos.current = { x: e.clientX, y: e.clientY }; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameState, setGameState]);

  const bindTouchEvents = (canvas: HTMLCanvasElement) => {
    const handleTouchStart = (e: TouchEvent) => {
        if (gameState === GameState.PLAYING) e.preventDefault();

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            // Left half of screen is joystick
            if (touch.clientX < window.innerWidth / 2) {
                joystickRef.current = {
                    active: true,
                    originX: touch.clientX,
                    originY: touch.clientY,
                    currentX: touch.clientX,
                    currentY: touch.clientY,
                    touchId: touch.identifier
                };
            }
        }
    };

    const handleTouchMove = (e: TouchEvent) => {
        if (gameState === GameState.PLAYING) e.preventDefault();
        if (!joystickRef.current.active) return;

        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            if (touch.identifier === joystickRef.current.touchId) {
                joystickRef.current.currentX = touch.clientX;
                joystickRef.current.currentY = touch.clientY;
            }
        }
    };

    const handleTouchEnd = (e: TouchEvent) => {
        if (gameState === GameState.PLAYING) e.preventDefault();
        
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === joystickRef.current.touchId) {
                joystickRef.current.active = false;
                joystickRef.current.touchId = null;
            }
        }
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
        canvas.removeEventListener('touchstart', handleTouchStart);
        canvas.removeEventListener('touchmove', handleTouchMove);
        canvas.removeEventListener('touchend', handleTouchEnd);
    };
  };

  return { keysPressed, mousePos, joystickRef, bindTouchEvents };
};
